'use strict';

var fs = require('fs');

var config = {
    src: 'dist/',
    css: 'css/main.css',
    js: 'js/main.js',
    html: 'index.html',
};

var getFileContentAsString = function (filePath) {

    return fs.readFileSync(filePath, 'utf8', function (error, content) {
        if (error) throw error;

        return content;

    });
};

var writeToFile = function (filePath, content) {

    fs.writeFile(filePath, content, function (error) {
        if (error) throw error;
    });
};

var fileToMarkup = function (filePath, tag) {

    var openTag = '<' + tag + '>';
    var closeTag = '</' + tag + '>';

    var content = getFileContentAsString(filePath);
    return openTag + content + closeTag;

};

/* CSS */
var cssToStyle = (function () {

    var cssFile = config.src + config.css;
    var cssLink = '<link rel="stylesheet" href="' + config.css + '">';

    var style = fileToMarkup(cssFile, 'style');

    var includeInHtml = function (html) {
        return html.replace(cssLink, style);
    };

    return {
        includeInHtml,
    };

})();

/* JavaScript */
var jsToScript = (function () {

    var jsFile = config.src + config.js;
    var jsSrc = '<script src="' + config.js + '"></script>';

    var script = fileToMarkup(jsFile, 'script');

    var includeInHtml = function (html) {
        return html.replace(jsSrc, script);
    };

    return {
        includeInHtml,
    };

})();

/* HTML */
var htmlInclude = (function () {

    var htmlFile = config.src + config.html;
    var html = getFileContentAsString(htmlFile);

    html = cssToStyle.includeInHtml(html);
    html = jsToScript.includeInHtml(html);

    // Create the resulting html file in the current directory
    writeToFile(config.html, html);

})();
