# ff14-overlay-vue

[简体中文](README.md) | [English](README.en.md) | [日本語](README.ja.md)

## 部署位置

- 海外：[GitHub Pages](https://souma-sumire.github.io/ff14-overlay-vue/#/)
- 中國大陸：[呆萌伺服器](https://souma.diemoe.net/#/)

### 加入 ACT 浮動視窗

1. 打開 **ACT > OverlayPlugin** 插件
2. 點擊 **「新增」**
3. 設定如下：
   - **名稱：** 可任意命名
   - **預設：** 選擇「自訂浮動視窗」
   - **類型：** 選擇「資料統計」

## 開發指南

### 一、環境準備

1. [Bun](https://bun.sh/)

### 二、啟動專案

```bash
bun install
git submodule update --init --recursive
git submodule update --remote --recursive
git apply patches/0001-cactbot-all.patch
bun dev
bun run build
```

大多數頁面都可以透過 `dev` 參數進入測試模式，例如：
`http://localhost:3000/ff14-overlay-vue/#/keySkillTimer?dev=1`
