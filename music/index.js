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

const fs = require("fs");
const path = require("path");
const express = require('express');
const fetch = require("node-fetch");
const util = require('util');
const exec = util.promisify(require('child_process').exec);

var debug = beo.debug;
var sources;

var version = require("./package.json").version;

var musicProviders = [];

var defaultSettings = {
	previousSearches: [],
	artistPicturePath: "/data/library/artists"
};
var settings = JSON.parse(JSON.stringify(defaultSettings));

if (!fs.existsSync(settings.artistPicturePath)) {
	fs.mkdirSync(settings.artistPicturePath);
}


beo.bus.on('general', function(event) {
	
	if (event.header == "startup") {
		
		if (beo.extensions.sources &&
			beo.extensions.sources.setSourceOptions &&
			beo.extensions.sources.sourceDeactivated) {
			sources = beo.extensions.sources;
		} else {
			sources = null;
		}
		
		if (sources) {
			
			sources.setSourceOptions("music", {
				enabled: true,
				aggregate: true,
				transportControls: "inherit"
			});
			
			beo.expressServer.use('/music/artists/', (req, res, next) => {
				if (!req.url.match(/^.*\.(png|jpg|jpeg)/ig)) return res.status(403).end('403 Forbidden');
				next();
			});
			beo.expressServer.use("/music/artists/", express.static(settings.artistPicturePath));
				
		}
		
	}
	
	if (event.header == "activatedExtension") {
		if (event.content.extension == "music") {
			if (updatingLibrary) beo.sendToUI("music", "updatingLibrary");
		}
	}
});	



