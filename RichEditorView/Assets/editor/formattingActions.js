// formattingActions.js
// Formatting helpers called from the iOS app via evaluateJavaScript.
// All functions attach to the RE namespace so they share the editor's scope.

// Returns a helper that collects non-whitespace text nodes within the current selection.
// Used by formattingQueryState and formattingGetSelectionColor.
RE._formattingSelectedNodes = function() {
  var sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) { return []; }
  var range = sel.getRangeAt(0);
  if (range.collapsed) { return []; }
  var root = range.commonAncestorContainer.nodeType === 3
    ? range.commonAncestorContainer.parentElement
    : range.commonAncestorContainer;
  var walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    { acceptNode: function(node) {
      return range.intersectsNode(node)
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }}
  );
  var nodes = [];
  var node;
  while ((node = walker.nextNode())) {
    var s = (node === range.startContainer) ? range.startOffset : 0;
    var e = (node === range.endContainer) ? range.endOffset : node.length;
    if (node.textContent.substring(s, e).trim().length > 0) { nodes.push(node); }
  }
  return nodes;
};

// Overrides the original queryCommandState-based implementation so that a format button
// only shows active when ALL text in the selection has that format, not just part of it.
// For a collapsed cursor, falls back to queryCommandState so new typed text inherits the
// cursor's format correctly.
RE.formattingQueryState = function() {
  var sel = window.getSelection();
  var anchor = null;
  if (sel && sel.anchorNode) {
    var n = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
    anchor = n ? n.closest('a') : null;
  }
  if (!sel || sel.rangeCount === 0 || sel.getRangeAt(0).collapsed) {
    return JSON.stringify({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      list: document.queryCommandState('insertUnorderedList'),
      link: anchor !== null
    });
  }
  var nodes = RE._formattingSelectedNodes();
  if (nodes.length === 0) {
    return JSON.stringify({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      list: document.queryCommandState('insertUnorderedList'),
      link: anchor !== null
    });
  }
  function all(test) {
    return nodes.every(function(n) { return test(window.getComputedStyle(n.parentElement)); });
  }
  var bold = all(function(s) { return parseInt(s.fontWeight) >= 700; });
  var italic = all(function(s) { return s.fontStyle === 'italic'; });
  var underline = all(function(s) { return s.textDecorationLine.indexOf('underline') !== -1; });
  var list = nodes.every(function(n) {
    var el = n.parentElement;
    while (el && el !== document.body) { if (el.tagName === 'LI') return true; el = el.parentElement; }
    return false;
  });
  return JSON.stringify({ bold: bold, italic: italic, underline: underline, list: list, link: anchor !== null });
};

RE.formattingGetLinkAtCursor = function() {
  var sel = window.getSelection();
  var node = sel.anchorNode;
  if (node) {
    var el = node.nodeType === 3 ? node.parentElement : node;
    var anchor = el ? el.closest('a') : null;
    if (anchor) {
      return JSON.stringify({ "href": anchor.href, "text": anchor.textContent });
    }
  }
  return JSON.stringify({ "href": "", "text": sel.toString() });
};

RE.formattingInsertLink = function(href, title) {
  var html = "<a href='" + href + "' style='text-decoration:none; color:rgba(0,122,255,1)'>" + title + "</a>";
  var saved = RE.currentSelection;
  RE.editor.focus();
  RE.currentSelection = saved;
  RE.restorerange();
  document.execCommand('insertHTML', false, html);
  RE.callback('input');
};

RE.formattingUpdateLink = function(href, title) {
  var saved = RE.currentSelection;
  RE.editor.focus();
  RE.currentSelection = saved;
  RE.restorerange();
  var sel = window.getSelection();
  var node = sel.anchorNode;
  if (node) {
    var el = node.nodeType === 3 ? node.parentElement : node;
    var anchor = el ? el.closest('a') : null;
    if (anchor) {
      anchor.href = href;
      anchor.textContent = title;
    }
  }
  RE.callback('input');
};

RE.formattingRemoveLink = function() {
  var sel = window.getSelection();
  var node = sel.anchorNode;
  if (node) {
    var el = node.nodeType === 3 ? node.parentElement : node;
    var anchor = el ? el.closest('a') : null;
    if (anchor) {
      var text = document.createTextNode(anchor.textContent);
      anchor.parentNode.replaceChild(text, anchor);
    }
  }
  RE.callback('input');
};

// Returns the computed color of the selection if all nodes share the same color,
// empty string when colors are mixed, or the cursor color for a collapsed selection.
RE.formattingGetSelectionColor = function() {
  var sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.getRangeAt(0).collapsed) {
    return document.queryCommandValue('foreColor');
  }
  var nodes = RE._formattingSelectedNodes();
  if (nodes.length === 0) { return document.queryCommandValue('foreColor'); }
  var first = window.getComputedStyle(nodes[0].parentElement).color;
  for (var i = 1; i < nodes.length; i++) {
    if (window.getComputedStyle(nodes[i].parentElement).color !== first) { return ''; }
  }
  return first;
};

// Ensures execCommand always applies (not removes) when toggling a format on a mixed
// selection. WebKit reports a mixed selection as active, so a plain execCommand would
// remove the format instead of applying it to the full selection.
RE.formattingForceApply = function(command) {
  if (document.queryCommandState(command)) {
    document.execCommand(command);
  }
  document.execCommand(command);
};

RE.formattingInstallSelectionListener = function() {
  var timer = null;
  document.addEventListener('selectionchange', function() {
    clearTimeout(timer);
    timer = setTimeout(function() { RE.callback('action/cursor-moved'); }, 50);
  });
};
