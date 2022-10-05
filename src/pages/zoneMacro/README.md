# 帮助

## 说明

本项目意在使玩家不再受困于FFXIV客户端本身的限制，提供一种自由的保存/使用 `用户宏`/`场景标记预设`的方式。

另外征集一个项目名称。

## 依赖

通过 [ACT](https://advancedcombattraker.com/) 的 [OverlayPlugin](https://github.com/OverlayPlugin/OverlayPlugin) 提供的 WebSocket Server 实现在主流浏览器中与 [鲶鱼精邮差](https://github.com/Natsukage/PostNamazu/releases)（版本1.3.2.1及以上） 进行通信，委托其执行场地标点或发送消息的动作（Command, Preset, Queue, WayMark）。同时使用了 [OverlayPlugin](https://github.com/OverlayPlugin/OverlayPlugin) 与 [Cactbot](https://github.com/quisquous/cactbot) 提供的事件来实现部分易用性改善的功能（ChangeZone, LogLine, onGameExistsEvent）。

## 使用说明

### 网页操作

* 页眉区：副本列表的选择切换。右方提供了常用高难副本的跳转，不过暂未提供此列表的自定义功能。
* 正文区：显示用户宏与标点预设。
  * 鼠标悬浮到卡片内会滑出操作菜单
    * macro：编辑，删除，默语频道进行发送，小队频道进行发送。
    * place：编辑，删除，写入预设插槽。
* 页脚区：一些常用功能。
  * 新增宏文本：新建一个类型为macro的容器，内容为空。
  * 新增场地标记：新建一个类型为place的容器， 具有 A, B, C, D, One, Two, Three, Four 的属性，他们分别具有 X, Y, Z, Active的属性，其中**X**为场地从西至东的坐标，**Z**为场地从北至南的坐标，Active表示是否启用此标记。（在一些软件中，他们会帮助你调换Y与Z的数值，但在本项目中未进行额外处理）
    * 现在您无法修改Y值，因为这有可能导致作弊。
  * 导入PP字符串：导入一个兼容PaisleyPark格式的JSON字符串，绝大部分实现游戏内标点管理的软件都可以使用此兼容标准进行导出。导入时会进行MapID的检查，如果导入的字符串中携带的MapID与你当前选择的场地不符时（由于每一个MAP的Offset不同，你无法将多个地图的标点进行通用），会进行二次确认，若选择了使用强制转换，则会进行尝试性的坐标转换，而我并**不保证此转换的正确性，或许你会得到一份含有非法坐标的标点**，请留意。
  * 恢复当前区域默认：恢复当前选择的地图的内容为默认值。
  * 清除用户数据：使用重新赋值的方式完全替换所有数据为默认值，需要二次确认。
  * 帮助：显示/隐藏你正在阅读的这段文字。

### 默语宏操作

当**仅有一个**对应结果时可以在游戏中使用默语宏进行快捷操作

注意：宏操作不会进行弹窗二次确认。

注意：请不要真的在宏里写上尖括号。他表示这里是一个参数。

#### 发送到聊天频道

`/e marco <channel>`

macro：也可以写作 "宏" "发宏"

channel：发言频道。默语为e，小队为p，忽略为e

#### 标点预设写入插槽

`/e place <num>`

place：也可以写作"标点" "标记" "场景标记"

num：存档编号1-5，省略为5

最后如果加以叹号 `!` 结尾则还会进行标点。

## 数据来源

默认自带的标点、宏大部分来源于以下帖子

* [FFXIVWaymarkPresets/wiki](https://github.com/Em-Six/FFXIVWaymarkPresets/wiki)
* [FF14标点大全](https://docs.qq.com/sheet/DY0ttR2xQT1Vjc2V4?tab=BB08J2)
* [NGA副本迷宫开门到打完系列](https://nga.178.com/read.php?pid=369819381)

## 感谢

[@Natsukage](https://github.com/Natsukage)

## 捐赠

[afdian](https://afdian.net/a/Souma)
