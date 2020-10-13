Vue.component('AlbumItem', {
	props: ["album", "inArtist", "stackPosition"],
	template: '<div class="album-item" v-bind:class="{droppable: dragging}" v-on:click="click()" @mouseout="endHold()" @mouseup="endHold()" @mousemove="endHold()" @touchmove="endHold()" @touchend="endHold()" @mousedown="startHold($event)" @touchstart="startHold($event)"  @contextmenu="contextMenu($event)">\
				<div class="artwork-container" v-bind:title="album.name" v-cloak @drop.prevent="pictureDrop($event, album)" @dragover.prevent="dragging = true" @drop="dragging=false" @dragleave="dragging=false">\
					<img class="square-helper" src="common/square-helper.png">\
					<div class="artwork" v-if="album.thumbnail || album.img" v-bind:style="{backgroundImage: \'url(\'+((album.thumbnail) ? album.thumbnail : album.img)+\')\'}"></div>\
					<div class="artwork-placeholder" v-else></div>\
				</div>\
				<div class="album-name">{{ album.name }}</div>\
				<div class="album-artist">{{ !inArtist ? album.artist : album.date }}</div>\
			</div>',
	methods: {
		getAlbum: function(context, stackPosition) {
			music.getContent("album", context, stackPosition);
		},
		pictureDrop: function(event, context) {
			if (this.$parent.uploadPicture) {
				this.$parent.uploadPicture(event, context);
			}
		},
		startHold: function(event) {
			if (event.targetTouches) {
				this.holdPosition = [event.targetTouches[0].pageX, event.targetTouches[0].pageY];
			} else {
				this.holdPosition = [event.pageX, event.pageY];
			}
			this.holding = true;
			var that = this;
			this.holdTimeout = setTimeout(function() {
				that.canClick = false;
				that.$emit("hold");
			}, 500);
		},
		endHold: function() {
			if (this.holding) {
				this.holding = false;
				clearTimeout(this.holdTimeout);
				this.holdTimeout = null;
				setTimeout(function() {
					this.canClick = true;
				}, 20);
			}
		},
		click: function() {
			if (this.canClick) {
				this.getAlbum({artist: this.album.artist, album: this.album.name, provider: this.album.provider}, this.stackPosition);
			}
		},
		contextMenu: function(event) {
			if (this.$listeners.context) {
				this.endHold();
				event.preventDefault();
				this.$emit("context");
			}
		}
	},
	data: function() {
		return {
			dragging: false,
			canClick: true,
			holdTimeout: null,
			holding: false,
			holdPosition: [0,0]
		}
	}
});

Vue.component('ArtistItem', {
	props: ["artist", "stackPosition"],
	template: '<div class="artist-item" v-bind:class="{droppable: dragging}" v-on:click="getArtist({artist: artist.artist}, stackPosition)">\
				<div class="artist-img-container" v-bind:title="artist.artist" v-cloak @drop.prevent="pictureDrop($event, artist)" @dragover.prevent="dragging = true" @drop="dragging=false" @dragleave="dragging=false">\
					<img class="square-helper" src="common/square-helper.png">\
					<div class="artist-img" v-if="artist.img || artist.thumbnail" v-bind:style="{backgroundImage: \'url(\'+((artist.thumbnail) ? artist.thumbnail : artist.img)+\')\'}"></div>\
					<div class="artist-placeholder" v-else></div>\
				</div>\
				<div class="artist-item-text"><div class="artist-name">{{ artist.artist }}</div>\
				<div class="artist-albums" v-if="artist.albumLength">{{ artist.albumLength }} album{{(artist.albumLength != 1) ? "s" : ""}}</div></div>\
			</div>',
	methods: {
		getArtist: function(context, stackPosition) {
			music.getContent("artist", context, stackPosition);
		},
		pictureDrop: function(event, context) {
			if (this.$parent.uploadPicture) {
				this.$parent.uploadPicture(event, context, "thumbnail");
			}
		}
	},
	data: function() {
		return {
			dragging: false
		}
	}
});

