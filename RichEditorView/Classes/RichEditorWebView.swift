//
//  RichEditorWebView.swift
//  RichEditorView
//
//  Created by C. Bess on 9/18/19.
//

import WebKit

open class RichEditorWebView: WKWebView {

    public var accessoryView: UIView?
    public var linkMenuDelegate: RichEditorLinkMenuDelegate?

    public override var inputAccessoryView: UIView? {
        return accessoryView
    }

    open override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        if action == #selector(openLinkMenu) ||
           action == #selector(editLinkMenu) ||
           action == #selector(removeLinkMenu) {
            return linkMenuDelegate?.isLinkAtCursor() ?? false
        }
        return super.canPerformAction(action, withSender: sender)
    }

    @objc func openLinkMenu() {
        linkMenuDelegate?.openLink()
    }

    @objc func editLinkMenu() {
        linkMenuDelegate?.editLink()
    }

    @objc func removeLinkMenu() {
        linkMenuDelegate?.removeLink()
    }
}

public protocol RichEditorLinkMenuDelegate: AnyObject {
    func isLinkAtCursor() -> Bool
    func openLink()
    func editLink()
    func removeLink()
}
