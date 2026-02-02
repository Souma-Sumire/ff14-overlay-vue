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
# 安装依赖
bun install
# 初始化子模块
git submodule update --init --recursive
# 拉取最新 cactbot 代码并应用补丁
bash scripts/update-cactbot.sh
# 开发模式
bun dev
# 构建
bun run build
```

大部分页面，可以通过 dev 参数来进入测试模式。例如：
`http://localhost:3000/ff14-overlay-vue/#/keySkillTimer?dev=1`
