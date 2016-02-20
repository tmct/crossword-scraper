//Inspired by https://scotch.io/tutorials/scraping-the-web-with-node-js

var express = require('express');
var rp = require('request-promise');
var cheerio = require('cheerio');
var app     = express();
var _ = require('lodash');

app.get('/scrape', function(req, res) {
    return getClues().then(showClues);
});

function getClues() {
    url = 'https://www.theguardian.com/crosswords/accessible/cryptic/26811';

    return rp(url)
    .then(function(html){
        var $ = cheerio.load(html);
        var clueElements = $('.crossword__clue');
        return _.map(clueElements, function(clueElement) {
            return $(clueElement).text();
        });
    });
}

function showClues(clues) {
    var c = clues;
}

app.listen('8081');

exports = module.exports = app;