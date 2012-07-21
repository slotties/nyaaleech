/* ****************************************************************************
		UI
**************************************************************************** */
window.UI = {};
UI.bindElement = function(el, data) {
	// nodeValue binding
	var str = el.innerText,
		idx = str.indexOf('{bind:');
	while (idx >= 0) {
		var end = el.innerText.indexOf('}', idx + 6);
		if (end > 0) {
			var field = str.substring(idx + 6, end);
			str = str.substring(0, idx) + data[field] + str.substring(end + 1);
			idx += data[field].length;
		} else {
			idx = str.length;
		}
		
		idx = el.innerText.indexOf('{bind:', idx);
	}
	el.innerText = str;
	
	// attribute-specific bindings
	for (var i = 0; i < el.attributes.length; i++) {
		var attr = el.attributes[i];
		if (attr.nodeName.indexOf('bind:') === 0) {
			el.removeAttribute(attr.nodeName);
			
			var v = attr.nodeValue,
				k = attr.nodeName.substring(5, attr.nodeName.length);
			el.setAttribute(k, data[v]);
		}
	}
};

UI.bindFields = function(protEl, data) {
	if (protEl.hasAttribute('bindScope')) {
		var binds = protEl.querySelectorAll('[bindScope=' + protEl.getAttribute('bindScope') + ']');
	} else {
		var binds = protEl.querySelectorAll('[bound]');
	}
	
	if (protEl.hasAttribute('bound'))
		UI.bindElement(protEl, data);
		
	for (var i = 0; i < binds.length; i++) {
		UI.bindElement(binds[i], data);
	}
};

UI.list = function(data, rootEl, itemPrototypeSelector, conf) {
	var p = rootEl.querySelector(itemPrototypeSelector),
		bindScope = p.getAttribute('bindScope');
		
	for (var i = 0; i < data.length; i++) {
		var c = p.cloneNode(true);
		
		UI.bindFields(c, data[i]);
		
		p.parentNode.appendChild(c);
		
		UTIL.signal(conf.render, [ data[i], c, i, data ]);
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
			
			if (typeof(n) === 'string' && v !== '') {
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

UI.toggleCls = function(el, cls) {
	var idx = el.className.indexOf(cls);
	if (idx < 0) {
		el.className += ' ' + cls;
	} else {
		el.className = el.className.substring(0, idx) + el.className.substring(idx + cls.length);
	}
};

UI.removeCls = function(el, cls) {
	var idx = el.className.indexOf(cls);
	if (idx >= 0)
		el.className = el.className.substring(0, idx) + el.className.substring(idx + cls.length);
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