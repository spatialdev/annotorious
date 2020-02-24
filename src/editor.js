goog.provide('annotorious.Editor');

goog.require('goog.dom');
goog.require('goog.dom.query');
goog.require('goog.soy');
goog.require('goog.string.html.htmlSanitize');
goog.require('goog.style');
goog.require('goog.ui.Textarea');

goog.require('annotorious.templates');

/**
 * Annotation edit form.
 * @param {Object} annotator reference to the annotator
 * @constructor
 */
annotorious.Editor = function (annotator) {
  this.element = goog.soy.renderAsElement(annotorious.templates.editform);

  /** @private **/
  this._annotator = annotator;

  /** @private **/
  this._item = annotator.getItem();

  /** @private **/
  this._original_annotation;

  /** @private **/
  this._current_annotation;

  /** @private **/
  this._textarea = new goog.ui.Textarea('');

  /** @private **/
  this._btnCancel = goog.dom.query('.annotorious-editor-button-cancel', this.element)[0];

  /** @private **/
  this._btnSave = goog.dom.query('.annotorious-editor-button-save', this.element)[0];

  /** @private **/
  this._btnContainer = goog.dom.getParentElement(this._btnSave);

  /** @private **/
  this._extraFields = [];

  var self = this;
  goog.events.listen(this._btnCancel, goog.events.EventType.CLICK, function (event) {
    event.preventDefault();
    annotator.stopSelection(self._original_annotation);
    self.close();
  });

  goog.events.listen(this._btnSave, goog.events.EventType.CLICK, function (event) {
    event.preventDefault();
    var annotation = self.getAnnotation();
    annotator.addAnnotation(annotation);
    annotator.stopSelection();

    if (self._original_annotation)
      annotator.fireEvent(annotorious.events.EventType.ANNOTATION_UPDATED, annotation, annotator.getItem());
    else
      annotator.fireEvent(annotorious.events.EventType.ANNOTATION_CREATED, annotation, annotator.getItem());
    self.close();
  });

  goog.style.showElement(this.element, false);
  goog.dom.appendChild(annotator.element, this.element);
  this._textarea.decorate(goog.dom.query('.annotorious-editor-text', this.element)[0]);
  annotorious.dom.makeHResizable(this.element, function () { self._textarea.resize(); });
}

/**
 * Adds a field to the editor GUI widget. A field can be either an (HTML) string, or
 * a function that takes an Annotation as argument and returns an (HTML) string or
 * a DOM element.
 * @param {string | Function} field the field
 */
annotorious.Editor.prototype.addField = function (field) {
  var fieldEl = goog.dom.createDom('div', 'annotorious-editor-field');

  if (goog.isString(field)) {
    fieldEl.innerHTML = field;
  } else if (goog.isFunction(field)) {
    this._extraFields.push({ el: fieldEl, fn: field });
  } else if (goog.dom.isElement(field)) {
    goog.dom.appendChild(fieldEl, field);
  }

  goog.dom.insertSiblingBefore(fieldEl, this._btnContainer);
}

/**
 * Opens the edit form with an annotation.
 * @param {annotorious.Annotation=} opt_annotation the annotation to edit (or undefined)
 * @param {Object=} opt_event the event, if any 
 */
