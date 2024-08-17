# ff14-overlay-vue

## 部署地址

- from [DieMoe](https://souma.diemoe.net/#/)
- from [Github Pages](https://souma-sumire.github.io/ff14-overlay-vue/#/)（有些页面可能有问题，不知道为什么）

### 加入 ACT 悬浮窗

OverlayPlugin 悬浮窗插件 > 新建 > 名称：_任意_，预设：'_自定义悬浮窗_'，类型：'__数据统计__'

## 开发笔记

- 更新 Cactbot 模块 `git submodule update --remote`
- 添加 PostNamazu 事件声明 / 兼容 Hash 路由模式  `git apply patches/0001-postNamazu.patch patches/0002-hash-mode.patch`
