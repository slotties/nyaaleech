jQuery(document).ready(function() {
	var animes = loadAnimes(),
		rootEl = jQuery('#animes');
		
	window.animes = animes;
		
	jQuery.each(animes, function(idx, item) {
		var html = renderTemplate('animeTpl', item),
			el;
				
		el = jQuery(html).appendTo(rootEl);
		
		pullLinks(item, el);
	});
	
	jQuery('.anidb').click(openAnidb);
	jQuery('.plusOne').click(plusOne);
	jQuery('.edit').click(edit);
	jQuery('.remove').click(remove);
	jQuery('.up').click(moveUp);
	jQuery('.down').click(moveDown);
	
	jQuery('.add').click(create);
	jQuery('.save').click(save);
});

/*
 * Actions
 */
function openTorrent() {
	chrome.tabs.update(null, { url: this.dataset.url });
};
function openAnidb() {
	var name = resolveAnimeName(this),
		url = 'http://anidb.net/perl-bin/animedb.pl?show=animelist&adb.search=' + escape(name) + '&do.search=search';
		
	chrome.tabs.update(null, { url: url });
};

function plusOne() {
	var anime = getAnime(this);
		
	anime.episode += 1;	
	
	storeAnimes();
	window.location.reload();
};

function edit() {
	var anime = getAnime(this);		
	showAnimeForm(anime);
};

function create() {
	var anime = { name: '', episode: 0, prefs: [ '' ] };
	showAnimeForm(anime);
};

function showAnimeForm(anime) {
	var form = jQuery('#animeForm');
	
	jQuery('input[name="name"]', form).val(anime.name);
	jQuery('input[name="episode"]', form).val(anime.episode);
	jQuery('input[name="prefs"]', form).val(anime.prefs[0]);
	
	form.fadeIn();
};

function save() {
	var form = jQuery('#animeForm'),
		name = jQuery('input[name="name"]', form).val(),
		episode = jQuery('input[name="episode"]', form).val(),
		prefs = jQuery('input[name="prefs"]', form).val(),
		anime,
		animes = window.animes;
			
	anime = getAnime(name);
	if (!anime) {
		anime = animes.push({
			name: name
		});
	}
	
	anime.episode = parseInt(episode, 10);
	anime.prefs = [ prefs ];
	
	storeAnimes();
	window.location.reload();
	
	return false;
};

function remove() {
	if (!confirm('Really?'))
		return;

	var animeName = resolveAnimeName(this),
		idx = indexOfAnime(animeName);
		
	window.animes.splice(idx, 1);	
	storeAnimes();
	
	jQuery(this).parents('.anime').remove();
};

function moveUp() {
	var anime = resolveAnimeName(this);	
	moveAnime(anime, -1);
};

function moveDown() {
	var anime = resolveAnimeName(this);	
	moveAnime(anime, 1);
};

function toggleLatest() {
	jQuery(this).next('ul').fadeToggle();
};

/*
 * Rendering
 */
function renderTemplate(tplId, data) {
	var tplMarkup = document.getElementById(tplId),
		rendered;
		
	rendered = tplMarkup.innerHTML.replace(/\$\{([a-zA-Z]*)\}/g, function(match, field) {
		return data[field];
	});
		
	return rendered;
};

/*
 * Storage and local data management
 */
function storeAnimes() {
	localStorage.setItem('animes', JSON.stringify(window.animes));
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

function resolveAnimeName(el) {
	return jQuery(el).parents('.anime')[0].dataset.name;
};

function getAnime(name) {
	if (typeof(name) !== 'string') {
		// Must be a DOM node then
		name = resolveAnimeName(name);
	}

	return jQuery.grep(window.animes, function(item) {
		return name === item.name;
	})[0];
};

function indexOfAnime(name) {
	for (var i = 0; i < window.animes.length; i++) {
		if (name === window.animes[i].name) {
			return i;
		}
	}
	
	return -1;
};

function moveAnime(animeName, offset) {
	var idx = indexOfAnime(animeName);
	
	if ((idx + offset) >= 0 && ((idx + offset) < window.animes.length)) {
		var curr = window.animes[idx];
			
		window.animes.splice(idx, 1);
		window.animes.splice(idx + offset, 0, curr);
	
		storeAnimes();	
		window.location.reload();
	}
};

/*
 * Connector to nyaa.eu
 */
function parseAnime(item, exp) {
	var title = item.querySelector('title').firstChild.nodeValue,
		next = { title: title },
		m = null;
	
	if (exp.prefsFn.length > 0)
		for (var i = exp.prefsFn.length; i-- && !next.ep; )
			next.ep = exp.prefsFn[i](title);
		
	return next;
};
function createGetEpisodeFn(anime) {
	if (!anime.prefs || anime.prefs.length === 0) {
		return function() {
			return -0;
		};
	}

	var filterStr = anime.prefs[0],
		epIdx = filterStr.indexOf('??'),
		plainTitle = filterStr.substring(0, epIdx < 0 ? filterStr.length : epIdx);
	
	return function(title) {
		if (title.indexOf(plainTitle) !== 0) {
			return null;
		}
		
		return parseInt(title.substring(plainTitle.length, title.length), 10);
	};
};
function insertLinks(xmlItems, anime, nextEl, latestEl) {
	var latestLeft = 15,
		nextLeft = 3,
		getEpisode = createGetEpisodeFn(anime);
		
	for (var i = 0; i < xmlItems.length && (latestLeft > 0 || nextLeft > 0); i++) {
		var title = xmlItems[i].querySelector('title').firstChild.nodeValue,
			url =  xmlItems[i].querySelector('link').firstChild.nodeValue,
			targetEl;
			
		if (nextLeft > 0 && getEpisode(title) > anime.episode) {
			targetEl = nextEl;
			nextLeft--;
		} else {
			targetEl = latestEl;
			latestLeft--;
		}
		
		targetEl.append('<li><a class="torrent" href="#" data-url="' + url + '">' + title + '</a></li>');
	}
};

function pullLinks(anime, el) {
	var url = 'http://www.nyaa.eu/?page=rss&cats=1_37&term=' + anime.name

	jQuery.get(url, null, function(rsp) {
		var xmlItems = rsp.getElementsByTagName('item'),
			latestEl = jQuery('.latest .links', el),
			nextEl = jQuery('.next .links', el);
		
		insertLinks(xmlItems, anime, nextEl, latestEl);
		jQuery('.torrent', el).click(openTorrent);
		jQuery('.latest button', el).click(toggleLatest);
	});
};