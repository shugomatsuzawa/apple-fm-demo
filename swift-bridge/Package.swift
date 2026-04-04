// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "swift-bridge",
    platforms: [
        .macOS(.v26)
    ],
    products: [
        .executable(name: "FoundationModelsBridge", targets: ["FoundationModelsBridge"])
    ],
    targets: [
        .executableTarget(
            name: "FoundationModelsBridge"
        )
    ]
)
