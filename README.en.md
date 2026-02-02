# ff14-overlay-vue

[简体中文](README.md) | [日本語](README.ja.md) | [繁體中文](README.zh-TW.md)

## Deployment

- Global: [GitHub Pages](https://souma-sumire.github.io/ff14-overlay-vue/#/)
- China Mainland: [Daimoe Server](https://souma.diemoe.net/#/)

### Add to ACT Overlay

1. Open **ACT > OverlayPlugin**
2. Click **"New"**
3. Configure as follows:
   - **Name:** Any name you like
   - **Preset:** Choose “Custom Overlay”
   - **Type:** Select “Data Statistics”

## Development Guide

### 1. Environment Setup

1. [Bun](https://bun.sh/)

### 2. Start the Project

```bash
bun install
git submodule update --init --recursive
git submodule update --remote --recursive
git apply patches/0001-cactbot-all.patch
bun dev
bun run build
```

Most pages can be opened in test mode using the `dev` parameter, for example:
`http://localhost:3000/ff14-overlay-vue/#/keySkillTimer?dev=1`
