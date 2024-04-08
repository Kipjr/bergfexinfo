'use strict';


/*
 * By Juergen Wolf-Hofer, adapted by Kipjr
 * Apache 2.0 Licensed.
 */

const usingNodeJS = (typeof process !== 'undefined') && (process.release.name === 'node');
console.log(usingNodeJS);
let JSDOM;
let $;
let fs;
if (usingNodeJS){
    fs = require('fs');
    const jsdom = require('jsdom');
    JSDOM = jsdom.JSDOM;
    const jquery = require('jquery');
    $ = jquery(new JSDOM().window);
} else {
    $ = window.$; // Initialize $ in browser environment
}

var config= {
    updateInterval: 30 * 60 * 1000,
    animationSpeed: 0,
    header: 'Bergfex.at',
    skiAreas: [
            'silvretta-arena-ischgl-samnaun',
            'hochzillertal',
        ],
    shortenArea: 20,
    cssclassrow: 'light',
    cssclassheader: 'normal'
}

function parseEntry(row,type='lifte') {
    // lifte,pisten,area
    

    if(type == 'lifte'){
        var entry = {status: "",type: "", short: "", name: "", length: "" };
        entry.status = row.find("." + 'lifte-icon-status' ).children()[0].classList[1] == 'icon-status1' ; //icon | type of lift/piste
        entry.short = row.find("." + 'lifte-kuerzel' ).text().trim() //short
        entry.name = row.find("." + 'lifte-name' ).text().trim() ; //name
        entry.type = row.find("." + 'lifte-typname' ).text().trim() ; //type
        entry.length = row.find("." + 'lifte-laenge' ).text().trim() ; //length
    } 
    if(type == 'pisten'){
        var entry = {status: "",type: "", short: "", name: "", length: "" };
        entry.status = row.find("." + 'pisten-icon-status' ).children()[0].classList[1] == 'icon-status1' ; //icon | type of lift/piste
        entry.short = row.find("." + 'pisten-kuerzel' ).text().trim(); //short
        entry.name = row.find("." + 'pisten-name' ).text().trim() ; //name
        entry.type = row.find("." + 'icon-pisten' )[0].title.trim() ; //type
        entry.length = row.find("." + 'pisten-laenge' ).text().trim() ; //length	
    }
    if(type == 'area'){
        var entry = {skiArea: "",slug: "", valley: 0, berg: 0, new: 0, lift: {open: 0, total:0} };
        var td1 = row.children().first();
        var td2 = td1.next();
        var td3 = td2.next();
        var td4 = td3.next();
        var td5 = td4.next();
        var td6 = td5.next();
        
        entry.skiArea = td1.data().value.trim();
        entry.slug = td1.children()[0].getAttribute('href').split('/')[1];
        entry.valley =  parseInt(td2.data().value);
        entry.berg =  parseInt(td3.data().value);
        entry.new = parseInt(td4.data().value);
        entry.lift.open  = parseInt(td5.text().trim().split("/")[0]);
        entry.lift.total = parseInt(td5.text().trim().split("/")[1]);
        entry.update = td6.data().value;
    }
    return entry;
}

function searchData(snow_reports, skiArea) {
    console.log('searchData: searching in snow_reports for ' + skiArea);
    for (var i=0; i<snow_reports.length; i++) {
        var regex = new RegExp(skiArea);
        if( regex.test('^' + snow_reports[i].slug + '$')){
            return snow_reports[i];
        };
    }
    return null;
}

async function getHTMLDoc(URL) {
    var response = await fetch(URL,{
        mode: 'cors',
        headers: {
            'Access-Control-Allow-Origin':'*'
        }
    });
    var responseText = await response.text();
    if (usingNodeJS){
        var htmlDoc = new JSDOM(responseText).window.document; 
    } else {
        var parser = new DOMParser();
        var htmlDoc = parser.parseFromString(responseText, 'text/html');
    }
    return htmlDoc;
}
async function getSkiAreaInfo(slugURL) {
    var URL = 'https://www.bergfex.at/' + slugURL + '/schneebericht/'
    console.log(URL);
    var liftReports = [];
    var pisteReports = [];
    var details = {}
    
    var htmlDoc = await getHTMLDoc(URL);

    var tbody = $(htmlDoc).find("table:first tr.row0")
    tbody.each(function() {
        var entry = parseEntry($(this),'lifte');
        liftReports.push(entry);
    });
    var tbody =  $(htmlDoc).find("table:first tr.row1")

    tbody.each(function() {
        var entry = parseEntry($(this),'lifte');
        liftReports.push(entry);
    });
    var tbody = $(htmlDoc).find("table:last tr.row0")
    tbody.each(function() {
        var entry = parseEntry($(this),'pisten');
        pisteReports.push(entry);
    });
    var tbody =  $(htmlDoc).find("table:last tr.row1")

    tbody.each(function() {
        var entry = parseEntry($(this),'pisten');
        pisteReports.push(entry);
    });
    return details = {
        liften: liftReports,
        pisten: pisteReports
    };
}

async function GetBergfexInfo(){
    try {
        var htmlDoc;
        var allSnowReports = [];
        var selSnowReports = []
        var htmlDoc = await getHTMLDoc('https://www.bergfex.at/oesterreich/schneewerte/');
        

        var tbody =  $(htmlDoc).find('tr.tr0');
        tbody.each(function() {
            var entry = parseEntry($(this),'area');
            allSnowReports.push(entry);
        });
        var tbody =  $(htmlDoc).find('tr.tr1');

        tbody.each(function() {
            var entry = parseEntry($(this),'area');
            allSnowReports.push(entry);
        });
        allSnowReports.sort(function(a,b){ 
            if(a.skiArea < b.skiArea) { 
                return -1
            }
            if(a.skiArea > b.skiArea) { 
                return 1
            } 	
            else { 
                return 0
            } 
        })
        console.log(allSnowReports);
        for (var i=0; i<config.skiAreas.length; i++) {
            console.log("searching for " + config.skiAreas[i]);
            var skiArea = searchData(allSnowReports, config.skiAreas[i]);
            if (skiArea) {
                var details = await getSkiAreaInfo(skiArea.slug);
                skiArea.details = details;
                console.log(skiArea)
                if (usingNodeJS){
                    var filename = skiArea.slug + '.json'; // Generate filename based on ski area name
                    var jsonData = JSON.stringify(skiArea, null, 2); // Get JSON data for the current ski area
                    fs.writeFileSync(filename, jsonData); // Write JSON data to file
                }
                selSnowReports.push(skiArea);
            }
        }
        console.log(selSnowReports)
        if (usingNodeJS && selSnowReports.length > 0){
            fs.writeFileSync('snow_reports.json', JSON.stringify(selSnowReports, null, 2));
        }
    } catch (error) {
        // Handle errors
        console.error(error);
    }
}

// Extract ski areas from command-line arguments (excluding the first two arguments which are node and script file)
if (usingNodeJS){
    const skiAreas = process.argv.slice(2);
    config.skiAreas = skiAreas
}
GetBergfexInfo()
