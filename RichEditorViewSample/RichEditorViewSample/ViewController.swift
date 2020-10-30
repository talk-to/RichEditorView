//
//  ViewController.swift
//  RichEditorViewSample
//
//  Created by Caesar Wirth on 4/5/15.
//  Copyright (c) 2015 Caesar Wirth. All rights reserved.
//

import UIKit
import RichEditorView

class ViewController: UIViewController {
    @IBOutlet var editorView: RichEditorView!
    @IBOutlet var htmlTextView: UITextView!
    var isTextColor = true

    lazy var toolbar: RichEditorToolbar = {
        let toolbar = RichEditorToolbar(frame: CGRect(x: 0, y: 0, width: self.view.bounds.width, height: 44))
        toolbar.options = RichEditorDefaultOption.all
        return toolbar
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        
        editorView.delegate = self
        editorView.inputAccessoryView = toolbar
        editorView.placeholder = "Edit here"
        editorView.html = "<b>Jesus is God.</b> He saves by grace through faith alone. Soli Deo gloria! <a href='https://perfectGod.com'>perfectGod.com</a>"

        toolbar.delegate = self
        toolbar.editor = editorView

        // This will create a custom action that clears all the input text when it is pressed
//        let item = RichEditorOptionItem(image: nil, title: "Clear") { toolbar in
//            toolbar?.editor?.html = ""
//        }
//
//        var options = toolbar.options
//        options.append(item)
//        toolbar.options = options
    }

}

extension ViewController: RichEditorDelegate {
    func richEditor(_ editor: RichEditorView, heightDidChange height: Int) { }

    func richEditor(_ editor: RichEditorView, contentDidChange content: String) {
        if content.isEmpty {
            htmlTextView.text = "HTML Preview"
        } else {
            htmlTextView.text = content
        }
    }

    func richEditorTookFocus(_ editor: RichEditorView) { }
    
    func richEditorLostFocus(_ editor: RichEditorView) { }
    
    func richEditorDidLoad(_ editor: RichEditorView) { }
    
    func richEditor(_ editor: RichEditorView, shouldInteractWith url: URL) -> Bool { return true }

    func richEditor(_ editor: RichEditorView, handleCustomAction content: String) { }
}

extension ViewController: RichEditorToolbarDelegate, UIColorPickerViewControllerDelegate {
    private func presentColorPicker(title: String?, color: UIColor?) {
        let picker = UIColorPickerViewController()
        picker.supportsAlpha = false
        picker.delegate = self
        picker.title = title
        if let color = color {
            picker.selectedColor = color
        }
        
        present(picker, animated: true, completion: nil)
    }
    
    private func getRGBA(from color: UIColor) -> [CGFloat] {
        var R: CGFloat = 0
        var G: CGFloat = 0
        var B: CGFloat = 0
        var A: CGFloat = 0
        
        color.getRed(&R, green: &G, blue: &B, alpha: &A)
        
        return [R, G, B, A]
    }
    
    private func isBlackOrWhite(_ color: UIColor) -> Bool {
        let RGBA = getRGBA(from: color)
        let isBlack = RGBA[0] < 0.09 && RGBA[1] < 0.09 && RGBA[2] < 0.09
        let isWhite = RGBA[0] > 0.91 && RGBA[1] > 0.91 && RGBA[2] > 0.91
        
        return isBlack || isWhite
    }
    
    func richEditorToolbarChangeTextColor(_ toolbar: RichEditorToolbar) {
        isTextColor = true
        presentColorPicker(title: "Text Color", color: .black)
    }

    func richEditorToolbarChangeBackgroundColor(_ toolbar: RichEditorToolbar) {
        isTextColor = false
        presentColorPicker(title: "Background Color", color: .white)
    }

    func richEditorToolbarInsertImage(_ toolbar: RichEditorToolbar) {
        toolbar.editor?.insertImage("https://gravatar.com/avatar/696cf5da599733261059de06c4d1fe22", alt: "Gravatar")
    }

    func richEditorToolbarInsertLink(_ toolbar: RichEditorToolbar) {
        // Can only add links to selected text, so make sure there is a range selection first
//        if let hasSelection = toolbar.editor?.rangeSelectionExists(), hasSelection {
//            toolbar.editor?.insertLink("http://github.com/cjwirth/RichEditorView", title: "Github Link")
//        }
    }
    
    func colorPickerViewControllerDidSelectColor(_ viewController: UIColorPickerViewController) {
        var color: UIColor? = viewController.selectedColor
        
        // don't allow black or white color changes
        let resetColor = isBlackOrWhite(viewController.selectedColor)

        if isTextColor {
            if resetColor {
                color = nil
            }
            
            toolbar.editor?.setTextColor(color)
        } else {
            if resetColor {
                color = nil
            }
            
            toolbar.editor?.setTextBackgroundColor(color)
        }
    }
}
