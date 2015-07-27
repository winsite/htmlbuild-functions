'use strict';

var path = require('path'),
	fs = require('fs'),
	es = require('event-stream'),
	gulp = require('gulp'),
	cheerio = require('cheerio'),
	sprintf = require('sprintf'),

	/**
	 * Zkontroluje pøístup k souboru a vyhodí chybu v pøípadì, že nelze pøeèíst.
	 * @param file	Název souboru
	 */
	validateFile = function (file) {
		fs.accessSync && fs.accessSync(file, fs.R_OK);
		if (fs.existsSync && !fs.existsSync(file)) {
			throw new Error(sprintf('ENOENT, no such file or directory \'%s\'', file));
		}
	},

	/**
	 * Zkonvertuje pole názvù souborù na zdrojový stream Gulpu
	 * @param cwd	Pracovní adresáø
	 * @returns {*}
	 */
	gulpSources = function (cwd) {
		cwd = cwd || '';
		var pathStream = es.through(),
			fileStream = es.through();
		pathStream.pipe(es.writeArray(function (err, files) {
			files = files.map(function (file) {
				file = path.join(cwd, file);
				validateFile(file);
				return file;
			});
			gulp.src(files).pipe(fileStream);
		}));
		return es.duplex(pathStream, fileStream);
	},

	/**
	 * Builder funkce pro script tag
	 * @param builder	Builder funkce
	 * @param minified	Použít minifikovanou verzi sriptu
	 * @returns {Function}
	 */
	scriptBuilder = function (builder, minified) {
		minified = minified !== false;
		var extractSrc = function (line) {
			var element = cheerio('script[src]', line) || cheerio('<script></script>');
			return minified && element.attr('data-build-src') || element.attr('data-abs-src') || element.attr('src');
		};
		return function (block) {
			var templateScript = function (path) {
					var element = cheerio('script', '<script></script>');
					element.attr('src', path);
					return block.indent + cheerio.html(element);
				},
				extractScriptStream = es.mapSync(extractSrc),
				templateScriptStream = es.mapSync(templateScript);
			block.pipe(extractScriptStream);
			templateScriptStream.pipe(block);
			builder(es.duplex(templateScriptStream, extractScriptStream));
		};
	},

	/**
	 * Builder funkce pro link tag
	 * @param builder	Builder funkce
	 * @param minified	Použít minifikovanou verzi sriptu
	 * @returns {Function}
	 */
	stylesheetBuilder = function (builder, minified) {
		minified = minified !== false;
		var extractLink = function (line) {
			var element = cheerio('link[rel=stylesheet][href]', line) || cheerio('<link>');
			return minified && element.attr('data-build-href') ||  element.attr('data-href') || element.attr('href');
		};
		return function (block) {
			var templateLink = function (path) {
					var element = cheerio('link', '<link>');
					element.attr('rel', 'stylesheet');
					element.attr('href', path);
					return block.indent + cheerio.html(element);
				},
				extractLinkStream = es.mapSync(extractLink),
				templateLinkStream = es.mapSync(templateLink);
			block.pipe(extractLinkStream);
			templateLinkStream.pipe(block);
			builder(es.duplex(templateLinkStream, extractLinkStream));
		};
	};

module.exports = {
	/**
	 * Builder pro vytvoøení streamu se seznamem všech skriptù
	 * @param stream	Výstupní stream
	 * @param cwd		Pracovní adresáø
	 * @param minified	Použít minifikované verze sriptù
	 * @returns {Function}
	 */
	scriptStream: function (stream, cwd, minified) {
		return scriptBuilder(function (block) {
			block.pipe(gulpSources(cwd)).pipe(stream);
		}, minified);
	},

	/**
	 * Builder pro nahrazení sekce scriptù za souhrnný script tag
	 * @param src	Hodnota src atributu
	 * @returns {Function}
	 */
	scriptReplace: function (src) {
		return scriptBuilder(function (block) {
			block.end(src);
		});
	},

	/**
	 * Builder pro vytvoøení streamu se seznamem všech souborù se styly
	 * @param stream	Výstupní stream
	 * @param cwd		Pracovní adresáø
	 * @param minified	Použít minifikované verze souborù se styly
	 * @returns {Function}
	 */
	stylesheetStream: function (stream, cwd, minified) {
		return stylesheetBuilder(function (block) {
			block.pipe(gulpSources(cwd)).pipe(stream);
		}, minified);
	},

	/**
	 * Builder pro nahrazení sekce stylù za souhrnný script link
	 * @param href	Hodnota href atributu
	 * @returns {Function}
	 */
	stylesheetReplace: function (href) {
		return stylesheetBuilder(function (block) {
			block.end(href);
		});
	}
};