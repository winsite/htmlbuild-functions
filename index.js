'use strict';

var wait = function (stream, callback) {
	var chunks = [];

	stream.on('error', function (err) {
		callback(error);
	});

	stream.on('data', function (chunk) {
		chunks.push(chunk);
	});

	stream.on('end', function () {
		var data = chunks.join('');
		callback(null, data);
	});

	stream.resume();
};

var readFile = function (cwd) {
	var fs = require('fs'),
		path = require('path'),
		through2 = require('through2'),
		File = require('vinyl'),
		stripBom = require('strip-bom');

	return through2.obj(function (chunk, end, callback) {
		var filename = path.join(cwd || '', chunk);
		fs.readFile(filename, function (err, data) {
			if (err) {
				callback(err);
				return;
			}
			var file = new File({
				path: filename,
				contents: stripBom(data)
			});
			callback(null, file);
		});
	});
};

var scriptSrc = function (html, min) {
	var stream = require('stream'),
		cheerio = require('cheerio'),
		readable = new stream.Readable({objectMode: true}),
		$ = cheerio.load(html);

	$('script[src]').each(function () {
		var element = $(this),
			src;
		if (min) {
			src = element.attr('min-src') || element.attr('data-min-src');
		}
		src = src || element.attr('target-src') || element.attr('data-target-src') || element.attr('src');
		src && readable.push(src);
	});
	readable.push(null);
	return readable;
};

var stylesheetSrc = function (html, min) {
	var stream = require('stream'),
		cheerio = require('cheerio'),
		readable = new stream.Readable({objectMode: true}),
		$ = cheerio.load(html);

	$('link[rel=stylesheet][href]').each(function () {
		var element = $(this),
			href;
		if (min) {
			href = element.attr('min-href') || element.attr('data-min-href');
		}
		href = href || element.attr('target-href') || element.attr('data-target-href') || element.attr('href');
		href && readable.push(href);
	});
	readable.push(null);
	return readable;
};

module.exports = {

	/**
	 * Builder pro vytvoření streamu se seznamem všech skriptů
	 * @param stream	Výstupní stream
	 * @param cwd	Pracovní adresář
	 * @param min	Použít minifikované verze sriptů
	 * @returns {Function}
	 */
	streamScript: function (stream, cwd, min) {
		min = min !== false;
		return function (block) {
			wait(block, function (err, html) {
				if (err) throw err;
				scriptSrc(html, min)
					.pipe(readFile(cwd))
					.pipe(stream);
			});
		};
	},

	/**
	 * Builder pro vytvoření streamu se seznamem všech souborů se styly
	 * @param stream	Výstupní stream
	 * @param cwd	Pracovní adresář
	 * @param min	Použít minifikované verze souborů se styly
	 * @returns {Function}
	 */
	streamStylesheet: function (stream, cwd, min) {
		min = min !== false;
		return function (block) {
			wait(block, function (err, html) {
				if (err) throw err;
				stylesheetSrc(html, min)
					.pipe(readFile(cwd))
					.pipe(stream);
			});
		};
	},

	/**
	 * Builder pro nahrazení sekce scriptů za souhrnný script tag
	 * @param src	Hodnota src atributu
	 * @returns {Function}
	 */
	replaceScript: function (src) {
		return function (block) {
			var cheerio = require('cheerio'),
				element = cheerio('<script></script>');
			element.attr('src', src);
			block.end(block.indent + cheerio.html(element));
		};
	},

	/**
	 * Builder pro nahrazení sekce stylů za souhrnný script link
	 * @param href	Hodnota href atributu
	 * @returns {Function}
	 */
	replaceStylesheet: function (href) {
		return function (block) {
			var cheerio = require('cheerio'),
				element = cheerio('<link>');
			element.attr('rel', 'stylesheet');
			element.attr('href', href);
			block.end(block.indent + cheerio.html(element));
		};
	}
};