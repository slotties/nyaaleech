angular.module('dragdrop', []);
angular.module('dragdrop')
	/*
		Binds an HTML element as item that can be dragged or dropped onto.
		You must define the item that is set into the DataTransfer as attribute value.
		The item is searched in the current scope.
	*/
	.directive('ngDdItem', function() {
		return {
			restrict: 'A',
			link: function(scope, el, attrs) {
				var itemName = attrs.ngDdItem,
					item = scope[itemName];
				
				if (item) {
					scope.dragItem = item;
					angular.element(el).addClass('ng-ddItem');
				}
			}
		};
	})
	/*
		Makes an HTML element draggable. The item marked using ngDragItem is propagated as dragged data.
	*/
	.directive('ngDragHandle', function() {
		return {
			restrict: 'A',
			link: function(scope, el, attrs) {
				el.attr('draggable', 'true');
				el.bind('dragstart', function(evnt) {
					var item = scope.dragItem;
					evnt.dataTransfer.setData('dragItem', JSON.stringify(item));
				});
			}
		};
	})
	/*
		Marks an HTML element as drop zone.
		You may specify a drop handler function using ng-drop-handler="functionNameInCurrentScope".
		The drop handler will receive the dragged data and the element it was droppeditem that it was dropped to.
	*/
	.directive('ngDropzone', function() {
		var resolveItemElement = function(el, rootEl) {
				var itemEl = null;
				while (el && !itemEl && el !== rootEl) {
					if (el.className.indexOf('ng-ddItem') >= 0) {
						itemEl = el;
					}
					
					el = el.parentNode;
				}
				
				return itemEl;
			};
			
		return {
			restrict: 'A',
			link: function(scope, el, attrs) {
				var dropHandler = scope[attrs.ngDropHandler],
					dropZoneRootEl = angular.element(el)[0],
					dropState = {
						dragOverElement: null
					};
			
				el.bind('drop', function(evnt) {
					var droppedData = evnt.dataTransfer.getData('dragItem'),
						dropEl,
						dropItem,
						dragItem;
					
					if (!droppedData) {
						return;
					}
									
					dropEl = angular.element(dropState.dragOverElement);
					dropEl.removeClass('ng-dropBefore');					
					dropItem = dropEl.scope().dragItem;
					delete dropState.dragOverElement;
					
					dragItem = JSON.parse(droppedData);
					
					dropHandler.call(scope, dragItem, dropItem);
				});
				el.bind('dragover', function(evnt) {
					var overEl = evnt.target;
					
					// User dragged over another element?
					if (!dropState.dragOverElement || !dropState.dragOverElement.contains(overEl)) {
						var itemEl = resolveItemElement(overEl, dropZoneRootEl);
						if (itemEl) {
							if (dropState.dragOverElement) {
								angular.element(dropState.dragOverElement).removeClass('ng-dropBefore');
							}
							
							dropState.dragOverElement = itemEl;
							angular.element(itemEl).addClass('ng-dropBefore');
						}
					}
					
					// Allow drop if everything's fine. 
					if (dropState.dragOverElement) {							
						evnt.preventDefault();
						evnt.dataTransfer.dropEffect = 'move';
						return false;
					}
				});
			}
		};		
	});