beo.bus.on('music', function(event) {
	
	if (event.header == "settings") {
		if (event.content.settings) {
			settings = Object.assign(settings, event.content.settings);
		}
	}
	
	
	if (event.header == "getMusic") {
		if (event.content &&
			event.content.type &&
			!event.content.context) {
			getFromMultipleProviders(event.content.type).then(data => {
				if (event.content.type == "artists") {
					data = getArtistPictures(data[0], true);
				} else {
					data = data[0];
				}
				beo.sendToUI("music", "musicData", {type: event.content.type, data: data, context: null});
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
					artist = getArtistPictures([artist])[0];
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
			if (event.content.type == "search") {
				previousSearchIndex = settings.previousSearches.indexOf(event.content.context.searchString);
				if (previousSearchIndex != -1) {
					settings.previousSearches.splice(previousSearchIndex, 1);
				}
				settings.previousSearches.unshift(event.content.context.searchString);
				if (settings.previousSearches.length > 5) settings.previousSearches.pop();
				beo.saveSettings("music", settings);
				getFromMultipleProviders("search", event.content.context).then(data => {
					beo.sendToUI("music", "musicData", {type: "search", data: {
						type: "search",
						tracks: data[0].tracks,
						albums: data[0].albums,
						artists: getArtistPictures(data[0].artists, true)
					}, context: event.content.context, previousSearches: settings.previousSearches});
				});
			}
		}
	}
	
	if (event.header == "playMusic") {
		if (event.content.type &&
			event.content.context && 
			event.content.context.provider) {
			beo.extensions[event.content.context.provider].playMusic(event.content.index, event.content.type, event.content.context).then(response => {
				//
			});
		}
	}
	
	if (event.header == "revealMusic" &&
		event.content.type && event.content.context) {
		revealMusic(event.content.type, event.content.context);
	}
	
	if (event.header == "previousSearches") {
		beo.sendToUI("music", "previousSearches", settings.previousSearches);
	}
	
	if (event.header == "playQueued" &&
		event.content && event.content.position != undefined) {
		playQueued(event.content.position);
	}
	
	if (event.header == "getQueue") {
		sendQueue();
	}
	
	if (event.header == "clearQueue") {
		clearQueue();
	}
	
	if (event.header == "modifyQueue" && event.content.operation) {
		modifyQueue(event.content.operation, event.content.data);
	}
	
	if (event.header == "addToQueue" && 
		event.content.position && event.content.type && event.content.context) {
		addToQueue(event.content.position, event.content.type, event.content.context);
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

var artistDB = null;
var artistPictures = [];
var artistPicturesLC = [];
var extList = [".jpg", ".jpeg", ".png"];

function getArtistPictures(artists) {
	if (!artistDB) {
		if (fs.existsSync(settings.artistPicturePath+"/database.json")) {
			try {
				artistDB = require(settings.artistPicturePath+"/database.json");
			} catch (error) {
				console.error("Error reading artist database:", error);
				artistDB = {};
			}
		} else {
			artistDB = {};
		}
	}
	
	artistPictures = fs.readdirSync(settings.artistPicturePath);
	artistPicturesLC = [];
	for (f in artistPictures) {
		artistPicturesLC.push(artistPictures[f].toLowerCase());
	}
	
	artistList = [];
	for (a in artists) {
		if (!artistDB[artists[a].artist]) {
			artistDB[artists[a].artist] = {internetLookup: false, img: null, thumbnail: null, mbid: null};
			saveArtistDB();
		}
		artistList.push(artists[a].artist);
		artist = artists[a].artist.toLowerCase().replace(/\//g, "-").replace(/"/g, "");
		
		// Get thumbnail.
		for (e in extList) {
			index = artistPicturesLC.indexOf(artist+"-thumb"+extList[e]);
			if (index != -1) {
				artists[a].thumbnail = "/music/artists/"+encodeURIComponent(artistPictures[index]).replace(/[!'()*]/g, escape);
				artistDB[artists[a].artist].thumbnail = artistPictures[index];
				break;
			}
		}
		if (!artists[a].thumbnail) artistDB[artists[a].artist].thumbnail = null;
		
		// Get cover picture.
		for (e in extList) {
			index = artistPicturesLC.indexOf(artist+extList[e]);
			if (index != -1) {
				artists[a].img = "/music/artists/"+encodeURIComponent(artistPictures[index]).replace(/[!'()*]/g, escape);
				artistDB[artists[a].artist].img = artistPictures[index];
				if (!artists[a].thumbnail) artists[a].thumbnail = artists[a].img;
				break;
			}
		}
		if (!artists[a].img) artistDB[artists[a].artist].img = null;
	}
	if (beo.extensions.privacy &&
		beo.extensions.privacy.getPrivacySetting) {
		if (beo.extensions.privacy.getPrivacySetting("externalMetadata")) findMissingArtistPictures(artistList);
	}
	return artists;
}

artistDownloadQueue = [];

async function findMissingArtistPictures(list = null) {
	if (!list) {
		list = Object.keys(artistDB);
	}
	
	start = (artistDownloadQueue.length == 0) ? true : false; // Don't start download if a queue is already processing.
	
	artistDownloadQueue = artistDownloadQueue.concat(list);
	
	if (start) {
		
		changesMade = false;
		for (a in artistDownloadQueue) {
			if (artistDB[artistDownloadQueue[a]] && !artistDB[artistDownloadQueue[a]].internetLookup) {
				setLibraryUpdateStatus("artistPictureDL", true);
				changesMade = true;
				
				hifiberryJSON = null;
				fanartJSON = null;
				hifiberryAPICall = null;
				fanartAPICall = null;
				filename = null;
				
				hifiberryAPICall = await fetch("http://musicdb.hifiberry.com/artistcover/"+encodeURIComponent(artistDownloadQueue[a]));
				if (hifiberryAPICall.status == 200) {
					hifiberryJSON = await hifiberryAPICall.json();
					if (hifiberryJSON.mbid) {
						artistDB[artistDownloadQueue[a]].mbid = hifiberryJSON.mbid;
						filename = artistDownloadQueue[a].toLowerCase().replace(/\//g, "-").replace(/"/g, "");
						if (!artistDB[artistDownloadQueue[a]].img || !artistDB[artistDownloadQueue[a]].thumbnail) {
							newPictures = {artist: artistDownloadQueue[a]};
							if (hifiberryJSON.url && !artistDB[artistDownloadQueue[a]].thumbnail) {
								if (debug > 1) console.log("Downloading thumbnail for artist '"+artistDownloadQueue[a]+"'...");
								// Download picture.
								try {
									await beo.download(hifiberryJSON.url, settings.artistPicturePath, filename+"-thumb.jpg");
									// Resize picture.
									try {
										await exec("convert \""+settings.artistPicturePath+"/"+filename+"-thumb.jpg\" -resize 400x400\\> \""+settings.artistPicturePath+"/"+filename+"-thumb.jpg\"");
									} catch (error) {
										console.log("Error resizing image:", error);
									}
									
									artistDB[artistDownloadQueue[a]].thumbnail = filename+"-thumb.jpg";
									newPictures.thumbnail = "/music/artists/"+encodeURIComponent(artistDB[artistDownloadQueue[a]].thumbnail).replace(/[!'()*]/g, escape);
								} catch(error) {
									console.error("There was an error downloading image:", error);
								}
							}
							fanartAPICall = await fetch("http://webservice.fanart.tv/v3/music/"+hifiberryJSON.mbid+"?api_key=084f2487ed559999e85996db790f864b");
							if (fanartAPICall.status == 200) {
								try {
									fanartJSON = await fanartAPICall.json();
									if (fanartJSON.artistbackground && !artistDB[artistDownloadQueue[a]].img) {
										if (debug > 1) console.log("Downloading image for artist '"+artistDownloadQueue[a]+"'...");
										await beo.download(fanartJSON.artistbackground[0].url, settings.artistPicturePath, filename+".jpg");
										artistDB[artistDownloadQueue[a]].img = filename+".jpg";
										newPictures.img = "/music/artists/"+encodeURIComponent(artistDB[artistDownloadQueue[a]].img).replace(/[!'()*]/g, escape);
									}
								} catch (error) {
									console.error("There was an error downloading image:", error);
								}
							}
							if (newPictures.thumbnail || newPictures.img) beo.sendToUI("music", "artistPictures", newPictures);
						}
					}
				}
				artistDB[artistDownloadQueue[a]].internetLookup = true;
			}
		}
		
		setLibraryUpdateStatus("artistPictureDL", false);
		if (changesMade) saveArtistDB();
		artistDownloadQueue = [];
	}
}

async function setArtistPicture(uploadPath, context) {
	if (artistDB && artistDB[context.artist]) {
		
		urlParameters = "?variant="+Math.round(Math.random()*100);
		fileExtension = (context.fileType == "image/jpeg") ? ".jpg" : ".png";
		filename = context.artist.toLowerCase().replace(/\//g, "-").replace(/"/g, "");
		newPictures = {artist: context.artist};
		
		if (context.imageKind == "thumbnail") {
			if (debug) console.log("Updating thumbnail for artist '"+context.artist+"'.");
			fs.copyFileSync(uploadPath, settings.artistPicturePath+"/"+filename+"-thumb"+fileExtension);
			try {
				await exec("convert \""+settings.artistPicturePath+"/"+filename+"-thumb"+fileExtension+"\" -resize 400x400\\> \""+settings.artistPicturePath+"/"+filename+"-thumb"+fileExtension+"\"");
			} catch (error) {
				console.log("Error resizing image:", error);
			}
			
			artistDB[context.artist].thumbnail = filename+"-thumb"+fileExtension;
			newPictures.thumbnail = "/music/artists/"+encodeURIComponent(artistDB[context.artist].thumbnail).replace(/[!'()*]/g, escape)+urlParameters;
		}
		
		if (newPictures.thumbnail || newPictures.img) {
			beo.sendToUI("music", "artistPictures", newPictures);
			saveArtistDB();
		}
	}
	fs.unlink(uploadPath, (err) => {
		if (err) console.error("Error deleting file:", err);
	});
}

var artistDBSaveTimeout;
function saveArtistDB() {
	clearTimeout(artistDBSaveTimeout);
	artistDBSaveTimeout = setTimeout(function() {
		fs.writeFileSync(settings.artistPicturePath+"/database.json", JSON.stringify(artistDB));
	}, 5000);
}


var libraryUpdateJobs = [];
var updatingLibrary = false;
function setLibraryUpdateStatus(job, status) {
	jobIndex = libraryUpdateJobs.indexOf(job);
	if (status) {
		if (jobIndex == -1) {
			libraryUpdateJobs.push(job);
			beo.sendToUI("music", "updatingLibrary");
			updatingLibrary = true;
		}
	} else {
		if (jobIndex != -1) {
			libraryUpdateJobs.splice(jobIndex, 1);
			if (libraryUpdateJobs.length == 0) beo.sendToUI("music", "libraryUpdated");
			updatingLibrary = false;
		}
	}
}

function returnMusic(provider, type, musicData, context) {
	if (type == "artists") {
			musicData = getArtistPictures(musicData, true);
		}
	beo.sendToUI("music", "musicData", {type: type, data: musicData, context: context});
}

function revealMusic(type, context = {}) {
	if (!context.provider && context.uri) {
		if (beo.extensions.sources &&
			beo.extensions.sources.getSources) {
			allSources = beo.extensions.sources.getSources();
			for (source in allSources) {
				if (source != "music") {
					if (allSources[source].metadata && 
						allSources[source].metadata.uri &&
						allSources[source].metadata.uri == context.uri) {
						context.provider = source;
					}
				}
			}
		}
	}
	if (!context.provider) {
		// Search queue for this track.
		for (t in masterQueue.tracks) {
			if (masterQueue.tracks[t].path == context.uri && masterQueue.tracks[t].provider) {
				context.provider = masterQueue.tracks[t].provider;
			}
		}
	}
	if (context.provider) {
		if (type == "album") {
			beo.extensions[context.provider].getMusic("album", context).then(album => {
				album.type = "album";
				delete context.uri;
				album.context = context;
				beo.sendToUI("music", "musicData", {type: "album", data: album, context: context});
			});
		}
	}
}

function processUpload(path, context) {
	if (context.type == "artist") {
		setArtistPicture(path, context);
	} else if (context.type == "album") {
		if (context.provider &&
			beo.extensions[context.provider] &&
			beo.extensions[context.provider].setAlbumCover) {
			beo.extensions[context.provider].setAlbumCover(path, context).then(newCover => {
				if (newCover.error == null) {
					beo.sendToUI("music", "albumPictures", {pictures: newCover, context: context});
				}
			});
		}
	}
}

// UP NEXT FUNCTIONALITY

var masterQueue = {
	position: 0,
	providers: [],
	tracks: []
};

function updateQueue(provider, operation, data) {
	switch (operation) {
		case "tracks":
			// Gives complete queue.
			masterQueue.position = data.position;
			masterQueue.tracks = data.tracks;
			break;
	}
	if (masterQueue.providers.indexOf(provider) == -1) masterQueue.providers.push(provider);
	beo.sendToUI("now-playing", "queue", {source: "music", data: masterQueue, canClear: true});
}

function sendQueue() {
	beo.sendToUI("now-playing", "queue", {source: "music", data: masterQueue, canClear: true});
}

function playQueued(position) {
	if (masterQueue.tracks[position]) {
		if (masterQueue.tracks[position].provider &&
			beo.extensions[masterQueue.tracks[position].provider] &&
			beo.extensions[masterQueue.tracks[position].provider].playQueued) {
			beo.extensions[masterQueue.tracks[position].provider].playQueued(position);
		}
	}
}

function clearQueue() {
	for (p in masterQueue.providers) {
		if (beo.extensions[masterQueue.providers[p]] &&
			beo.extensions[masterQueue.providers[p]].clearQueue) {
			beo.extensions[masterQueue.providers[p]].clearQueue();
		}
	}
}

function modifyQueue(operation, data) {
	var queueTrack = null;
	if (data && data.id != undefined) {
		for (t in masterQueue.tracks) {
			if (masterQueue.tracks[t].queueID == data.id) {
				queueTrack = masterQueue.tracks[t];
			}
		}
	}
	switch (operation) {
		case "remove":
			if (queueTrack && queueTrack.provider) {
				if (beo.extensions[queueTrack.provider] &&
					beo.extensions[queueTrack.provider].modifyQueue) {
					beo.extensions[queueTrack.provider].modifyQueue("remove", data);
				}
			}
			break;
		case "playNext":
			if (queueTrack && queueTrack.provider) {
				if (beo.extensions[queueTrack.provider] &&
					beo.extensions[queueTrack.provider].modifyQueue) {
					beo.extensions[queueTrack.provider].modifyQueue("playNext", data);
				}
			}
			break;
	}
}

function addToQueue(position, type, context) {
	if (position == "next" || position == "last") {
		if (context.provider && 
			beo.extensions[context.provider] && 
			beo.extensions[context.provider].addToQueue) {
			beo.extensions[context.provider].addToQueue(position, type, context);
		}
	}
}


	
module.exports = {
	version: version,
	processUpload: processUpload,
	registerProvider: registerProvider,
	setLibraryUpdateStatus: setLibraryUpdateStatus,
	returnMusic: returnMusic,
	updateQueue: updateQueue
};

