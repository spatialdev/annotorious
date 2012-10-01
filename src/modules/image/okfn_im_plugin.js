goog.provide('yuma.okfn.ImagePlugin');

goog.require('goog.soy');
goog.require('goog.dom');
goog.require('goog.dom.query');
goog.require('goog.events');
goog.require('goog.math');
goog.require('goog.style');

/**
 * Implementation of the Yuma image plugin for OKFN Annotator.
 * @param {element} image the image to be annotated
 * @param {Object} okfnAnnotator reference to the OKFN Annotator instance
 * @constructor
 */
yuma.okfn.ImagePlugin = function(image, okfnAnnotator) {
  var eventBroker = new yuma.events.EventBroker(this);
  
  var annotationLayer = goog.dom.createDom('div', 'yuma-annotationlayer');
  goog.style.setStyle(annotationLayer, 'position', 'relative');
  goog.style.setSize(annotationLayer, image.width, image.height); 
  goog.dom.replaceNode(annotationLayer, image);
  goog.dom.appendChild(annotationLayer, image);
    
  var hint = goog.soy.renderAsElement(yuma.templates.image.hint, {msg:'Click and Drag to Annotate'});
  goog.style.setOpacity(hint, 0); 
  goog.dom.appendChild(annotationLayer, hint);
  
  var viewCanvas = goog.soy.renderAsElement(yuma.templates.image.canvas,
    { width:image.width, height:image.height });
  goog.dom.appendChild(annotationLayer, viewCanvas);   

  /** @private **/
  var editCanvas = goog.soy.renderAsElement(yuma.templates.image.canvas, 
    { width:image.width, height:image.height });
  goog.style.showElement(editCanvas, false); 
  goog.dom.appendChild(annotationLayer, editCanvas);  
 
  // TODO correctly fire
  //  yuma.events.EventType.MOUSE_OVER_ANNOTATABLE_MEDIA,
  //  yuma.events.EventType.MOUSE_OUT_OF_ANNOTATABLE_MEDIA,
  
  goog.events.listen(annotationLayer, goog.events.EventType.MOUSEOVER, function() { 
    goog.style.setOpacity(viewCanvas, 1.0); 
    goog.style.setOpacity(hint, 0.8); 
  });
  
  goog.events.listen(annotationLayer, goog.events.EventType.MOUSEOUT, function() { 
    goog.style.setOpacity(viewCanvas, 0.4); 
    goog.style.setOpacity(hint, 0);
  });
 
  /** @private **/
  var viewer = new yuma.modules.image.Viewer(viewCanvas, eventBroker, false);
  
  /** @private **/
  var selector = new yuma.selection.DragSelector(editCanvas, eventBroker);

  var self = this;
  goog.events.listen(viewCanvas, goog.events.EventType.MOUSEDOWN, function(event) {
    goog.style.showElement(editCanvas, true);
    selector.startSelection(event.offsetX, event.offsetY);
  });
  
  /** Communication yuma -> okfn **/
  
  eventBroker.addHandler(yuma.events.EventType.SELECTION_COMPLETED, function(event) {	
    // TODO once we have aligned our datamodels, this conversion won't be necessary any more
    var annotation = {};

    okfnAnnotator.publish('beforeAnnotationCreated', annotation);
	
    var geometry = event.shape.geometry;
    var offset = yuma.getOffset(image);
    var x = geometry.x + offset.left + 16;
    var y = geometry.y + geometry.height + offset.top + 5;	

    // TODO can we move that before okfnAnnotator.publish?
    annotation.url = image.src;
    annotation.shape = event.shape;
    
    okfnAnnotator.showEditor(annotation, {top: window.pageYOffset, left: 0});
    goog.style.setPosition(okfnAnnotator.editor.element[0], x, y + window.pageYOffset);	
  });
  
  eventBroker.addHandler(yuma.events.EventType.MOUSE_OVER_ANNOTATION, function(event) {
    var shape = event.annotation.shape;
    var offset = yuma.getOffset(image);
    var x = shape.geometry.x + offset.left + 16;
    var y = shape.geometry.y + shape.geometry.height + offset.top + 5;

    okfnAnnotator.showViewer([event.annotation], {top: window.pageYOffset, left: 0});    	
    goog.style.setPosition(okfnAnnotator.viewer.element[0], x, y + window.pageYOffset);
    okfnAnnotator.clearViewerHideTimer();
  });
  
  eventBroker.addHandler(yuma.events.EventType.MOUSE_OUT_OF_ANNOTATION, function(event) {  
    okfnAnnotator.startViewerHideTimer();
  });
  
  /** Communication okfn -> yuma **/
  
  okfnAnnotator.viewer.on('edit', function(annotation) {
    // TODO code duplication -> move into a function
    var shape = annotation.shape;
    var x = shape.geometry.x + imagePosition.x;
    var y = shape.geometry.y + shape.geometry.height + imagePosition.y;
	
    // Use editor.show instead of showEditor to prevent a second annotationEditorShown event
    goog.style.setPosition(okfnAnnotator.editor.element[0], 0, window.pageYOffset);
    okfnAnnotator.editor.show();
    goog.style.setPosition(okfnAnnotator.editor.element[0], x, y);
  });
  
  
  okfnAnnotator.subscribe('annotationCreated', function(annotation) {
    selector.stopSelection();
    if(annotation.url == image.src) {
      viewer.addAnnotation(annotation);
    }
  });
  
  okfnAnnotator.subscribe('annotationsLoaded', function(annotations) {
    // Use Google's forEach utility instead!
    for(var i in annotations) {
      var annotation = annotations[i];
      if(annotation.url == image.src) {
	viewer.addAnnotation(annotation);
      }
    }
  });
  
  okfnAnnotator.subscribe('annotationDeleted', function(annotation) {
    if(annotation.url == image.src) {
      viewer.removeAnnotation(annotation);
    }
  });
  
  okfnAnnotator.subscribe('annotationEditorHidden', function(editor) {
    goog.style.showElement(editCanvas, false);
    selector.stopSelection();
  });
}

// TODO move this function into a central location somewhere!
yuma.getOffset = function(el) {
  var _x = 0;
  var _y = 0;
  
  while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
    _x += el.offsetLeft - el.scrollLeft;
    _y += el.offsetTop - el.scrollTop;
    el = el.offsetParent;
  }
  return { top: _y, left: _x };
}

/**
 * OKFN plugin interface.
 */
window['Annotator']['Plugin']['YumaImagePlugin'] = (function() {
  var annotatableElement;

  function YumaImagePlugin(element, options) {
    annotatableElement = element;
  }

  YumaImagePlugin.prototype['pluginInit'] = function() {
    var images = annotatableElement.getElementsByTagName('img');
  
    var self = this;
    if (typeof window.onload != 'function') {
      window.onload = function() {
        // TODO use Google collection iterator util
        for (var i=0; i<images.length; i++) {
          new yuma.okfn.ImagePlugin(images[i], self['annotator']);
          // TODO annotation edit save event => annotator
        }
      }
    } else {
      var current = window.onload;
      window.onload = function() {
        current();
        // TODO use Google collection iterator util
        for (var i=0; i<images.length; i++) {
          new yuma.okfn.ImagePlugin(images[i], self['annotator']);
          // TODO annotation edit save event => annotator
        }
      }
    }
  }
  
  return YumaImagePlugin;
})();

