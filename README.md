# ff14-overlay-vue

## 用法

ACT > OverlayPlugin 悬浮窗插件 > 新建 > 名称：任意，预设：'自定义悬浮窗'，类型：'数据统计'

### 悬浮窗地址

- from [DieMoe](https://souma.diemoe.net/#/)
- from [Github Pages](https://souma-sumire.github.io/ff14-overlay-vue/#/)

## 开发笔记

- 更新 Cactbot 模块 `git submodule update --remote`
- 添加 PostNamazu 事件声明 / 兼容 Hash 路由模式  `git apply patches/0001-postNamazu.patch patches/0002-hash-mode.patch`
- vxe-table 不要升级，会破坏现有代码，就让他锁死在这个版本吧