Vue.component('MenuItem', {
	props: ["label", "value", "valueLeft", "icon", "hideIcon", "iconRight", "chevron", "description", "thumbnail", "thumbnailPlaceholder"],
	template: '<div class="menu-item" v-on:click="click()" v-bind:class="{\'two-rows-new\': description, icon: icon, \'hide-icon\': hideIcon}" @mouseout="endHold()" @mouseup="endHold()" @mousemove="endHold()" @touchmove="endHold()" @touchend="endHold()" @mousedown="startHold($event)" @touchstart="startHold($event)"  @contextmenu="contextMenu($event)">\
					<div class="menu-thumbnail" v-if="thumbnail || thumbnailPlaceholder" v-bind:style="{backgroundImage: \'url(\'+thumbnail+\')\'}">\
						<div class="menu-thumbnail-placeholder" v-if="thumbnailPlaceholder && !thumbnail" v-bind:style="{maskImage: \'url(\'+thumbnailPlaceholder+\')\'}"></div>\
					</div>\
					<div class="menu-item-right">\
					<div class="first-row">\
						<div v-if="icon" class="menu-icon left" v-bind:style="{maskImage: \'url(\'+icon+\')\'}"></div>\
						<div v-if="valueLeft" v-bind:class="{\'with-icon\': icon}" class="menu-value left">{{ valueLeft }}</div>\
						<div class="menu-text-wrap">\
							<div class="menu-label">{{ label }}</div>\
							<div class="menu-value">{{ value }}</div>\
						</div>\
					</div>\
					<div class="menu-custom-markup" v-if="description">\
						<p>{{ description }}</p>\
					</div>\
					</div>\
				</div>',
	methods: {
		startHold: function(event) {
			if (event.targetTouches) {
				this.holdPosition = [event.targetTouches[0].pageX, event.targetTouches[0].pageY];
			} else {
				this.holdPosition = [event.pageX, event.pageY];
			}
			this.holding = true;
			var that = this;
			this.holdTimeout = setTimeout(function() {
				that.canClick = false;
				that.$emit("hold");
			}, 500);
		},
		endHold: function() {
			if (this.holding) {
				this.holding = false;
				clearTimeout(this.holdTimeout);
				this.holdTimeout = null;
				setTimeout(function() {
					this.canClick = true;
				}, 20);
			}
		},
		click: function() {
			if (this.canClick) this.$emit("click");
		},
		contextMenu: function(event) {
			if (this.$listeners.context) {
				this.endHold();
				event.preventDefault();
				this.$emit("context");
			}
		}
	},
	data: function() {
		return {
			canClick: true,
			holdTimeout: null,
			holding: false,
			holdPosition: [0,0]
		}
	}
});

Vue.component('MenuTabs', {
	props: ["tabs", "value"],
	template: '<div class="tabs-container">\
					<div class="tabs">\
						<div v-for="tab in tabs" v-bind:class="{selected: value == tab.name, disabled: tab.disabled}" v-on:click="$emit(\'input\', tab.name)" v-html="tab.title"></div>\
					</div>\
				</div>'
});

Vue.component('SegmentedControl', {
	props: ["buttons", "value"],
	template: '<div class="segmented-control">\
					<span><slot></slot></span>\
					<div v-for="button in buttons" v-bind:class="{selected: value == button.name, disabled: button.disabled}" v-on:click="$emit(\'input\', button.name)" v-html="button.title"></div>\
				</div>'
});

