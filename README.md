# ff14-overlay-vue

## 部署地址

- 推荐：[呆萌服务器](https://souma.diemoe.net/#/)
- 备用：[Github Pages](https://souma-sumire.github.io/ff14-overlay-vue/#/)

### 加入 ACT 悬浮窗

OverlayPlugin 悬浮窗插件 > 新建 > 名称：_任意_，预设：'_自定义悬浮窗_'，类型：'__数据统计__'

### 直接在浏览器里用

使用部分子页面时，如果你希望在浏览器中使用，则通过在url后添加 `?OVERLAY_WS=ws://127.0.0.1:10501/ws` 且开启 ACT 中的 ACT WS Server 功能，便可以在浏览器中获取数据。可获得更好的操作体验。

## 开发笔记

- 更新 Cactbot 模块 `git submodule update --remote`
- 添加 PostNamazu 事件声明 / 兼容 Hash 路由模式  `git apply patches/0001-postNamazu.patch patches/0002-hash-mode.patch`
