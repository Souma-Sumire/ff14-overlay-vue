import type { Lang } from '@/types/lang'

type MapKey = 'PT' | 'EO' | 'HoH' | 'PotD'

type langString = Partial<Record<Lang, string>>

type EnemyData = {
  // 难度： 简单       小心       危险
  grade?: 'easy' | 'caution' | 'danger'
  // 感知：  视觉       听觉        范围       BOSS
  detect?: 'visual' | 'auditory' | 'scope' | 'boss'
  // 攻略笔记。中文用户可直接写字符串。
  // If your native language is not Chinese and you wish to submit translations.
  // Please format it like this: {zhCn:'中文笔记', en:'English note', ja:'日本語の備考', zhTw:'中文備註'}}
  // This instruction also applies to FloorTips.

  // 如果你正在提交PR：请按照以下格式提交：
  // 若怪物只有一种能力，直接写能力效果，例如：读条小扇形
  // 若怪物存在复数能力且初始释放顺序有规律。请按格式“技能名称：技能效果”填写，并按照初始释放顺序排列。例如：“吸气：吸引 \n蛮力金刚臂：钢铁”
  // 若怪物存在复数能力且初始释放顺序无规律。请按照技能威胁值从低到高排序，并按格式“技能名称：技能效果”填写。例如：“野蛮咬：小死刑 \n黑暗神圣：点名某人的大黄圈\n生命停止：极快的前方超大扇形！”
  // 若怪物是巡逻怪，请在第一行写'巡逻怪\n'后面再跟上能力效果。例如：“巡逻怪\n读条小扇形”
  // 若多个怪物拥有相同的机制（不光是你提交的部分，还包括现有数据），请保持全程术语的一致性。
  // 请全程使用中文半角标点符号。
  note?: string | langString
  // 抗性弱点
  vulnerabilities?: {
    // 眩晕
    stun?: boolean
    // 减速
    slow?: boolean
    // 沉睡
    sleep?: boolean
    // 加重
    heavy?: boolean
    // 止步
    bind?: boolean
  }
}

type EnemiesData = Record<number, EnemyData>
type FloorTips = Record<number, string | langString>

type DDInfo = { enemiesData: EnemiesData; floorTips: FloorTips }

type Data = { zoneIDs: number[] } & DDInfo

