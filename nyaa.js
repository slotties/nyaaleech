function createPrefMatcher(e) {
	var epIdx = e.indexOf('??'),
		plainTitle = e.substring(0, epIdx < 0 ? e.length : epIdx);
	
	return function(title) {
		if (title.indexOf(plainTitle) !== 0) {
			return null;
		}
		
		return parseInt(title.substring(plainTitle.length, title.length), 10);
	};
};

function convertPrefMatchers(anime) {
	anime.prefsFn = [];

	if (anime.prefs && anime.prefs.length > 0) {	
		for (var i = anime.prefs.length; i--; ) {
			anime.prefsFn.push(createPrefMatcher(anime.prefs[i]));
		}
	}
};

function parseAnime(item, exp) {
	var title = item.querySelector('title').firstChild.nodeValue,
		next = { title: title },
		m = null;
	
	if (exp.prefsFn.length > 0)
		for (var i = exp.prefsFn.length; i-- && !next.ep; )
			next.ep = exp.prefsFn[i](title);
		
	return next;
};

function openLink(el) {
	var url = el.getAttribute('href');
	if (url)
		chrome.tabs.update(null, { url: url });
};

function collectEpisodes(anime, items, nextEpisodes, latest) {
	var maxLatest = 15,
		maxNext = 3;

	for (var i = 0; i < items.length && latest.length < maxLatest; i++) {
		var next = parseAnime(items[i], anime),
			obj = {
				name: next.title,
				url: items[i].querySelector('link').firstChild.nodeValue				
			};
		
		if (next.ep > anime.episode && nextEpisodes.length < maxNext) {
			nextEpisodes.push(obj);
		}
		
		latest.push(obj);
	}
};

function applyHref(d, el) {
	// in the next-list the list is created based on the links, the lastest-list is
	// built using LI-nodes which contain links.
	if (el.nodeName !== 'A')
		el = el.querySelector('a');
		
	el.setAttribute('href', d.url);
};

function afterAnimeRendered(anime, el) {
	convertPrefMatchers(anime);

	el.setAttribute('animeName', anime.name);
	
	var anidbUrl = 'http://anidb.net/perl-bin/animedb.pl?show=animelist&adb.search=' + escape(anime.name) + '&do.search=search';
	el.querySelector('.anidb').setAttribute('href', anidbUrl);
	
	el.className += ' loading';

	var req = new XMLHttpRequest();
	req.open('GET', 'http://www.nyaa.eu/?page=rss&cats=1_37&term=' + anime.name, true);
	req.onload = function() {		
		var next = [], latest = [];
			
		collectEpisodes(anime, req.responseXML.getElementsByTagName('item'), next, latest);
		
		UI.list(next, el, '.next .torrent', { render: applyHref });
		UI.list(latest, el, '.latest .torrent', { render: applyHref });
		
		UI.removeCls(el, 'loading');
	};
	req.send(null);
};

function addFilter(orig) {
	var d = UI.dupe(orig);
	d.querySelector('input').value = '';	
	d.className += ' dupe';
	
	return d;
};

function getAnimeIdx(animeEl) {
	var n = (typeof(animeEl) === 'string' ? animeEl : animeEl.getAttribute('animeName'));
	
	return window.animes.indexOfByFn(function(a) {
		return a.name === n;
	});
};

function removeAnime(animeEl) {
	if (!confirm('u sure?'))
		return;

	var idx = getAnimeIdx(animeEl);	
	window.animes.splice(idx, 1);
	
	storeAnimes();
	
	animeEl.parentNode.removeChild(animeEl);
};

function increaseEpisode(animeEl) {
	var idx = getAnimeIdx(animeEl);	
	animes[idx].episode += 1;
	
	storeAnimes();
	
	window.location.reload();
};

function showAnimeForm(data) {
	var el = document.getElementById('animeForm');
	// just collapse form when it's currently shown
	if (el.className.indexOf('collapsed') < 0) {
		el.className += ' collapsed';
		return;
	}
	
	if (!data)
		data = {
			name: '',
			episode: '',
			prefs: ''
		};
	
	el.querySelector('[name="name"]').value = data.name;
	el.querySelector('[name="episode"]').value = data.episode;
	
	var addFilterBtn = el.querySelector('.addFilter');
	
	// TODO: optimize by re-using duped filters
	var dupedFilters = el.querySelectorAll('.dupe');
	for (var i = 0; i < dupedFilters.length; i++)
		dupedFilters[i].parentNode.removeChild(dupedFilters[i]);
	
	var filterField = el.querySelector('[name="prefs"]');
	if (data.prefs) {
		for (var i = 0; i < data.prefs.length; i++) {
			filterField.value = data.prefs[i];
				
			filterField = addFilter(filterField.parentNode).querySelector('[name="prefs"]');
		}
	} else {
		filterField.value = '';
	}
	
	UI.showCard(el);
};

function editAnime(animeEl) {
	var form = document.getElementById('animeForm'),
		idx = getAnimeIdx(animeEl);
		
	showAnimeForm(window.animes[idx]);
};

function saveAnime(form) {
	var v = UI.formValues(form.querySelector('form'));

	// TODO: validate v

	// some data changes/adjustments
	v.episode = parseInt(v.episode, 10);

	if (typeof(v.prefs) === 'string')
		v.prefs = [ v.prefs ];
	
	var idx = getAnimeIdx(v.name);
	
	if (idx < 0)
		animes.push(v);
	else
		animes[idx] = v;

	storeAnimes();
	
	return false;
};

function upAnime(animeEl) {
	moveAnime(animeEl, -1);
};

function downAnime(animeEl) {
	moveAnime(animeEl, 1);
};

function moveAnime(animeEl, offset) {
	var idx = getAnimeIdx(animeEl);
	
	if ((idx + offset) >= 0 && ((idx + offset) < window.animes.length)) {
		var curr = window.animes[idx];
			
		window.animes.splice(idx, 1);
		window.animes.splice(idx + offset, 0, curr);
	
		storeAnimes();	
		window.location.reload();
	}
};

function exportJson() {
	var str = localStorage.getItem('animes'),
		impexp = document.getElementById('impexp');
	
	impexp.querySelector('textarea').value = str;
	
	UI.showCard(impexp);
};

function importJson() {
	if (confirm('u sure?')) {
		var impexp = document.getElementById('impexp'),
			str = impexp.querySelector('textarea').value;
			
		// TODO: check str!
		localStorage.setItem('animes', str);

		window.location.reload();
	}
};

function storeAnimes() {
	localStorage.setItem('animes', JSON.stringify(window.animes));
};

window.onload = function() {
	var root = document.getElementById('animes');
	
	// parse local stored animes and keep them as global var	
	var a = localStorage.getItem('animes');
	if (a) {
		try {
			window.animes = JSON.parse(a);
		} catch (e) {
			window.animes = [];
		}
	} else {
		window.animes = [];
	}
		
	UI.list(window.animes, root, '.anime', { render: afterAnimeRendered });
};