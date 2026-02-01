# ff14-overlay-vue

[简体中文](README.md) | [English](README.en.md) | [繁體中文](README.zh-TW.md)

## デプロイ先

- 海外：[GitHub Pages](https://souma-sumire.github.io/ff14-overlay-vue/#/)
- 国内サーバー：[ダイモエサーバー](https://souma.diemoe.net/#/)

### ACT オーバーレイに追加する

1. **ACT > OverlayPlugin** を開く
2. **「新規作成」** をクリック
3. 次のように設定します：
   - **名前：** 任意の名前
   - **プリセット：** 「カスタムオーバーレイ」を選択
   - **タイプ：** 「データ統計」を選択

## 開発ガイド

### 1. 環境の準備

1. [Node.js（LTS バージョン）](https://nodejs.org/en/download)
2. [pnpm パッケージマネージャー](https://pnpm.io/installation)

### 2. プロジェクトの起動

```bash
pnpm install
git submodule update --init --recursive
git submodule update --remote --recursive
git apply patches/0001-cactbot-all.patch
pnpm dev
pnpm vite build
```

ほとんどのページは、`dev` パラメータを使うことでテストモードで開けます。
例：`http://localhost:3000/ff14-overlay-vue/#/keySkillTimer?dev=1`
