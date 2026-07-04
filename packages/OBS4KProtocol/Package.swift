// swift-tools-version: 6.1
import PackageDescription

let package = Package(
  name: "OBS4KProtocol",
  platforms: [
    .iOS(.v17),
    .macOS(.v14),
  ],
  products: [
    .library(
      name: "OBS4KProtocol",
      targets: ["OBS4KProtocol"]
    ),
  ],
  targets: [
    .target(
      name: "OBS4KProtocol"
    ),
  ]
)
