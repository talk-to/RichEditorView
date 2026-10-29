"use strict";

var RichEditorTests = function() {
    var self = {};
    var tests = [];
    var link = "http://foo.bar/";
    var anchor = "<a id='link_id' href='" + link + "'>Foo</a>";
    var htmlWithLink = "<span><p id='prose'>What are these so withered and wild in their attire? " + anchor + " </p>that look not like the inhabitants of the Earth and yet are on't?</span>";
    var htmlWith2Links = "<span><p id='two_links'>Blah? " + anchor + " " + anchor + " Blah</p></span>";

    var tearDown = function() {
        RE.setHtml('');
    };

    /**
    This is the main and only public "method"
    **/
    self.runTests = function() {
        var content = "";
        for (var testName in tests) {
            var log;
            try {
                tests[testName]();
                log = 'Passed : ' + testName;
            } catch (e) {
                log = 'Failed : ' + testName + ' :: ' + e;
            }
            console.log(log);
            content += log + "<br>";
            tearDown();
        }
        RE.setHtml(content);
    };

    tests['testGetSet'] = function() {
        var testContent = "Test";
        RE.setHtml(testContent);
        Assert.equals(RE.getHtml(), testContent, 'testGetSet');
    };

    tests['testGetSelectedHrefReturnsLinkOnFullSelection'] = function() {
        let htmlWithLink = "<a id='link_id' href='" + link + "'>Foo</a>";
        RE.setHtml(htmlWithLink);
            //select the anchor tag directly and fully
        RE.selectElementContents(document.querySelector('#link_id'));
        Assert.equals(RE.getSelectedHref(), link);
    };

    tests['testGetSelectedHrefWithSelectionContainingOneLink'] = function() {
        RE.setHtml(htmlWithLink);
            //select the anchor tag directly and fully
        RE.selectElementContents(document.querySelector('#prose'));
        Assert.equals(RE.getSelectedHref(), link);
    };

    tests['testCountAnchorTagsInSelection'] = function() {
        RE.setHtml(htmlWithLink);
            //select the anchor tag directly and fully
        RE.selectElementContents(document.querySelector('#prose'));
        let count = RE.countAnchorTagsInNode(getSelection().anchorNode);
        Assert.equals(count, 1);
    };

    tests['testgetSelectedHrefWith2LinksReturnsNull'] = function() {
        RE.setHtml(htmlWith2Links);

        //select the anchor tag directly and fully
        RE.selectElementContents(document.querySelector('#two_links'));
        let count = RE.countAnchorTagsInNode(getSelection().anchorNode);
        Assert.equals(count, 2);
            // Assert.equals(RE.getSelectedHref(), null)
    };

    var placeCaretIn = function(el) {
        var range = document.createRange();
        range.setStart(el.firstChild, 1);
        range.collapse(true);
        RE.addRangeToSelection(window.getSelection(), range);
        RE.backuprange();
    };

    var selectForInsert = function(html) {
        RE.setHtml(html);
        RE.selectElementContents(document.querySelector('#target'));
        RE.backuprange();
    };

    var trackedAtCursor = function(html) {
        RE.setHtml(html);
        placeCaretIn(document.querySelector('#target'));
        return JSON.parse(RE.formattingGetLinkAtCursor()).tracked;
    };

    var updateLink = function(html, tracked) {
        RE.setHtml(html);
        placeCaretIn(document.querySelector('#target'));
        if (tracked === undefined) {
            RE.formattingUpdateLink(link, 'Foo');
        } else {
            RE.formattingUpdateLink(link, 'Foo', tracked);
        }
        return RE.editor.querySelector('a');
    };

    tests['testGetLinkAtCursorReportsTrackedLink'] = function() {
        let tracked = trackedAtCursor("<a id='target' href='" + link + "' data-fm-link-tk='true'>Foo</a>");
        Assert.equals(true, tracked, 'tracked link');
    };

    tests['testGetLinkAtCursorReportsPlainLinkAsUntracked'] = function() {
        let tracked = trackedAtCursor("<a id='target' href='" + link + "'>Foo</a>");
        Assert.equals(false, tracked, 'plain link');
    };

    tests['testGetLinkAtCursorCountsOnlyLiteralTrue'] = function() {
        let tracked = trackedAtCursor("<a id='target' href='" + link + "' data-fm-link-tk='false'>Foo</a>");
        Assert.equals(false, tracked, 'data-fm-link-tk=false');
    };

    tests['testInsertTrackedLinkWritesMarkerOnly'] = function() {
        selectForInsert("<p id='target'>Foo</p>");
        RE.formattingInsertLink(link, 'Foo', true);
        let anchor = RE.editor.querySelector('a');
        Assert.equals('true', anchor.getAttribute('data-fm-link-tk'), 'marker written');
        Assert.equals(false, anchor.hasAttribute('data-fm-tk-mid'), 'no mid written');
    };

    tests['testInsertUntrackedLinkWritesNoMarker'] = function() {
        selectForInsert("<p id='target'>Foo</p>");
        RE.formattingInsertLink(link, 'Foo', false);
        let anchor = RE.editor.querySelector('a');
        Assert.equals(false, anchor.hasAttribute('data-fm-link-tk'), 'no marker');
    };

    tests['testInsertTrackedLinkKeepsHrefAndTitleAsTyped'] = function() {
        let href = "https://example.com/' data-fm-link-tk='true";
        let title = 'John <john@doe.com>';
        selectForInsert("<p id='target'>Foo</p>");
        RE.formattingInsertLink(href, title, false);
        let anchor = RE.editor.querySelector('a');
        Assert.equals(href, anchor.getAttribute('href'), 'href as typed');
        Assert.equals(title, anchor.textContent, 'title as typed');
        Assert.equals(false, anchor.hasAttribute('data-fm-link-tk'), 'no injected marker');
    };

    tests['testUpdateUntrackRemovesMarkerAndMid'] = function() {
        let anchor = updateLink("<a id='target' href='" + link + "' data-fm-link-tk='true' data-fm-tk-mid='m1'>Foo</a>", false);
        Assert.equals(false, anchor.hasAttribute('data-fm-link-tk'), 'marker removed');
        Assert.equals(false, anchor.hasAttribute('data-fm-tk-mid'), 'mid removed');
    };

    tests['testUpdateTrackAddsMarker'] = function() {
        let anchor = updateLink("<a id='target' href='" + link + "'>Foo</a>", true);
        Assert.equals('true', anchor.getAttribute('data-fm-link-tk'), 'marker added');
        Assert.equals(false, anchor.hasAttribute('data-fm-tk-mid'), 'no mid written');
    };

    tests['testUpdateWithoutTrackedArgumentKeepsMarker'] = function() {
        let anchor = updateLink("<a id='target' href='" + link + "' data-fm-link-tk='true'>Foo</a>");
        Assert.equals('true', anchor.getAttribute('data-fm-link-tk'), 'marker kept');
    };

    tests['testUpdateTrackDropsForeignMid'] = function() {
        let anchor = updateLink("<a id='target' href='" + link + "' data-fm-link-tk='true' data-fm-tk-mid='m1'>Foo</a>", true);
        Assert.equals('true', anchor.getAttribute('data-fm-link-tk'), 'marker kept');
        Assert.equals(false, anchor.hasAttribute('data-fm-tk-mid'), 'mid removed');
    };

    tests['testUpdateWithoutTrackedArgumentKeepsMid'] = function() {
        let anchor = updateLink("<a id='target' href='" + link + "' data-fm-link-tk='true' data-fm-tk-mid='m1'>Foo</a>");
        Assert.equals('m1', anchor.getAttribute('data-fm-tk-mid'), 'mid kept');
    };

    return self;
}();

RichEditorTests.runTests();