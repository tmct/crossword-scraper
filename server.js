//Inspired by https://scotch.io/tutorials/scraping-the-web-with-node-js

var express = require('express');
var rp = require('request-promise');
var cheerio = require('cheerio');
var app     = express();
var _ = require('lodash');

app.get('/scrape', function(req, res) {
    return getClues()
    .then(parseClues)
    .then(function(parsedClues) {
        returnClueJson(parsedClues, res);
    });
});

function getClues() {
    var url = 'https://www.theguardian.com/crosswords/accessible/cryptic/26811';

    return rp(url)
    .then(function(html){
        var $ = cheerio.load(html);
        var clueElements = $('.crossword__clue');
        return _.map(clueElements, function(clueElement) {
            return fetchClueDetails($(clueElement));
        });
    });
}

function fetchClueDetails(clueElement) {
    return {
        text: clueElement.text(),
        number: clueElement.attr('value'),
        across: clueElement.parent().parent().attr('class') === "crossword__clues--across"
    };
}

function parseClues(clues) {
    return _.map(clues, parseClue);
}

function parseClue(clue) {
    // Format is e.g. "(2D) Fresh poem search by a nose (5,4)"
    var standardFormat = /^\((.*)\) (.*) \((.*)\)$/;
    var match = clue.text.match(standardFormat);
    if (match) {
        clue.type = 'standard';
        clue.startLocation = match[1];
        clue.clue = match[2];
        clue.wordLengths = match[3];
        return clue;
    }
    // Format is e.g. "(4D) See 1A"
    var seeOtherClueFormat = /^\((.*)\) See (.*)$/;
    match = clue.text.match(seeOtherClueFormat);
    if (match) {
        clue.type = 'seeOther';
        clue.startLocation = match[1];
        clue.seeOther = match[2];
        return clue;
    }
    throw new Error("Clue didn't match any known format");
}

function returnClueJson(parsedClues, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(parsedClues));
}

//Navigate to http://localhost:8081/scrape to run
app.listen('8081');

exports = module.exports = app;