const EO: Data = {
  zoneIDs: [1099, 1100, 1101, 1102, 1103, 1104, 1105, 1106, 1107, 1108],
  enemiesData: {
    12100: { grade: 'caution', detect: 'boss' }, // 斗神 王者之剑
    12102: { grade: 'caution', detect: 'boss' }, // 管理者
    12106: { grade: 'easy', detect: 'visual', vulnerabilities: { slow: true, sleep: true, heavy: false, bind: false } }, // 正统尸龙
    12107: { grade: 'easy', detect: 'auditory', vulnerabilities: { stun: true, slow: true, heavy: true, bind: true } }, // 正统塔纳托斯
    12108: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: false, slow: true, sleep: true } }, // 正统梦魔
    12109: { grade: 'caution', detect: 'visual', note: '对一仇目标读条击退攻击(防击退有效)；血量40%以下读条黄道陨石(大范围AOE)，可隔墙躲避', vulnerabilities: { heavy: false, bind: false } }, // 正统贝希摩斯
    12110: { grade: 'caution', detect: 'visual', note: '读条后半可见钢铁AOE', vulnerabilities: { stun: true, slow: true, heavy: true, bind: false } }, // 正统榴弹怪
    12111: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: false } }, // 正统扎哈克
    12112: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, sleep: true } }, // 正统小魔精
    12113: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: true, slow: true, sleep: true } }, // 正统恶魔
    12114: { grade: 'easy', detect: 'visual', vulnerabilities: { sleep: true, bind: false, slow: false, heavy: false } }, // 正统幽鬼之眼
    12115: { grade: 'easy', detect: 'visual', vulnerabilities: { slow: true, heavy: false, bind: false } }, // 正统瓦沙克
    12116: { grade: 'easy', detect: 'auditory', note: '对一仇目标释放病弱debuff，可打断', vulnerabilities: { stun: true, sleep: true, bind: false, heavy: true, slow: true } }, // 正统浮灵
    12117: { grade: 'easy', detect: 'scope', note: '无法催眠', vulnerabilities: { stun: true, heavy: true, slow: true, sleep: false, bind: false } }, // 正统钢铁之爪
    12118: { grade: 'easy', detect: 'scope', vulnerabilities: { stun: true, heavy: true, bind: false, slow: false } }, // 正统水元精
    12119: { grade: 'easy', detect: 'visual', vulnerabilities: { slow: true, heavy: false, bind: false } }, // 正统猎手
    12120: { grade: 'easy', detect: 'scope', vulnerabilities: { heavy: true, bind: false } }, // 正统系统β
    12121: { grade: 'easy', detect: 'scope', vulnerabilities: { stun: true } }, // 正统微型系统
    12122: { grade: 'easy', detect: 'visual', vulnerabilities: { heavy: false, bind: false } }, // 正统士兵
    12123: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 正统树木巨像
    12124: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 正统坐镇巨像
    12125: { grade: 'easy', detect: 'visual', vulnerabilities: { slow: true, heavy: false, bind: false } }, // 正统王冠
    12126: { grade: 'easy', detect: 'visual', vulnerabilities: { slow: true, heavy: true, bind: true } }, // 正统大王花
    12127: { grade: 'easy', detect: 'visual', vulnerabilities: { slow: true, heavy: false, bind: false } }, // 正统锯齿花
    12128: { grade: 'easy', detect: 'visual', vulnerabilities: { slow: true, heavy: true, bind: true } }, // 正统胜利
    12129: { grade: 'easy', detect: 'visual', vulnerabilities: { slow: true, heavy: true, bind: true } }, // 正统螺旋藻
    12130: { grade: 'easy', detect: 'visual', vulnerabilities: { heavy: true, bind: false } }, // 正统大魔界花
    12131: { grade: 'easy', detect: 'visual', vulnerabilities: { heavy: true, bind: true } }, // 正统剧毒美人
    12132: { grade: 'caution', detect: 'scope', note: '血量30%以下读条大范围AOE雾散爆发，可隔墙躲避\n无法眩晕', vulnerabilities: { stun: false, bind: false, heavy: false } }, // 正统破坏者
    12133: { grade: 'caution', detect: 'visual', note: '大范围吸引，防击退有效，随后释放不可见钢铁AOE\n无法眩晕', vulnerabilities: { stun: false, bind: false, heavy: false } }, // 正统骑士
    12134: { grade: 'easy', detect: 'visual', note: '无仇恨读条点名黄圈', vulnerabilities: { stun: true, slow: false, heavy: true } }, // 正统机甲
    12135: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, slow: true, heavy: true, bind: true } }, // 正统铁巨人
    12136: { grade: 'easy', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false } }, // 正统卡利亚
    12137: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 正统雷蛟
    12138: { grade: 'caution', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统小龙
    12139: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, slow: true, bind: false } }, // 正统双足飞龙
    12140: { grade: 'easy', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统蓝龙
    12141: { grade: 'easy', detect: 'visual', note: '无仇恨读条大范围AOE，命中附加易伤debuff', vulnerabilities: { stun: true, slow: true, heavy: true, bind: false } }, // 正统薇薇尔飞龙
    12142: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 正统布罗宾雅克
    12143: { grade: 'caution', detect: 'visual', note: '近战范围钢铁，吃到被击退并击晕，随后秒杀眩晕中的玩家\n无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统婆那罗
    12144: { grade: 'easy', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统龟甲龙
    12145: { grade: 'easy', detect: 'scope', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统发条虫
    12146: { grade: 'caution', detect: 'auditory', note: '释放钢铁AOE，命中后附加缩小debuff；秒杀缩小的玩家，穿无敌', vulnerabilities: { stun: true, heavy: true, sleep: true } }, // 正统蜘蛛
    12147: { grade: 'caution', detect: 'visual', note: '赋予自己一分钟的加速buff\n无法眩晕', vulnerabilities: { stun: false, slow: true, heavy: false, bind: false } }, // 正统铁血战士
    12148: { grade: 'danger', detect: 'visual', note: '随机面向一名玩家释放正面超大范围AOE；释放钢铁AOE\n无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统幻影光
    12149: { grade: 'caution', detect: 'visual', note: '读条石化视线，随后点名黄圈', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统镜骑士
    12150: { grade: 'caution', detect: 'visual', note: '不可见钢铁AOE；正面扇形AOE；\n不吃战技封印，无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统弥诺陶洛斯
    12151: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: true, slow: true } }, // 正统爬虫半人马
    12152: { grade: 'danger', detect: 'scope', note: '释放不可见月环AOE、钢铁AOE\n无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false, slow: true } }, // 正统奇美拉
    12153: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: true, slow: true } }, // 正统沙布提
    12154: { grade: 'easy', detect: 'visual', note: '点名黄圈；给附近一只怪赋予伤害提升一倍buff', vulnerabilities: { stun: true, heavy: true, bind: false, slow: true } }, // 正统改造鸟人
    12155: { grade: 'caution', detect: 'visual', note: '正面石化视线', vulnerabilities: { stun: true, heavy: true, bind: false } }, // 正统那迦
    12156: { grade: 'caution', detect: 'auditory', note: '正面范围不可见扇形AOE击退，偶尔绕到玩家背后读条', vulnerabilities: { stun: true, heavy: true, bind: true, slow: true } }, // 正统疫虫
    12157: { grade: 'easy', detect: 'visual', vulnerabilities: { heavy: true, bind: true, slow: true } }, // 正统拉米亚
    12158: { grade: 'caution', detect: 'visual', note: '血量30%以下读条自爆，释放不可见大范围AOE，可隔墙躲避\n无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统明胶怪
    12159: { grade: 'caution', detect: 'visual', note: '赋予自己一分钟的加速buff', vulnerabilities: { stun: true, slow: true, heavy: true, bind: true } }, // 正统魔石精
    12160: { grade: 'caution', detect: 'scope', note: '背后不可见扇形AOE；点名黄圈', vulnerabilities: { stun: true, heavy: true, bind: true, slow: true } }, // 正统山巨魔
    12161: { grade: 'easy', detect: 'scope', vulnerabilities: { stun: true, heavy: true, bind: false, slow: false } }, // 正统阿帕斯
    12162: { grade: 'caution', detect: 'visual', note: '点名冲锋，随后快速读条钢铁', vulnerabilities: { stun: true, heavy: true } }, // 正统凯尔派
    12163: { grade: 'easy', detect: 'visual', note: '无仇恨读条释放大范围AOE，命中附加易伤debuff', vulnerabilities: { stun: true, slow: true, heavy: true, bind: false } }, // 正统库库尔坎
    12164: { grade: 'danger', detect: 'visual', note: '释放不可见全屏AOE，只可隔墙躲避，命中眩晕5秒，扑向并秒杀眩晕玩家\n无法眩晕', vulnerabilities: { stun: false, slow: false, heavy: false, bind: false } }, // 正统霜狼
    12165: { grade: 'easy', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统胡瓦西
    12166: { grade: 'danger', detect: 'visual', note: '读条释放不可见全屏秒杀AOE，可插言打断或隔墙躲避；释放正面可见扇形AOE\n无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统阿刻戎
    12167: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: false } }, // 正统阿巴伊
    12168: { grade: 'caution', detect: 'visual', note: '正面无读条吸引，然后释放正面不可见扇形AOE', vulnerabilities: { heavy: false, bind: false } }, // 正统古菩猩猩
    12169: { grade: 'easy', detect: 'visual', note: '每隔一段时间对玩家附加减速效果；点名可见长直线攻击', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统赫德提特
    12170: { grade: 'easy', detect: 'scope', note: '无读条钢铁，伤害不高但会附加加重debuff', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统土泥人
    12171: { grade: 'easy', detect: 'scope', vulnerabilities: { stun: true, heavy: true, bind: false } }, // 正统班西
    12172: { grade: 'caution', detect: 'scope', note: '吸引后钢铁，防击退有效\n无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false, slow: true } }, // 正统鬼鱼
    12173: { grade: 'caution', detect: 'visual', note: '跳到玩家释放半房间击退，紧接月环或钢铁; 点名AOE', vulnerabilities: { stun: true, heavy: true, bind: false } }, // 正统刺魟
    12174: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统俄刻阿诺斯
    12175: { grade: 'easy', detect: 'visual', note: '背后扇形AOE', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统大螯陆蟹
    12176: { grade: 'caution', detect: 'visual', note: '加重紧接螺旋尾，血量降至1\n无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统虾蛄
    12177: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统皮拉鱼
    12178: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统水蛭
    12179: { grade: 'caution', detect: 'auditory', note: '向前或后释放半圆AOE，然后立刻对反方向释放一次', vulnerabilities: { stun: true, heavy: true, bind: false } }, // 正统扎拉坦
    12180: { grade: 'caution', detect: 'visual', note: '死亡后爆炸(不可见钢铁AOE)\n无法眩晕', vulnerabilities: { stun: false, heavy: true, bind: false, slow: false } }, // 正统冰元精
    12181: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: false } }, // 正统爆弹鱼
    12182: { grade: 'caution', detect: 'visual', note: '点名读条释放秒杀直线冲锋，卡障碍物躲避(不穿无敌)\n无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false, slow: true } }, // 正统石鳍鲨
    12183: { grade: 'caution', detect: 'visual', note: '读条上物理反伤Buff，受到物理攻击秒杀玩家', vulnerabilities: { stun: true, heavy: true } }, // 正统尤弥尔
    12184: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统翼蜥
    12185: { grade: 'caution', detect: 'visual', note: '读条上物理反伤Buff，受到物理攻击秒杀玩家', vulnerabilities: { stun: true } }, // 正统烈阳火蛟
    12186: { grade: 'easy', detect: 'visual', note: '死亡立即爆炸，近距离易伤', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统眼镜蛇
    12187: { grade: 'easy', detect: 'visual', vulnerabilities: { heavy: true, bind: false } }, // 正统飞巨蜥
    12188: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统阿那罗
    12189: { grade: 'caution', detect: 'scope', note: 'AOE让命中怪物获得闪避Buff', vulnerabilities: { heavy: false, bind: false } }, // 正统笠头螈
    12190: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统石蜥蜴
    12191: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true } }, // 正统玛塔蛇颈龟
    12192: { grade: 'caution', detect: 'visual', note: '拉近紧接钢铁', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统侏儒避役
    12193: { grade: 'danger', detect: 'visual', note: '近战范围安全的环形AOE', vulnerabilities: { stun: true } }, // 正统法拉克
    12194: { grade: 'caution', detect: 'visual', note: '看动作正、反面扇形AOE\n无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统高牢怪龙
    12195: { grade: 'caution', detect: 'scope', note: '斩杀血量低于20%\n无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false, slow: true } }, // 正统忍者
    12196: { grade: 'easy', detect: 'visual', note: '击退', vulnerabilities: { slow: true, heavy: true, bind: true } }, // 正统哈奥卡
    12197: { grade: 'easy', detect: 'visual', note: '释放正面小扇形AOE，附加减速debuff', vulnerabilities: { stun: true, heavy: true, bind: false } }, // 正统巨嘴鸟
    12198: { grade: 'caution', detect: 'auditory', note: '无读条钢铁', vulnerabilities: { stun: true } }, // 正统斯卡尼特
    12199: { grade: 'caution', detect: 'visual', note: '对一仇三连冲锋击退；点名黄圈', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统独角兽
    12200: { grade: 'danger', detect: 'visual', note: '正面、背面大范围扇形AOE，侧面安全', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统长须豹
    12201: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统凶狼
    12202: { grade: 'caution', detect: 'visual', note: '双重顺劈第二下无读条', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统狼獾
    12203: { grade: 'danger', detect: 'visual', note: '无仇恨时读条释放超大AOE', vulnerabilities: { stun: true, heavy: true, bind: false } }, // 正统大脚巨猿
    12204: { grade: 'caution', detect: 'visual', note: '冲锋接钢铁', vulnerabilities: { stun: true, heavy: true, bind: false } }, // 正统曙象
    12205: { grade: 'caution', detect: 'scope', note: '斩杀血量低于20%\n无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统女忍
    12206: { grade: 'caution', detect: 'visual', note: '全屏AOE，背对回避', vulnerabilities: { stun: true, heavy: true, bind: false } }, // 正统妖鸟
    12207: { grade: 'danger', detect: 'visual', note: '1)无读条月环; 2) 无读条钢铁，会摇尾巴\n无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统雷兽
    12208: { grade: 'caution', detect: 'visual', note: '正面宽条形AOE，穿墙！\n无法眩晕', vulnerabilities: { stun: false } }, // 正统焰兽
    12209: { grade: 'danger', detect: 'visual', note: '两次自由落体后大AOE，需要卡墙或眩晕', vulnerabilities: { stun: true, heavy: true } }, // 正统卡尔加斯
    12210: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统深瞳
    12211: { grade: 'easy', detect: 'visual', note: '点名大黄圈，接读条中距离扇形AOE', vulnerabilities: { stun: true } }, // 正统地生人
    12212: { grade: 'danger', detect: 'auditory', note: '读条近距离可背对AOE；读条超大范围钢铁\n无法眩晕', vulnerabilities: { stun: false } }, // 正统百目妖
    12213: { grade: 'caution', detect: 'visual', note: '转向玩家释放超大扇形AOE；点名黄圈\n无法眩晕', vulnerabilities: { stun: false } }, // 正统软糊怪
    12214: { grade: 'easy', detect: 'scope', note: '正面60°扇形AOE；瞬移读条钢铁\n无法眩晕', vulnerabilities: { stun: false } }, // 正统假面
    12215: { grade: 'caution', detect: 'scope', note: '无法眩晕', vulnerabilities: { stun: false } }, // 正统贪吃鬼
    12216: { grade: 'caution', detect: 'visual', note: '正面宽条形AOE', vulnerabilities: { stun: true } }, // 正统冥鬼之眼
    12217: { grade: 'easy', detect: 'scope', note: '无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统铁面腐尸
    12218: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: false } }, // 正统卡托布莱帕斯
    12219: { grade: 'caution', detect: 'visual', note: '正面60°扇形AOE；瞬移读条钢铁', vulnerabilities: { stun: true } }, // 正统黑天马
    12220: { grade: 'caution', detect: 'scope', note: '20m钢铁\n无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统幽灵
    12221: { grade: 'danger', detect: 'scope', note: '左右210°扇形AOE；月环、钢铁\n无法眩晕', vulnerabilities: { stun: false } }, // 正统妖影
    12222: { grade: 'easy', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false } }, // 正统深渊
    12223: { grade: 'easy', detect: 'scope', note: '死亡读条钢铁\n无法眩晕', vulnerabilities: { stun: false } }, // 正统无人机
    12224: { grade: 'caution', detect: 'scope', note: '可打断超大范围AOE；钢铁\n无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统系统γ
    12225: { grade: 'easy', detect: 'scope', note: '正面270° AOE', vulnerabilities: { stun: true } }, // 正统米特里达梯
    12226: { grade: 'caution', detect: 'visual', note: '正面120°扇形；读条强化物理伤害60秒', vulnerabilities: { stun: true } }, // 正统恐慌装甲
    12227: { grade: 'caution', detect: 'visual', note: '无仇恨读条大范围AOE；近战全屏可背对AOE，对混乱玩家接超大AOE\n无法眩晕', vulnerabilities: { stun: false } }, // 正统整备工
    12228: { grade: 'easy', detect: 'visual', note: '全屏可背对AOE；正面60°扇形AOE\n无法眩晕', vulnerabilities: { stun: false } }, // 正统斯芬克斯
    12229: { grade: 'easy', detect: 'scope', note: '正面150°扇形AOE', vulnerabilities: { stun: true, heavy: true, bind: false } }, // 正统系统α
    12230: { grade: 'caution', detect: 'visual', note: '无仇恨读条大范围AOE；点名AOE击退非点名\n无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统扎戈斧龙
    12231: { grade: 'easy', detect: 'auditory', note: '4次随机冲锋击退，接正面半场AOE', vulnerabilities: { stun: true, heavy: false, bind: false } }, // 正统采掘无人机
    12232: { grade: 'easy', detect: 'scope', note: '点名黄圈；正面直线攻击', vulnerabilities: { stun: true } }, // 正统浮游炮主板
    12233: { grade: 'danger', detect: 'visual', note: '左右读条120°扇形AOE；\n后面快速读条90°扇形AOE；\n冲锋接钢铁或月环\n无法眩晕', vulnerabilities: { stun: false } }, // 正统自控化奇美拉
    12234: { grade: 'caution', detect: 'visual', note: '正面60°扇形AOE；冲锋接钢铁\n无法眩晕', vulnerabilities: { stun: false, heavy: false, bind: false } }, // 正统自控化弥诺陶洛斯
    12235: { grade: 'caution', detect: 'scope', note: '正面扇形AOE；随机点名读条混乱3秒，对混乱玩家紧接黄圈或扇形\n无法眩晕', vulnerabilities: { stun: false } }, // 正统杜尔迦
    12240: { grade: 'easy', detect: 'boss' }, // 蜜言妖
    12242: { grade: 'easy', detect: 'boss' }, // 提亚马特复制体
    12246: { grade: 'caution', detect: 'boss' }, // 永恒
    12247: { grade: 'caution', detect: 'boss', note: '1) 半场顺劈，正面安全;\n2) 在BOSS下方和外环生成即死区域' }, // 原型卡利亚
    12261: { grade: 'caution', detect: 'boss' }, // 复制系统
    12263: { grade: 'caution', detect: 'boss', note: '1) 旋风,读条结束时移动躲避\n2) 俯冲,躲避俯冲的同时躲避旋风\n3) 生成4次需要躲避的风圈' }, // 双塔尼亚复制体
    12265: { grade: 'caution', detect: 'boss', note: '半屏顺劈；拉球，直到球消失' }, // 自控化奇美拉14X
    12267: { grade: 'caution', detect: 'boss', note: '1) 八连斩\n2) 咆哮 - 击退，需要在BOSS目标圈内' }, // 自控化弥诺陶洛斯16
    12318: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 正统裂钳蟹
    12322: { grade: 'caution', detect: 'visual', note: '击杀获得生命恢复；\n顺劈叠加生命恢复，上限8层；\n读条石化可背对；读条钢铁' }, // 拉米亚女王
    12323: { grade: 'caution', detect: 'visual', note: '击杀获得伤害上升；\n读条提升伤害可打断；\n读条AOE可卡墙躲避' }, // 美拉西迪亚复制体
    12324: { grade: 'caution', detect: 'visual', note: '击杀获得受伤减轻；\n顺劈叠加受伤减轻，上限8层；\n读条AOE可卡墙躲避' }, // 亚灵智慧之灵
  },
  floorTips: {
    0: '第1~10层：铜宝箱会刷出宝箱怪\nAOE比死宫、天宫的1-10层伤害高。第7层开始刷亚灵、解咒、解除、大漩涡、重生、泥头车',
    1: '第11~20层：铜宝箱会刷出宝箱怪',
    2: '第21~30层：铜宝箱会刷出宝箱怪',
    3: '第31~40层：银宝箱会刷出宝箱怪',
    4: '第41~50层：银宝箱会刷出宝箱怪\n注意巡逻怪',
    5: '第51~60层：银宝箱会刷出宝箱怪\n第57-59层击退无效几率很高',
    6: '第61~70层：金宝箱会刷出宝箱怪',
    7: '第71~80层：金宝箱会刷出宝箱怪\n第71-73层有很高概率刷出地雷。\n第76-79层当心猩猩的全屏AOE。\n房间内水晶不能用来卡墙躲技能。',
    8: '第81~90层：金宝箱会刷出宝箱怪\n没有墙，没法卡墙躲技能',
    9: '第91~100层：金宝箱会刷出宝箱怪\n巡逻怪都带大AOE。还有斧龙、整备工两种怪无仇恨读条大AOE',
  },
}

const HoH: Data = {
  zoneIDs: [770, 771, 772, 782, 773, 783, 774, 784, 775, 785],
  enemiesData: {
    // HoH floors 1-10
    7262: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之无壳观梦螺
    7263: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之鯥鮟鱇
    7264: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之刺球爆弹怪
    7265: { grade: 'danger', detect: 'scope' }, // 天之怨灵
    7266: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之珊瑚壳
    7267: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之牛鬼
    7268: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之蟒蛇
    7269: { grade: 'easy', detect: 'scope', vulnerabilities: { stun: true } }, // 天之蛸入道
    7270: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之安居鮟鱇
    7271: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之玛塔蛇颈龟
    7272: { grade: 'danger', detect: 'visual', vulnerabilities: { stun: true } }, // 天之飞鲨
    7273: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之切网虾蛄
    7274: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之观梦螺

    // HoH floors 11-20
    7275: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之叶小妖
    7276: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之滴
    7277: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之盐虫
    7278: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之一日蛇
    7279: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之甲鲎
    7280: { grade: 'easy', detect: 'scope', vulnerabilities: { stun: true } }, // 天之阿帕斯
    7281: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之巨蜥
    7282: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之龙之子
    7283: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之盐尝
    7284: { grade: 'easy', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false } }, // 天之祈雨龟
    7285: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之鲶鱼精
    7286: { grade: 'danger', detect: 'visual', vulnerabilities: { stun: true } }, // 天之右手
    7287: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之盐蓝燕

    // HoH floors 21-30
    7288: { grade: 'easy', detect: 'scope', vulnerabilities: { stun: true } }, // 天之鬼火
    7289: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之刺草球
    7290: { grade: 'easy', detect: 'scope', vulnerabilities: { stun: true } }, // 天之陀鲁婆
    7291: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之赛太岁
    7292: { grade: 'caution', detect: 'scope', vulnerabilities: { stun: true } }, // 天之旗本
    7293: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之长手精
    7294: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之毛羽毛现
    7295: { grade: 'caution', detect: 'scope', vulnerabilities: { stun: true } }, // 天之幽鬼
    7296: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之鸦天狗
    7297: { grade: 'easy', detect: 'auditory', vulnerabilities: { stun: true } }, // 天之高加颅
    7298: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之片轮车
    7299: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之面灵气
    7300: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之轮入道

    // HoH floors 31-40
    7301: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之獦狚
    7302: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之红角犀鸟
    7303: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之般若
    7304: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之切腹般若
    7305: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之隐密
    7306: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之猛虎
    7307: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之猛禽
    7308: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之清房
    7309: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之足轻
    7310: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之狮子
    7311: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之隐密
    7312: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之婆那罗
    7313: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之土偶

    // HoH floors 41-50
    7314: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之骰子
    7315: { grade: 'easy', detect: 'scope', vulnerabilities: { stun: true } }, // 天之岩石
    7316: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之陀罗
    7317: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之石像
    7318: { grade: 'caution', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false } }, // 天之石板
    7319: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之骰子
    7320: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之异石
    7321: { grade: 'easy', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false } }, // 天之赤岩
    7322: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之物岩
    7323: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之异石
    7324: { grade: 'caution', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false } }, // 天之黑兔
    7325: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之石像
    7326: { grade: 'caution', detect: 'auditory', vulnerabilities: { stun: true } }, // 天之仙女虫

    // HoH floors 51-60
    7327: { grade: 'caution', detect: 'auditory', vulnerabilities: { stun: true } }, // 天之鸣釜
    7328: { grade: 'caution', detect: 'auditory', vulnerabilities: { stun: true } }, // 天之螳螂
    7329: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之牙蜥
    7330: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之金刚铃
    7331: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之铁爪
    7332: { grade: 'caution', detect: 'scope', vulnerabilities: { stun: true } }, // 天之圆石
    7333: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之机关人
    7334: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之沙布提
    7335: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之铁臂
    7336: { grade: 'caution', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false } }, // 天之无厘头
    7337: { grade: 'danger', detect: 'visual', vulnerabilities: { stun: true } }, // 天之那迦
    7338: { grade: 'easy', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false } }, // 天之铁巨人
    7339: { grade: 'easy', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false } }, // 天之无畏

    // HoH floors 61-70
    7340: { grade: 'caution', detect: 'auditory', vulnerabilities: { stun: true } }, // 天之嫩草
    7341: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之万年草
    7342: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之岩虫
    7343: { grade: 'caution', detect: 'scope', vulnerabilities: { stun: true } }, // 天之海滨水母
    7344: { grade: 'easy', detect: 'auditory', vulnerabilities: { stun: true } }, // 天之毒芹
    7345: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之小袖贝
    7346: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之尸生花
    7347: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之东莨菪
    7348: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之彭侯
    7349: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之树木子
    7350: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之魔界花
    7351: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之血樱

    // HoH floors 71-80
    7352: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之四九火
    7353: { grade: 'caution', detect: 'scope', vulnerabilities: { stun: true } }, // 天之生邪魔
    7354: { grade: 'easy', detect: 'visual', vulnerabilities: { stun: true } }, // 天之野山羊
    7355: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之狼
    7356: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之雪蜥
    7357: { grade: 'danger', detect: 'visual', note: '未进战斗时释放大范围AOE，吸引玩家后释放正面AOE\n无法眩晕', vulnerabilities: { stun: false } }, // 天之长毛象
    7358: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之豆腐
    7359: { grade: 'danger', detect: 'scope', vulnerabilities: { stun: true } }, // 天之狮鹫
    7360: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之雪人
    7361: { grade: 'caution', detect: 'visual', note: '吸引攻击，大范围AOE，会狂暴\n无法眩晕', vulnerabilities: { stun: false } }, // 天之牦牛
    7362: { grade: 'caution', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false } }, // 天之冰牙
    7363: { grade: 'easy', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false } }, // 天之冰山
    7364: { grade: 'danger', detect: 'visual', note: '双重攻击，大范围AOE', vulnerabilities: { stun: true } }, // 天之白狮

    // HoH floors 81-89
    7365: { grade: 'caution', detect: 'scope', note: '寒冰远离，雷电靠近，可打断', vulnerabilities: { sleep: true, slow: true } }, // 天之送狼
    7366: { grade: 'caution', detect: 'visual', note: '未进战斗时吃香蕉会提升自身伤害，会对视野内玩家释放AOE并叠加易伤', vulnerabilities: { sleep: true, slow: true } }, // 天之老猿
    7367: { grade: 'easy', detect: 'visual', note: '开怪时冲锋', vulnerabilities: { sleep: true, slow: true } }, // 天之象魔
    7368: { grade: 'caution', detect: 'visual', note: '面向随机玩家释放大范围扇形AOE，邪眼攻击', vulnerabilities: { sleep: true, slow: true } }, // 天之牛头
    7369: { grade: 'easy', detect: 'visual', note: '圆形AOE，未进战斗时也会使用', vulnerabilities: { sleep: true, slow: true } }, // 天之龙骨
    7370: { grade: 'caution', detect: 'visual', note: '双重攻击，后方有玩家时释放扇形AOE；单人时可引导落肘减少平A', vulnerabilities: { sleep: true, slow: true, stun: true } }, // 天之龙人
    7371: { grade: 'caution', detect: 'visual', note: '无范围提示直线攻击和圆形AOE', vulnerabilities: { sleep: true, slow: true } }, // 天之独眼
    7372: { grade: 'danger', detect: 'visual', note: '双重攻击，开怪60秒后给自己附加伤害上升BUFF', vulnerabilities: { sleep: true, slow: true, stun: true } }, // 天之猿猴
    7373: { grade: 'easy', detect: 'visual', note: '吸引玩家后释放前方扇形AOE，对周围玩家附加DOT，可卡墙躲避', vulnerabilities: { sleep: true, slow: true } }, // 天之紫衫
    7374: { grade: 'easy', detect: 'scope', note: '大范围扇形AOE，月环，会对周围玩家附加受伤加重，可卡墙躲避', vulnerabilities: { sleep: true, slow: true } }, // 天之钢鬼
    7375: { grade: 'danger', detect: 'visual', note: '先使用超大扇形aoe，再使用圆形aoe，最后连续吟唱大伤害aoe，可卡墙', vulnerabilities: { slow: true } }, // 天之加鲁拉
    7376: { grade: 'danger', detect: 'visual', note: '双重攻击造成大量伤害并附加dot。震雷会对一个单位点名四次，一次8k。', vulnerabilities: { sleep: true, slow: true } }, // 天之真济
    7377: { grade: 'danger', detect: 'visual', note: '开怪时冲锋，附加伤害上升BUFF，无范围提示前方扇形AOE', vulnerabilities: { sleep: true, slow: true } }, // 天之罗刹

    // HoH floors 91-99
    7378: { grade: 'danger', detect: 'visual', note: '三连击退冲锋，开怪30秒后死刑', vulnerabilities: { stun: true, heavy: true, slow: true, bind: true } }, // 天之肉人
    7379: { grade: 'caution', detect: 'visual', note: '自身附加加速BUFF，之后附加回避上升BUFF', vulnerabilities: { stun: true, heavy: true, slow: true, bind: true } }, // 天之肉人
    7380: { grade: 'easy', detect: 'visual', note: '读条卡墙躲避', vulnerabilities: { stun: true, heavy: true, slow: true, bind: true } }, // 天之肉人
    7381: { grade: 'caution', detect: 'scope', note: '点名直线攻击，卡墙躲避', vulnerabilities: { stun: true, heavy: true, slow: true, bind: true } }, // 天之三船
    7382: { grade: 'easy', detect: 'visual', note: '点随机玩家释放圆形AOE，分散站位；点一名玩家释放大漩涡减至1血', vulnerabilities: { stun: true, heavy: true, slow: true, bind: true } }, // 天之邪鬼
    7383: { grade: 'caution', detect: 'visual', vulnerabilities: { stun: true } }, // 天之蜥武者
    7384: { grade: 'easy', detect: 'visual', note: '点名圆形AOE，未进战斗时也会使用，会给自己和周围敌人附加防御BUFF', vulnerabilities: { stun: true, slow: true, sleep: true, bind: true } }, // 天之镜像
    7385: { grade: 'easy', detect: 'scope', note: '顺劈，点名AOE', vulnerabilities: { stun: true, slow: true, sleep: true, bind: true } }, // 天之黑骑士
    7386: { grade: 'easy', detect: 'visual', note: '直线攻击', vulnerabilities: { stun: true, slow: true, sleep: true, bind: true } }, // 天之沙布提
    7387: { grade: 'easy', detect: 'visual', note: '随机平A一名玩家', vulnerabilities: { stun: true, slow: true } }, // 天之前鬼
    7388: { grade: 'caution', detect: 'visual', note: '开怪后冲锋，面向随机玩家释放大范围扇形AOE，大范围钢铁', vulnerabilities: { slow: true } }, // 天之牛头
    7389: { grade: 'danger', detect: 'visual', note: '顺劈，生命吸取，自身伤害增加，约60秒狂暴', vulnerabilities: { slow: true } }, // 天之无头鬼
    7390: { grade: 'caution', detect: 'visual', note: '双重攻击，前方直线攻击', vulnerabilities: { slow: true, sleep: true, stun: true } }, // 天之马
    7391: { grade: 'caution', detect: 'visual', note: '双重攻击，扇形AOE带睡眠', vulnerabilities: { slow: true, stun: true } }, // 天之渡渡鸟
    7584: { grade: 'danger', detect: 'visual' }, // 天之人马
  },
  floorTips: {
    0: '第1~10层：easy',
    1: '第11~20层：easy',
    2: '第21~30层：easy',
    3: '第31~40层：easy',
    4: '第41~50层：难度稍有上升',
    5: '第51~60层：难度稍有上升',
    6: '第61~70层：从这层开始拟态怪无法眩晕',
    7: '第71~80层：金宝箱会刷出拟态怪',
    8: '第81~90层：金宝箱会刷出拟态怪',
    9: '第91~100层：金宝箱会刷出拟态怪\n97-99大概率出恶劣天气',
  },
}

const PotD: Data = {
  zoneIDs: [561, 562, 563, 564, 565, 593, 594, 595, 596, 597, 598, 599, 600, 601, 602, 603, 604, 605, 606, 607],
  enemiesData: {
    5288: { grade: 'easy', detect: 'visual', note: '罕见未知生物' }, // 黑铠甲帝国阵营官
    5360: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, heavy: true, bind: true, sleep: true } }, // 深宫松鼠
    5361: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, heavy: true, bind: true, sleep: true } }, // 深宫雄羚羊
    5362: { grade: 'easy', detect: 'visual', note: '' }, // 深宫风筝猫
    5363: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, heavy: true, bind: true, sleep: true } }, // 深宫矿妖虫
    5364: { grade: 'caution', detect: 'scope', note: '191-200层：双重平A', vulnerabilities: { stun: true, heavy: true, bind: true, sleep: true } }, // 深宫骏鹰
    5365: { grade: 'easy', detect: 'visual', note: '中毒', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 深宫花甲虫
    5366: { grade: 'caution', detect: 'scope', note: '狂暴“终极针”秒杀单人', vulnerabilities: { stun: true } }, // 深宫黄蜂
    5367: { grade: 'easy', detect: 'auditory', note: '易伤', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 深宫盲头蟹
    5368: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, slow: true, heavy: true, bind: true } }, // 深宫席兹
    5369: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 哥布林冒险者
    5370: { grade: 'easy', detect: 'visual', note: '小死刑', vulnerabilities: { stun: true } }, // 深宫粪甲虫
    5371: { grade: 'easy', detect: 'boss', note: '' }, // 阿利坎托
    5372: { grade: 'easy', detect: 'visual', note: '' }, // 深宫水蛭
    5373: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, heavy: false, bind: false } }, // 深宫对菊石
    5374: { grade: 'caution', detect: 'visual', note: '吸引接钢铁，吸引时若背对会被眩晕吃钢铁', vulnerabilities: { stun: true, heavy: true, bind: false, sleep: true } }, // 深宫巨蟾蜍
    5375: { grade: 'caution', detect: 'auditory', note: '狂暴', vulnerabilities: { stun: true } }, // 深宫粘液怪
    5376: { grade: 'easy', detect: 'auditory', note: '', vulnerabilities: { stun: true, heavy: true, bind: true, sleep: true } }, // 深宫南加
    5377: { grade: 'easy', detect: 'auditory', note: '可打断读条无敌Buff', vulnerabilities: { sleep: true } }, // 深宫蝾螈
    5378: { grade: 'easy', detect: 'scope', note: '范围减速', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 深宫大口花
    5379: { grade: 'easy', detect: 'auditory', note: '', vulnerabilities: { stun: true, heavy: true, bind: true, sleep: true } }, // 深宫幼苗
    5380: { grade: 'caution', detect: 'scope', note: '瞬发短暂睡眠，接读条扇形AOE臭气', vulnerabilities: { stun: true } }, // 深宫魔界花
    5381: { grade: 'easy', detect: 'scope', note: '无仇恨点名黄圈', vulnerabilities: { stun: true } }, // 深宫软糊怪
    5382: { grade: 'danger', detect: 'visual', note: '石化、中毒；秒杀踩陷阱变青蛙的玩家', vulnerabilities: { stun: true, heavy: false, bind: false } }, // 深宫眼镜蛇
    5383: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { heavy: true, bind: true } }, // 深宫比洛克
    5384: { grade: 'caution', detect: 'boss', note: '' }, // 荣光魔花
    5385: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, heavy: true, bind: true, sleep: true } }, // 深宫翼蜥
    5386: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, heavy: true, bind: true, sleep: true } }, // 深宫雷蛟
    5387: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { heavy: true, bind: false, sleep: true } }, // 深宫精金龟
    5388: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, heavy: true, bind: false } }, // 深宫石蜥蜴
    5389: { grade: 'caution', detect: 'scope', note: '双重平A', vulnerabilities: { stun: true, heavy: true, bind: false, sleep: true } }, // 深宫犀蜴
    5390: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, sleep: true } }, // 深宫魔石精
    5391: { grade: 'easy', detect: 'scope', note: '', vulnerabilities: { heavy: true, bind: true, sleep: true } }, // 深宫半人马
    5392: { grade: 'easy', detect: 'visual', note: '' }, // 深宫泥岩巨兽
    5393: { grade: 'easy', detect: 'scope', note: '', vulnerabilities: { stun: true } }, // 深宫乌洛里石
    5394: { grade: 'easy', detect: 'auditory', note: '', vulnerabilities: { stun: true, heavy: true } }, // 深宫无头骑士
    5395: { grade: 'caution', detect: 'visual', note: '不可见钢铁，命中高伤害并击退', vulnerabilities: { stun: true, heavy: true, bind: false, sleep: true } }, // 深宫弥诺陶洛斯
    5396: { grade: 'caution', detect: 'auditory', note: '不可见大范围15秒睡眠', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 深宫斯卡尼特
    5397: { grade: 'caution', detect: 'boss', note: '回中释放恐惧AOE，目标圈内安全' }, // 埃尔法德
    5398: { grade: 'easy', detect: 'auditory', note: '', vulnerabilities: { stun: true, heavy: false, bind: false } }, // 深宫游魂
    5399: { grade: 'easy', detect: 'auditory', note: '', vulnerabilities: { stun: true } }, // 深宫百目妖
    5400: { grade: 'easy', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false } }, // 深宫食人魔
    5401: { grade: 'easy', detect: 'scope', note: '', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 深宫木乃伊
    5402: { grade: 'caution', detect: 'visual', note: '不可见扇形AOE', vulnerabilities: { stun: true } }, // 深宫冥鬼之眼
    5403: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, sleep: true } }, // 深宫扎哈克
    5404: { grade: 'easy', detect: 'scope', note: '吸引接钢铁', vulnerabilities: { stun: true } }, // 深宫鬼鱼
    5405: { grade: 'easy', detect: 'scope', note: '', vulnerabilities: { stun: true, sleep: true } }, // 深宫行吟诗人
    5406: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, sleep: true } }, // 深宫牛头魔
    5407: { grade: 'easy', detect: 'visual', note: '无法眩晕', vulnerabilities: { stun: false } }, // 深宫护卫
    5408: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true } }, // 深宫卡托布莱帕斯
    5409: { grade: 'caution', detect: 'scope', note: '191-200层：双重平A', vulnerabilities: { stun: true, sleep: true } }, // 深宫贪吃鬼
    5410: { grade: 'caution', detect: 'boss', note: '' }, // 阿普切
    5412: { grade: 'easy', detect: 'visual', note: '' }, // 深宫巨虻
    5413: { grade: 'caution', detect: 'visual', note: '狂暴，降低血量至1%', vulnerabilities: { stun: true } }, // 深宫恶魔
    5414: { grade: 'danger', detect: 'visual', note: '高伤害，中毒', vulnerabilities: { stun: true } }, // 深宫石像鬼
    5415: { grade: 'danger', detect: 'scope', note: '191-200层：高伤害月环AOE\n无法眩晕', vulnerabilities: { stun: false } }, // 深宫骑士
    5416: { grade: 'easy', detect: 'auditory', note: '', vulnerabilities: { stun: true } }, // 深宫浮灵
    5417: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true } }, // 深宫地狱犬
    5418: { grade: 'easy', detect: 'scope', note: '', vulnerabilities: { stun: true } }, // 深宫假面
    5419: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true } }, // 深宫梦魔
    5420: { grade: 'easy', detect: 'scope', note: '可背对读条AOE' }, // 奥尼克斯龙
    5421: { grade: 'easy', detect: 'visual', note: '看动作正面不可见顺劈' }, // 深宫曼提克
    5422: { grade: 'caution', detect: 'scope', note: '无仇恨点名黄圈，可打断读条超大AOE', vulnerabilities: { stun: true } }, // 深宫幽灵
    5423: { grade: 'danger', detect: 'auditory', note: '高伤害，191+层瞬发DPS半血AOE' }, // 深宫守卫
    5424: { grade: 'caution', detect: 'boss', note: '召唤小怪\n“狂热丧尸”会抓住玩家使其无法移动直到被消灭\n“狂热魅魔”如果抵达BOSS会治疗BOSS\n' }, // 提西福涅
    5429: { grade: 'caution', detect: 'visual', note: '双重平A\n凝视附加麻痹\n', vulnerabilities: { stun: true, heavy: true, sleep: true, bind: true } }, // 深宫深瞳
    5430: { grade: 'easy', detect: 'visual', note: '易伤', vulnerabilities: { stun: true } }, // 深宫格雷姆林
    5431: { grade: 'easy', detect: 'visual', note: '可打断读条物理反伤', vulnerabilities: { stun: true } }, // 深宫小恶魔
    5432: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true } }, // 深宫沙布提
    5433: { grade: 'easy', detect: 'visual', note: '双重平A吸血', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 深宫夺魂魔
    5434: { grade: 'easy', detect: 'scope', note: '', vulnerabilities: { stun: true } }, // 深宫上级恶魔
    5435: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true } }, // 深宫阿巴伊
    5436: { grade: 'easy', detect: 'scope', note: '双重平A', vulnerabilities: { stun: true } }, // 深宫马洛里石
    5437: { grade: 'caution', detect: 'scope', note: '双重平A\n可背对读条AOE致盲', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 深宫魔力罐
    5438: { grade: 'caution', detect: 'boss', note: '' }, // 非生骑士
    5439: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, heavy: true, sleep: true, bind: true } }, // 深宫森疾龙
    5440: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, heavy: true, sleep: true } }, // 深宫古恐龙
    5441: { grade: 'caution', detect: 'scope', note: '', vulnerabilities: { stun: true, heavy: true, sleep: true, bind: true } }, // 深宫笠头螈
    5442: { grade: 'caution', detect: 'scope', note: '双重平A', vulnerabilities: { stun: true, heavy: true, sleep: true } }, // 深宫三角龙
    5443: { grade: 'caution', detect: 'visual', note: '双重平A', vulnerabilities: { stun: true, heavy: true, sleep: true, bind: true } }, // 深宫中音巨鳄
    5444: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true } }, // 深宫磨齿兽
    5445: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true } }, // 深宫图苏斯水龙蜥
    5446: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, heavy: true, sleep: true, bind: true } }, // 深宫帝王鳄
    5447: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true } }, // 深宫醋蝎龙
    5448: { grade: 'caution', detect: 'scope', note: '', vulnerabilities: { stun: true, heavy: true, sleep: true, bind: true } }, // 深宫无齿翼龙
    5449: { grade: 'easy', detect: 'boss', note: '“浸泡” - 持续地面AOE会加强BOSS\n之后平A加重15s，接顺劈、黄圈' }, // 虹蛇
    5450: { grade: 'caution', detect: 'visual', note: '双重平A', vulnerabilities: { stun: true, heavy: true, sleep: true, bind: true } }, // 深宫斑攫兽
    5451: { grade: 'caution', detect: 'visual', note: '30秒时会半狂暴', vulnerabilities: { sleep: true } }, // 深宫文森野牛
    5452: { grade: 'easy', detect: 'scope', note: '“热带风暴”大幅增加敌人疾走和伤害\n' }, // 深宫妖鸟
    5453: { grade: 'caution', detect: 'visual', note: '读条不可见直线攻击；读条不可见钢铁', vulnerabilities: { stun: true, heavy: true, sleep: true } }, // 深宫独眼雪巨人
    5454: { grade: 'caution', detect: 'scope', note: '无仇恨AOE叠加物理易伤', vulnerabilities: { stun: true, heavy: true, sleep: true } }, // 深宫大脚巨猿
    5455: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, heavy: true, sleep: true, bind: true } }, // 深宫白熊
    5456: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, heavy: true, sleep: true, bind: true } }, // 深宫长须黑豹
    5457: { grade: 'easy', detect: 'scope', note: '', vulnerabilities: { stun: true, heavy: true, sleep: true, bind: true } }, // 深宫长颈驼
    5458: { grade: 'caution', detect: 'visual', note: '双重平A', vulnerabilities: { stun: true, heavy: true, sleep: true, bind: true } }, // 深宫雄狮
    5459: { grade: 'danger', detect: 'visual', note: '顺劈dot；\n点名突脸AOE，眩晕+易伤', vulnerabilities: { stun: true } }, // 深宫安祖
    5460: { grade: 'danger', detect: 'visual', note: '顺劈dot', vulnerabilities: { stun: true, heavy: true, sleep: true, bind: true } }, // 深宫白狼
    5461: { grade: 'danger', detect: 'boss', note: '最刺激的Boss。读条正面120°扇形AOE；\n连续2次读条“大漩涡”放龙卷风\nBOSS去12点或6点面向玩家读条60°扇形AOE“呵斥”\n在15%血量时,连续6s读条“黄道陨石” - 80%血上限伤害，穿无敌' }, // 丹代恩索涅
    5462: { grade: 'easy', detect: 'visual', note: '', vulnerabilities: { stun: true, heavy: true, sleep: true, bind: true } }, // 深宫榴弹怪
    5463: { grade: 'caution', detect: 'auditory', note: '双重平A', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 深宫瓦魔蛾幼虫
    5464: { grade: 'danger', detect: 'visual', note: '能别打就别打。瞬发AOE带dot，非T药不回来', vulnerabilities: { heavy: true, bind: true } }, // 水龙
    5465: { grade: 'danger', detect: 'auditory', note: '无仇恨范围伤害；\n双重平A；30秒时狂暴', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 深宫洪水巨虫
    5466: { grade: 'caution', detect: 'visual', note: '点名吸引', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 深宫巨钳虾
    5467: { grade: 'danger', detect: 'auditory', note: '瞬发减速\n瞬发中毒', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 深宫毛爬虫
    5468: { grade: 'easy', detect: 'scope', note: '', vulnerabilities: { heavy: true, bind: true } }, // 深宫风巨魔
    5469: { grade: 'easy', detect: 'auditory', note: '', vulnerabilities: { stun: true, heavy: true, bind: true } }, // 深宫瓦魔蛾
    5470: { grade: 'danger', detect: 'scope', note: '可打断读条冰钢铁、雷月环', vulnerabilities: { heavy: true, sleep: true, bind: true } }, // 深宫加姆
    5471: { grade: 'danger', detect: 'boss', note: '平A高伤害；\n杀治疗爆弹怪；\n用熔岩爆弹怪眩晕Boss的狂暴读条' }, // 爆弹怪教父
    5472: { grade: 'easy', detect: 'auditory', note: '', vulnerabilities: { stun: true } }, // 深宫寒冰陷阱草
    5473: { grade: 'danger', detect: 'visual', note: '读条正面不可见“5级即死”', vulnerabilities: { stun: true } }, // 深宫幽鬼之眼
    5474: { grade: 'easy', detect: 'scope', note: '', vulnerabilities: { heavy: true } }, // 深宫双头腐尸
    5475: { grade: 'caution', detect: 'scope', note: '双重平A', vulnerabilities: { stun: true } }, // 深宫铁面腐尸
    5480: { grade: 'easy', detect: 'scope', note: '', vulnerabilities: { stun: true, heavy: false, bind: false } }, // 深宫元精
  },
  floorTips: {
    4: `第41~50层：宝箱怪开始免疫眩晕，金宝箱会刷出宝箱怪`,
    9: `第91~100层：不死族可以用“基路伯化”快速击杀`,
    17: `第171~180层：这是最后一个掉落“重生”的副本。\n176层起出现visual怪 深宫安祖，单刷注意避让`,
    18: `第181~190层：巡逻怪深宫加姆，容易初见杀。\n186层起出现visual怪 水龙，注意避让`,
    19: `第191层~200层：大多数敌人被“基路伯化”2-3下击杀，\n但放第三下时可能会先被打死`,
  },
}

const PT: Data = {
  zoneIDs: [1281, 1282, 1283, 1284, 1285, 1286, 1287, 1288, 1289, 1290],
  enemiesData: {
    // 通用
    14264: { detect: 'scope', grade: 'caution', note: '底层版本，几乎没有抗性\n尽快击杀，打断怨念', vulnerabilities: { slow: undefined, sleep: undefined, heavy: undefined, stun: true, bind: undefined } }, // 拟态怪 mimic ミミック
    14265: { detect: 'scope', grade: 'caution', note: '中层版本，可以晕\n尽快击杀，打断怨念', vulnerabilities: { slow: undefined, sleep: undefined, heavy: undefined, stun: true, bind: undefined } }, // 拟态怪 mimic ミミック
    14266: { detect: 'scope', grade: 'caution', note: '深层版本，几乎全抗性\n尽快击杀，打断怨念', vulnerabilities: { slow: undefined, sleep: false, heavy: undefined, stun: false, bind: true } }, // 拟态怪 mimic ミミック
    14267: { detect: undefined, grade: 'caution', note: '一碰就死，亡语会眩晕周围。远距离处理。', vulnerabilities: { slow: undefined, sleep: undefined, heavy: undefined, stun: undefined, bind: undefined } }, // 交错路柯瑞甘 traverse korrigan トラバース・コリガン

    // BOSS

    13979: { detect: 'boss', grade: 'caution', note: '小怪会复制BOSS的技能，可选中后尽快击杀。\nBOSS还会释放捕食，记好预兆寻找安全区。' }, // 花人 ornamental leafman 花人
    13973: { detect: 'boss', grade: 'easy', note: '4条腿会依次闪烁红光，击退后按照腿发光的顺序依次释放大范围钢铁\n点名是放置冰花' }, // 得到宽恕的模仿 forgiven emulation フォーギヴン・エミュレーション
    13863: { detect: 'boss', grade: 'easy', note: '月环会从天而降（伤害不高且无易伤）\n手发光代表左右刀，躲完穿到另一侧\n点名是潜地式波动炮' }, // 得到宽恕的背信 forgiven treachery フォーギヴン・トレチャリー
    13977: { detect: 'boss', grade: 'easy', note: '小怪会复读技能：黄色为钢铁 蓝色为击退。\n小怪可选中后尽快击杀。\nBOSS环浪是月环，圆浪是钢铁。' }, // 得到宽恕的天真 forgiven naivety フォーギヴン・ナイヴテイ
    14263: { detect: 'boss', grade: 'caution', note: '不可以长时间站在流沙中否则即死。\n龙卷风需要在倒计时结束时站在流沙里避免被击退。\n进沙坑：四连追踪红圈，约9W伤害，判定很慢\n组合技时优先处理四连，龙卷风可以吃药硬吃。' }, // 奥格布那巴利 Ogbunabali オグブナバリ
    14097: { detect: 'boss', grade: 'caution', note: '小仙人掌对自身所在格造成伤害。\n大仙人掌对自身及周围9格造成伤害\n飞针射击：打前后\n飞针射击+旋转：速度很快，走内圈跟紧\n马利克敕令：1或2进：仙人掌会移动对应步数，找出安全区躲避。' }, // 始祖马利克巨人掌 ancestral Maliktender 元祖マリクテンダー
    13971: { detect: 'boss', grade: 'caution', note: '热忱怒视：直线。\n热忱之眼：月环。\n白球会按照出现顺序发动月环。\n二千迈纳回转：钢铁\n吼叫：击退\n八重横扫：需要记忆预兆的8次连续扇形。' }, // 得到宽恕的热忱 forgiven zeal フォーギヴン・ズィール
    13968: { detect: 'boss', grade: 'caution', note: '紫雷是月环，伤痛是钢铁。\n红色buff少移动 蓝色buff吃前后刀。' }, // 得到宽恕的不敬 forgiven profanity フォーギヴン・プロファニティー
    14090: { detect: 'boss', grade: 'caution', note: '发光手一侧的270°半场刀。\n横断击：对boss左右的90°扇形攻击\n纵断击：对boss前后的90°扇形攻击\nX断击时，场边的魔法阵会对所在行或列发动直线攻击。' }, // 马纳果达 Malacoda マラコーダ
    14037: { detect: 'boss', grade: 'caution', note: '男，需吃白buff' }, // 卓异的悲寂 Eminent Grief エミネントグリーフ
    14038: { detect: 'boss', grade: 'caution', note: '女，需吃黑buff' }, // 被侵蚀的食罪灵 devoured eater 侵蝕された罪喰い

    // 1-10层
    14100: { detect: 'visual', grade: 'easy', note: '', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: true } }, // 交错路紫闪蝶 traverse morpho トラバース・パープルモルフォ
    14101: { detect: 'visual', grade: 'easy', note: '', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: true } }, // 交错路石莲猬 traverse echevore トラバース・エケボア
    14102: { detect: 'visual', grade: 'easy', note: '读条脚底黄圈', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: true } }, // 交错路普卡精 traverse phooka トラバース・プーカ
    14103: { detect: 'visual', grade: 'easy', note: '读条扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路鹰蜓 traverse hawker トラバース・ホーカー
    14104: { detect: 'auditory', grade: 'easy', note: '', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路苔菇 traverse moss fungus トラバース・モスフングス
    14105: { detect: 'visual', grade: 'easy', note: '读条扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路花楸树 traverse rowan トラバース・ローワン
    14106: { detect: 'visual', grade: 'easy', note: '读条直线', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路杀人蜂 traverse killer bee トラバース・キラービー
    14107: { detect: 'auditory', grade: 'easy', note: '读条直线', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路铁线莲 traverse clematis トラバース・クレマチス
    14108: { detect: 'visual', grade: 'easy', note: '读条钢铁，附带中毒', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路篮筐 traverse basket トラバース・バスケット
    14109: { detect: 'visual', grade: 'easy', note: '读条扇形，附带睡眠', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路爱蒂恩蛾 traverse etainmoth トラバース・エーディンモス
    14110: { detect: 'visual', grade: 'easy', note: '巡逻怪\n读条直线', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路草小人 traverse shrub トラバース・シュラブレット
    14111: { detect: 'visual', grade: 'easy', note: '巡逻怪\n读条扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路鹦鹉 traverse lorikeet トラバース・ロリキート
    14112: { detect: 'auditory', grade: 'easy', note: '巡逻怪\n读条扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路玫瑰熊 traverse rosebear トラバース・ローズベアー

    // 11-20层
    14113: { detect: 'visual', grade: 'easy', note: '无', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: true } }, // 得到宽恕的盲从 forgiven conformity フォーギヴン・コンフォーミティー
    14114: { detect: 'visual', grade: 'easy', note: '读条直线攻击', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: true } }, // 得到宽恕的无知 forgiven ignorance フォーギヴン・イグノランス
    14115: { detect: 'visual', grade: 'easy', note: '读条钢铁', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: true } }, // 得到宽恕的蠢笨 forgiven folly フォーギヴン・フォリー
    14116: { detect: 'visual', grade: 'easy', note: '读条扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: true } }, // 得到宽恕的自负 forgiven conceit フォーギヴン・コンスィート
    14117: { detect: 'visual', grade: 'easy', note: '读条脚底黄圈', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: true } }, // 得到宽恕的暴力 forgiven violence フォーギヴン・ヴァイオレンス
    14118: { detect: 'visual', grade: 'easy', note: '读条直线攻击', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: undefined, slow: undefined } }, // 得到宽恕的违命 forgiven disobedience フォーギヴン・ディスオビーデアンス
    14119: { detect: 'visual', grade: 'easy', note: '巡逻怪\n读条扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的欺骗 forgiven deceit フォーギヴン・デシート
    14120: { detect: 'visual', grade: 'easy', note: '巡逻怪\n读条扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: undefined, slow: undefined } }, // 得到宽恕的轻蔑 forgiven contempt フォーギヴン・コンテンプト
    14121: { detect: 'visual', grade: 'easy', note: '读条脚底黄圈', vulnerabilities: { bind: undefined, heavy: undefined, sleep: true, stun: true, slow: true } }, // 得到宽恕的自满 forgiven complacency フォーギヴン・コンプレイセンシー
    14122: { detect: 'auditory', grade: 'easy', note: '读条直线攻击', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: true } }, // 交错路帕克 traverse Puck トラバース・パック
    14123: { detect: 'visual', grade: 'easy', note: '无', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: true } }, // 交错路绿雕 traverse topiary トラバース・トピアリー
    14124: { detect: 'visual', grade: 'easy', note: '读条脚底黄圈', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: true } }, // 交错路豌豆花 traverse Peaseblossom トラバース・ピーズブロッサム
    14125: { detect: 'visual', grade: 'easy', note: '巡逻怪\n读条扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: true } }, // 交错路幼体龙鸟 traverse tot aevis トラバース・トートエイビス

    // 21-30层
    14126: { detect: 'visual', grade: 'easy', note: '巡逻怪', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: undefined, slow: undefined } }, // 得到宽恕的妒忌 forgiven jealousy フォーギヴン・ジェラシー
    14127: { detect: 'visual', grade: 'easy', note: '非战斗状态下会读条玩家脚底黄圈\n进入战斗后同样会读条脚底黄圈', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的情欲 forgiven venery フォーギヴン・ヴェナリー
    14128: { detect: 'visual', grade: 'easy', note: '巡逻怪\n读条小扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的失调 forgiven dissonance フォーギヴン・ディソナンス
    14129: { detect: 'visual', grade: 'easy', note: '读条直线攻击', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的残忍 forgiven cruelty フォーギヴン・クルエルティー
    14130: { detect: 'visual', grade: 'caution', note: '读条扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: undefined, slow: undefined } }, // 得到宽恕的奢望 forgiven ambition フォーギヴン・アンビション
    14131: { detect: 'visual', grade: 'easy', note: undefined, vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的侮辱 forgiven insult フォーギヴン・インサルト
    14132: { detect: 'visual', grade: 'easy', note: undefined, vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的踌躇 forgiven hesitance フォーギヴン・ヘジテンス
    14133: { detect: 'visual', grade: 'easy', note: '重拳波：跳向玩家+钢铁\n巨像之光：直线攻击', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路魔像 traverse statue トラバース・スタチュー
    14134: { detect: 'visual', grade: 'easy', note: undefined, vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: undefined, slow: undefined } }, // 交错路莫高海怪 traverse morgawr トラバース・モーゴウル
    14135: { detect: 'visual', grade: 'easy', note: undefined, vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: undefined, slow: undefined } }, // 交错路角雉 traverse tragopan トラバース・トラゴパン
    14136: { detect: 'visual', grade: 'easy', note: '巡逻怪\n读条直线攻击', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: undefined, slow: undefined } }, // 得到宽恕的贿赂 forgiven bribery フォーギヴン・ブライバリー
    14137: { detect: 'visual', grade: 'caution', note: '在血量低于25%后，会读条使下一次平A成为秒杀。可以打断。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路冰海天使 traverse clionid トラバース・クリオニッド
    14138: { detect: 'visual', grade: 'easy', note: '读条直线攻击', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: undefined, slow: undefined } }, // 得到宽恕的狭隘 forgiven intolerance フォーギヴン・イントーラランス

    // 31-40层
    14139: { detect: 'visual', grade: 'caution', note: '重拳波：跳跃玩家+大钢铁\n强冲拳：近战击退\n冲波炮：长直线攻击', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: undefined, slow: undefined } }, // 交错路石兵 traverse soldierstone トラバース・ストーンソルジャー
    14140: { detect: 'visual', grade: 'caution', note: '巡逻怪\n读条前方扇形，随后立即在背后再释放一次。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: undefined, slow: undefined } }, // 得到宽恕的疫病 forgiven plague フォーギヴン・プレイグ
    14141: { detect: 'visual', grade: 'caution', note: '归于尘土：血量低于25%时反复施放全场AOE，约32W伤害。\n平时会为自己增加攻击力造成可观伤害。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的背德 forgiven perversion フォーギヴン・パーヴァージョン
    14142: { detect: 'visual', grade: 'easy', note: '平A穿插小死刑', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的勒索 forgiven extortion フォーギヴン・エクストーション
    14143: { detect: 'visual', grade: 'easy', note: '读条小扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的偏见 forgiven prejudice フォーギヴン・プレジュディス
    14144: { detect: 'visual', grade: 'caution', note: '巡逻怪\n木马：前方扇形AOE，范围极大！\n绞刑笼：钢铁', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的伪善 forgiven hypocrisy フォーギヴン・ヒポクリシー
    14145: { detect: 'visual', grade: 'caution', note: '左/右触手：不可见的半场刀，范围极大！', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的暴躁 forgiven petulance フォーギヴン・ペチュランス
    14146: { detect: 'visual', grade: 'easy', note: '读条脚底黄圈，可打断', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的嘲笑 forgiven mockery フォーギヴン・モッカリィ
    14147: { detect: 'visual', grade: 'caution', note: '读条小扇形。\n在低血量时会快速连续释放直线攻击。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路判官 traverse inquisitor トラバース・インクイジター
    14148: { detect: 'visual', grade: 'easy', note: '巡逻怪。\n远距离时会使用中等范围的扇形AOE，近距离则为小范围钢铁AOE。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路妖鸟 bird of the traverse バード・オブ・トラバース
    14149: { detect: 'visual', grade: 'easy', note: '狮子业火：很长的窄扇形\n捕猎爪：小扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路石狮 traverse lionstone トラバース・ストーンライオン
    14150: { detect: 'visual', grade: 'easy', note: '高山气流：前方长直线攻击\n黄金爪：小扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路飞翼兽 traverse jaculus トラバース・ヤクルス
    14151: { detect: 'visual', grade: 'caution', note: '飞驰：强力击退，可以隔墙躲避。\n天马嘶啸：延迟中范围钢铁，可以隔墙躲避。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: true } }, // 交错路天马 traverse pegasus トラバース・ペガサス

    // 41-50层
    14152: { detect: 'visual', grade: 'caution', note: '吸引震动：吸引\n平原震裂：钢铁', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路塑像 traverse petreffigy トラバース・エフィジィ
    14153: { detect: 'visual', grade: 'danger', note: '移动极慢，但平A伤害极高且叠加易伤，需要远距离处理。\n龟足踏：钢铁', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路托尔巴龟 traverse troubadour トラバース・トルバ
    14154: { detect: 'visual', grade: 'easy', note: '毒滴牙：毒dot，可打断。\n喷毒：点名脚底黄圈', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路水蚺 traverse anaconda トラバース・アナコンダ
    14155: { detect: 'visual', grade: 'easy', note: '巡逻怪\n读条中等扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: false, slow: undefined } }, // 交错路三尖树 traverse triffid トラバース・トリフィド
    14156: { detect: 'visual', grade: 'easy', note: '点名脚底黄圈', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路蜥蜴 traverse lizard トラバース・リザード
    14157: { detect: 'visual', grade: 'easy', note: '巡逻怪\n酸液喷射：小扇形\n太久没打死会给自己“加速”buff。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路白蚁 traverse termite トラバース・ターマイト
    14158: { detect: 'visual', grade: 'caution', note: '直线冲锋AOE，然后再冲回去。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: false, slow: undefined } }, // 交错路蚁狮 traverse antlion トラバース・アントリオン
    14159: { detect: 'visual', grade: 'easy', note: '火球：点名脚底黄圈\n尾部碎击：大范围钢铁', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路钳喙魔鸟 traverse pincerbeak トラバース・ピンサービーク
    14160: { detect: 'visual', grade: 'easy', note: '巡逻怪\n读条直线攻击', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: undefined, slow: undefined } }, // 交错路飞鸢 traverse cliffkite トラバース・クリフカイト
    14161: { detect: 'visual', grade: 'caution', note: '愤怒旋风：钢铁，附带无法净化的眩晕\n愤怒一击：短直线攻击', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路兵装 traverse weapon トラバース・ウェポン
    14162: { detect: 'visual', grade: 'easy', note: '点名脚底黄圈，可打断', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路龙舌兰 traverse agave トラバース・アガベ
    14163: { detect: 'visual', grade: 'easy', note: '读条扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路大口花 traverse germinant トラバース・ジェルミナンツ
    14164: { detect: 'visual', grade: 'easy', note: '读条小钢铁', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路螳螂 traverse mantis トラバース・マンティス

    // 51-60层
    14165: { detect: 'visual', grade: 'easy', note: '平A穿插小死刑\n螺旋尾：点名脚底黄圈', vulnerabilities: { bind: true, heavy: true, sleep: true, stun: true, slow: true } }, // 交错路褐钳龙虾 traverse tawnyclaw トラバース・ブラウンクロウ
    14166: { detect: 'visual', grade: 'easy', note: '只会平A', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路守卫 traverse guardian トラバース・ガーディアン
    14167: { detect: 'visual', grade: 'danger', note: '巡逻怪\n大地钻击：正面270度旋体脚，站在脚下或背后躲避，可以隔墙躲避。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路沙地巨蟒 traverse sand serpent トラバース・サンドサーペント
    14168: { detect: 'visual', grade: 'danger', note: '读条让所有人进入目押状态。根据动作释放钢铁 或 正面大扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路美甲兽 traverse saichania トラバース・サイカニア
    14169: { detect: 'visual', grade: 'caution', note: '非战斗状态下会施放“火鳞甲”：物理攻击会受到秒杀级反伤！\n火龙卷：小扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路巨蜥 traverse monitor トラバース・モニター
    14170: { detect: 'visual', grade: 'easy', note: '巡逻怪\n火球：点名脚底黄圈\n炽热弥漫：直线攻击', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路恶魔怪鸟 traverse fallen aevis トラバース・イビルエイビス
    14171: { detect: 'visual', grade: 'easy', note: '读条小扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路帕查玛玛 traverse Pachamama トラバース・パチャママ
    14172: { detect: 'auditory', grade: 'easy', note: '读条中等宽扇形', vulnerabilities: { bind: false, heavy: true, sleep: true, stun: true, slow: true } }, // 交错路海索草 traverse hyssop トラバース・ヒソプ
    14173: { detect: 'visual', grade: 'danger', note: '巡逻怪。\n会施放超大范围的钢铁/月环/扇形。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路恐鹤 traverse phorusrhacos トラバース・フォルスラコス
    14174: { detect: 'visual', grade: 'danger', note: '尾镰：中等范围钢铁。\n高速撞击：直线攻击。\n外环雷：超大月环！可以隔墙躲避', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路怒嚎 traverse howler トラバース・ハウラー
    14175: { detect: 'visual', grade: 'easy', note: '读条钢铁。背后有人时会释放大范围扫尾', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路狞猫 traverse caracal トラバース・カラカル
    14176: { detect: 'visual', grade: 'caution', note: '吸气：吸引\n蛮力金刚臂：钢铁\n蛮力上投：扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路巨人 traverse gigant トラバース・ギガント
    14177: { detect: 'visual', grade: 'easy', note: '平A穿插小死刑，太久没打死会给自己加闪避buff', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路甲虫 traverse beetle トラバース・ビートル

    // 61-70层
    14178: { detect: 'visual', grade: 'danger', note: '平A穿插小死刑\n左右刀，躲完立即穿到对侧！', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: false, slow: undefined } }, // 得到宽恕的暴动 forgiven riot フォーギヴン・ライオティング
    14179: { detect: 'visual', grade: 'caution', note: '几千针刺：延迟大范围直线攻击。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的主见 forgiven contention フォーギヴン・コンテンション
    14180: { detect: 'visual', grade: 'easy', note: '未终针：延迟小范围前方直线攻击。\n终极针：血量低于10%时的点名狂暴攻击。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路蜂后 traverse queen トラバース・クイーンビー
    14181: { detect: 'visual', grade: 'danger', note: '巡逻怪。\n冰雹发射：延迟长直线攻击。\n血量低于25%时会反复释放超大钢铁AOE“水晶刺”，可以隔墙躲避。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的怨恨 forgiven grudge フォーギヴン・グラッジ
    14182: { detect: 'visual', grade: 'caution', note: '巡逻怪。\n执行贯穿：向前冲刺并在终点释放小范围钢铁，接小月环。\n平A穿插小死刑', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: false, slow: undefined } }, // 交错路塔罗斯 traverse Talos トラバース・タロース
    14183: { detect: 'visual', grade: 'caution', note: '冲顶：延迟正面扇形AOE。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路壁崖鼹鼠 traverse cliffmole トラバース・クリフモール
    14184: { detect: 'auditory', grade: 'caution', note: '在两次“沉岛”圆形点名后会施放超大范围十字AOE“岩石崩溃”！', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的不公 forgiven imparity フォーギヴン・イムパリティー
    14185: { detect: 'visual', grade: 'easy', note: '巡逻怪。\n掷锤：点名脚底黄圈\n刺阵：给自己施加减伤buff', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的捉弄 forgiven mischief フォーギヴン・ミスチーフ
    14186: { detect: 'visual', grade: 'danger', note: '石化凝视：延迟前方扇形石化（无法背对躲避！）\n猛撞：延迟小钢铁。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的贪食 forgiven voracity フォーギヴン・ヴォラシティ
    14187: { detect: 'visual', grade: 'danger', note: '隐身敌人，接近后才会显形。\n会向你冲撞造成约40K伤害，随后施放快速且延迟小范围钢铁。\n仅出现于61-64层。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的疑念 forgiven doubt フォーギヴン・ダウト
    14188: { detect: 'visual', grade: 'danger', note: '臭水：【需要诱导的】延迟前（或后）半圆AOE，随后立即在反方向再释放一次。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的依恋 forgiven attachment フォーギヴン・アタッチメント
    14189: { detect: 'visual', grade: 'caution', note: '平A穿插小死刑\n平地捶打：不可见的小钢铁', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路诺姆 traverse gnome トラバース・ノーム
    14190: { detect: 'visual', grade: 'caution', note: '泥石流：延迟的宽中扇形AOE。\n投石：点名黄圈', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路恩戈齐 traverse ngozi トラバース・ンゴツィ

    // 71-80层
    14191: { detect: 'visual', grade: 'caution', note: '迅猛回旋：钢铁\n呵斥：正面窄大扇形，可以隔墙躲避。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的争执 forgiven dissention フォーギヴン・ディセンション
    14192: { detect: 'visual', grade: 'danger', note: '非战斗状态会释放全屏AOE\n进战后会读条释放正面小扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的腐败 forgiven corruption フォーギヴン・コラプション
    14193: { detect: 'visual', grade: 'danger', note: '两种读条，先月环后钢铁，或者先钢铁后月环。（月环外圈范围极大）', vulnerabilities: { sleep: false, bind: undefined, heavy: undefined, stun: false, slow: undefined } }, // 得到宽恕的恶意 forgiven spite フォーギヴン・スパイト
    14194: { detect: 'visual', grade: 'caution', note: '巡逻怪\n拉怪时会跳向玩家并击退，以及一个毒DOT', vulnerabilities: { sleep: true, bind: undefined, heavy: undefined, stun: true, slow: undefined } }, // 交错路食岩狼 traverse stone eater トラバース・ロックイーター
    14195: { detect: 'visual', grade: 'danger', note: '巡逻怪\n读条钢铁，死了会自爆！！！！！！', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: false, slow: true } }, // 交错路爆岩怪 traverse huldu トラバース・フルドゥ
    14196: { detect: 'visual', grade: 'easy', note: '点名脚底黄圈', vulnerabilities: { sleep: true, bind: undefined, heavy: undefined, stun: true, slow: true } }, // 交错路泡沫奶黄怪 traverse diplomat cream トラバース・ホイップカスタード
    14197: { detect: 'scope', grade: 'danger', note: '超级大月环或者十字！注意不要拉在过道上导致无路可走！', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: false, slow: undefined } }, // 得到宽恕的虚夸 forgiven vanity フォーギヴン・ヴァニティー
    14198: { detect: 'visual', grade: 'caution', note: '巡逻怪\n连续四次正面半圆扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: false, slow: undefined } }, // 得到宽恕的傲慢 forgiven arrogance フォーギヴン・アロガンス
    14199: { detect: 'scope', grade: 'caution', note: '变质岩波：读条不可见的扇形\n造山风暴：点名某人不可见的脚底黄圈（可以通过面向判断点谁）', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 得到宽恕的诋毁 forgiven slander フォーギヴン・スランダー
    14200: { detect: 'visual', grade: 'caution', note: '平A衔接小死刑（较痛）\n读条延迟小直线攻击，秒杀级伤害', vulnerabilities: { sleep: true, bind: undefined, heavy: undefined, stun: true, slow: undefined } }, // 得到宽恕的怀疑 forgiven unbelief フォーギヴン・アンビリーフ
    14201: { detect: 'visual', grade: 'caution', note: '推翻：延迟的小范围钢铁。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路阿米特 traverse amemet トラバース・アメミット
    14202: { detect: 'auditory', grade: 'caution', note: '读条中等范围钢铁', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路巨虫 traverse worm トラバース・ウォーム
    14203: { detect: 'visual', grade: 'caution', note: '读条延迟小扇形，秒杀级伤害', vulnerabilities: { sleep: true, bind: undefined, heavy: undefined, stun: true, slow: undefined } }, // 交错路铰颌蚁 traverse scissorjaws トラバース・シザージョウ

    // 81-90层
    14204: { detect: 'visual', grade: 'caution', note: '飞踢后摆尾：先读条小范围前方直线攻击，随后在背后扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: false, slow: undefined } }, // 交错路卡玛 traverse cama トラバース・キャマ
    14205: { detect: 'visual', grade: 'danger', note: '非战斗状态下会释放全场AOE。\n深渊射线：读条极大范围的直线攻击，穿墙！', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 召引巴尔 invoked Baal インヴォークド・バエル
    14206: { detect: 'scope', grade: 'caution', note: '巡逻怪\n残杀：会连续击退四次\n风暴斩：前方扇形AOE', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路骑兵 traverse rider トラバース・ライダー
    14207: { detect: 'visual', grade: 'danger', note: '巡逻怪\n会点名热病，不要动否则会秒杀级爆炸。建议隔墙躲避。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 召引梦魔 invoked succubus インヴォークド・サキュバス
    14208: { detect: 'visual', grade: 'caution', note: '巡逻怪\n读条三重/四重强击，攻击对应次数后以当前面向释放秒杀级扇形。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: false, slow: true } }, // 召引洪巴巴 invoked Humbaba インヴォークド・フンババ
    14209: { detect: 'visual', grade: 'easy', note: '读条小范围扇形\n会上减速debuff', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 召引格雷姆林 invoked gremlin インヴォークド・グレムリン
    14210: { detect: 'visual', grade: 'caution', note: '读条中等范围扇形\n低血量时会施放长读条的狂暴技能，可能是点名秒杀攻击。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路异豺 traverse gnoll トラバース・ノール
    14211: { detect: 'visual', grade: 'danger', note: '昏暗：长读条的可打断超宽扇形AOE，不要与“黑暗”混淆。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路卡部斯 traverse cubus トラバース・カブス
    14212: { detect: 'visual', grade: 'easy', note: '虚空冰冻：脚底黄圈，\n冰结陷阱：钢铁', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 召引小恶灵 invoked satana インヴォークド・サタナジュニア
    14213: { detect: 'visual', grade: 'caution', note: '读条宽扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 召引上级恶魔 summoned arch demon サモンド・アークデーモン
    14214: { detect: 'visual', grade: 'easy', note: '大凶眼：很大范围的背对\n眼光弹：点名脚底黄圈', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: true } }, // 召引盖因 invoked caym インヴォークド・カイム
    14215: { detect: 'visual', grade: 'danger', note: '闪电：读条前方圆形AOE。\n地狱爪击：读条前方扇形AOE。\n摆尾：不可见的大范围后方扇形AOE。\n雷光：不可见的点某人脚下的黄圈', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: true } }, // 召引刻耳柏洛斯 invoked Cerberus インヴォークド・ケルベロス
    14216: { detect: 'scope', grade: 'caution', note: '（远离时会释放）昏暗：很大范围扇形（可以隔墙躲避）\n（靠近时会释放）心魔：小范围钢铁', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 召引行吟诗人 invoked troubadour インヴォークド・トルバドゥール

    // 91-100层
    14217: { detect: 'visual', grade: 'caution', note: '读条三重/四重猛击，攻击对应次数后以当前面向释放秒杀级扇形。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: undefined, slow: undefined } }, // 交错路座狼 traverse warg トラバース・ワーグ
    14218: { detect: 'visual', grade: 'caution', note: '读条左右刀，记得穿', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: undefined, slow: undefined } }, // 召引古辛 invoked Gusion インヴォークド・グシオン
    14219: { detect: 'visual', grade: 'danger', note: '梦祸视线：直线攻击\n死亡会自爆！！！（可以隔墙躲避）', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: undefined, slow: undefined } }, // 召引梦祸 invoked dreamer インヴォークド・ドリームエビル
    14220: { detect: 'visual', grade: 'caution', note: '点名，隔墙躲避，随后释放黄圈', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 召引光棍 invoked bachelor インヴォークド・バチェラー
    14221: { detect: 'visual', grade: 'caution', note: '石化需要背对\n怪光线：大范围直线攻击', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 召引破坏本能 invoked Destrudo インヴォークド・デストルドー
    14222: { detect: 'auditory', grade: 'caution', note: '巡逻怪\n读条身后危险的180度左右刀\n前方花蜜喷吐：前方大扇形AOE。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 召引锯齿花 invoked sawtooth インヴォークド・ソウトゥース
    14223: { detect: 'scope', grade: 'easy', note: '根系纠缠：点名脚底黄圈\n藤枝伏地：小扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路紫罗兰三尖树 traverse triffid トラバース・ヴァイオレットトリフィド
    14224: { detect: 'auditory', grade: 'caution', note: '腐烂恶臭：超长的宽直线攻击，穿墙！\n黄金粉尘：点名脚底黄圈', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 交错路食人花 traverse ya-te-veo トラバース・ヤテベオ
    14225: { detect: 'visual', grade: 'caution', note: '石质吐息：面前大扇形。\n背后有人时，会瞬发秒杀级扫尾。最好去侧面。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 召引扎哈克 invoked dahak インヴォークド・ダハーカ
    14226: { detect: 'visual', grade: 'caution', note: '在它拿剑的方向的大型半圆AOE，秒杀级伤害。（可以隔墙躲避）。', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 召引阿刻戎 invoked Acheron インヴォークド・アケローン
    14227: { detect: 'visual', grade: 'easy', note: '巡逻怪\n读条钢铁', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 召引玩偶 invoked poppet インヴォークド・パペット
    14228: { detect: 'visual', grade: 'easy', note: '读条扇形', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: undefined, slow: undefined } }, // 交错路恶意灵 traverse malevolence トラバース・マレヴォレンス
    14229: { detect: 'visual', grade: 'caution', note: '巡逻怪\n黑暗神圣：点名某人的大黄圈\n生命停止：极快！前方超大扇形！', vulnerabilities: { bind: undefined, heavy: undefined, sleep: undefined, stun: true, slow: undefined } }, // 召引古恶魔 invoked archaeodemon インヴォークド・アルケオデーモン
  },
  floorTips: {
    0: '第1~10层：铜宝箱可能出现拟态怪',
    1: '第11~20层：铜宝箱可能出现拟态怪',
    2: '第21~30层：铜宝箱可能出现拟态怪',
    3: '第31~40层：银宝箱可能出现拟态怪',
    4: '第41~50层：银宝箱可能出现拟态怪',
    5: '第51~60层：银宝箱可能出现拟态怪',
    6: '第61~70层：金宝箱可能出现拟态怪，61-64层小心隐身怪。',
    7: '第71~80层：金宝箱可能出现拟态怪',
    8: '第81~90层：金宝箱可能出现拟态怪',
    9: '第91~99层：金宝箱可能出现拟态怪',
  },
}

const data: Data[] = [PT, EO, HoH, PotD]

function getMaps(zoneID: number): DDInfo | undefined {
  const mapData = data.find((map) => map.zoneIDs.includes(zoneID))
  if (mapData) {
    return { enemiesData: mapData.enemiesData, floorTips: mapData.floorTips[mapData.zoneIDs.indexOf(zoneID) ?? 0] ?? '' }
  }
}

export { type EnemyData, type MapKey, getMaps, type DDInfo, type langString }