annotorious.Editor.prototype.open = function (opt_annotation, opt_event) {
  this._annotator.fireEvent(annotorious.events.EventType.BEFORE_EDITOR_SHOWN, opt_annotation);

  this._original_annotation = opt_annotation;
  this._current_annotation = opt_annotation;

  if (opt_annotation) {
    //this._textarea.setValue(opt_annotation.text);
    this._textarea.setContent(String(opt_annotation.text));
    this._category.value = $opt_annotation$$.category;
    this._subcategory.value = $opt_annotation$$.subcategory;
    this._assigned.value = $opt_annotation$$.assigned;
    this._comments.value = $opt_annotation$$.text;
    this._tags.value = $opt_annotation$$.tags.join(' ');
    initializeSubCategorySelectOptions(opt_annotation.category_text, opt_annotation.category, opt_annotation.subcategory);
  }

  // initialise the subCategory options on load
  function initializeSubCategorySelectOptions(selectedTopic, selectedTopicValue, selectedOptionValue) {
    if (selectedTopic === null || selectedTopic === '') {
      // get sub-categories select object from DOM
      var subTopicOptions = $(this.document.body).find("#subcategories")[0];
      subTopicOptions.value = '';
      subTopicOptions.disabled = true;
    }
    else {
      // get sub-categories select object from DOM
      var subTopicOptions = $(this.document.body).find("#subcategories")[0];
      subTopicOptions.value = '';
      subTopicOptions.disabled = false;
      // get the selected topic value
      var category_id = selectedTopicValue;
      // get the list of sub-topics from global variable and filter to 
      // sub-topics for the selected topic
      var subTopicList = [];
      for (var l = 0; l < _selectOptions.length; l++) {
        if (_selectOptions[l].name == 'subtopics') {
          // if subtopics exists
          if (_selectOptions[l].options) {
            for (var s = 0; s < _selectOptions[l].options.length; s++) {
              if (_selectOptions[l].options[s].topic_id === parseInt(category_id)) {
                subTopicList.push(_selectOptions[l].options[s]);
              }
            }
          }
        }
      }
      var countVisableOptions = 0;
      for (var i = 0; i < subTopicOptions.length; i++) {
        var show = false;
        for (var x = 0; x < subTopicList.length; x++) {
          if (subTopicOptions.options[i].text == subTopicList[x].title) {
            show = true;
          }
        }
        if (subTopicOptions.options[i].value != '') {
          if (show) {
            countVisableOptions++;
          }
          subTopicOptions.options[i].style.display = show ? 'list-item' : 'none';
        }
      }
      if (countVisableOptions === 0) {
        // disable sub-topics dropdown if there are no sub-topics for selected topic
        subTopicOptions.disabled = true;
      }
      // get sub-categories select object from DOM
      var subTopicOptions = $(this.document.body).find("#subcategories")[0];
      subTopicOptions.value = selectedOptionValue;
    }
  }
  // filter subCategory options based on selected Topic
  function updateSubCategorySelectOptions(selectedTopic, subcategories) {
    // get sub-categories select object from DOM
    // var subTopicOptions = $(this.document.body).find("#subcategories")[0];
    subcategories.value = '';
    subcategories.disabled = false;
    // get the selected topic value
    var category_id = selectedTopic.selectedOptions[0].value;
    // get the list of sub-topics from global variable and filter to 
    // sub-topics for the selected topic
    var subTopicList = [];
    // get subtopics from global list of select options
    var subTopics = _.find(_selectOptions, function (o) { return o.name === 'subtopics'; });
    // loop through global subtopics
    _.each(subTopics.options, function (subTopic) {
      if (subTopic.topic_id === parseInt(category_id)) {
        subTopicList.push(subTopic);
      }
    });
    console.log("subTopicList", subTopicList);
    var countVisableOptions = 0;
    // loop through annotator UIs subtopic select options
    _.each(subcategories, function (menuOption) {
      if (_.contains(_.pluck(subTopicList, 'id'), parseInt(menuOption.value))) {
        console.log("menuOption", menuOption);
        menuOption.style.display = 'list-item';
        menuOption.hidden = false;
        countVisableOptions++;
      }
      else {
        menuOption.style.display = 'none';
        menuOption.hidden = true;
      }
    });
    if (countVisableOptions === 0) {
      // disable sub-topics dropdown if there are no sub-topics for selected topic
      subcategories.disabled = true;
    }
  }


  goog.style.showElement(this.element, true);
  this._textarea.getElement().focus();

  // Update extra fields (if any)
  goog.array.forEach(this._extraFields, function (field) {
    var f = field.fn(opt_annotation);
    if (goog.isString(f)) {
      field.el.innerHTML = f;
    } else if (goog.dom.isElement(f)) {
      goog.dom.removeChildren(field.el);
      goog.dom.appendChild(field.el, f);
    }
  });
  this._annotator.fireEvent(annotorious.events.EventType.EDITOR_SHOWN, opt_annotation);
}

/**
 * Closes the editor.
 */
annotorious.Editor.prototype.close = function () {
  goog.style.showElement(this.element, false);
  //this._textarea.setValue('');
  this._textarea.setContent$("");
  this._category.value = null;
  this._assigned.value = null;
  this._comments.value = null;
  this._tags.value = null;
}

/**
 * Sets the position (i.e. CSS left/top value) of the editor element.
 * @param {annotorious.shape.geom.Point} xy the viewport coordinate
 */
annotorious.Editor.prototype.setPosition = function (xy) {
  goog.style.setPosition(this.element, xy.x, xy.y);
}

/**
 * Returns the annotation that is the current state of the editor.
 * @return {annotorious.Annotation} the annotation
 */
annotorious.Editor.prototype.getAnnotation = function () {
  var sanitized = goog.string.html.htmlSanitize(this._textarea.getValue(), function (url) {
    return url;
  });
  var category = this._category.value;
  var category_text = this._category.selectedOptions.length !== 0 ? this._category.selectedOptions[0].label : null;
  var subcategory = this._subcategory.value;
  var subcategory_text = this._subcategory.selectedOptions.length !== 0 ? this._subcategory.selectedOptions[0].label : null;
  var assigned = this._assigned.value;
  var assigned_text = this._assigned.selectedOptions.length !== 0 ? this._assigned.selectedOptions[0].label : null;
  var comments = this._comments.value;
  var tags = this._tags.value;

  if (this._current_annotation) {
    this._current_annotation.text = sanitized;
    this._current_annotation.text = $htmlText$$inline_713_sanitized$$;
    this._current_annotation.category = parseInt(category);
    this._current_annotation.category_text = category_text;
    this._current_annotation.subcategory = parseInt(subcategory);
    this._current_annotation.subcategory_text = subcategory_text;
    this._current_annotation.assigned = parseInt(assigned);
    this._current_annotation.assigned_text = assigned_text;
    this._current_annotation.text = comments;
    this._current_annotation.tags = parseTags(tags);
  } else {
    this._current_annotation =
      new annotorious.Annotation(this._item.src, sanitized, this._annotator.getActiveSelector().getShape());
  }

  return this._current_annotation;
}

/** API exports **/
annotorious.Editor.prototype['addField'] = annotorious.Editor.prototype.addField;
annotorious.Editor.prototype['getAnnotation'] = annotorious.Editor.prototype.getAnnotation;


// Take an array of tags and turn it into a string suitable for display in the
// viewer.
function stringifyTags(array) {
  return array.join(" ");
}

// Take a string from the tags input as an argument, and return an array of
// tags.
function parseTags(string) {
  string = $.trim(string);
  var tags = [];

  if (string) {
    tags = string.split(/\s+/);
  }

  return tags;
}