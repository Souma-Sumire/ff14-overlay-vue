# 时间轴语法简易帮助

## 来源

本文档节取并修改自[Cactbot时间轴指南](https://github.com/quisquous/cactbot/blob/main/docs/zh-CN/TimelineGuide.md)。

### 注释

时间轴中的 `#` 符号用于定义注释，其后的所有内容均会被忽略。

### 条目

以下是一些时间轴条目的语法示例。每一行的条目均以事件时间和事件名称开始。

`数字 "字符串" (duration 数字)`

`数字 "字符串" sync /正则/ (window 数字,数字) (jump 数字)`

此处的括号表示这个部分是可选的，括号本身并不是语法的组成部分。

数字可以是整数，如 `34`；也可以是浮点数，如 `84.381`；也可以是MM:SS格式，如 `05:20`；

字符串一般为事件名，如 `"坠落"` 或 `"双重攻击"`。

正则是一个标准的 [Javascript 正则表达式](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)。

事件时间与事件名称永远在最开始的位置，但 `window`、`jump`、以及 `sync` 并没有明确的顺序规定。但是在代码规范里，sync通常放在前面。

`window 数字,数字` 规定了同步的时间范围。若 `window` 未设置，timeline默认将其视同为设置了 `window 2.5,2.5`。也就是，相对于当前事件时间的前2.5秒至后2.5秒之间。例如，对于此时间轴条目：`3118.9 "Lancing Bolt" sync /:Raiden:3876:/`， 当正则表达式 `/:Raiden:3876:/` 在 3116.4 到 3121.4 之间的任意时间点被匹配到时，时间轴会同步并回溯至 3118.9。时间轴通常在独特的技能上使用较大的window值，以确保时间轴即使在战斗中才启动也可以正确地同步到正确的位置。

`jump 数字` 告诉时间轴在匹配sync成功时跳转至指定的时间点。
