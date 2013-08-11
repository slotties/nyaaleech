"use strict";

var nyaaModule = angular.module('nyaaleech', [ 'dragdrop' ]);
nyaaModule.factory('nyaaService', function($http) {
	return {
		queryTorrents: function(anime, fn) {
			var url = 'http://www.nyaa.eu/?page=rss&cats=1_37&term=' + (anime.name + ' ' + (anime.group || anime.customGroup));
			
			$http({
				method: 'GET',
				url: url,
				transformResponse: function(str) {
					var parser = new DOMParser();
					
					return parser.parseFromString(str, 'text/xml');
				}
			})
			.success(function(torrentFeedXmlRoot) {
				var xmlItems = torrentFeedXmlRoot.getElementsByTagName('item');
				// FIXME: use promise instead of callback-fn
				fn(xmlItems);
			})
			.error(function(data) {
				// FIXME
				console.log(data);
			});		
		},
		
		loadAnimes: function() {
			var storedData = localStorage.getItem('animes');		
			if (storedData) {
				try {
					var animes = JSON.parse(storedData);
					/*
						Each anime receives two lists:
						- one for torrents that are recognized as being 'new' (have an episode number above the currently saved one)
						- one for torrents that did not get into the 'new' list
						Both lists are initialized with an empty array because they're loaded via ng-init.
					*/
					for (var i = 0; i < animes.length; i++) {
						animes[i].nextLinks = [];
						animes[i].latestLinks = [];
					}
					
					return animes;
				} catch (e) {
					// ignored
				}
			}
			
			return [];
		},
		
		storeAnimes: function(animes) {
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
		},
		
		requestAnimeFromCurrentPage: function(fn) {
			chrome.tabs.getSelected(null, function(tab) {
				chrome.tabs.sendMessage(tab.id, {greeting: "hello"}, function(anime) {
					if (anime) {
						fn(anime);
					}
				});
			});
		},
		
		getAnimeByName: function(animes, name) {
			for (var i = 0; i < animes.length; i++) {
				if (animes[i].name === name) {
					return animes[i];
				}
			}
		}
	}
});

var NyaaCtrl = function($scope, nyaaService) {
	$scope.animes = nyaaService.loadAnimes();
	
	// This model is bound to the create/edit anime form.
	$scope.animeFormObj = {
		name: '',
		episode: 0,
		customGroup: ''
	};
	
	$scope.showAnimeForm = function(data) {
		var formObj = $scope.animeFormObj;
		
		formObj.name = data.name;
		formObj.episode = data.episode;
		formObj.customGroup = data.customGroup;
		
		document.getElementById('animeForm').style.display = '';	
	};
	$scope.createAnime = function() {
		$scope.showAnimeForm({
			name: '',
			episode: 0,
			customGroup: ''
		});	
	};
	
	nyaaService.requestAnimeFromCurrentPage(function(anime) {
		$scope.showAnimeForm(anime);
	});
};

var AnimeManager = function($scope, nyaaService) {
	/*
		Opens a new tab to view a specific anime in anidb.net.
	*/
	$scope.openAnidb = function(name) {
		var url = 'http://anidb.net/perl-bin/animedb.pl?show=animelist&adb.search=' + escape(name) + '&do.search=search';
		
		chrome.tabs.update(null, { url: url });		
	};
	
	/*
		Removes an anime (identified by its index).
	*/
	$scope.remove = function(idx) {
		if (confirm('Really?')) {
			$scope.animes.splice(idx, 1);
			nyaaService.storeAnimes($scope.animes);
		}
	};
	
	/*
		Increases the episode counter by one.
	*/
	$scope.plusOne = function(anime) {
		anime.episode += 1;
		
		nyaaService.storeAnimes($scope.animes);
		window.location.reload();
	};
	
	/*
		Pulls the torrents for a specific anime from nyaa.eu and appends the links 
		to anime.nextLinks and anime.latestLinks.
	*/
	$scope.initAnime = function(anime) {	
		nyaaService.queryTorrents(anime, function(links) {
			var nextList = anime.nextLinks,
				latestList = anime.latestLinks,
				maxLatest = 15,
				maxNext = 3,
				scanEpisode = function(title) {
					(/\-[ _]([0-9]*).*/g).exec(title);
	
					if (RegExp.$1) {
						return parseInt(RegExp.$1, 10);
					} else {
						return 0;
					}
				};
				
			for (var i = 0; i < links.length && nextList.length < maxNext && latestList.length < maxLatest; i++) {
				var link = {
					title: links[i].querySelector('title').firstChild.nodeValue,
					url: links[i].querySelector('link').firstChild.nodeValue
				};
				
				if (nextList.length < maxNext && scanEpisode(link.title) > anime.episode) {
					nextList.push(link);
				} else {
					latestList.push(link);
				}
			}			
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
	
	$scope.onAnimeDrop = function(draggedItem, droppedItem) {
		var animes = $scope.animes,
			dragIdx, dropIdx;
		
		draggedItem = nyaaService.getAnimeByName($scope.animes, draggedItem.name);
		
		if (draggedItem && droppedItem && draggedItem !== droppedItem) {
			dragIdx = animes.indexOf(draggedItem);
			animes.splice(dragIdx, 1);
			
			dropIdx =  animes.indexOf(droppedItem);
			animes.splice(dropIdx, 0, draggedItem);
			
			nyaaService.storeAnimes(animes);
			window.location.reload();
		}
	};
};

var EditAnime = function($scope, nyaaService) {		
	$scope.saveAnime = function() {
		var formObj = $scope.animeFormObj,
			anime = nyaaService.getAnimeByName($scope.animes, formObj.name);
		
		if (!anime) {
			anime = {
				name: formObj.name
			};
			$scope.animes.push(anime);
		}
		
		anime.episode = parseInt(formObj.episode, 10);
		anime.customGroup = formObj.customGroup || '';
		
		nyaaService.storeAnimes($scope.animes);
		window.location.reload();
	};
};

