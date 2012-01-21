/* ****************************************************************************
		UI
**************************************************************************** */
window.UI = {};
// TODO: bindAttribute to bind attributes, bindText to bind text, bindHtml to bind innerhtml
UI.bindField = function(el, data) {
	var k = el.getAttribute('bindField'),
		v = data[k];
	
	// substitute render-functions
	// TODO: test
	/*if (typeof(v) === 'function')
		v = v(k, el, data);*/
	
	el.innerText = v;
};

UI.bindFields = function(protEl, data) {
	if (protEl.hasAttribute('bindScope')) {
		var binds = protEl.querySelectorAll('[bindScope=' + protEl.getAttribute('bindScope') + ']');
	} else {
		var binds = protEl.querySelectorAll('[bindField]');
	}
	
	if (protEl.hasAttribute('bindField'))
		UI.bindField(protEl, data);
		
	for (var i = 0; i < binds.length; i++) {
		UI.bindField(binds[i], data);
	}
};

UI.list = function(data, rootEl, itemPrototypeSelector, conf) {
	var p = rootEl.querySelector(itemPrototypeSelector),
		bindScope = p.getAttribute('bindScope');
		
	for (var i = 0; i < data.length; i++) {
		var c = p.cloneNode(true);
		
		UI.bindFields(c, data[i]);
		
		p.parentNode.appendChild(c);
		
		UTIL.signal(conf.render, [ data[i], c ]);
	}
	
	p.parentNode.removeChild(p);
};

UI.dupe = function(el) {
	var d = el.cloneNode(true);
	// TODO: remove all id's
	if (el.parentNode.lastChild === el)
		el.parentNode.appendChild(d);
	else
		el.parentNode.insertBefore(d, el.nextSibling);
		
	return d;
};

UI.formValues = function(form) {
	var values = {},
		e = form.elements;
		
	if (e.length > 0) {
		for (var i = e.length; i--; ) {
			var n = e[i].getAttribute('name'),
				v = e[i].value;
				
			if (typeof(n) === 'string') {
				if (typeof(values[n]) !== 'undefined') {
					if (typeof(values[n].push) === 'function')
						values[n].push(v);
					else
						values[n] = [ values[n], v ];
				} else {
					values[n] = v;
				}
			}
		}
	}
	
	return values;
};

UI.showCard = function(el) {
	var cards = el.parentNode.querySelectorAll('[cardScope="' + el.getAttribute('cardScope') + '"]');
	for (var i = 0; i < cards.length; i++) {
		if (cards[i] === el)
			cards[i].className = cards[i].className.replace(/collapsed/g, '');
		else 
			cards[i].className += ' collapsed';
	}
};

/* ****************************************************************************
		UTIL
**************************************************************************** */
window.UTIL = {};
UTIL.signal = function(listeners, args) {
	if (!listeners)
		return;

	if (typeof(listeners) === 'function')
		listeners.apply(window, args);
	else
		for (var i = 0; i < listeners.length; i++)
			listeners[i].apply(window, args);
};

/* ****************************************************************************
		JS API Extensions
**************************************************************************** */
Array.prototype.indexOfByFn = function(fn) {
	if (this.length > 0)
		for (var i = this.length; i--;) 
			if (fn(this[i]) === true)
				return i;
				
	return -1;
};