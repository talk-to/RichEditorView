//
//  RichEditorWebView.swift
//  RichEditorView
//
//  Created by C. Bess on 9/18/19.
//

import WebKit

open class RichEditorWebView: WKWebView {

    public var accessoryView: UIView?
    public weak var linkMenuDelegate: RichEditorLinkMenuDelegate?

    public override var inputAccessoryView: UIView? {
        return accessoryView
    }

    open override func buildMenu(with builder: any UIMenuBuilder) {
        super.buildMenu(with: builder)
        guard builder.system == .context else { return }
        guard let delegate = linkMenuDelegate, delegate.isLinkAtCursor() else { return }

        let openAction = UIAction(title: NSLocalizedString("Open link", comment: "")) { [weak self] _ in
            self?.linkMenuDelegate?.openLink()
        }
        let editAction = UIAction(title: NSLocalizedString("Edit link", comment: "")) { [weak self] _ in
            self?.linkMenuDelegate?.editLink()
        }
        let removeAction = UIAction(title: NSLocalizedString("Remove link", comment: "")) { [weak self] _ in
            self?.linkMenuDelegate?.removeLink()
        }

        let linkMenu = UIMenu(title: "", options: .displayInline, children: [openAction, editAction, removeAction])
        builder.insertChild(linkMenu, atEndOfMenu: .root)
    }
}

public protocol RichEditorLinkMenuDelegate: AnyObject {
    func isLinkAtCursor() -> Bool
    func openLink()
    func editLink()
    func removeLink()
}
