/*Copyright 2020 Tuomas Hämäläinen
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.*/

// MUSIC BROWSING FOR BEOCREATE 2

var debug = beo.debug;

var version = require("./package.json").version;

var musicProviders = [];

beo.bus.on('general', function(event) {
	
	if (event.header == "startup") {
		
		if (beo.extensions.sources &&
			beo.extensions.sources.setSourceOptions &&
			beo.extensions.sources.sourceDeactivated) {
			sources = beo.extensions.sources;
		}
		
		if (sources) {
			
			sources.setSourceOptions("music", {
				enabled: true,
				aggregate: true,
				transportControls: "inherit"
			});
				
		}
		
	}
});	

beo.bus.on('music', function(event) {
	
	
	if (event.header == "getMusic") {
		if (event.content &&
			event.content.type &&
			!event.content.context) {
			getFromMultipleProviders(event.content.type).then(data => {
				beo.sendToUI("music", "musicData", {type: event.content.type, data: data[0], context: null});
			});
		} else {
			if (event.content.type == "artist") {
				getFromMultipleProviders("albums", event.content.context).then(data => {
					artist = {
						type: "artist",
						artist: event.content.context.artist,
						albums: data[0],
						context: event.content.context
					}
					beo.sendToUI("music", "musicData", {type: "artist", data: artist, context: event.content.context});
				});
			}
			if (event.content.type == "album" &&
				event.content.context.provider) {
				beo.extensions[event.content.context.provider].getMusic("album", event.content.context).then(album => {
					album.type = "album";
					album.context = event.content.context;
					beo.sendToUI("music", "musicData", {type: "album", data: album, context: event.content.context});
				});
			}
		}
	}
	
	if (event.header == "playMusic") {
		if (event.content.index != undefined &&
			event.content.context && 
			event.content.context.provider) {
			beo.extensions[event.content.context.provider].playMusic(event.content.index, event.content.context).then(response => {
				//
			});
		}
	}
	
	if (event.header == "find") {
		if (client && event.content) {
			client.api.db.find(event.content.filter).then(results => {
				beo.sendToUI("mpd", "find", results);
			})
			.catch(error => {
				console.error(error);
			});
		}
	}
});

async function getFromMultipleProviders(type, context = null, providers = musicProviders) {
	musicRequests = [];
	providers.forEach(provider => {
		if (debug > 1) console.log("Requesting '"+type+"' (in context '"+context+"') from '"+provider+"'...");
		musicRequests.push(beo.extensions[provider].getMusic(type, context));
	});
	
	allData = await Promise.all(musicRequests);
	return allData;
}

function registerProvider(provider) {
	if (musicProviders.indexOf(provider) == -1) {
		musicProviders.push(provider);
		if (debug) console.log("'"+provider+"' was registered as a music provider.");
	}
}
	
module.exports = {
	version: version,
	registerProvider: registerProvider
};

