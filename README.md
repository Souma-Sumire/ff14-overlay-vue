# ff14-overlay-vue

[English](README.en.md) | [日本語](README.ja.md) | [繁體中文](README.zh-TW.md)

## 部署地址

- 国内：[呆萌服务器](https://souma.diemoe.net/#/)
- 国外 / 备用：[Github Pages](https://souma-sumire.github.io/ff14-overlay-vue/#/)

### 加入 ACT 悬浮窗

1. 打开 ACT > OverlayPlugin 插件
2. 点击 “新建”
3. 设置如下：
   - 名称：任意名称
   - 预设：选择“自定义悬浮窗”
   - 类型：选择“数据统计”

## 开发指南

### 一、环境准备

1. [Bun](https://bun.sh/)

### 二、启动项目

```bash
bun install
git submodule update --init --recursive
git submodule update --remote --recursive
git apply patches/0001-cactbot-all.patch
bun dev
bun run build
```

大部分页面，可以通过 dev 参数来进入测试模式。例如：
`http://localhost:3000/ff14-overlay-vue/#/keySkillTimer?dev=1`
