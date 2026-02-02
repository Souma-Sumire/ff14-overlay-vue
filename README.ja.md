# ff14-overlay-vue

[English](README.en.md) | [简体中文](README.md) | [繁體中文](README.zh-TW.md)

## デプロイ先

- 海外：[GitHub Pages](https://souma-sumire.github.io/ff14-overlay-vue/#/)
- 国内サーバー：[ダイモエサーバー](https://souma.diemoe.net/#/)

### ACT オーバーレイへの追加

1. ACT > OverlayPlugin を開く
2. 「新規作成 (New)」をクリック
3. 以下のように設定：
   - 名前：任意
   - プリセット：「カスタム (Custom Web Overlay)」を選択
   - 種類：「Mini Parse」を選択

## 開発ガイド

### 1. 環境準備

1. [Bun](https://bun.sh/)

### 2. プロジェクトの起動

```bash
# 依存関係のインストール
bun install
# サブモジュールの初期化
git submodule update --init --recursive
# 最新の cactbot コードを取得してパッチを適用
bash scripts/update-cactbot.sh
# 開発モード
bun dev
# ビルド
bun run build
```

ほとんどのページは、`dev` パラメータを使用してテストモードに入ることができます。例：
`http://localhost:3000/ff14-overlay-vue/#/keySkillTimer?dev=1`
