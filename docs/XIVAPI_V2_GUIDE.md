# 🚀 XIVAPI V2 深度开发指南 (Boilmaster 版)

**XIVAPI V2** 相比 V1 有了质的飞跃，但也带来了更严苛的查询语法限制。本指南汇总了在开发过程中跳过的“坑”以及最鲁棒的实践方案。

---

## 📍 基础连接与域名分离

* **API 接口地址**：`https://v2.xivapi.com/api`
* **图片/资源地址**：`https://xivapi.com` (注意：图片**不要**加上 v2 前缀)

---

## 🔍 核心避坑指南 (Pitfalls)

### 1. URL 编码的“生死抉择” (`+` 号处理)

Boilmaster 引擎使用 `+` 表达“必须命中（MUST）”。

* **坑**：如果在浏览器或 Axios 请求中直接发送 `+`，它常被解析为空格，导致复杂嵌套查询报 400 错误。
* **对策**：必须手动将 `+` 编码为 `%2B`。
* **示例**：`query=%2BIsPvP=false` (等同于 `+IsPvP=false`)

### 2. ID 字段的“双重人格”

* **搜索过滤时**：左侧 Key 必须写成 **`ID`** (全大写)。
  * ❌ `query=row_id=7531` -> 报错 `error Char at: _id` (下划线是非法标识符)
  * ✅ `query=ID=7531`
* **获取结果时**：`fields` 列表中必须写成 **`row_id`**。
  * ❌ `fields=ID` -> 返回的结果里 ID 可能是空的或报错
  * ✅ `fields=row_id` -> 结果字段名为 `row_id`

### 3. 复杂列表搜索 (解包 OR)

V2 目前不支持 `Field=(Value1 Value2)` 这种 SQL 风格的简写。

* **坑**：`query=ClassJobCategory=(113 161)` 会报 400。
* **对策**：必须手动展开为 `OR` 逻辑。在括号内，空格分隔的条件默认就是 `OR`。
* **示例**：`query=+(ClassJobCategory=113 ClassJobCategory=161)`

### 4. 获取嵌套对象 (Dot Notation)

V2 支持点路径访问，但返回结果会平铺为整个对象。

* **用法**：`fields=Icon.path` 会返回包含整个 `Icon` 对象的 JSON。
* **推荐字段**：`row_id,Name,Icon.path,IsRoleAction,ClassJobLevel,Recast100ms`

---

## 🔎 实战例子 (可以直接点击测试)

### 1. 组合搜索：白魔法师 (ID: 21) 的非 PvP 技能

解析：必须满足非 PvP，且满足 (职业是 21 OR 职能技能且分类属于白魔)。

[点击访问 (已处理编码)](https://v2.xivapi.com/api/search?sheets=Action&query=%2BIsPvP=false%20%2B(ClassJob=21%20(%2BIsRoleAction=true%20%2B(ClassJobCategory=113%20ClassJobCategory=161)))&fields=row_id,Name,Icon.path,ClassJobLevel,Recast100ms)

### 2. 模糊搜索：名字包含 "Rampart" 且显示图标路径

[点击访问](https://v2.xivapi.com/api/search?sheets=Action&query=Name=%22Rampart%22&fields=row_id,Name,Icon.path)

### 3. 获取单个数据详情 (非搜索)

获取 ID 为 7531 的技能详细信息。

[点击访问](https://v2.xivapi.com/api/sheet/Action/7531?fields=row_id,Name,Icon,ClassJobLevel)

---

## 📚 常用字段映射表

| 功能 | V1 字段 (旧) | V2 字段 (新) | 搜索时 Key |
| :--- | :--- | :--- | :--- |
| **主键 ID** | `ID` | `row_id` | `ID` |
| **职业 ID** | `ClassJobTargetID` | `ClassJob` | `ClassJob` |
| **职业分类** | `ClassJobCategoryTargetID` | `ClassJobCategory` | `ClassJobCategory` |
| **技能分类** | `ActionCategoryTargetID` | `ActionCategory` | `ActionCategory` |
| **是否职能** | `IsRoleAction` | `IsRoleAction` | `IsRoleAction` |
| **冷却时间** | `Recast100ms` | `Recast100ms` | `Recast100ms` |

---

> **开发提示**：在 JS/TS 中发送请求前，建议手动执行 `encodeURIComponent`，确保所有的 `+`、`=`、`(`、`)` 和空格都经过正确处理，避免 Boilmaster 内核解析失败。