var musicVue = new Vue({
	el: "#music-app",
	data: {
		selectedTab: "artists",
		tabs: [
			{name: "home", title: "Home", disabled: true},
			{name: "artists", title: "Artists"},
			{name: "albums", title: "Albums"},
			{name: "songs", title: "Songs", disabled: true}
		],
		updating: false,
		currentTrackPath: null,
		artists: [],
		albums: [],
		albumSortOptions: [
			{name: "artistYear", title: "Artist & Year"},
			{name: "name", title: "Name"},
			{name: "year", title: "Year"}
		],
		albumSort: "artistYear",
		search: {
			string: "",
			currentSearch: "",
			previousSearches: [],
			tracks: [],
			showAllTracks: false,
			albums: [],
			artists: []
		},
		navStack: [
			{id: 0, type: "placeholder"}
			/*{
				id: 0,
				type: "album",
				name: "Ultraviolet",
				artist: "Poets of the Fall",
				artistImg: "extensions/music/poetsofthefall.jpg",
				img: "extensions/music/ultraviolet.jpg",
				year: 2018,
				text: "Ultraviolet is the eighth studio album from the Helsinki-based Poets of the Fall. Released in 2018, the album retains the band's signature style, whilst mixing in new electronic vibes. Lead singer Marko Saaresto also describes the album as a return to the roots of sorts: \"Back to the roots it is. With the band back to self producing the album, there is a sense of coming home, coming back to the way it was originally meant to be. Also we found this an opportune time to make something more real, if you will, of the Poets of the Fall Morpho sign. Like a new introduction, stating: ”this is the real thing”.\"",
				tracks: [
					{id: 0, name: "Dancing on Broken Glass", length: "3.54"},
					{id: 1, name: "My Dark Disquiet", length: "5.10"},
					{id: 2, name: "False Kings", length: "3.32"},
					{id: 3, name: "Fool's Paradise", length: "4:33"},
					{id: 4, name: "Standstill", length: "3.47"},
					{id: 5, name: "The Sweet Escape", length: "5.30"},
					{id: 6, name: "Moments Before the Storm", length: "4.27", artist: "Old Gods of Asgard"},
					{id: 7, name: "In a Perfect World", length: "4.46"},
					{id: 8, name: "Angel", length: "4.22"},
					{id: 9, name: "Choir of Cicadas", length: "5.04"}
				]
			}*/
		]
	},
	computed: {
		sortedAlbums: function() {
			if (this.albumSort == "name") {
				sortAlbums = [].concat(this.albums);
				return sortAlbums.sort(function(a, b) {
					a = a.name.toLowerCase();
					b = b.name.toLowerCase();
					if (a.startsWith("the ")) {
						a = a.substring(4);
					} else if (a.startsWith("a ")) {
						a = a.substring(2);
					}
					if (b.startsWith("the ")) {
						b = b.substring(4);
					} else if (b.startsWith("a ")) {
						b = b.substring(2);
					}
					if (a >= b) {
						return 1
					} else {
						return -1;
					}
				});
			} else if (this.albumSort == "year") {
				sortAlbums = [].concat(this.albums);
				return sortAlbums.sort(function(a, b) {
					if (a.date && b.date) {
						return parseInt(a.date) - parseInt(b.date);
					} else if (a.date) {
						return -1;
					} else if (b.date) {
						return 1;
					} else {
						return 0;
					}
				});
			} else {
				return this.albums;
			}
		}
	},
	methods: {
		getMusic: function(type, context, stackPosition) {
			music.getContent(type, context, stackPosition);
		},
		time: function(seconds) {
			return Intl.DateTimeFormat(window.navigator.language, {minute: "numeric", second: "numeric"}).format(new Date(seconds * 1000)).replace(/^0?/g, '');
		},
		releaseDate: function(theTime) {
			if (theTime.length > 4) {
				try {
					if (Date.parse(theTime) == Date.parse(theTime.substring(0, 4))) {
						return theTime.substring(0, 4);
					} else {
						return Intl.DateTimeFormat(window.navigator.language, {month: "long", year: "numeric"}).format(new Date(theTime));
					}
				} catch (error) {
					return theTime.substring(0, 4);
				}
			} else if (theTime) {
				return theTime;
			} else {
				return null;
			}
		},
		play: function(index, stackIndex) {
			music.play(index, stackIndex);
		},
		trackMenu: function(track, stackIndex, index) {
			music.musicMenu("track", track, stackIndex, index);
		},
		albumMenu: function(album, stackIndex, index) {
			music.musicMenu("album", album, stackIndex, index);
		},
		searchWithString: function(string) {
			music.search(string);
			musicVue.search.string = string;
		},
		uploadPicture: function(event, target, kind) {
			if (event.dataTransfer && event.dataTransfer.files) {
				if (target.provider) {
					context = {type: "artist", fileType: event.dataTransfer.files[0].type};
					if (kind) context.imageKind = kind;
					if (target.provider) context.provider = target.provider;
					if (target.artist) context.artist = target.artist;
					if (target.name) {
						context.album = target.name;
						context.type = "album";
					}
					beo.uploadFile(
						{types: ["image/jpeg", "image/png"], fileExtensions: [".png", ".jpg", ".jpeg"], customData: context},
						"music",
						event.dataTransfer.files[0]
					);
				}
			}
	    }
	}
});

if (localStorage.beocreateAlbumSort) {
	switch (localStorage.beocreateAlbumSort) {
		case "artistYear":
		case "name":
		case "year":
			musicVue.albumSort = localStorage.beocreateAlbumSort;
			break;
	}
}


