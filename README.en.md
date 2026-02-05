# ff14-overlay-vue

[简体中文](README.md) | [日本語](README.ja.md) | [繁體中文](README.zh-TW.md)

> As the user base outside of Simplified Chinese is unclear, internationalization (i18n) has not been fully optimized. If you are using other languages, please let us know so we can improve support.

## Deployment

- International: [Github Pages](https://souma-sumire.github.io/ff14-overlay-vue/#/)
- China / Backup: [Diemoe Server](https://souma.diemoe.net/#/)

### Add to ACT Overlay

1. Open ACT > OverlayPlugin
2. Click "New"
3. Settings:
   - Name: Any name
   - Preset: Select "Custom Web Overlay"
   - Type: Select "Mini Parse"

## Development Guide

### 1. Prerequisites

1. [Bun](https://bun.sh/)

### 2. Start Project

```bash
# Install dependencies
bun install
# Initialize submodules
git submodule update --init --recursive
# Pull latest cactbot code and apply patches
bash scripts/update-cactbot.sh
# Development mode
bun dev
# Build
bun run build
```

Most pages can be tested by adding `dev` parameter. Example:
`http://localhost:3000/ff14-overlay-vue/#/keySkillTimer?dev=1`
