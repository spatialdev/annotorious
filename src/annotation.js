goog.provide('annotorious.Annotation');

goog.require('annotorious.shape');

/**
 * A 'domain class' implementation of the external annotation interface.
 * @param {string} src the source URL of the annotated object
 * @param {string} text the annotation text
 * @param {annotorious.shape.Shape} shape the annotated fragment shape
 * @constructor
 */
annotorious.Annotation = function(src, text, category, category_text, subcategory, subcategory_text, assigned, assigned_text, comment, tags, file_id, shape) {
  this.type = 'image';
  this.src = src;
  this.text = text;
  this.category = parseInt(category, 10);
  this.category_text = category_text;
  this.subcategory = parseInt(subcategory, 10);
  this.subcategory_text = subcategory_text;
  this.assigned = parseInt(assigned, 10);
  this.assigned_text = assigned_text;
  this.text = comment;
  this.tags = parseTags(tags);
  this.file = file_id;
  this.shapes = [ shape ];
  this.context = document.URL
  this['context'] = document.URL; // Prevents dead code removal
}
