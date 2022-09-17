import { cleanMacro } from "../store/macro";
import { ZoneIdInfo } from "../types/Macro";
export const defaultMacro: { zoneId: ZoneIdInfo } = {
  zoneId: {
    "1003": [
      {
        name: "P1S被窝",
        type: "macro",
        text: cleanMacro(`
          /p 【基本八方】|【P1锁链换位】同色标点
          /p D3 MT D4    | MTD3 STD2 H1D1 H2D4
          /p H1  ◎   H2   |【冰火侵蚀】
          /p D1  ST  D2   |MT和D3第二次固定换颜色
          /p                         |第三次根据颜色站位
          /p 【四连锁】
          /p 红3                 红8
          /p              紫3
          /p     紫18 ◎ 紫8
          /p             紫13
          /p 红18              红13
          /p 【定时锁链】
          /p 人群：红 点名：白
  `),
      },
      {
        name: "P1S WayMark",
        type: "place",
        place: [
          { Mark: "A", "X": 100.0, "Y": 0.0, "Z": 96.0, "ID": 0, "Active": true },
          { Mark: "B", "X": 104.0, "Y": 0.0, "Z": 100.0, "ID": 1, "Active": true },
          { Mark: "C", "X": 100.0, "Y": 0.0, "Z": 104.0, "ID": 2, "Active": true },
          { Mark: "D", "X": 96.0, "Y": 0.0, "Z": 100.0, "ID": 3, "Active": true },
          { Mark: "One", "X": 90.0, "Y": 0.0, "Z": 90.0, "ID": 4, "Active": true },
          { Mark: "Two", "X": 110.0, "Y": 0.0, "Z": 90.0, "ID": 5, "Active": true },
          { Mark: "Three", "X": 110.0, "Y": 0.0, "Z": 110.0, "ID": 6, "Active": true },
          { Mark: "Four", "X": 90.0, "Y": 0.0, "Z": 110.0, "ID": 7, "Active": true },
        ],
      },
    ],
    "1005": [
      {
        name: "P2S被窝",
        type: "macro",
        text: cleanMacro(`
          /p 【跳跃分摊】
          /p    原地：MTH1D1D3
          /p    水路：ST H2D2D4
          /p 【麻将】
          /p    紫三角1234→【1234】（无连线）
          /p    蓝方块13：对面 蓝方块24：原地（有连线）
          /p 【第二次对冲】
          /p 非对冲的H固定站污水地板对角，其余人灵性分散
          /p 【多重刻印&污水】←T 分摊 DPS→
          /p 【多重刻印&俯冲】DPS：角落 T：边上
          /p 【散开→接线】T：对面 人群：原地
  `),
      },
      {
        name: "P2S WayMark",
        type: "place",
        place: [
          { Mark: "A", "X": 87.5, "Y": 0.5, "Z": 87.5, "ID": 0, "Active": true },
          { Mark: "B", "X": 112.5, "Y": 0.5, "Z": 87.5, "ID": 1, "Active": true },
          { Mark: "C", "X": 112.5, "Y": 0.5, "Z": 112.5, "ID": 2, "Active": true },
          { Mark: "D", "X": 87.5, "Y": 0.5, "Z": 112.5, "ID": 3, "Active": true },
          { Mark: "One", "X": 100.0, "Y": 0.0, "Z": 90.0, "ID": 4, "Active": true },
          { Mark: "Two", "X": 110.0, "Y": 0.0, "Z": 100.0, "ID": 5, "Active": true },
          { Mark: "Three", "X": 100.0, "Y": 0.0, "Z": 110.0, "ID": 6, "Active": true },
          { Mark: "Four", "X": 90.0, "Y": 0.0, "Z": 100.0, "ID": 7, "Active": true },
        ],
      },
    ],
    "1007": [
      {
        name: "P3S魔法少女",
        type: "macro",
        text: cleanMacro(`
          /p ┌───■暗之炎────┬─■十字地火─┐
          /p │　⑴　│●大球：　　　│
          /p │　⑷　　　　　　　⑵　│　　　北西　　│
          /p │　⑶　│●小球：　　　│
          /p │※顺时针击杀暗之炎　　│　　　11/1点  │
          /p ├───────────┴───────┤
          /p ├─────■俯冲─────┬─■灵泉─┤
          /p │【两侧发光】│【中央发光】│塔：　　　│
          /p │↓　　　　↓│西　↓↓　东│　西北│
          /p │　　│　│　东南│
          /p │　　├──────┘　　　　　│
          /p │　　│点名：→→　│
          /p │　　│　　　→→　│
          /p └──────┴────────────┘
          /p ┌─■炎暗劫火分散─┬─■火龙卷站位──┐
          /p │　　　　　│　　　　　　│
          /p │　　　　　│　　　　　　　　│
          /p │　　　　　│　　★　　│
          /p │　　　　　│　　　　　　│
          /p ├─────────┴─────────┤
          /p ├■火龙卷三穿一分散┬■火龙卷击退后分散┤
          /p │　　　　　　　　　│　　　　黑　　　　│
          /p │　　　　　│　　　　　　　　　│
          /p │　　　　　│　　　　　│
          /p │　　　　★　　　　│　　　　　│
          /p │　　　　　│　　　　　│
          /p │　　　　　│　　　　　　　│
          /p │　　　　　　　　　│　　　　　│
          /p └─────────┴─────────┘
  `),
      },
      {
        name: "P3S WayMark 魔法少女",
        type: "place",
        place: [
          { Mark: "A", "X": 100.0, "Y": 0.0, "Z": 80.0, "ID": 0, "Active": true },
          { Mark: "B", "X": 120.0, "Y": 0.0, "Z": 100.0, "ID": 1, "Active": true },
          { Mark: "C", "X": 100.0, "Y": 0.0, "Z": 120.0, "ID": 2, "Active": true },
          { Mark: "D", "X": 80.0, "Y": 0.0, "Z": 100.0, "ID": 3, "Active": true },
          { Mark: "One", "X": 100.0, "Y": 0.0, "Z": 94.0, "ID": 4, "Active": true },
          { Mark: "Two", "X": 106.0, "Y": 0.0, "Z": 100.0, "ID": 5, "Active": true },
          { Mark: "Three", "X": 100.0, "Y": 0.0, "Z": 106.0, "ID": 6, "Active": true },
          { Mark: "Four", "X": 94.0, "Y": 0.0, "Z": 100.0, "ID": 7, "Active": true },
        ],
      },
      {
        name: "P3S WayMark 被窝",
        type: "place",
        place: [
          { Mark: "A", "X": 100.0, "Y": 0.0, "Z": 91.19, "ID": 0, "Active": true },
          { Mark: "B", "X": 108.81, "Y": 0.0, "Z": 100.277, "ID": 1, "Active": true },
          { Mark: "C", "X": 100.0, "Y": 0.0, "Z": 108.81, "ID": 2, "Active": true },
          { Mark: "D", "X": 91.19, "Y": 0.0, "Z": 100.0, "ID": 3, "Active": true },
          { Mark: "One", "X": 93.966, "Y": 0.007, "Z": 93.921, "ID": 4, "Active": true },
          { Mark: "Two", "X": 105.988, "Y": 0.007, "Z": 93.938, "ID": 5, "Active": true },
          { Mark: "Three", "X": 106.035, "Y": 0.008, "Z": 106.026, "ID": 6, "Active": true },
          { Mark: "Four", "X": 93.989, "Y": 0.008, "Z": 105.995, "ID": 7, "Active": true },
        ],
      },
    ],
    "1009": [
      {
        name: "P4S被窝门神",
        type: "macro",
        text: cleanMacro(`
          /p 【P1拉线 + P3踩塔】     |【踩塔时拉线】
          /p    D1/MT　　 D2/ST     |     H1/D3
          /p                     ◎                    |     MT/D1
          /p    D3/H1  [1]  D4/H2   |     ST/D2
          /p                                             |     H2/D4
          /p 接毒顺序：D1D2D3D4/MTSTH1H2
          /p 【剧场分散】雷火为6点|【撞球】
          /p             MT    ST                |D3 MT H2
          /p   D3    D1◎D2    D4     |D1 ◎  D2
          /p             H1    H2               |H1 ST  D4
          /p 【剧场分摊】                   |同组一起顺时针连撞两个
          /p   前：MTH1D1D3         |D1D3→A开始 D2D4→C开始
          /p   后： STH2D2D4          |MTH2→B开始 STH1→D开始
          /p 【死刑】MT无敌→ST无敌→换T（战士无敌）
  `),
      },
      {
        name: "P4S被窝本体",
        type: "macro",
        text: cleanMacro(`
          /p          【一运】    | 【三运】MTD4引导
          /p  D3　　　  D4  | H1                    |                     MT
          /p   　MT　ST        | D3        D1      |        H1      D1
          /p   　　   ◎            |              ◎ ST  →   D3◎
          /p   　D1　D2       | D4       D2       |        H2      D2
          /p  H1　　　H2    | H2                    |                     ST
          /p 【二运】以第一次A/B的安全区为12点
          /p 无T：11点钟拉线→12点钟踩塔→3点钟分摊  红T：12点钟分摊→3点钟分摊
          /p 紫H：5点钟拉线→6点钟踩塔→3点钟踩塔   红H：6点钟分摊→9点钟踩塔
          /p 红D：12点钟分摊→9点分摊[D1234]3点分摊 绿D：6点钟分摊→9点钟分摊
          /p 【五运】D3　D1　　　ST　H2
          /p 　　           荆棘         ◎        荆棘
          /p                 D4    D2            MT   H1
          /p 【四运】顺时针，蓝三紫一【六运】DPS：10s TH：5s
  `),
      },
      {
        name: "P4S WayMark 被窝门神",
        type: "place",
        place: [
          { Mark: "A", "X": 100.0, "Y": 0.0, "Z": 85.0, "ID": 0, "Active": true },
          { Mark: "B", "X": 115.0, "Y": 0.0, "Z": 100.0, "ID": 1, "Active": true },
          { Mark: "C", "X": 100.0, "Y": 0.0, "Z": 115.0, "ID": 2, "Active": true },
          { Mark: "D", "X": 85.0, "Y": 0.0, "Z": 100.0, "ID": 3, "Active": true },
          { Mark: "One", "X": 100.0, "Y": 0.0, "Z": 102.5, "ID": 4, "Active": true },
          { Mark: "Two", "X": 100.0, "Y": 0.0, "Z": 107.5, "ID": 5, "Active": true },
          { Mark: "Three", "X": 0.0, "Y": 0.0, "Z": 0.0, "ID": 6, "Active": false },
          { Mark: "Four", "X": 0.0, "Y": 0.0, "Z": 0.0, "ID": 7, "Active": false },
        ],
      },
      {
        name: "P4S WayMark 被窝本体",
        type: "place",
        place: [
          { Mark: "A", "X": 99.058, "Y": 0.0, "Z": 81.135, "ID": 0, "Active": true },
          { Mark: "B", "X": 119.352, "Y": 0.0, "Z": 99.316, "ID": 1, "Active": true },
          { Mark: "C", "X": 100.747, "Y": 0.0, "Z": 119.114, "ID": 2, "Active": true },
          { Mark: "D", "X": 80.574, "Y": 0.0, "Z": 101.415, "ID": 3, "Active": true },
          { Mark: "One", "X": 105.052, "Y": 0.0, "Z": 84.859, "ID": 4, "Active": true },
          { Mark: "Two", "X": 114.869, "Y": 0.0, "Z": 104.923, "ID": 5, "Active": true },
          { Mark: "Three", "X": 95.007, "Y": 0.0, "Z": 114.873, "ID": 6, "Active": true },
          { Mark: "Four", "X": 85.0, "Y": 0.0, "Z": 95.019, "ID": 7, "Active": true },
        ],
      },
      {
        name: "P4S WayMark Melee Uptime",
        type: "place",
        place: [
          { Mark: "A", "X": 102.5, "Y": 0.0, "Z": 90.0, "ID": 0, "Active": true },
          { Mark: "B", "X": 110.0, "Y": 0.0, "Z": 102.5, "ID": 1, "Active": true },
          { Mark: "C", "X": 97.5, "Y": 0.0, "Z": 110.0, "ID": 2, "Active": true },
          { Mark: "D", "X": 90.0, "Y": 0.0, "Z": 97.5, "ID": 3, "Active": true },
          { Mark: "One", "X": 97.0, "Y": 0.0, "Z": 82.0, "ID": 4, "Active": true },
          { Mark: "Two", "X": 118.0, "Y": 0.0, "Z": 97.0, "ID": 5, "Active": true },
          { Mark: "Three", "X": 103.0, "Y": 0.0, "Z": 118.0, "ID": 6, "Active": true },
          { Mark: "Four", "X": 82.0, "Y": 0.0, "Z": 103.0, "ID": 7, "Active": true },
        ],
      },
    ],
    "1082": [
      {
        name: "P5S game8",
        type: "macro",
        text: cleanMacro(`
          /p 【基本散開】　　　【十字毒塔】STフリー
          /p D3 MT D4　　　　　　MT(無敵)
          /p H1　　H2　　　H1D3　　 H2D4
          /p D1 ST D2　　　　　　 D1D2
          /p 【毒塔（近接内側 / 遠隔外側）】
          /p MTST / H1D3：12時から反時計回り
          /p D1D2 / H2D4：1時から時計回り
          /p 【ベノムサージ(東西受け)/スプラッシュ】
          /p 西/内壁：MTH1D1D3 東/外壁：STH2D2D4
          /p 【毒沼 + ベノムスコール】
          /p 　　毒D1H1D3外
          /p 　　　　MT
          /p 　　　　☆
          /p 　　　　ST
          /p 　外D4H2D2毒　※毒が逆位置の場合反転
          /p MT組：マーカー1or4に出た毒に合わせて移動
          /p ST組：マーカー2or3に出た毒に合わせて移動
          /p AOEは外周に捨ててMT/STの位置で頭割り
          /p 【4部屋ベノムスプラッシュ：3個部屋の対角】
  `),
      },
      {
        name: "P5S WayMark",
        type: "place",
        place: [
          { Mark: "A", "X": 100.0, "Y": -300.0, "Z": 93.0, "ID": 0, "Active": true },
          { Mark: "B", "X": 107.0, "Y": -300.0, "Z": 100.0, "ID": 1, "Active": true },
          { Mark: "C", "X": 100.0, "Y": -300.0, "Z": 107.0, "ID": 2, "Active": true },
          { Mark: "D", "X": 93.0, "Y": -300.0, "Z": 100.0, "ID": 3, "Active": true },
          { Mark: "One", "X": 112.5, "Y": -300.0, "Z": 87.5, "ID": 4, "Active": true },
          { Mark: "Two", "X": 112.5, "Y": -300.0, "Z": 112.5, "ID": 5, "Active": true },
          { Mark: "Three", "X": 87.5, "Y": -300.0, "Z": 112.5, "ID": 6, "Active": true },
          { Mark: "Four", "X": 87.5, "Y": -300.0, "Z": 87.5, "ID": 7, "Active": true },
        ],
      },
    ],
    "1084": [
      {
        name: "P6S game8",
        type: "macro",
        text: cleanMacro(`
          /p ※MT組：MTH1D1D3 ST組：STH2D2D4
          /p 　【基本散開】　　【カヘキシー1回目】
          /p MT/D3　ST/D4 　 　 8　　 　 　8
          /p 　　 　 ★　　 　 　12　20 ★ 20　12
          /p H1/D1　H2/D2　　16 　 　 　 16
          /p 【 頭割り+扇範囲 】｜ 【4：4頭割り】
          /p 西：MT組 東：ST組｜西側→MT組 東側→ST組
          /p ※時計回りで頭割り｜※内周4マスを使用
          /p 【サイコロ】　　 　｜【チェンジバースト2回目】
          /p 西：奇数　　　　　｜西→T・H 東→DPS
          /p 東：偶数　　　　　｜※AOEも上記方向に捨てる
          /p 【カヘキシー2回目】
          /p 西：紫デバフ　東：緑デバフ
          /p 北・南外周マス→AoE　内周マス→頭割り
  `),
      },
      {
        name: "P6S WayMark",
        type: "place",
        place: [
          { Mark: "A", "X": 100.071, "Y": 0.0, "Z": 90.053, "ID": 0, "Active": true },
          { Mark: "B", "X": 110.043, "Y": 0.0, "Z": 99.861, "ID": 1, "Active": true },
          { Mark: "C", "X": 99.954, "Y": 0.0, "Z": 110.023, "ID": 2, "Active": true },
          { Mark: "D", "X": 89.937, "Y": 0.0, "Z": 99.946, "ID": 3, "Active": true },
          { Mark: "One", "X": 109.937, "Y": 0.0, "Z": 90.068, "ID": 4, "Active": true },
          { Mark: "Two", "X": 109.992, "Y": 0.0, "Z": 109.859, "ID": 5, "Active": true },
          { Mark: "Three", "X": 89.9, "Y": 0.0, "Z": 109.926, "ID": 6, "Active": true },
          { Mark: "Four", "X": 89.969, "Y": 0.0, "Z": 90.134, "ID": 7, "Active": true },
        ],
      },
    ],
    "1086": [
      {
        name: "P7S game8",
        type: "macro",
        text: cleanMacro(`
          /p MT組：MTH1D1D3　ST組：STH2D2D4
          /p 　【基本散開】　　　　　【ノックバック+鳥】
          /p MT/D1　ST/D2　　　　 D1　　 　 　 D2
          /p 　　 　 ★　　　　　　D3　 MT　 　ST　 D4
          /p H1/D3　H2/D4　　　　通路 　 　 　 通路
          /p 　　　　　　　　　　　H1　　　　　　　H2
          /p 【生命の果実：頭割り】　│【魔印創成：散開】
          /p 北側：MT組　南側：ST組 │基本散開※頭割りと被ったら通路
          /p 【エクサ+頭割り】　 　 　 │【鳥誘導＋塔】
          /p 西：MT組　東：ST組　　 │基本散開準拠でズレたら時計回り
          /p 【魔印創成：獄】
          /p 　 ▼西島▼　　　　　　　 　 ▼東島▼
          /p 頭割り　MT/D1 　 　 　 MT/D1　頭割り
          /p ST/D2　H2/D4　通路　H2/D4　ST/D2
          /p 　　　　H1/D3　 　　　H1/D3
  `),
      },
      {
        name: "P7S WayMark",
        type: "place",
        place: [
          { Mark: "A", "X": 114.29, "Y": 0.0, "Z": 83.0, "ID": 0, "Active": true },
          { Mark: "B", "X": 121.87, "Y": 0.0, "Z": 87.38, "ID": 1, "Active": true },
          { Mark: "C", "X": 121.87, "Y": 0.0, "Z": 96.13, "ID": 2, "Active": true },
          { Mark: "D", "X": 114.29, "Y": 0.0, "Z": 100.5, "ID": 3, "Active": true },
          { Mark: "One", "X": 85.71, "Y": 0.0, "Z": 83.0, "ID": 4, "Active": true },
          { Mark: "Two", "X": 78.13, "Y": 0.0, "Z": 87.38, "ID": 5, "Active": true },
          { Mark: "Three", "X": 78.13, "Y": 0.0, "Z": 96.13, "ID": 6, "Active": true },
          { Mark: "Four", "X": 85.71, "Y": 0.0, "Z": 100.5, "ID": 7, "Active": true },
        ],
      },
    ],
    "1088": [
      {
        name: "P8S game8门神",
        type: "macro",
        text: cleanMacro(`
          /p ■テトラオクタ/誘導/蛇2　 ■基本散会
          /p 　MT/D3　→　ST/D4　　　D3 MT D4
          /p 　　↑　　 ☆　　↓　 　　　H1(H2) ST
          /p 　H1/D1　←　H2/D2 　　D1 H2 D2
          /p ■イントゥシャドウ(1回目)
          /p 　蛇：北から時計回りMTD1>STD2>H1D3>H2D4
          /p ■フェイタルストンプ
          /p 　1,3回目→1(北西)　2,4回目→中央　待機→A(北)
          /p ■幻影創造
          /p ◎竜竜×散開　　　　 │◎フェニ×散開
          /p 　　　　D3　　　 　 │　D3 MT D4
          /p 　　　　MT　ST　D4│　H1 ☆ ST
          /p 　　H1 D1　D2　　 │　D1 H2 D2
          /p 　　　　　　 H2　　 │
          /p ■四重炎嵐(縦横) ｜■四重炎嵐(角)
          /p 　　　 MT　　　│　　中央　※MT組：西優先
          /p 　 D1 ST D2 　　｜T　近
          /p 　D3 H1 H2 D4 │遠　H
          /p ◎頭割り：近H位置(MTD1/STD2/H1D3/H2D4)
          /p ■イントゥシャドウ(2回目) 4:4頭割り
          /p 　デバフ持ち：北西>MT/D1>ST/D2>H1/D3>H2/D4>南東
          /p 　無職：北西TH/南東DPS
          /p ■テトラ/ディフレア
          /p 　テトラ：(ボス)MT/D1>ST/D2>H1/D3>H2/D4
          /p 　ディフレア：(ボス)MTH1D1D2>STH2D3D4
  `),
      },
      {
        name: "P8S game8本体",
        type: "macro",
        text: cleanMacro(`
          /p 【術式1回目(頭割は西)】【術式炎氷(TH西 DPS東) 】
          /p 　 　★　　　紫 　 ST│ ▼炎:中央前詰め　▼氷誘導
          /p D1 MT D2　　 MT　│ MT>ST >H1>H2 西 D1>ST
          /p H1　　H2　H1　D2│ D1>D2>D3>D4 東MT>D2
          /p D3 S T D4　 　 D1　│【術式2回目散開 】
          /p 　※左安置は　H2　D3│　STMT 紫 D3D1
          /p 　　左右反転→　 D4 　│　　 H1H2D4D2
          /p 【概念1回目①】　　【概念1回目②】
          /p 　　　　早α　　 　 │　　　遅α
          /p 複/遅α　　　　　　│
          /p 　　　　　　 早β 　│ 生物　　　　遅β
          /p 重/遅βγ　　　　　 │
          /p 　　　　早γ　　 　 │　　　遅γ
          /p ※4塔：遅αβγ→北で合成
          /p 　 　 　 複/重/早余り→南で合成
          /p 【万象灰燼：はいじあ/ビジョン式】
          /p 　　MT　　D1
          /p ST　 +　　　+　D2　※1,3番塔は前+で範囲捨て
          /p H1　+　　　+　D3　※2,4番塔は後+で範囲捨て
          /p 　 　H2　　D4
          /p 【概念2回目①】 　 　【概念2回目②】
          /p 　　 無/早α　　　 │　　　　遅α
          /p 単　　　　　 　 　 │ 生物
          /p 　　　　　　早β　│ ｲﾌ ｲﾌ　　　　遅β
          /p 複/遅　　　　　　 │ 生物
          /p 　　　 早γ 　　 　 │　　　　遅γ
          /p ※4塔：遅αβ→北で合成　遅γ/早余り→南で合成
          /p 【支配者の一撃】　　　　　【塔優先度】
          /p 　MTH1 D3 D1　西>MTSTH1H2D4D3D2D1>東
          /p 　ST H2 D4 D2
  `),
      },
      // {
      //   name: "P8S WayMark",
      //   type: "place",
      //   place: [
      //     { Mark: "A", "X": 100.0, "Y": 0.0, "Z": 85.0, "ID": 0, "Active": true },
      //     { Mark: "B", "X": 115.0, "Y": 0.0, "Z": 100.0, "ID": 1, "Active": true },
      //     { Mark: "C", "X": 100.0, "Y": 0.0, "Z": 115.0, "ID": 2, "Active": true },
      //     { Mark: "D", "X": 85.0, "Y": 0.0, "Z": 100.0, "ID": 3, "Active": true },
      //     { Mark: "One", "X": 110.0, "Y": 0.0, "Z": 90.0, "ID": 4, "Active": true },
      //     { Mark: "Two", "X": 110.0, "Y": 0.0, "Z": 110.0, "ID": 5, "Active": true },
      //     { Mark: "Three", "X": 90.0, "Y": 0.0, "Z": 110.0, "ID": 6, "Active": true },
      //     { Mark: "Four", "X": 90.0, "Y": 0.0, "Z": 90.0, "ID": 7, "Active": true },
      //   ],
      // },
    ],
  },
};
