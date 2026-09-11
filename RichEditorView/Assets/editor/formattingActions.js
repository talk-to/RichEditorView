// formattingActions.js
// Formatting helpers called from the iOS app via evaluateJavaScript.
// All functions attach to the RE namespace so they share the editor's scope.

RE.formattingQueryState = function() {
  var anchor = null;
  var sel = window.getSelection();
  if (sel.anchorNode) {
    var node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
    anchor = node ? node.closest('a') : null;
  }
  return JSON.stringify({
    "bold": document.queryCommandState('bold'),
    "italic": document.queryCommandState('italic'),
    "underline": document.queryCommandState('underline'),
    "list": document.queryCommandState('insertUnorderedList'),
    "link": anchor !== null
  });
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

RE.formattingInstallSelectionListener = function() {
  var timer = null;
  document.addEventListener('selectionchange', function() {
    clearTimeout(timer);
    timer = setTimeout(function() { RE.callback('action/cursor-moved'); }, 50);
  });
};
