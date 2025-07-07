# 时间轴语法

你不需要按照时间顺序编写时间轴，程序会自动按照时间顺序显示。

## 显式语句（你实际上能在悬浮窗中看到的部分）

```text
时间 "提示文本" tts "语音文本"
```

```text
120 "<天赐祝福>~"
150 "高频平A" tts "注意奶T"
200 "<至黑之夜><献奉><暗影卫>开减伤"
```

### 时间

  可以是整数、浮点数，如 `84.38`；或时间格式，如 `01:35`

### 提示文本

- 必须使用双引号包裹
- 显示在悬浮窗中的文本，如 `天赐祝福` 或 `治疗MT`
- 提供一种 `<技能名>` 的特殊语法，来生成一张技能图标的图片。并且可以接上一个 `~` 来快速在后面重复该技能名称的字符串，如 `<天赐祝福>~` 在悬浮窗中实际显示为 `[图片]天赐祝福`

### 语音文本

- 如 `tts "天赐祝福"`，会在该语句时间判定前默认 1 秒，调用 ACT 的 TTS 方法朗读 `天赐祝福` 。该参数可以省略

## 匹配语句（隐藏的、用于匹配时间轴的）

大部分情况下，你不需要手动编写这些匹配语句

在没有血量轴或快慢轴的 BOSS 战斗中，不需要编写匹配语句

在使用FFLOGS导入时，会自动生成部分匹配语句，你可以在 [timelineSpecialRules.ts](https://github.com/Souma-Sumire/ff14-overlay-vue/blob/main/src/utils/timelineSpecialRules.ts) 查看全部预置规则

### 新语法

已兼容 [Cactbot Timeline](https://github.com/OverlayPlugin/cactbot/blob/main/docs/TimelineGuide.md) 新语法糖，只支持日志语法的 Ability、StartsUsing 类型

你可以复制 Cactbot Timeline 的时间轴条目到这里使用，其中参数的 `source` 字段将会被自动剔除

```text
时间 "隐藏的文本" 日志类型 { 日志参数 } window 前匹配,后匹配 jump 时间
```

```text
00:11.3 "空间斩" StartsUsing { id: "A3DA" } window 10,10 #注释文本
00:21.1 "unknown_a38f" Ability { id: "A38F", once: true } window 60,60
736.5 "Beetle Avatar" Ability { id: "E82" } window 130,10 jump 413.9 #匹配时跳转至第 413.9 秒
```

### 日志匹配类型与参数

- Ability 技能判定。参数类型: `{ id: string, once?: boolean }`，id为16进制技能ID，once为true时该条目在整场战斗中仅会被匹配一次
- StartsUsing 技能开始读条。参数类型: `{ id: string, once?: boolean }`，id为16进制技能ID，once为true时该条目在整场战斗中仅会被匹配一次
- 参数是一个标准的 Javascript 对象，如 `{ id: "A3DA" }`。

### 窗口匹配

- 控制日志匹配的容错范围，格式为 `window 前匹配,后匹配`。
- 例如，在 `00:10.0 "AoE" StartsUsing { id: "ABCD" } window 2,4`，当 BOSS 读条技能 ID 为 ABCD 的技能，且当前时间轴时间处于第 8 ~ 14 秒内，时间轴时间会修正至第 10 秒
- 该参数可以省略。若不填写，`window` 默认为 `2.5,2.5`

### 跳转语句

- 改写日志匹配成功时跳转的时间点，格式为 `jump 时间`。只支持秒数格式，如 `120`
- 例如，在 `736.5 "Beetle Avatar" Ability { id: "E82" } window 130,10 jump 413.9`，当 BOSS 判定技能 ID 为 E82 的技能，且时间轴时间处于第 606.5 ~ 746.5 秒内，时间轴会跳转至第 413.9 秒
- 该参数可以省略

### 旧语法（仍然可用）

```text
时间 "注释文本" sync /正则表达式/ window 前匹配,后匹配 jump 时间
```

#### sync 正则表达式

- 一个标准的 Javascript 正则表达式。用于匹配 ACT LogLine 日志，若匹配成功，则触发同步（参考下方window、jump的说明）
- 事件修饰符：可以在 sync 后面添加 `.once` 修饰符，来设置该条目在整场战斗中仅会被匹配一次，如 `sync.once /正则表达式/`

#### window 数字,数字

- 控制 sync 匹配的时间范围，第一个数字代表向前的时间范围，第二个数字代表向后的时间范围
- 例如，在：`50 "同步语句" sync /正则表达式/ window 2,3`，当正则表达式匹配，且当前时间轴时间处于第 48 ~ 53 秒内，时间轴会跳转至第 50 秒
- 若不填写，默认为 `2.5,2.5`

#### jump 数字

- 改写日志匹配成功时跳转的时间点，当 sync 匹配成功，且符合 window 的判定条件时候，时间轴会跳转至 `jump` 指定的数字时间点
- 只支持秒数格式，如 `120`
- 例如，在：`120 "分支判断" sync /正则表达式/ window 20,5 jump 300`，当正则表达式匹配，且当前时间轴时间处于第 100 ~ 125 秒内，时间轴会跳转至第 300 秒

### 旧匹配语句例子

```text
652.1 "究极超豪华野蛮大乱击" sync /^.{14} \w+ 14:4.{7}:[^:]+:942B:/ window 12,12
```
