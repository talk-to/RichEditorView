//
//  RichEditorToolbar.swift
//
//  Created by Caesar Wirth on 4/2/15.
//  Updated/Modernized by C. Bess on 9/18/19.
//
//  Copyright (c) 2015 Caesar Wirth. All rights reserved.
//

import UIKit

/// RichEditorToolbarDelegate is a protocol for the RichEditorToolbar.
/// Used to receive actions that need extra work to perform (eg. display some UI)
@objc public protocol RichEditorToolbarDelegate: class {

    /// Called when the Text Color toolbar item is pressed.
    @objc optional func richEditorToolbarChangeTextColor(_ toolbar: RichEditorToolbar)

    /// Called when the Background Color toolbar item is pressed.
    @objc optional func richEditorToolbarChangeBackgroundColor(_ toolbar: RichEditorToolbar)

    /// Called when the Insert Image toolbar item is pressed.
    @objc optional func richEditorToolbarInsertImage(_ toolbar: RichEditorToolbar)

    /// Called when the Insert Link toolbar item is pressed.
    @objc optional func richEditorToolbarInsertLink(_ toolbar: RichEditorToolbar)
}

/// RichBarButtonItem is a subclass of UIBarButtonItem that takes a callback as opposed to the target-action pattern
@objcMembers open class RichBarButtonItem: UIBarButtonItem {
    open var actionHandler: (() -> Void)?
    
    public convenience init(image: UIImage? = nil, handler: (() -> Void)? = nil) {
        self.init(image: image, style: .plain, target: nil, action: #selector(buttonTapped))
        target = self
        actionHandler = handler
    }
    
    public convenience init(title: String = "", handler: (() -> Void)? = nil) {
        self.init(title: title, style: .plain, target: nil, action: #selector(buttonTapped))
        target = self
        actionHandler = handler
    }
    
    @objc func buttonTapped() {
        actionHandler?()
    }
}

/// RichEditorToolbar is UIView that contains the toolbar for actions that can be performed on a RichEditorView
@objcMembers open class RichEditorToolbar: UIView {

    /// The delegate to receive events that cannot be automatically completed
    open weak var delegate: RichEditorToolbarDelegate?

    /// A reference to the RichEditorView that it should be performing actions on
    open weak var editor: RichEditorView?

    /// The list of options to be displayed on the toolbar
    open var options: [RichEditorOption] = [] {
        didSet {
            updateToolbar()
        }
    }

    /// The tint color to apply to the toolbar background.
    open var barTintColor: UIColor? {
        get { return toolbar.barTintColor }
        set { toolbar.barTintColor = newValue }
    }

    private var toolbarScroll: UIScrollView
    private var toolbar: UIToolbar
    
    public override init(frame: CGRect) {
        toolbarScroll = UIScrollView()
        toolbar = UIToolbar()
        super.init(frame: frame)
        setup()
    }
    
    public required init?(coder aDecoder: NSCoder) {
        toolbarScroll = UIScrollView()
        toolbar = UIToolbar()
        super.init(coder: aDecoder)
        setup()
    }
    
    private func setup() {
        autoresizingMask = .flexibleWidth

        toolbar.autoresizingMask = .flexibleWidth

        toolbarScroll.frame = bounds
        toolbarScroll.bounces = false
        toolbarScroll.autoresizingMask = [.flexibleHeight, .flexibleWidth]
        toolbarScroll.showsHorizontalScrollIndicator = false
        toolbarScroll.showsVerticalScrollIndicator = false

        toolbarScroll.addSubview(toolbar)

        addSubview(toolbarScroll)
        updateToolbar()
    }
    
    private func updateToolbar() {
        var buttons = [UIBarButtonItem]()
        
        // build collection of richbar buttons
        for option in options {
            let handler = { [weak self] in
                if let strongSelf = self {
                    option.action(strongSelf)
                }
            }

            var button: RichBarButtonItem!
            if let image = option.image {
                button = RichBarButtonItem(image: image, handler: handler)
            } else {
                button = RichBarButtonItem(title: option.title, handler: handler)
            }
            
            buttons.append(button)
        }

        // calculate new toolbar width
        let defaultIconWidth: CGFloat = 28
        let barButtonItemMargin: CGFloat = 12
        let width: CGFloat = buttons.reduce(0) { result, button in
            var width = defaultIconWidth
            
            if let view = button.customView {
                width = view.bounds.width
            }
            
            return result + width + barButtonItemMargin
        }
        
        toolbar.items = buttons
        toolbar.frame.size.width = (width < frame.size.width ? frame.size.width : width + defaultIconWidth)
        toolbar.frame.size.height = bounds.height
        toolbarScroll.contentSize.width = width + barButtonItemMargin
    }
    
}