var music = (function() {

stackPosition = -1;
dataRequested = false;

musicVue.$watch('selectedTab', function(tab) {
	getData = false;
	switch (tab) {
		case "artists":
		case "albums":
			if (musicVue[tab].length == 0) getData = true;
			break;
	}
	if (getData) beo.sendToProduct("music", "getMusic", {type: tab});
});

musicVue.$watch('albumSort', function(sort) {
	localStorage.beocreateAlbumSort = sort;
});

$(document).on("music", function(event, data) {
	if (data.header == "musicData" && data.content.data) {
		if (!data.content.context) {
			if (data.content.type == "albums") {
				musicVue.albums = data.content.data;
			}
			if (data.content.type == "artists") {
				musicVue.artists = data.content.data;
			}
		} else {
			if (dataRequested) {
				if (data.content.type == "search") {
					musicVue.search.tracks = (data.content.data.tracks) ? data.content.data.tracks : [];
					musicVue.search.artists = (data.content.data.artists) ? data.content.data.artists : [];
					musicVue.search.albums = (data.content.data.albums) ? data.content.data.albums : [];
					musicVue.search.previousSearches = data.content.previousSearches;
					musicVue.search.currentSearch = data.content.context.searchString;
				} else {
					//if (data.content.data.type == "artist") data.content.data.img = "extensions/music/poetsofthefall.jpg";
					if (!musicVue.navStack[stackPosition] || 
						!_.isEqual(musicVue.navStack[stackPosition].context, data.content.context)) {
						data.content.data.id = stackPosition+1;
						musicVue.navStack.splice(stackPosition+1, 2, data.content.data, {id: stackPosition+2, type: "placeholder"});
						try {
							document.querySelector("#music-navstack-item-"+(stackPosition+1)+" .scroll-area").scrollTop = 0; // Scroll up the possibly reused view.
						} catch (error) {
							// Nothing to scroll up.
						}
						beo.showDeepMenu("music-navstack-item-"+(stackPosition+1), "music");
					} else {
						//beo.showDeepMenu("music-navstack-item-"+stackPosition, "music");
						if (selectedExtension != "music") beo.showExtension("music");
					}
				}
				dataRequested = false;
			}
		}
	}
	
	if (data.header == "previousSearches") {
		if (data.content) musicVue.search.previousSearches = data.content;
	}
	
	if (data.header == "artistPictures" && data.content.artist) {
		// Update artist images when they arrive asynchronously.
		for (a in musicVue.artists) {
			if (musicVue.artists[a].artist == data.content.artist) {
				musicVue.$set(musicVue.artists[a], 'img', data.content.img);
				musicVue.$set(musicVue.artists[a], 'thumbnail', data.content.thumbnail);
			}
		}
		for (a in musicVue.search.artists) {
			if (musicVue.search.artists[a].artist == data.content.artist) {
				musicVue.$set(musicVue.search.artists[a], 'img', data.content.img);
				musicVue.$set(musicVue.search.artists[a], 'thumbnail', data.content.thumbnail);
			}
		}
		for (s in musicVue.navStack) {
			if (musicVue.navStack[s].type == "artist" && musicVue.navStack[s].artist == data.content.artist) {
				musicVue.$set(musicVue.navStack[s], 'img', data.content.img);
				musicVue.$set(musicVue.navStack[s], 'thumbnail', data.content.thumbnail);
			}
			if (musicVue.navStack[s].artists) {
				for (a in musicVue.navStack[s].artists) {
					if (musicVue.navStack[s].artists[a].artist == data.content.artist) {
						musicVue.$set(musicVue.navStack[s].artists[a], 'img', data.content.img);
						musicVue.$set(musicVue.navStack[s].artists[a], 'thumbnail', data.content.thumbnail);
					}
				}
			}
		}
	}
	
	if (data.header == "albumPictures" && data.content.context) {
		// Update album images when they arrive asynchronously.
		for (a in musicVue.albums) {
			if (musicVue.albums[a].name == data.content.context.album &&
				musicVue.albums[a].artist == data.content.context.artist) {
				musicVue.$set(musicVue.albums[a], 'img', data.content.pictures.img);
				musicVue.$set(musicVue.albums[a], 'thumbnail', data.content.pictures.thumbnail);
				musicVue.$set(musicVue.albums[a], 'tinyThumbnail', data.content.pictures.tinyThumbnail);
			}
		}
		for (a in musicVue.search.albums) {
			if (musicVue.search.albums[a].name == data.content.context.album &&
				musicVue.search.albums[a].artist == data.content.context.artist) {
				musicVue.$set(musicVue.search.albums[a], 'img', data.content.pictures.img);
				musicVue.$set(musicVue.search.albums[a], 'thumbnail', data.content.pictures.thumbnail);
				musicVue.$set(musicVue.search.albums[a], 'tinyThumbnail', data.content.pictures.tinyThumbnail);
			}
		}
		for (s in musicVue.navStack) {
			if (musicVue.navStack[s].type == "album" && 
				musicVue.navStack[s].artist == data.content.context.artist && 
				musicVue.navStack[s].name == data.content.context.album) {
				musicVue.$set(musicVue.navStack[s], 'img', data.content.pictures.img);
				musicVue.$set(musicVue.navStack[s], 'thumbnail', data.content.pictures.thumbnail);
				musicVue.$set(musicVue.navStack[s], 'tinyThumbnail', data.content.pictures.tinyThumbnail);
					
			}
			
			for (a in musicVue.navStack[s].albums) {
				if (musicVue.navStack[s].albums[a].name == data.content.context.album &&
					musicVue.navStack[s].albums[a].artist == data.content.context.artist) {
					musicVue.$set(musicVue.navStack[s].albums[a], 'img', data.content.pictures.img);
					musicVue.$set(musicVue.navStack[s].albums[a], 'thumbnail', data.content.pictures.thumbnail);
					musicVue.$set(musicVue.navStack[s].albums[a], 'tinyThumbnail', data.content.pictures.tinyThumbnail);
				}
			}
			
		}
	}
	
	if (data.header == "updatingLibrary") musicVue.updating = true;
	if (data.header == "libraryUpdated") musicVue.updating = false;
	
});

$(document).on("general", function(event, data) {
	if (data.header == "activatedExtension") {
		if (data.content.extension == "music") {
			if (data.content.deepMenu != null) {
				menu = data.content.deepMenu.split("-").pop();
				if (menu != "search") {
					stackPosition = parseInt(menu);
				}
			} else {
				stackPosition = -1;
				if (musicVue.artists.length == 0) {
					beo.sendToProduct("music", "getMusic", {type: "artists"});
				}
			}
		}
	}

});

$(document).on("sources", function(event, data) {
	if (data.header == "sources") {
		
		if (data.content.currentSource &&
			data.content.currentSource == "music") {
			musicVue.currentTrackPath = data.content.sources.music.metadata.uri;
		} else {
			musicVue.currentTrackPath = null;
		}
		
		if (data.content.sources.music &&
			data.content.sources.music.metadata &&
			data.content.sources.music.metadata.uri) {
			currentTrackPath = data.content.sources.music.metadata.uri;
		} else {
			currentTrackPath = null;
		}
	}

	
});

function getContent(type, context, stackPosition) {
	dataRequested = true;
	beo.sendToProduct("music", "getMusic", {type: type, context: context});
}

function play(index, stackIndex) {
	if (stackIndex != "search") {
		beo.sendToProduct("music", "playMusic", {index: index, type: musicVue.navStack[stackIndex].type, context: musicVue.navStack[stackIndex].context});
	} else {
		beo.sendToProduct("music", "playMusic", {index: index, type: "search", context: {searchString: musicVue.search.currentSearch, provider: musicVue.search.tracks[index].provider}});
	}
}

function playContext(type, context) {
	beo.sendToProduct("music", "playMusic", {type: type, context: context});
}

function search(string) {
	if (!string) {
		beo.showDeepMenu("music-search");
		beo.sendToProduct("music", "previousSearches");
		setTimeout(function() {
			document.querySelector(".music-search-field").focus();
		}, 100);
	} else {
		document.querySelector(".music-search-field").blur();
		dataRequested = true;
		musicVue.search.showAllTracks = false;
		if (string == true) string = musicVue.search.string;
		beo.sendToProduct("music", "getMusic", {type: "search", context: {searchString: string}});
	}
}

var currentTrackPath = null;
function reveal(path = currentTrackPath) { 
	console.log(path);
	dataRequested = true;
	beo.sendToProduct("music", "revealMusic", {type: "album", context: {uri: path}});
	
	return true;
}

function musicMenu(type, context, stackIndex, index) {
	if (type == "track") {
		beo.ask("music-track-menu", [context.name, context.artist], [
			function() {
				beo.sendToProduct("music", "addToQueue", {position: "next", type: "track", context: context});
			},
			function() {
				beo.sendToProduct("music", "addToQueue", {position: "last", type: "track", context: context});
			},
			function() {
				play(index, stackIndex);
			},
		]);
	}
	if (type == "album") {
		beo.ask("music-album-menu", [context.name, context.artist], [
			function() {
				beo.sendToProduct("music", "addToQueue", {position: "next", type: "album", context: context});
			},
			function() {
				beo.sendToProduct("music", "addToQueue", {position: "last", type: "album", context: context});
			},
			function() {
				console.log(context);
				playContext("album", context);
			},
		]);
	}
}

return {
	getContent: getContent,
	play: play,
	search: search,
	reveal: reveal,
	musicMenu: musicMenu
};

})();