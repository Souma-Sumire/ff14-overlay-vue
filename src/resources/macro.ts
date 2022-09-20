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
    "968": [
      {
        name: "莫古力P1",
        type: "macro",
        text: cleanMacro(`
          /p P1锁链点名 索尼 ｜ 白球冲锋：骑士12点，下半场躲避
          /p    △H  ×T   □T   ｜ 深仁厚泽打断：ST→远敏→MT
          /p    ○D          ○D   ｜ 钢铁：全维空间/月环：无维空间
          /p    □D  ×H  △D   ｜ P1.5引导：奶→远→近→T
          /p                              右 左 右 左
      `),
      },
      {
        name: "莫古力P2",
        type: "macro",
        text: cleanMacro(`
          /p 一运雷分散   ｜ 二运分组：D12补位
          /p         奶          ｜ MTH1       STH2
          /p    近  T  远     ｜  D1D3       D2D4
          /p  3C4D-MT组 |     2刀            1刀
          /p  1A2B-ST组  |     脚下           对面
          /p ————————————————
          /p              MTD1             ｜ 固定AC陨石整组换位（除非BD正好出现陨石）
          /p  H1D3            H2D4  ｜ 第一次踩塔：陨石＞DPS＞TN，对应塔：场外中左右＞场内左手
          /p              STD2              ｜ 第二次踩塔：陨石＞DPS＞TN，按换位后的组同色标点塔正＞斜
      `),
      },
      {
        name: "莫古力P3",
        type: "macro",
        text: cleanMacro(`
          /p 【莫古力龙诗站位宏P3】
          /p 牙尾的连旋：分摊-钢铁-月环
          /p 尾牙的连旋：分摊-月环-钢铁
          /p ————————————————
          /p 【麻将阶段】预站位｜【麻将阶段】小抄 
          /p               A               ｜  注意麻将组内点名，B上D下
          /p       4②       ②1       ｜ 处理麻将时请注意钢铁月环
          /p           ③③③           ｜ ①C：放塔-回人群-分摊-踩3塔-引导
          /p   B①          ①D    ｜  ①BD：放塔-回人群-踩2塔-引导-回人群-分摊
          /p       3      ①     2       ｜  ② BD：分摊-连旋-放塔-回人群-分摊-踩3塔-引导
          /p                C               ｜  ③BCD：分摊-踩1塔-引导-连旋-放塔-回人群
          /p ————————————————
          /p 【8人4塔阶段】 ｜ 4近战负责补塔，顺序：左→右→中
          /p MTD3      STD4 ｜组内只有1座塔，补位；组内超过2座塔，不动
          /p H1D1      H2D2｜死刑：MT接本体，ST接分身，本体/分身脚下处理
      `),
      },
      {
        name: "莫古力P4~P7",
        type: "macro",
        text: cleanMacro(`
          /p 【P4撞球阶段】      ｜【陨石流】D12→D34→第一轮点名
          /p 场中换色，DPS先撞｜ 左上角开始顺、逆时针数的第一个点名
          /p         MT    ST          ｜  MT       ST
          /p D12蓝      红D34    ｜       人群（蓝龙眼）
          /p         H1    H2         ｜  H2       H1
          /p ————————————————
          /p  【P5死宣+锁链】｜ 【P7接刀】D12→D34→H12
          /p   △无  X无  □无   ｜ 【死亡轮回/狂暴】BOSS面向！
          /p   ○死           ○死  ｜ H1D3D1           H2D4D2
          /p   □死  X无  △死   ｜                  MTST
          /p 【P6传毒】DTTDD最后一次原地，其他全部场中处理
          /p 【P6十字火阶段↓】｜ 【P6光翼死刑】MT固定中，ST找位置
          /p V字放地火，从场边跑到场中时的面向处理点名
          /p 攻击1 2 3 4 ←o→ 锁链2禁止2 锁链1禁止1
          /p 【P6双龙俯冲+P7地火左右出】MT去左，ST去右
      `),
      },
      {
        name: "莫古力减伤宏",
        type: "macro",
        text: cleanMacro(`
          /p 【莫古力龙诗减伤宏P1~P7】只安排目标减伤，场地减伤请队内自行沟通
          /p P1至圣：MT雪仇、D1牵制                     ｜P2古代爆震：MT雪仇、D1牵制、D4昏乱
          /p P1锁链点名：ST雪仇、D2牵制、D4昏乱｜P2碎屏斩：ST雪仇、D2牵制、D4昏乱
          /p ————————————————
          /p P3第一次连旋：MT雪仇、D1牵制               ｜P4陨石流：给不给都可以
          /p P3第二次连旋：ST雪仇、D2牵制、D4昏乱 ｜P4.5纯洁心灵：ST雪仇、D2牵制、D4昏乱
          /p ————————————————
          /p P5第一次古代爆震：MT雪仇、D1牵制              ｜P6两次血量检测：MT雪仇
          /p P5第二次古代爆震：ST雪仇、D2牵制、D4昏乱｜P6死亡轮回：ST雪仇、D1牵制、D4昏乱
          /p ————————————————
          /p 转场，超大AOE注意减伤嗷！别好不容易要进P7了结果噶了嗷！MTST给D34减伤，H12D12开特色减伤，龙骑找奶妈要
          /p ————————————————
          /p P7第一次死亡轮回：MT雪仇、D1牵制、D4昏乱  ｜P7第一次陨石：ST雪仇、D2牵制
          /p P7第二次死亡轮回：MT雪仇                 ｜P7第二次陨石：ST雪仇  、D1牵制、D4昏乱
          /p P7第三次死亡轮回：别看了！有什么给什么！留着过年吗？
          （如果觉得第二次死亡轮回的压力过大，可以考虑2死亡轮回D2牵制）
      `),
      },
      {
        name: `陨石逃课宏 需要连打+锁60帧 ${getSource("https://docs.qq.com/doc/DSkpLTVNTT2doT2Rz")}`,
        type: "macro",
        text: cleanMacro(`
          /mlock
          /merror off
          /automove on <wait.1>
          /automove off
          /echo
          /echo
          /echo
          /echo
          /echo
          /echo
          /echo
          /echo
          /echo
          /echo
          /echo
      `),
      },
      {
        name: "陨石宏 竹取辉夜姬",
        type: "macro",
        text: cleanMacro(`
          /automove on <wait.1>
          /automove off
      `),
      },
      {
        name: "黑色分散buff-攻击标",
        type: "macro",
        text: cleanMacro(`
          /macrolock
          /macroicon attack1 marking
          /mk attack <me>
          /wait 1
      `),
      },
      {
        name: "白色分摊buff-锁链标",
        type: "macro",
        text: cleanMacro(`
          /macrolock
          /macroicon bind1 marking
          /mk bind <me>
          /wait 1
      `),
      },
      {
        name: "无buff-禁止标",
        type: "macro",
        text: cleanMacro(`
          /macrolock
          /macroicon stop1 marking
          /mk stop <me>
          /wait 1
      `),
      },
      {
        name: "一键清除标记",
        type: "macro",
        text: cleanMacro(`
          /mk attack1 <attack1>
          /mk attack2 <attack2>
          /mk attack3 <attack3>
          /mk attack4 <attack4>
          /mk attack5 <attack5>
          /mk bind1 <bind1>
          /mk bind2 <bind2>
          /mk bind3 <bind3>
          /mk stop1 <stop1>
          /mk stop2 <stop2>
      `),
      },
      {
        name: "P1 门神",
        type: "place",
        place: [
          { Mark: "A", "X": 94.265, "Y": 0.0, "Z": 90.057, "ID": 0, "Active": true },
          { Mark: "B", "X": 105.559, "Y": 0.0, "Z": 89.944, "ID": 1, "Active": true },
          { Mark: "C", "X": 105.687, "Y": 0.0, "Z": 109.95, "ID": 2, "Active": true },
          { Mark: "D", "X": 94.363, "Y": 0.0, "Z": 109.892, "ID": 3, "Active": true },
          { Mark: "One", "X": 89.994, "Y": 0.0, "Z": 94.231, "ID": 4, "Active": true },
          { Mark: "Two", "X": 110.13, "Y": 0.0, "Z": 94.36, "ID": 5, "Active": true },
          { Mark: "Three", "X": 110.003, "Y": 0.0, "Z": 105.871, "ID": 6, "Active": true },
          { Mark: "Four", "X": 90.049, "Y": 0.0, "Z": 105.51, "ID": 7, "Active": true },
        ],
      },
      {
        name: `P2 竹取辉夜姬 ${getSource("https://nga.178.com/read.php?tid=31807681")}`,
        type: "place",
        place: [
          { Mark: "A", "X": 100.0, "Y": 0.0, "Z": 86.8, "ID": 0, "Active": true },
          { Mark: "B", "X": 113.2, "Y": 0.0, "Z": 100.0, "ID": 1, "Active": true },
          { Mark: "C", "X": 100.0, "Y": 0.0, "Z": 113.2, "ID": 2, "Active": true },
          { Mark: "D", "X": 86.8, "Y": 0.0, "Z": 100.0, "ID": 3, "Active": true },
          { Mark: "One", "X": 109.333809, "Y": 0.0, "Z": 90.66619, "ID": 4, "Active": true },
          { Mark: "Two", "X": 109.333809, "Y": 0.0, "Z": 109.333809, "ID": 5, "Active": true },
          { Mark: "Three", "X": 90.66619, "Y": 0.0, "Z": 109.333809, "ID": 6, "Active": true },
          { Mark: "Four", "X": 90.66619, "Y": 0.0, "Z": 90.66619, "ID": 7, "Active": true },
        ],
      },
    ],
  },
};

function getSource(href: string) {
  return `<a href='${href}' target='_blank'>出处</a>`;
}
