"use strict";

var TorrentCtrl = function($scope, $http) {
	var animes = loadAnimes();
	
	for (var i = 0; i < animes.length; i++) {
		animes[i].nextLinks = [];
		animes[i].latestLinks = [];
	}
	
	$scope.animes = animes;
	
	$scope.animeFormObj = {
		name: '',
		episode: 2,
		groups: [],
		customGroup: ''
	};
	
	/*
		Actions
	*/	
	$scope.openAnidb = function(name) {
		var url = 'http://anidb.net/perl-bin/animedb.pl?show=animelist&adb.search=' + escape(name) + '&do.search=search';
		
		chrome.tabs.update(null, { url: url });		
	};
	
	$scope.move = function(idx, offset) {
		var animes = $scope.animes;
		if ((idx + offset) >= 0 && ((idx + offset) < animes.length)) {
			var curr = animes[idx];
				
			animes.splice(idx, 1);
			animes.splice(idx + offset, 0, curr);
			
			storeAnimes($scope.animes);
		}
	};
	
	$scope.remove = function(idx) {
		if (confirm('Really?')) {
			$scope.animes.splice(idx, 1);
			storeAnimes($scope.animes);
		}
	};
	
	$scope.plusOne = function(anime) {
		anime.episode += 1;
		
		storeAnimes($scope.animes);
		window.location.reload();
	};
	
	$scope.pullTorrentList = function(anime) {
		var url = 'http://www.nyaa.eu/?page=rss&cats=1_37&term=' + (anime.name + ' ' + (anime.group || anime.customGroup)),
			el = this;
		
		$http({
				method: 'GET',
				url: url,
				transformResponse: function(str) {
					var parser = new DOMParser();
					
					return parser.parseFromString(str, 'text/xml');
				}
			})
			.success(function(torrentFeedXmlRoot) {
				var xmlItems = torrentFeedXmlRoot.getElementsByTagName('item'),
					latestEl = document.querySelector('.latest .links', el),
					nextEl = document.querySelector('.next .links', el);
				
				insertLinks(xmlItems, anime, nextEl, latestEl);
			})
			.error(function(data) {
				// FIXME
				console.log(data);
			});
	};
	
	$scope.toggleLatest = function(event) {
		var listEl = event.srcElement.parentNode.querySelector('.links');
		
		if (listEl.style.display === 'none') {
			listEl.style.display = '';
		} else {
			listEl.style.display = 'none';
		}
	};
	
	$scope.openTorrent = function(url) {
		chrome.tabs.update(null, { url: url });
	};
	
	$scope.showAnimeForm = function(data) {
		var formObj = $scope.animeFormObj;
		
		formObj.name = data.name;
		formObj.episode = data.episode;
		formObj.customGroup = data.customGroup || data.group;
		
		document.getElementById('animeForm').style.display = '';
	};
	$scope.editAnime = function(anime) {
		showAnimeForm(anime);
	};
	$scope.createAnime = function() {
		showAnimeForm({
			name: '',
			episode: 0,
			customGroup: ''
		});
	};
	
	$scope.saveAnime = function() {
		var formObj = $scope.animeFormObj,
			anime = getAnimeByName(animes, formObj.name);
			
		if (!anime) {
			anime = {
				name: formObj.name
			};
			animes.push(anime);
		}
		
		anime.episode = parseInt(formObj.episode, 10);
		anime.customGroup = formObj.customGroup;
		
		storeAnimes($scope.animes);
		window.location.reload();
	};
	
	// FIXME
	requestAnidb($scope);
};
	
function getAnimeByName(animes, name) {
	for (var i = 0; i < animes.length; i++) {
		if (animes[i].name === name) {
			return animes[i];
		}
	}
};

function requestAnidb(scope) {
	chrome.tabs.getSelected(null, function(tab) {
		chrome.tabs.sendMessage(tab.id, {greeting: "hello"}, function(anime) {
			if (anime) {
				if (!getAnimeByName(scope.animes, anime.name)) {
					scope.showAnimeForm({
						name: anime.name,
						// FIXME: re-support this feature groups: anime.groups,
						customGroup: '',
						episode: 0
					});
				}
			}			
		});
	});
};

/*
 * Storage and local data management
 */
function storeAnimes(animes) {
	// TODO: use angular.copy?
	var storedAnimes = [];
	for (var i = 0; i < animes.length; i++) {
		storedAnimes.push({
			name: animes[i].name,
			episode: animes[i].episode,
			customGroup: animes[i].customGroup
		});
	}
	
	localStorage.setItem('animes', JSON.stringify(storedAnimes));
};
function loadAnimes() {
	var storedData = localStorage.getItem('animes');		
	if (storedData) {
		try {
			return JSON.parse(storedData);
		} catch (e) {
			// ignored
		}
	}
	
	return [];
};

/*
 * Connector to nyaa.eu
 */
function getEpisode(title) {
	(/\-[ _]([0-9]*).*/g).exec(title);
	
	if (RegExp.$1) {
		return parseInt(RegExp.$1, 10);
	} else {
		return 0;
	}
};

function insertLinks(xmlItems, anime, nextEl, latestEl) {
	var latestLeft = 15,
		nextLeft = 3;
		
	for (var i = 0; i < xmlItems.length && (latestLeft > 0 || nextLeft > 0); i++) {
		var title = xmlItems[i].querySelector('title').firstChild.nodeValue,
			url =  xmlItems[i].querySelector('link').firstChild.nodeValue,
			targetList;
			
		if (nextLeft > 0 && getEpisode(title) > anime.episode) {
			targetList = anime.nextLinks;
			nextLeft--;
		} else {
			targetList = anime.latestLinks;
			latestLeft--;
		}
		
		targetList.push({
			title: title,
			url: url
		});
	}
};