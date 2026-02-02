# ff14-overlay-vue

[English](README.en.md) | [简体中文](README.md) | [日本語](README.ja.md)

## 部署地址

- 海外：[GitHub Pages](https://souma-sumire.github.io/ff14-overlay-vue/#/)
- 中國大陸：[呆萌伺服器](https://souma.diemoe.net/#/)

### 加入 ACT 懸浮窗

1. 開啟 ACT > OverlayPlugin 插件
2. 點擊「新建」
3. 設定如下：
   - 名稱：任意名稱
   - 預設：選擇「自定義懸浮窗」
   - 類型：選擇「數據統計」

## 開發指南

### 一、環境準備

1. [Bun](https://bun.sh/)

### 二、啟動專案

```bash
# 安裝依賴
bun install
# 初始化子模組
git submodule update --init --recursive
# 拉取最新 cactbot 程式碼並應用補丁
bash scripts/update-cactbot.sh
# 開發模式
bun dev
# 構建
bun run build
```

大部分頁面，可以透過 dev 參數來進入測試模式。例如：
`http://localhost:3000/ff14-overlay-vue/#/keySkillTimer?dev=1`
