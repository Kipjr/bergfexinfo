'use strict';


/*
 * By Juergen Wolf-Hofer, adapted by Kipjr
 * Apache 2.0 Licensed.
 */

var config= {
	updateInterval: 30 * 60 * 1000,
	animationSpeed: 0,
	header: 'Bergfex.at',
	skiareas: [
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
		var entry = {skiarea: "",slug: "", valley: 0, berg: 0, new: 0, lift: {open: 0, total:0} };
		var td1 = row.children().first();
		var td2 = td1.next();
		var td3 = td2.next();
		var td4 = td3.next();
		var td5 = td4.next();
		var td6 = td5.next();
		
		entry.skiarea = td1.data().value.trim();
		entry.slug = td1.children()[0].pathname.split("/")[1];
		entry.valley =  parseInt(td2.data().value);
		entry.berg =  parseInt(td3.data().value);
		entry.new = parseInt(td4.data().value);
		entry.lift.open  = parseInt(td5.text().trim().split("/")[0]);
		entry.lift.total = parseInt(td5.text().trim().split("/")[1]);
		entry.update = td6.data().value;
	}
	return entry;
}

function searchData(snow_reports, skiarea) {
	for (var i=0; i<snow_reports.length; i++) {
		var regex = new RegExp(skiarea);
		if( regex.test('^' + snow_reports[i].slug + '$')){
			return snow_reports[i];
		};
	}
	return null;
}

async function getHTMLDoc(URL) {
	var response = await fetch(URL);
	var responseText = await response.text();
	var parser = new DOMParser();
	var htmlDoc = parser.parseFromString(responseText, 'text/html');
	return htmlDoc;
}
async function getSkiAreaInfo(slugURL) {
	var URL = 'https://www.bergfex.at/' + slugURL + '/schneebericht/'
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
			if(a.skiarea < b.skiarea) { 
				return -1
			}
			if(a.skiarea > b.skiarea) { 
				return 1
			} 	
			else { 
				return 0
			} 
		})
		for (var i=0; i<config.skiareas.length; i++) {
			console.log("searching for " + config.skiareas[i]);
			var skiarea = searchData(allSnowReports, config.skiareas[i]);
			var details = await getSkiAreaInfo(skiarea.slug);
			skiarea.details = details;
			
			selSnowReports.push(skiarea);
		}
		console.log(selSnowReports)
		var json = JSON.stringify(selSnowReports);
		console.log(json);
	} catch (error) {
        // Handle errors
        console.error(error);
    }
}

GetBergfexInfo()
