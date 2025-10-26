# ff14-overlay-vue

## 部署地址

- 推荐：[呆萌服务器](https://souma.diemoe.net/#/)
- 备用：[Github Pages](https://souma-sumire.github.io/ff14-overlay-vue/#/)

### 加入 ACT 悬浮窗

1. 打开 ACT > OverlayPlugin 插件
1. 点击 “新建”
1. 设置如下：
    - 名称：任意名称
    - 预设：选择“自定义悬浮窗”
    - 类型：选择“数据统计”

## 开发指南

### 一、环境准备

1. [Node.js（LTS 版本）](https://nodejs.org/en/download)
1. [pnpm 包管理器](https://pnpm.io/installation)

### 二、启动项目

1. 安装依赖：

   ```bash
   pnpm install
   ```

1. 初始化 Cactbot 子模块：

   ```bash
   git submodule update --init --recursive
   ```

   - 更新 Cactbot 子模块：

        ```bash
        git submodule update --remote --recursive
        ```

1. 应用补丁：

   ```bash
   git apply patches/0001-postNamazu.patch patches/0002-hash-mode.patch patches/0003-event-type.patch patches/0004-party-type.patch
   ```

1. 启动开发模式：

     ```bash
     pnpm dev
     ```

   > __测试模式：__
   > 大部分页面，可以通过在url添加dev参数来进入测试模式。例如：`http://localhost:3000/ff14-overlay-vue/#/keySkillTimer?dev=1`

1. 构建项目：

     ```bash
     pnpm vite build
     ```
