// swift-tools-version:5.9
import PackageDescription

let package = Package(
  name: "RichEditorView",
  defaultLocalization: "en",
  platforms: [.iOS(.v15)],
  products: [
    .library(name: "RichEditorView", targets: ["RichEditorView"]),
  ],
  targets: [
    .target(
      name: "RichEditorView",
      path: "RichEditorView",
      exclude: ["Info.plist", "RichEditorView-Bridging-Header.h", "RichEditorView.h"],
      sources: ["Classes"],
      resources: [
        .copy("Assets/editor"),
        .copy("Assets/icons"),
      ]
    ),
  ]
)
