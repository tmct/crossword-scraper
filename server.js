//Inspired by https://scotch.io/tutorials/scraping-the-web-with-node-js

var express = require('express');
var rp = require('request-promise');
var cheerio = require('cheerio');
var app     = express();
var _ = require('lodash');
var URI = require('urijs');
var q = require('q');

app.get('/guardian/:type?/:number(\\d+)?', function(req, res) {
    return createCrosswordJson(req, res);
});

function createCrosswordJson(req, res) {
    var crosswordType = getCrosswordType(req.params.type);
    //TODO getting the latest should do so then redirect back to the URL with the number
    return getCrosswordNumber(req.params.number, crosswordType)
    .then(function(crosswordNumber) {
        return getClues(crosswordNumber, crosswordType);
    })
    .then(parseClues)
    .then(function(parsedClues) {
        returnClueJson(parsedClues, res);
    })
    .catch(function(error) {
        res.status(500).send(error.message);
    });
}

function getCrosswordType(type) {
    if (!type) {
        return 'cryptic';
    }
    var allowedTypes = ['cryptic', 'quick', 'quiptic', 'speedy', 'prize', 'everyman'];
    if (_.includes(allowedTypes, type)) {
        return type;
    }
    throw new Error('crossword type not recognised');
}

function getCrosswordNumber(number, type) {
    if (number) {
        return q(number);
    }
    return getLatestCrosswordNumber(type)
}

function getLatestCrosswordNumber(crosswordType) {
    var url = new URI('https://www.theguardian.com/crosswords/series/')
                .segment(crosswordType)
                .toString();

    return rp(url)
    .catch(function() {
        throw new Error("Could not access the series of " + crosswordType + " crosswords");
    })
    .then(function(html){
        var $ = cheerio.load(html);
        //This finds the element with this href
        $('a').filter(function(){return $(this).attr('href') === "https://www.theguardian.com/crosswords/cryptic/26811"})
        //Todo find the one with the max value after "cryptic" that's still a number
        return '26811'; //Fake for now
    });
}

function getClues(crosswordNumber, crosswordType) {
    var url = new URI('https://www.theguardian.com/crosswords/accessible/')
                .segment(crosswordType)
                .segment(crosswordNumber)
                .toString();

    return rp(url)
    .catch(function() {
        throw new Error("Could not access " + crosswordType + " crossword number " + crosswordNumber);
    })
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
        delete clue.text;
        return clue;
    }
    // Format is e.g. "(4D) See 1A"
    var seeOtherClueFormat = /^\((.*)\) See (.*)$/;
    match = clue.text.match(seeOtherClueFormat);
    if (match) {
        clue.type = 'seeOther';
        clue.startLocation = match[1];
        clue.seeOther = match[2];
        delete clue.text;
        return clue;
    }
    throw new Error("Clue didn't match any known format");
}

function returnClueJson(parsedClues, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(parsedClues));
}

//Navigate to e.g. http://localhost:8081/guardian/26811 to run
app.listen('8081');

exports = module.exports = app;