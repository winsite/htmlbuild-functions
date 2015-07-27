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
		File = require('vinyl');

	return through2.obj(function (chunk, end, callback) {
		var filename = path.join(cwd || '', chunk);
		fs.readFile(filename, function (err, data) {
			if (err) {
				callback(err);
				return;
			}
			var file = new File({
				path: filename,
				contents: data
			});
			console.log(file);
			callback(null, file);
		});
	});
};

var scriptSrc = function (html, min) {
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

var stylesheetSrc = function (html, min) {
	var stream = require('stream'),
		cheerio = require('cheerio'),
		readable = new stream.Readable({objectMode: true}),
		$ = cheerio.load(html);

	$('script[src]').each(function () {
		var element = $(this),
			href;
		if (min) {
			href = element.attr('min-src') || element.attr('data-min-src');
		}
		href = href || element.attr('target-src') || element.attr('data-target-src') || element.attr('src');
		href && readable.push(href);
	});
	readable.push(null);
	return readable;
};

module.exports = {

	/**
	 * Builder pro vytvo�en� streamu se seznamem v�ech skript�
	 * @param stream	V�stupn� stream
	 * @param cwd	Pracovn� adres��
	 * @param min	Pou��t minifikovan� verze sript�
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
	 * Builder pro vytvo�en� streamu se seznamem v�ech soubor� se styly
	 * @param stream	V�stupn� stream
	 * @param cwd	Pracovn� adres��
	 * @param min	Pou��t minifikovan� verze soubor� se styly
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
	 * Builder pro nahrazen� sekce script� za souhrnn� script tag
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
	 * Builder pro nahrazen� sekce styl� za souhrnn� script link
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