window.nyaaleech = {
	name: function() {
		var nameEl = document.body.querySelector('.g_section.info .pane.info tbody tr:first-child .value'),
			name;
		if (nameEl) {
			name = nameEl.firstChild.nodeValue;
			/* Some names contain a link. In this case the first child is the name plus a new line and a (, like here:
				Uchuu Kyoudai
				(<a class="shortlink" href="http://anidb.net/a8865">a8865</a>)
			 * We remove everything including and after the new line as it's not relevant for us.
			 */
			name = name.replace(/\n.*/g, '')
			return name;
		}
	},
	
	groups: function() {
		var groupElements = document.body.querySelectorAll('.g_section.groups .grouplist td.name.group a'),
			groups = [],
			group,
			i;
			
		if (groupElements) {
			for (i = 0; i < groupElements.length; i++) {
				group = groupElements[i].firstChild.nodeValue;
				if (group !== 'no group') {
					groups.push(group);
				}
			}
		}
		
		return groups;
	}
};

chrome.extension.onMessage.addListener(function(req, sender, rsp) {
	var anime = {
		name: nyaaleech.name(),
		groups: nyaaleech.groups()
	};
	
	rsp(anime);
});