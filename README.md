# apple-fm-demo

Electron で UI を作り、Apple Foundation Models の呼び出しだけを Swift sidecar に分離した実験用アプリです。

## 前提条件

- macOS 26.0 以降
- Xcode 26 以降
- Apple Intelligence 対応 Mac
- Foundation Models が利用可能な状態
- Node.js と npm

## セットアップ

依存関係はすでに入っていれば不要です。まだなら以下を実行します。

```bash
npm install
```

## Swift sidecar をビルド

```bash
npm run swift:build
```

成功すると `swift-bridge/.build/debug/FoundationModelsBridge` が作成されます。

## アプリを起動

```bash
npm start
```

Electron が起動し、アプリ内部から Swift sidecar を呼び出します。

## 使い方

1. アプリ起動後、左側の `Model Availability` を確認します
2. `User Prompt` に入力します
3. `Generate` を押します
4. 応答は `Response` に表示されます

## 開発メモ

- Electron 側の入口は [src/main.js](/Users/shugo/Development/apple-fm-demo/src/main.js)
- Swift 側の入口は [swift-bridge/Sources/FoundationModelsBridge/main.swift](/Users/shugo/Development/apple-fm-demo/swift-bridge/Sources/FoundationModelsBridge/main.swift)
- Swift sidecar は `stdin/stdout` の JSON で Electron と通信します
- ビルド済みバイナリがあればそれを優先して起動し、なければ `swift run` にフォールバックします

## うまく動かないとき

- `Model Availability` が `available` にならない場合は、macOS と Apple Intelligence の状態を確認してください
- Swift のビルドに失敗する場合は、Xcode のバージョンと Command Line Tools を確認してください
- Electron は起動しても生成できない場合、まず `npm run swift:build` を再実行してください
