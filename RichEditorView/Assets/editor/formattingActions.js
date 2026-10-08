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

// Ephemeral typing-state tracking.
// WebKit's queryCommandState on a collapsed cursor reads the DOM ancestor's computed style
// rather than the ephemeral state set by execCommand. We track the intended state and
// override the query for collapsed cursors until the cursor moves or the user types.
RE._ephemeralTypingState = null;
RE._ephemeralContainer  = null;
RE._ephemeralOffset     = null;

RE.formattingSetEphemeralState = function(bold, italic, underline, list) {
  var sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && sel.getRangeAt(0).collapsed) {
    var r = sel.getRangeAt(0);
    RE._ephemeralTypingState = { bold: bold, italic: italic, underline: underline, list: list };
    RE._ephemeralContainer  = r.startContainer;
    RE._ephemeralOffset     = r.startOffset;
  }
};

RE._formattingCheckEphemeralStale = function() {
  if (!RE._ephemeralTypingState) { return; }
  var sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) { RE._ephemeralTypingState = null; return; }
  var r = sel.getRangeAt(0);
  if (!r.collapsed
      || r.startContainer !== RE._ephemeralContainer
      || r.startOffset    !== RE._ephemeralOffset) {
    RE._ephemeralTypingState = null;
    RE._ephemeralContainer  = null;
    RE._ephemeralOffset     = null;
  }
};

RE.editor.addEventListener('input', function() {
  RE._ephemeralTypingState = null;
  RE._ephemeralContainer  = null;
  RE._ephemeralOffset     = null;
});

// Overrides the original queryCommandState-based implementation so that a format button
// only shows active when ALL text in the selection has that format, not just part of it.
// For a collapsed cursor, returns the ephemeral override if one is active, then falls back
// to queryCommandState so new typed text inherits the cursor's format correctly.
RE.formattingQueryState = function() {
  var sel = window.getSelection();
  var anchor = null;
  if (sel && sel.anchorNode) {
    var n = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
    anchor = n ? n.closest('a') : null;
  }
  if (!sel || sel.rangeCount === 0 || sel.getRangeAt(0).collapsed) {
    RE._formattingCheckEphemeralStale();
    if (RE._ephemeralTypingState) {
      return JSON.stringify({
        bold:      RE._ephemeralTypingState.bold,
        italic:    RE._ephemeralTypingState.italic,
        underline: RE._ephemeralTypingState.underline,
        list:      RE._ephemeralTypingState.list,
        link:      anchor !== null
      });
    }
    return JSON.stringify({
      bold:      document.queryCommandState('bold'),
      italic:    document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      list:      document.queryCommandState('insertUnorderedList'),
      link:      anchor !== null
    });
  }
  var nodes = RE._formattingSelectedNodes();
  if (nodes.length === 0) {
    return JSON.stringify({
      bold:      document.queryCommandState('bold'),
      italic:    document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      list:      document.queryCommandState('insertUnorderedList'),
      link:      anchor !== null
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
  var link = nodes.some(function(n) {
    var el = n.parentElement;
    while (el && el !== document.body) { if (el.tagName === 'A') return true; el = el.parentElement; }
    return false;
  });
  return JSON.stringify({ bold: bold, italic: italic, underline: underline, list: list, link: link });
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
  var saved = RE.currentSelection;
  RE.editor.focus();
  RE.currentSelection = saved;
  RE.restorerange();
  // createLink wraps the selection in <a> preserving inner formatting (bold, italic, etc.).
  // Use a unique placeholder href so we can reliably find the created anchor via
  // querySelector — sel.anchorNode after createLink is often outside the <a>.
  var placeholder = 're-insert-link-' + Date.now();
  document.execCommand('createLink', false, placeholder);
  var anchor = RE.editor.querySelector('a[href="' + placeholder + '"]');
  if (anchor) {
    anchor.href = href;
    anchor.style.textDecoration = 'none';
    anchor.style.color = 'rgba(0,122,255,1)';
    if (anchor.textContent !== title) { anchor.textContent = title; }
    var range = document.createRange();
    range.setStart(anchor, anchor.childNodes.length);
    range.collapse(true);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
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
      var range = document.createRange();
      range.setStart(anchor, anchor.childNodes.length);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
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
