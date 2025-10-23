type MapKey = 'PT' | 'EO' | 'HoH' | 'PotD'

type EnemyData = { grade?: '简单' | '小心' | '危险'; detect?: '视觉' | '听觉' | '范围' | 'Boss'; note?: string }

type EnemiesData = Record<number, EnemyData>
type FloorTips = Record<number, string>

type DD_Info = { enemiesData: EnemiesData; floorTips: FloorTips }

type Data = { zoneIDs: number[] } & DD_Info

const EO: Data = {
  zoneIDs: [1099, 1100, 1101, 1102, 1103, 1104, 1105, 1106, 1107, 1108],
  enemiesData: {
    12100: { grade: '小心', detect: 'Boss' }, // 斗神 王者之剑
    12102: { grade: '小心', detect: 'Boss' }, // 管理者
    12106: { grade: '简单', detect: '视觉' }, // 正统尸龙
    12107: { grade: '简单', detect: '听觉' }, // 正统塔纳托斯
    12108: { grade: '简单', detect: '视觉' }, // 正统梦魔
    12109: { grade: '小心', detect: '视觉', note: '对一仇目标读条击退攻击(防击退有效)；血量40%以下读条黄道陨石(大范围AOE)，可隔墙躲避' }, // 正统贝希摩斯
    12110: { grade: '小心', detect: '视觉', note: '读条后半可见钢铁AOE' }, // 正统榴弹怪
    12111: { grade: '简单', detect: '视觉' }, // 正统扎哈克
    12112: { grade: '简单', detect: '视觉' }, // 正统小魔精
    12113: { grade: '简单', detect: '视觉' }, // 正统恶魔
    12114: { grade: '简单', detect: '视觉' }, // 正统幽鬼之眼
    12115: { grade: '简单', detect: '视觉' }, // 正统瓦沙克
    12116: { grade: '简单', detect: '听觉', note: '对一仇目标释放病弱debuff，可打断' }, // 正统浮灵
    12117: { grade: '简单', detect: '范围', note: '无法催眠' }, // 正统钢铁之爪
    12118: { grade: '简单', detect: '范围' }, // 正统水元精
    12119: { grade: '简单', detect: '视觉' }, // 正统猎手
    12120: { grade: '简单', detect: '范围' }, // 正统系统β
    12121: { grade: '简单', detect: '范围' }, // 正统微型系统
    12122: { grade: '简单', detect: '视觉' }, // 正统士兵
    12123: { grade: '简单', detect: '视觉' }, // 正统树木巨像
    12124: { grade: '简单', detect: '视觉' }, // 正统坐镇巨像
    12125: { grade: '简单', detect: '视觉' }, // 正统王冠
    12126: { grade: '简单', detect: '视觉' }, // 正统大王花
    12127: { grade: '简单', detect: '视觉' }, // 正统锯齿花
    12128: { grade: '简单', detect: '视觉' }, // 正统胜利
    12129: { grade: '简单', detect: '视觉' }, // 正统螺旋藻
    12130: { grade: '简单', detect: '视觉' }, // 正统大魔界花
    12131: { grade: '简单', detect: '视觉' }, // 正统剧毒美人
    12132: { grade: '小心', detect: '范围', note: '血量30%以下读条大范围AOE雾散爆发，可隔墙躲避\n无法眩晕' }, // 正统破坏者
    12133: { grade: '小心', detect: '视觉', note: '大范围吸引，防击退有效，随后释放不可见钢铁AOE\n无法眩晕' }, // 正统骑士
    12134: { grade: '简单', detect: '视觉', note: '无仇恨读条点名黄圈' }, // 正统机甲
    12135: { grade: '简单', detect: '视觉' }, // 正统铁巨人
    12136: { grade: '简单', detect: '视觉', note: '无法眩晕' }, // 正统卡利亚
    12137: { grade: '简单', detect: '视觉' }, // 正统雷蛟
    12138: { grade: '小心', detect: '视觉', note: '无法眩晕' }, // 正统小龙
    12139: { grade: '简单', detect: '视觉' }, // 正统双足飞龙
    12140: { grade: '简单', detect: '视觉', note: '无法眩晕' }, // 正统蓝龙
    12141: { grade: '简单', detect: '视觉', note: '无仇恨读条大范围AOE，命中附加易伤debuff' }, // 正统薇薇尔飞龙
    12142: { grade: '简单', detect: '视觉' }, // 正统布罗宾雅克
    12143: { grade: '小心', detect: '视觉', note: '近战范围钢铁，吃到被击退并击晕，随后秒杀眩晕中的玩家\n无法眩晕' }, // 正统婆那罗
    12144: { grade: '简单', detect: '视觉', note: '无法眩晕' }, // 正统龟甲龙
    12145: { grade: '简单', detect: '范围' }, // 正统发条虫
    12146: { grade: '小心', detect: '听觉', note: '释放钢铁AOE，命中后附加缩小debuff；秒杀缩小的玩家，穿无敌' }, // 正统蜘蛛
    12147: { grade: '小心', detect: '视觉', note: '赋予自己一分钟的加速buff\n无法眩晕' }, // 正统铁血战士
    12148: { grade: '危险', detect: '视觉', note: '随机面向一名玩家释放正面超大范围AOE；释放钢铁AOE\n无法眩晕' }, // 正统幻影光
    12149: { grade: '小心', detect: '视觉', note: '读条石化视线，随后点名黄圈' }, // 正统镜骑士
    12150: { grade: '小心', detect: '视觉', note: '不可见钢铁AOE；正面扇形AOE；\n不吃战技封印，无法眩晕' }, // 正统弥诺陶洛斯
    12151: { grade: '简单', detect: '视觉' }, // 正统爬虫半人马
    12152: { grade: '危险', detect: '范围', note: '释放不可见月环AOE、钢铁AOE\n无法眩晕' }, // 正统奇美拉
    12153: { grade: '简单', detect: '视觉' }, // 正统沙布提
    12154: { grade: '简单', detect: '视觉', note: '点名黄圈；给附近一只怪赋予伤害提升一倍buff' }, // 正统改造鸟人
    12155: { grade: '小心', detect: '视觉', note: '正面石化视线' }, // 正统那迦
    12156: { grade: '小心', detect: '听觉', note: '正面范围不可见扇形AOE击退，偶尔绕到玩家背后读条' }, // 正统疫虫
    12157: { grade: '简单', detect: '视觉' }, // 正统拉米亚
    12158: { grade: '小心', detect: '视觉', note: '血量30%以下读条自爆，释放不可见大范围AOE，可隔墙躲避\n无法眩晕' }, // 正统明胶怪
    12159: { grade: '小心', detect: '视觉', note: '赋予自己一分钟的加速buff' }, // 正统魔石精
    12160: { grade: '小心', detect: '范围', note: '背后不可见扇形AOE；点名黄圈' }, // 正统山巨魔
    12161: { grade: '简单', detect: '范围' }, // 正统阿帕斯
    12162: { grade: '小心', detect: '视觉', note: '点名冲锋，随后快速读条钢铁' }, // 正统凯尔派
    12163: { grade: '简单', detect: '视觉', note: '无仇恨读条释放大范围AOE，命中附加易伤debuff' }, // 正统库库尔坎
    12164: { grade: '危险', detect: '视觉', note: '释放不可见全屏AOE，只可隔墙躲避，命中眩晕5秒，扑向并秒杀眩晕玩家\n无法眩晕' }, // 正统霜狼
    12165: { grade: '简单', detect: '视觉', note: '无法眩晕' }, // 正统胡瓦西
    12166: { grade: '危险', detect: '视觉', note: '读条释放不可见全屏秒杀AOE，可插言打断或隔墙躲避；释放正面可见扇形AOE\n无法眩晕' }, // 正统阿刻戎
    12167: { grade: '简单', detect: '视觉' }, // 正统阿巴伊
    12168: { grade: '小心', detect: '视觉', note: '正面无读条吸引，然后释放正面不可见扇形AOE' }, // 正统古菩猩猩
    12169: { grade: '简单', detect: '视觉', note: '每隔一段时间对玩家附加减速效果；点名可见长直线AOE' }, // 正统赫德提特
    12170: { grade: '简单', detect: '范围', note: '无读条钢铁，伤害不高但会附加加重debuff' }, // 正统土泥人
    12171: { grade: '简单', detect: '范围' }, // 正统班西
    12172: { grade: '小心', detect: '范围', note: '吸引后钢铁，防击退有效\n无法眩晕' }, // 正统鬼鱼
    12173: { grade: '小心', detect: '视觉', note: '跳到玩家释放半房间击退，紧接月环或钢铁; 点名AOE' }, // 正统刺魟
    12174: { grade: '简单', detect: '视觉' }, // 正统俄刻阿诺斯
    12175: { grade: '简单', detect: '视觉', note: '背后扇形AOE' }, // 正统大螯陆蟹
    12176: { grade: '小心', detect: '视觉', note: '加重紧接螺旋尾，血量降至1\n无法眩晕' }, // 正统虾蛄
    12177: { grade: '简单', detect: '视觉' }, // 正统皮拉鱼
    12178: { grade: '简单', detect: '视觉' }, // 正统水蛭
    12179: { grade: '小心', detect: '听觉', note: '向前或后释放半圆AOE，然后立刻对反方向释放一次' }, // 正统扎拉坦
    12180: { grade: '小心', detect: '视觉', note: '死亡后爆炸(不可见钢铁AOE)\n无法眩晕' }, // 正统冰元精
    12181: { grade: '简单', detect: '视觉' }, // 正统爆弹鱼
    12182: { grade: '小心', detect: '视觉', note: '点名读条释放秒杀直线冲锋，卡障碍物躲避(不穿无敌)\n无法眩晕' }, // 正统石鳍鲨
    12183: { grade: '小心', detect: '视觉', note: '读条上物理反伤Buff，受到物理攻击秒杀玩家' }, // 正统尤弥尔
    12184: { grade: '简单', detect: '视觉' }, // 正统翼蜥
    12185: { grade: '小心', detect: '视觉', note: '读条上物理反伤Buff，受到物理攻击秒杀玩家' }, // 正统烈阳火蛟
    12186: { grade: '简单', detect: '视觉', note: '死亡立即爆炸，近距离易伤' }, // 正统眼镜蛇
    12187: { grade: '简单', detect: '视觉' }, // 正统飞巨蜥
    12188: { grade: '简单', detect: '视觉' }, // 正统阿那罗
    12189: { grade: '小心', detect: '范围', note: 'AOE让命中怪物获得闪避Buff' }, // 正统笠头螈
    12190: { grade: '简单', detect: '视觉' }, // 正统石蜥蜴
    12191: { grade: '简单', detect: '视觉' }, // 正统玛塔蛇颈龟
    12192: { grade: '小心', detect: '视觉', note: '拉近紧接钢铁' }, // 正统侏儒避役
    12193: { grade: '危险', detect: '视觉', note: '近战范围安全的环形AOE' }, // 正统法拉克
    12194: { grade: '小心', detect: '视觉', note: '看动作正、反面扇形AOE\n无法眩晕' }, // 正统高牢怪龙
    12195: { grade: '小心', detect: '范围', note: '斩杀血量低于20%\n无法眩晕' }, // 正统忍者
    12196: { grade: '简单', detect: '视觉', note: '击退' }, // 正统哈奥卡
    12197: { grade: '简单', detect: '视觉', note: '释放正面小扇形AOE，附加减速debuff' }, // 正统巨嘴鸟
    12198: { grade: '小心', detect: '听觉', note: '无读条钢铁' }, // 正统斯卡尼特
    12199: { grade: '小心', detect: '视觉', note: '对一仇三连冲锋击退；点名黄圈' }, // 正统独角兽
    12200: { grade: '危险', detect: '视觉', note: '正面、背面大范围扇形AOE，侧面安全' }, // 正统长须豹
    12201: { grade: '简单', detect: '视觉' }, // 正统凶狼
    12202: { grade: '小心', detect: '视觉', note: '双重顺劈第二下无读条' }, // 正统狼獾
    12203: { grade: '危险', detect: '视觉', note: '无仇恨时读条释放超大AOE' }, // 正统大脚巨猿
    12204: { grade: '小心', detect: '视觉', note: '冲锋接钢铁' }, // 正统曙象
    12205: { grade: '小心', detect: '范围', note: '斩杀血量低于20%\n无法眩晕' }, // 正统女忍
    12206: { grade: '小心', detect: '视觉', note: '全屏AOE，背对回避' }, // 正统妖鸟
    12207: { grade: '危险', detect: '视觉', note: '1)无读条月环; 2) 无读条钢铁，会摇尾巴\n无法眩晕' }, // 正统雷兽
    12208: { grade: '小心', detect: '视觉', note: '正面宽条形AOE，穿墙！\n无法眩晕' }, // 正统焰兽
    12209: { grade: '危险', detect: '视觉', note: '两次自由落体后大AOE，需要卡墙或眩晕' }, // 正统卡尔加斯
    12210: { grade: '小心', detect: '视觉' }, // 正统深瞳
    12211: { grade: '简单', detect: '视觉', note: '点名大黄圈，接读条中距离扇形AOE' }, // 正统地生人
    12212: { grade: '危险', detect: '听觉', note: '读条近距离可背对AOE；读条超大范围钢铁\n无法眩晕' }, // 正统百目妖
    12213: { grade: '小心', detect: '视觉', note: '转向玩家释放超大扇形AOE；点名黄圈\n无法眩晕' }, // 正统软糊怪
    12214: { grade: '简单', detect: '范围', note: '正面60°扇形AOE；瞬移读条钢铁\n无法眩晕' }, // 正统假面
    12215: { grade: '小心', detect: '范围', note: '无法眩晕' }, // 正统贪吃鬼
    12216: { grade: '小心', detect: '视觉', note: '正面宽条形AOE' }, // 正统冥鬼之眼
    12217: { grade: '简单', detect: '范围', note: '无法眩晕' }, // 正统铁面腐尸
    12218: { grade: '小心', detect: '视觉' }, // 正统卡托布莱帕斯
    12219: { grade: '小心', detect: '视觉', note: '正面60°扇形AOE；瞬移读条钢铁' }, // 正统黑天马
    12220: { grade: '小心', detect: '范围', note: '20m钢铁\n无法眩晕' }, // 正统幽灵
    12221: { grade: '危险', detect: '范围', note: '左右210°扇形AOE；月环、钢铁\n无法眩晕' }, // 正统妖影
    12222: { grade: '简单', detect: '视觉', note: '无法眩晕' }, // 正统深渊
    12223: { grade: '简单', detect: '范围', note: '死亡读条钢铁\n无法眩晕' }, // 正统无人机
    12224: { grade: '小心', detect: '范围', note: '可打断超大范围AOE；钢铁\n无法眩晕' }, // 正统系统γ
    12225: { grade: '简单', detect: '范围', note: '正面270° AOE' }, // 正统米特里达梯
    12226: { grade: '小心', detect: '视觉', note: '正面120°扇形；读条强化物理伤害60秒' }, // 正统恐慌装甲
    12227: { grade: '小心', detect: '视觉', note: '无仇恨读条大范围AOE；近战全屏可背对AOE，对混乱玩家接超大AOE\n无法眩晕' }, // 正统整备工
    12228: { grade: '简单', detect: '视觉', note: '全屏可背对AOE；正面60°扇形AOE\n无法眩晕' }, // 正统斯芬克斯
    12229: { grade: '简单', detect: '范围', note: '正面150°扇形AOE' }, // 正统系统α
    12230: { grade: '小心', detect: '视觉', note: '无仇恨读条大范围AOE；点名AOE击退非点名\n无法眩晕' }, // 正统扎戈斧龙
    12231: { grade: '简单', detect: '听觉', note: '4次随机冲锋击退，接正面半场AOE' }, // 正统采掘无人机
    12232: { grade: '简单', detect: '范围', note: '点名黄圈；正面直线AOE' }, // 正统浮游炮主板
    12233: { grade: '危险', detect: '视觉', note: '左右读条120°扇形AOE；\n后面快速读条90°扇形AOE；\n冲锋接钢铁或月环\n无法眩晕' }, // 正统自控化奇美拉
    12234: { grade: '小心', detect: '视觉', note: '正面60°扇形AOE；冲锋接钢铁\n无法眩晕' }, // 正统自控化弥诺陶洛斯
    12235: { grade: '小心', detect: '范围', note: '正面扇形AOE；随机点名读条混乱3秒，对混乱玩家紧接黄圈或扇形\n无法眩晕' }, // 正统杜尔迦
    12240: { grade: '简单', detect: 'Boss' }, // 蜜言妖
    12242: { grade: '简单', detect: 'Boss' }, // 提亚马特复制体
    12246: { grade: '小心', detect: 'Boss' }, // 永恒
    12247: { grade: '小心', detect: 'Boss', note: '1) 半场顺劈，正面安全;\n2) 在BOSS下方和外环生成即死区域' }, // 原型卡利亚
    12261: { grade: '小心', detect: 'Boss' }, // 复制系统
    12263: { grade: '小心', detect: 'Boss', note: '1) 旋风,读条结束时移动躲避\n2) 俯冲,躲避俯冲的同时躲避旋风\n3) 生成4次需要躲避的风圈' }, // 双塔尼亚复制体
    12265: { grade: '小心', detect: 'Boss', note: '半屏顺劈；拉球，直到球消失' }, // 自控化奇美拉14X
    12267: { grade: '小心', detect: 'Boss', note: '1) 八连斩\n2) 咆哮 - 击退，需要在BOSS目标圈内' }, // 自控化弥诺陶洛斯16
    12318: { grade: '简单', detect: '视觉' }, // 正统裂钳蟹
    12322: { grade: '小心', detect: '视觉', note: '击杀获得生命恢复；\n顺劈叠加生命恢复，上限8层；\n读条石化可背对；读条钢铁' }, // 拉米亚女王
    12323: { grade: '小心', detect: '视觉', note: '击杀获得伤害上升；\n读条提升伤害可打断；\n读条AOE可卡墙躲避' }, // 美拉西迪亚复制体
    12324: { grade: '小心', detect: '视觉', note: '击杀获得受伤减轻；\n顺劈叠加受伤减轻，上限8层；\n读条AOE可卡墙躲避' }, // 亚灵智慧之灵
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
    7262: { grade: '简单', detect: '视觉' }, // 天之无壳观梦螺
    7263: { grade: '简单', detect: '视觉' }, // 天之鯥鮟鱇
    7264: { grade: '简单', detect: '视觉' }, // 天之刺球爆弹怪
    7265: { grade: '危险', detect: '范围' }, // 天之怨灵
    7266: { grade: '小心', detect: '视觉' }, // 天之珊瑚壳
    7267: { grade: '简单', detect: '视觉' }, // 天之牛鬼
    7268: { grade: '简单', detect: '视觉' }, // 天之蟒蛇
    7269: { grade: '简单', detect: '范围' }, // 天之蛸入道
    7270: { grade: '简单', detect: '视觉' }, // 天之安居鮟鱇
    7271: { grade: '简单', detect: '视觉' }, // 天之玛塔蛇颈龟
    7272: { grade: '危险', detect: '视觉' }, // 天之飞鲨
    7273: { grade: '简单', detect: '视觉' }, // 天之切网虾蛄
    7274: { grade: '简单', detect: '视觉' }, // 天之观梦螺

    // HoH floors 11-20
    7275: { grade: '简单', detect: '视觉' }, // 天之叶小妖
    7276: { grade: '简单', detect: '视觉' }, // 天之滴
    7277: { grade: '简单', detect: '视觉' }, // 天之盐虫
    7278: { grade: '简单', detect: '视觉' }, // 天之一日蛇
    7279: { grade: '小心', detect: '视觉' }, // 天之甲鲎
    7280: { grade: '简单', detect: '范围' }, // 天之阿帕斯
    7281: { grade: '小心', detect: '视觉' }, // 天之巨蜥
    7282: { grade: '简单', detect: '视觉' }, // 天之龙之子
    7283: { grade: '简单', detect: '视觉' }, // 天之盐尝
    7284: { grade: '简单', detect: '视觉', note: '无法眩晕' }, // 天之祈雨龟
    7285: { grade: '小心', detect: '视觉' }, // 天之鲶鱼精
    7286: { grade: '危险', detect: '视觉' }, // 天之右手
    7287: { grade: '简单', detect: '视觉' }, // 天之盐蓝燕

    // HoH floors 21-30
    7288: { grade: '简单', detect: '范围' }, // 天之鬼火
    7289: { grade: '简单', detect: '视觉' }, // 天之刺草球
    7290: { grade: '简单', detect: '范围' }, // 天之陀鲁婆
    7291: { grade: '简单', detect: '视觉' }, // 天之赛太岁
    7292: { grade: '小心', detect: '范围' }, // 天之旗本
    7293: { grade: '简单', detect: '视觉' }, // 天之长手精
    7294: { grade: '简单', detect: '视觉' }, // 天之毛羽毛现
    7295: { grade: '小心', detect: '范围' }, // 天之幽鬼
    7296: { grade: '简单', detect: '视觉' }, // 天之鸦天狗
    7297: { grade: '简单', detect: '听觉' }, // 天之高加颅
    7298: { grade: '简单', detect: '视觉' }, // 天之片轮车
    7299: { grade: '简单', detect: '视觉' }, // 天之面灵气
    7300: { grade: '简单', detect: '视觉' }, // 天之轮入道

    // HoH floors 31-40
    7301: { grade: '简单', detect: '视觉' }, // 天之獦狚
    7302: { grade: '简单', detect: '视觉' }, // 天之红角犀鸟
    7303: { grade: '小心', detect: '视觉' }, // 天之般若
    7304: { grade: '小心', detect: '视觉' }, // 天之切腹般若
    7305: { grade: '小心', detect: '视觉' }, // 天之隐密
    7306: { grade: '简单', detect: '视觉' }, // 天之猛虎
    7307: { grade: '简单', detect: '视觉' }, // 天之猛禽
    7308: { grade: '简单', detect: '视觉' }, // 天之清房
    7309: { grade: '小心', detect: '视觉' }, // 天之足轻
    7310: { grade: '小心', detect: '视觉' }, // 天之狮子
    7311: { grade: '小心', detect: '视觉' }, // 天之隐密
    7312: { grade: '小心', detect: '视觉' }, // 天之婆那罗
    7313: { grade: '小心', detect: '视觉' }, // 天之土偶

    // HoH floors 41-50
    7314: { grade: '小心', detect: '视觉' }, // 天之骰子
    7315: { grade: '简单', detect: '范围' }, // 天之岩石
    7316: { grade: '简单', detect: '视觉' }, // 天之陀罗
    7317: { grade: '简单', detect: '视觉' }, // 天之石像
    7318: { grade: '小心', detect: '视觉', note: '无法眩晕' }, // 天之石板
    7319: { grade: '小心', detect: '视觉' }, // 天之骰子
    7320: { grade: '小心', detect: '视觉' }, // 天之异石
    7321: { grade: '简单', detect: '视觉', note: '无法眩晕' }, // 天之赤岩
    7322: { grade: '简单', detect: '视觉' }, // 天之物岩
    7323: { grade: '简单', detect: '视觉' }, // 天之异石
    7324: { grade: '小心', detect: '视觉', note: '无法眩晕' }, // 天之黑兔
    7325: { grade: '简单', detect: '视觉' }, // 天之石像
    7326: { grade: '小心', detect: '听觉' }, // 天之仙女虫

    // HoH floors 51-60
    7327: { grade: '小心', detect: '听觉' }, // 天之鸣釜
    7328: { grade: '小心', detect: '听觉' }, // 天之螳螂
    7329: { grade: '小心', detect: '视觉' }, // 天之牙蜥
    7330: { grade: '小心', detect: '视觉' }, // 天之金刚铃
    7331: { grade: '简单', detect: '视觉' }, // 天之铁爪
    7332: { grade: '小心', detect: '范围' }, // 天之圆石
    7333: { grade: '简单', detect: '视觉' }, // 天之机关人
    7334: { grade: '简单', detect: '视觉' }, // 天之沙布提
    7335: { grade: '简单', detect: '视觉' }, // 天之铁臂
    7336: { grade: '小心', detect: '视觉', note: '无法眩晕' }, // 天之无厘头
    7337: { grade: '危险', detect: '视觉' }, // 天之那迦
    7338: { grade: '简单', detect: '视觉', note: '无法眩晕' }, // 天之铁巨人
    7339: { grade: '简单', detect: '视觉', note: '无法眩晕' }, // 天之无畏

    // HoH floors 61-70
    7340: { grade: '小心', detect: '听觉' }, // 天之嫩草
    7341: { grade: '小心', detect: '视觉' }, // 天之万年草
    7342: { grade: '简单', detect: '视觉' }, // 天之岩虫
    7343: { grade: '小心', detect: '范围' }, // 天之海滨水母
    7344: { grade: '简单', detect: '听觉' }, // 天之毒芹
    7345: { grade: '简单', detect: '视觉' }, // 天之小袖贝
    7346: { grade: '小心', detect: '视觉' }, // 天之尸生花
    7347: { grade: '简单', detect: '视觉' }, // 天之东莨菪
    7348: { grade: '简单', detect: '视觉' }, // 天之彭侯
    7349: { grade: '小心', detect: '视觉' }, // 天之树木子
    7350: { grade: '小心', detect: '视觉' }, // 天之魔界花
    7351: { grade: '简单', detect: '视觉' }, // 天之血樱

    // HoH floors 71-80
    7352: { grade: '简单', detect: '视觉' }, // 天之四九火
    7353: { grade: '小心', detect: '范围' }, // 天之生邪魔
    7354: { grade: '简单', detect: '视觉' }, // 天之野山羊
    7355: { grade: '小心', detect: '视觉' }, // 天之狼
    7356: { grade: '小心', detect: '视觉' }, // 天之雪蜥
    7357: { grade: '危险', detect: '视觉', note: '未进战斗时释放大范围AOE，吸引玩家后释放正面AOE\n无法眩晕' }, // 天之长毛象
    7358: { grade: '小心', detect: '视觉' }, // 天之豆腐
    7359: { grade: '危险', detect: '范围' }, // 天之狮鹫
    7360: { grade: '小心', detect: '视觉' }, // 天之雪人
    7361: { grade: '小心', detect: '视觉', note: '吸引攻击，大范围AOE，会狂暴\n无法眩晕' }, // 天之牦牛
    7362: { grade: '小心', detect: '视觉', note: '无法眩晕' }, // 天之冰牙
    7363: { grade: '简单', detect: '视觉', note: '无法眩晕' }, // 天之冰山
    7364: { grade: '危险', detect: '视觉', note: '双重攻击，大范围AOE' }, // 天之白狮

    // HoH floors 81-89
    7365: { grade: '小心', detect: '范围', note: '寒冰远离，雷电靠近，可打断' }, // 天之送狼
    7366: { grade: '小心', detect: '视觉', note: '未进战斗时吃香蕉会提升自身伤害，会对视野内玩家释放AOE并叠加易伤' }, // 天之老猿
    7367: { grade: '简单', detect: '视觉', note: '开怪时冲锋' }, // 天之象魔
    7368: { grade: '小心', detect: '视觉', note: '面向随机玩家释放大范围扇形AOE，邪眼攻击' }, // 天之牛头
    7369: { grade: '简单', detect: '视觉', note: '圆形AOE，未进战斗时也会使用' }, // 天之龙骨
    7370: { grade: '小心', detect: '视觉', note: '双重攻击，后方有玩家时释放扇形AOE；单人时可引导落肘减少平A' }, // 天之龙人
    7371: { grade: '小心', detect: '视觉', note: '无范围提示直线AOE和圆形AOE' }, // 天之独眼
    7372: { grade: '危险', detect: '视觉', note: '双重攻击，开怪60秒后给自己附加伤害上升BUFF' }, // 天之猿猴
    7373: { grade: '简单', detect: '视觉', note: '吸引玩家后释放前方扇形AOE，对周围玩家附加DOT，可卡墙躲避' }, // 天之紫衫
    7374: { grade: '简单', detect: '范围', note: '大范围扇形AOE，月环，会对周围玩家附加受伤加重，可卡墙躲避' }, // 天之钢鬼
    7375: { grade: '危险', detect: '视觉', note: '先使用超大扇形aoe，再使用圆形aoe，最后连续吟唱大伤害aoe，可卡墙' }, // 天之加鲁拉
    7376: { grade: '危险', detect: '视觉', note: '双重攻击造成大量伤害并附加dot。震雷会对一个单位点名四次，一次8k。' }, // 天之真济
    7377: { grade: '危险', detect: '视觉', note: '开怪时冲锋，附加伤害上升BUFF，无范围提示前方扇形AOE' }, // 天之罗刹

    // HoH floors 91-99
    7378: { grade: '危险', detect: '视觉', note: '三连击退冲锋，开怪30秒后死刑' }, // 天之肉人
    7379: { grade: '小心', detect: '视觉', note: '自身附加加速BUFF，之后附加回避上升BUFF' }, // 天之肉人
    7380: { grade: '简单', detect: '视觉', note: '读条卡墙躲避' }, // 天之肉人
    7381: { grade: '小心', detect: '范围', note: '点名直线AOE，卡墙躲避' }, // 天之三船
    7382: { grade: '简单', detect: '视觉', note: '点随机玩家释放圆形AOE，分散站位；点一名玩家释放大漩涡减至1血' }, // 天之邪鬼
    7383: { grade: '小心', detect: '视觉' }, // 天之蜥武者
    7384: { grade: '简单', detect: '视觉', note: '点名圆形AOE，未进战斗时也会使用，会给自己和周围敌人附加防御BUFF' }, // 天之镜像
    7385: { grade: '简单', detect: '范围', note: '顺劈，点名AOE' }, // 天之黑骑士
    7386: { grade: '简单', detect: '视觉', note: '直线AOE' }, // 天之沙布提
    7387: { grade: '简单', detect: '视觉', note: '随机平A一名玩家' }, // 天之前鬼
    7388: { grade: '小心', detect: '视觉', note: '开怪后冲锋，面向随机玩家释放大范围扇形AOE，大范围钢铁' }, // 天之牛头
    7389: { grade: '危险', detect: '视觉', note: '顺劈，生命吸取，自身伤害增加，约60秒狂暴' }, // 天之无头鬼
    7390: { grade: '小心', detect: '视觉', note: '双重攻击，前方直线AOE' }, // 天之马
    7391: { grade: '小心', detect: '视觉', note: '双重攻击，扇形AOE带睡眠' }, // 天之渡渡鸟
    7584: { grade: '危险', detect: '视觉' }, // 天之人马
  },
  floorTips: {
    0: '第1~10层：简单',
    1: '第11~20层：简单',
    2: '第21~30层：简单',
    3: '第31~40层：简单',
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
    5288: { grade: '简单', detect: '视觉', note: '罕见未知生物' }, // 黑铠甲帝国阵营官
    5360: { grade: '简单', detect: '视觉', note: '' }, // 深宫松鼠
    5361: { grade: '简单', detect: '视觉', note: '' }, // 深宫雄羚羊
    5362: { grade: '简单', detect: '视觉', note: '' }, // 深宫风筝猫
    5363: { grade: '简单', detect: '视觉', note: '' }, // 深宫矿妖虫
    5364: { grade: '小心', detect: '范围', note: '191-200层：双重平A' }, // 深宫骏鹰
    5365: { grade: '简单', detect: '视觉', note: '中毒' }, // 深宫花甲虫
    5366: { grade: '小心', detect: '范围', note: '狂暴“终极针”秒杀单人' }, // 深宫黄蜂
    5367: { grade: '简单', detect: '听觉', note: '易伤' }, // 深宫盲头蟹
    5368: { grade: '简单', detect: '视觉', note: '' }, // 深宫席兹
    5369: { grade: '简单', detect: '视觉', note: '' }, // 哥布林冒险者
    5370: { grade: '简单', detect: '视觉', note: '小死刑' }, // 深宫粪甲虫
    5371: { grade: '简单', detect: 'Boss', note: '' }, // 阿利坎托
    5372: { grade: '简单', detect: '视觉', note: '' }, // 深宫水蛭
    5373: { grade: '简单', detect: '视觉', note: '' }, // 深宫对菊石
    5374: { grade: '小心', detect: '视觉', note: '吸引接钢铁，吸引时若背对会被眩晕吃钢铁' }, // 深宫巨蟾蜍
    5375: { grade: '小心', detect: '听觉', note: '狂暴' }, // 深宫粘液怪
    5376: { grade: '简单', detect: '听觉', note: '' }, // 深宫南加
    5377: { grade: '简单', detect: '听觉', note: '可打断读条无敌Buff' }, // 深宫蝾螈
    5378: { grade: '简单', detect: '范围', note: '范围减速' }, // 深宫大口花
    5379: { grade: '简单', detect: '听觉', note: '' }, // 深宫幼苗
    5380: { grade: '小心', detect: '范围', note: '瞬发短暂睡眠，接读条扇形AOE臭气' }, // 深宫魔界花
    5381: { grade: '简单', detect: '范围', note: '无仇恨点名黄圈' }, // 深宫软糊怪
    5382: { grade: '危险', detect: '视觉', note: '石化、中毒；秒杀踩陷阱变青蛙的玩家' }, // 深宫眼镜蛇
    5383: { grade: '简单', detect: '视觉', note: '' }, // 深宫比洛克
    5384: { grade: '小心', detect: 'Boss', note: '' }, // 荣光魔花
    5385: { grade: '简单', detect: '视觉', note: '' }, // 深宫翼蜥
    5386: { grade: '简单', detect: '视觉', note: '' }, // 深宫雷蛟
    5387: { grade: '简单', detect: '视觉', note: '' }, // 深宫精金龟
    5388: { grade: '简单', detect: '视觉', note: '' }, // 深宫石蜥蜴
    5389: { grade: '小心', detect: '范围', note: '双重平A' }, // 深宫犀蜴
    5390: { grade: '简单', detect: '视觉', note: '' }, // 深宫魔石精
    5391: { grade: '简单', detect: '范围', note: '' }, // 深宫半人马
    5392: { grade: '简单', detect: '视觉', note: '' }, // 深宫泥岩巨兽
    5393: { grade: '简单', detect: '范围', note: '' }, // 深宫乌洛里石
    5394: { grade: '简单', detect: '听觉', note: '' }, // 深宫无头骑士
    5395: { grade: '小心', detect: '视觉', note: '不可见钢铁，命中高伤害并击退' }, // 深宫弥诺陶洛斯
    5396: { grade: '小心', detect: '听觉', note: '不可见大范围15秒睡眠' }, // 深宫斯卡尼特
    5397: { grade: '小心', detect: 'Boss', note: '回中释放恐惧AOE，目标圈内安全' }, // 埃尔法德
    5398: { grade: '简单', detect: '听觉', note: '' }, // 深宫游魂
    5399: { grade: '简单', detect: '听觉', note: '' }, // 深宫百目妖
    5400: { grade: '简单', detect: '视觉', note: '无法眩晕' }, // 深宫食人魔
    5401: { grade: '简单', detect: '范围', note: '' }, // 深宫木乃伊
    5402: { grade: '小心', detect: '视觉', note: '不可见扇形AOE' }, // 深宫冥鬼之眼
    5403: { grade: '简单', detect: '视觉', note: '' }, // 深宫扎哈克
    5404: { grade: '简单', detect: '范围', note: '吸引接钢铁' }, // 深宫鬼鱼
    5405: { grade: '简单', detect: '范围', note: '' }, // 深宫行吟诗人
    5406: { grade: '简单', detect: '视觉', note: '' }, // 深宫牛头魔
    5407: { grade: '简单', detect: '视觉', note: '无法眩晕' }, // 深宫护卫
    5408: { grade: '简单', detect: '视觉', note: '' }, // 深宫卡托布莱帕斯
    5409: { grade: '小心', detect: '范围', note: '191-200层：双重平A' }, // 深宫贪吃鬼
    5410: { grade: '小心', detect: 'Boss', note: '' }, // 阿普切
    5412: { grade: '简单', detect: '视觉', note: '' }, // 深宫巨虻
    5413: { grade: '小心', detect: '视觉', note: '狂暴，降低血量至1%' }, // 深宫恶魔
    5414: { grade: '危险', detect: '视觉', note: '高伤害，中毒' }, // 深宫石像鬼
    5415: { grade: '危险', detect: '范围', note: '191-200层：高伤害月环AOE\n无法眩晕' }, // 深宫骑士
    5416: { grade: '简单', detect: '听觉', note: '' }, // 深宫浮灵
    5417: { grade: '简单', detect: '视觉', note: '' }, // 深宫地狱犬
    5418: { grade: '简单', detect: '范围', note: '' }, // 深宫假面
    5419: { grade: '简单', detect: '视觉', note: '' }, // 深宫梦魔
    5420: { grade: '简单', detect: '范围', note: '可背对读条AOE' }, // 奥尼克斯龙
    5421: { grade: '简单', detect: '视觉', note: '看动作正面不可见顺劈' }, // 深宫曼提克
    5422: { grade: '小心', detect: '范围', note: '无仇恨点名黄圈，可打断读条超大AOE' }, // 深宫幽灵
    5423: { grade: '危险', detect: '听觉', note: '高伤害，191+层瞬发DPS半血AOE' }, // 深宫守卫
    5424: { grade: '小心', detect: 'Boss', note: '召唤小怪\n“狂热丧尸”会抓住玩家使其无法移动直到被消灭\n“狂热魅魔”如果抵达BOSS会治疗BOSS\n' }, // 提西福涅
    5429: { grade: '小心', detect: '视觉', note: '双重平A\n凝视附加麻痹\n' }, // 深宫深瞳
    5430: { grade: '简单', detect: '视觉', note: '易伤' }, // 深宫格雷姆林
    5431: { grade: '简单', detect: '视觉', note: '可打断读条物理反伤' }, // 深宫小恶魔
    5432: { grade: '简单', detect: '视觉', note: '' }, // 深宫沙布提
    5433: { grade: '简单', detect: '视觉', note: '双重平A吸血' }, // 深宫夺魂魔
    5434: { grade: '简单', detect: '范围', note: '' }, // 深宫上级恶魔
    5435: { grade: '简单', detect: '视觉', note: '' }, // 深宫阿巴伊
    5436: { grade: '简单', detect: '范围', note: '双重平A' }, // 深宫马洛里石
    5437: { grade: '小心', detect: '范围', note: '双重平A\n可背对读条AOE致盲' }, // 深宫魔力罐
    5438: { grade: '小心', detect: 'Boss', note: '' }, // 非生骑士
    5439: { grade: '简单', detect: '视觉', note: '' }, // 深宫森疾龙
    5440: { grade: '简单', detect: '视觉', note: '' }, // 深宫古恐龙
    5441: { grade: '小心', detect: '范围', note: '' }, // 深宫笠头螈
    5442: { grade: '小心', detect: '范围', note: '双重平A' }, // 深宫三角龙
    5443: { grade: '小心', detect: '视觉', note: '双重平A' }, // 深宫中音巨鳄
    5444: { grade: '简单', detect: '视觉', note: '' }, // 深宫磨齿兽
    5445: { grade: '简单', detect: '视觉', note: '' }, // 深宫图苏斯水龙蜥
    5446: { grade: '简单', detect: '视觉', note: '' }, // 深宫帝王鳄
    5447: { grade: '简单', detect: '视觉', note: '' }, // 深宫醋蝎龙
    5448: { grade: '小心', detect: '范围', note: '' }, // 深宫无齿翼龙
    5449: { grade: '简单', detect: 'Boss', note: '“浸泡” - 持续地面AOE会加强BOSS\n之后平A加重15s，接顺劈、黄圈' }, // 虹蛇
    5450: { grade: '小心', detect: '视觉', note: '双重平A' }, // 深宫斑攫兽
    5451: { grade: '小心', detect: '视觉', note: '30秒时会半狂暴' }, // 深宫文森野牛
    5452: { grade: '简单', detect: '范围', note: '“热带风暴”大幅增加敌人疾走和伤害\n' }, // 深宫妖鸟
    5453: { grade: '小心', detect: '视觉', note: '读条不可见直线AOE；读条不可见钢铁' }, // 深宫独眼雪巨人
    5454: { grade: '小心', detect: '范围', note: '无仇恨AOE叠加物理易伤' }, // 深宫大脚巨猿
    5455: { grade: '简单', detect: '视觉', note: '' }, // 深宫白熊
    5456: { grade: '简单', detect: '视觉', note: '' }, // 深宫长须黑豹
    5457: { grade: '简单', detect: '范围', note: '' }, // 深宫长颈驼
    5458: { grade: '小心', detect: '视觉', note: '双重平A' }, // 深宫雄狮
    5459: { grade: '危险', detect: '视觉', note: '顺劈dot；\n点名突脸AOE，眩晕+易伤' }, // 深宫安祖
    5460: { grade: '危险', detect: '视觉', note: '顺劈dot' }, // 深宫白狼
    5461: { grade: '危险', detect: 'Boss', note: '最刺激的Boss。读条正面120°扇形AOE；\n连续2次读条“大漩涡”放龙卷风\nBOSS去12点或6点面向玩家读条60°扇形AOE“呵斥”\n在15%血量时,连续6s读条“黄道陨石” - 80%血上限伤害，穿无敌' }, // 丹代恩索涅
    5462: { grade: '简单', detect: '视觉', note: '' }, // 深宫榴弹怪
    5463: { grade: '小心', detect: '听觉', note: '双重平A' }, // 深宫瓦魔蛾幼虫
    5464: { grade: '危险', detect: '视觉', note: '能别打就别打。瞬发AOE带dot，非T药不回来' }, // 水龙
    5465: { grade: '危险', detect: '听觉', note: '无仇恨范围伤害；\n双重平A；30秒时狂暴' }, // 深宫洪水巨虫
    5466: { grade: '小心', detect: '视觉', note: '点名吸引' }, // 深宫巨钳虾
    5467: { grade: '危险', detect: '听觉', note: '瞬发减速\n瞬发中毒' }, // 深宫毛爬虫
    5468: { grade: '简单', detect: '范围', note: '' }, // 深宫风巨魔
    5469: { grade: '简单', detect: '听觉', note: '' }, // 深宫瓦魔蛾
    5470: { grade: '危险', detect: '范围', note: '可打断读条冰钢铁、雷月环' }, // 深宫加姆
    5471: { grade: '危险', detect: 'Boss', note: '平A高伤害；\n杀治疗爆弹怪；\n用熔岩爆弹怪眩晕Boss的狂暴读条' }, // 爆弹怪教父
    5472: { grade: '简单', detect: '听觉', note: '' }, // 深宫寒冰陷阱草
    5473: { grade: '危险', detect: '视觉', note: '读条正面不可见“5级即死”' }, // 深宫幽鬼之眼
    5474: { grade: '简单', detect: '范围', note: '' }, // 深宫双头腐尸
    5475: { grade: '小心', detect: '范围', note: '双重平A' }, // 深宫铁面腐尸
    5480: { grade: '简单', detect: '范围', note: '' }, // 深宫元精
  },
  floorTips: {
    4: `第41~50层：宝箱怪开始免疫眩晕，金宝箱会刷出宝箱怪`,
    9: `第91~100层：不死族可以用“基路伯化”快速击杀`,
    17: `第171~180层：这是最后一个掉落“重生”的副本。\n176层起出现视觉怪 深宫安祖，单刷注意避让`,
    18: `第181~190层：巡逻怪深宫加姆，容易初见杀。\n186层起出现视觉怪 水龙，注意避让`,
    19: `第191层~200层：大多数敌人被“基路伯化”2-3下击杀，\n但放第三下时可能会先被打死`,
  },
}

const PT: Data = {
  zoneIDs: [1281, 1282, 1283, 1284, 1285, 1286, 1287, 1288, 1289, 1290],
  enemiesData: {
    // 通用
    14264: { grade: '小心', note: '尽快击杀，打断怨念' }, // '拟态怪'
    14265: { grade: '小心', note: '尽快击杀，打断怨念' }, // '拟态怪'
    14266: { grade: '小心', note: '尽快击杀，打断怨念' }, // '拟态怪'
    14267: { grade: '小心', note: '亡语：眩晕周围' }, // '漫步科柯瑞甘'

    // 1-10层
    14100: { detect: '视觉', grade: '简单', note: '无' }, // '漫步紫闪蝶'
    14101: { detect: '视觉', grade: '简单', note: '无' }, // '漫步石莲猬'
    14102: { detect: '视觉', grade: '简单', note: '无' }, // '漫步普卡精'
    14103: { detect: '视觉', grade: '简单', note: '无' }, // '漫步鹰蜓'
    14104: { detect: '听觉', grade: '简单', note: '无' }, // '漫步苔菇'
    14105: { detect: '视觉', grade: '简单', note: '无' }, // '漫步花楸'
    14106: { detect: '视觉', grade: '简单', note: '无' }, // '漫步杀人蜂'
    14107: { detect: '听觉', grade: '简单', note: '无' }, // '漫步铁线莲'
    14108: { detect: '视觉', grade: '简单', note: '无' }, // '漫步篮子'
    14109: { detect: '视觉', grade: '简单', note: '无' }, // '漫步爱蒂恩蛾'
    14110: { detect: '视觉', grade: '简单', note: '巡逻怪' }, // '漫步灌木丛'
    14111: { detect: '视觉', grade: '简单', note: '巡逻怪' }, // '漫步吸蜜鹦鹉'
    14112: { detect: '听觉', grade: '简单', note: '巡逻怪' }, // '漫步玫瑰熊'
    13979: { detect: 'Boss', grade: '小心', note: '小怪会复制BOSS的技能，可选中后尽快击杀。\nBOSS还会释放捕食，记好预兆寻找安全区。' }, // '花人' 10层BOSS

    // 11-20层
    13973: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的模仿'
    14113: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的盲从'
    14114: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的无知'
    14115: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的蠢笨'
    14116: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的自负'
    14117: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的暴力'
    14118: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的违命'
    14119: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的欺骗'
    14120: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的轻蔑'
    14121: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的自满'
    14122: { detect: undefined, grade: undefined, note: undefined }, // '漫步帕克'
    14123: { detect: undefined, grade: undefined, note: undefined }, // '漫步灌木塑像'
    14124: { detect: undefined, grade: undefined, note: undefined }, // '漫步豌豆花'
    14125: { detect: undefined, grade: undefined, note: undefined }, // '漫步幼体龙鸟'

    // 21-30层
    14126: { detect: '视觉', grade: '简单', note: '巡逻怪' }, // '得到宽恕的妒忌'
    14127: { detect: '视觉', grade: '简单', note: '非战斗状态下会读条玩家脚底黄圈' }, // '得到宽恕的情欲'
    14128: { detect: undefined, grade: undefined, note: '巡逻怪' }, // '得到宽恕的失调'
    14129: { detect: '视觉', grade: '简单', note: undefined }, // '得到宽恕的残忍'
    14130: { detect: '视觉', grade: '小心', note: '读条扇形顺劈' }, // '得到宽恕的奢望'
    14131: { detect: '视觉', grade: '简单', note: undefined }, // '得到宽恕的侮辱'
    14132: { detect: '视觉', grade: '简单', note: undefined }, // '得到宽恕的踌躇'
    14133: { detect: '视觉', grade: '简单', note: '读条玩家脚底钢铁' }, // '漫步石像'
    14134: { detect: '视觉', grade: '简单', note: undefined }, // '漫步莫高海怪'
    14135: { detect: '视觉', grade: '简单', note: undefined }, // '漫步角雉'
    14136: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的贿赂'
    14137: { detect: '视觉', grade: '小心', note: '在血量低于25%后，会读条使下一次平A成为秒杀。可以打断。' }, // '漫步冰海天使'
    14138: { detect: '视觉', grade: '简单', note: '读条直线攻击' }, // '得到宽恕的不容忍'
    13863: { detect: 'Boss', grade: undefined, note: undefined }, // '得到宽恕的叛逆'

    // 31-40层
    14139: { detect: '视觉', grade: '小心', note: '重拳波：跳跃至AOE区域后立刻释放更大的AOE，造成约70K伤害。\n强冲拳：在近战范围内会被强力击退。' }, // '漫步石兵' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14140: { detect: '视觉', grade: '小心', note: '先在前方释放扇形AOE，随后立刻在背后再释放一次。' }, // '得到宽恕的瘟疫' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14141: { detect: '视觉', grade: '小心', note: '归于尘土：血量低于25%时反复施放全场AOE，致命。\n平时会为自己增加攻击力造成可观伤害。' }, // '得到宽恕的堕落' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14142: { detect: '视觉', grade: '简单', note: '无' }, // '得到宽恕的勒索'
    14143: { detect: '视觉', grade: '简单', note: '读条小扇形' }, // '得到宽恕的偏见'
    14144: { detect: '视觉', grade: '小心', note: '前方扇形AOE，范围极大！' }, // '得到宽恕的伪善' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14145: { detect: undefined, grade: '小心', note: '左/右触手：隐藏的半场刀，范围极大！' }, // '得到宽恕的任性' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14146: { detect: '视觉', grade: '简单', note: '点名脚底黄圈，可打断' }, // '得到宽恕的嘲弄' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14147: { detect: '视觉', grade: '小心', note: '读条小扇形。\n在低血量时会快速连续释放直线AOE。' }, // '漫步异端审问官' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14148: { detect: '视觉', grade: '简单', note: '巡逻怪。\n远距离时会使用中等范围的扇形AOE，近距离则为小范围环形AOE。' }, // '漫步鸟' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14149: { detect: '视觉', grade: '简单', note: '先是小扇形提示，随后接着大范围扇形AOE。' }, // '漫步石狮' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14150: { detect: '视觉', grade: '简单', note: '高山气流：前方直条攻击' }, // '漫步亚克鲁斯'
    14151: { detect: '视觉', grade: '小心', note: '飞驰：强力击退，可通过视线躲避。\n天马嘶啸：延迟小范围钢铁，可通过视线躲避。' }, // '漫步飞马' 改编自nepufish/ff14-overlay-dungeon-cn项目
    13977: { detect: 'Boss', grade: '简单', note: '小怪会复读技能：黄色为钢铁 蓝色为击退。\n小怪可选中后尽快击杀。' }, // '得到宽恕的纯真' 40层BOSS

    // 41-50层
    14152: { detect: '视觉', grade: '小心', note: '吸引+延迟钢铁' }, // '漫步替身' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14153: { detect: '视觉', grade: '危险', note: '移动极慢，但伤害极高。不要被它碰到！\n攻击会叠加易伤。\n还会使用隐藏的步进式环形地震攻击。' }, // '漫步托尔巴龟' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14154: { detect: '视觉', grade: undefined, note: '读条毒滴牙，可打断，效果未知。' }, // '漫步水蚺'
    14155: { detect: '视觉', grade: '简单', note: '延迟小范围前方扇形AOE' }, // '漫步三裂' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14156: { detect: '视觉', grade: '简单', note: '点名脚底黄圈' }, // '漫步蜥蜴'
    14157: { detect: '视觉', grade: '简单', note: '加速自身，提高攻速。' }, // '漫步白蚁' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14158: { detect: '视觉', grade: '小心', note: '先在前方释放冲刺直线AOE，随后无提示地回头再冲刺一次。' }, // '漫步蚁狮' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14159: { detect: '视觉', grade: '简单', note: '点名脚底黄圈' }, // '漫步钳嘴鸟'
    14160: { detect: '视觉', grade: '简单', note: '读条直线攻击' }, // '漫步壁崖飞鸢'
    14161: { detect: '视觉', grade: '小心', note: '愤怒旋风：延迟钢铁，会造成无法净化的眩晕，伤害约65K。\n愤怒一击：延迟小范围直线AOE，伤害约70K。' }, // '漫步武器' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14162: { detect: '视觉', grade: '简单', note: '点名脚底黄圈，可打断' }, // '漫步龙舌兰'
    14163: { detect: '视觉', grade: '简单', note: '读条扇形' }, // '漫步发芽大口花'
    14164: { detect: '视觉', grade: '简单', note: '读条小钢铁' }, // '漫步螳螂'
    14263: { detect: 'Boss', grade: '简单', note: '不可以长时间站在流沙中。\n龙卷风需要在倒计时结束时站在流沙里避免被击退。' }, // '奥古布纳巴里' 50层BOSS

    // 51-60层
    14165: { detect: '视觉', grade: '简单', note: '读条脚底黄圈' }, // '漫步褐爪'
    14166: { detect: '视觉', grade: '简单', note: undefined }, // '漫步守护者'
    14167: { detect: '视觉', grade: '危险', note: '无提示的全场AOE，为270度环形范围，可站在背后或其命中区域内躲避，可利用视线阻挡。可被眩晕。' }, // '漫步沙蛇' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14168: { detect: '视觉', grade: '危险', note: '使所有人进入目押状态，然后释放延迟中等范围AOE，若不熟悉目押机制，建议提前远离。' }, // '漫步美甲兽' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14169: { detect: '视觉', grade: '小心', note: '非战斗状态下会施放反击屏障，物理攻击会受到秒杀级反伤！' }, // '漫步巨蜥' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14170: { detect: undefined, grade: undefined, note: undefined }, // '漫步邪恶海鸟'
    14171: { detect: '视觉', grade: '简单', note: '读条小扇形' }, // '漫步帕查玛玛'
    14172: { detect: '视觉', grade: '简单', note: '中等宽度的前方扇形提示AOE。' }, // '漫步神香草' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14173: { detect: '视觉', grade: '小心', note: '巡逻怪。\n可被眩晕，会施放超大范围环形AOE及前方扇形攻击。' }, // '漫步恐鹤' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14174: { detect: '视觉', grade: '危险', note: '外环雷：无提示的超大月环！\n尾镰：隐藏的中等范围钢铁。\n高速撞击：直线攻击。' }, // '漫步吼叫的小豹' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14175: { detect: '视觉', grade: '简单', note: '读条小钢铁 或 大范围扫尾' }, // '漫步狞猫'
    14176: { detect: '视觉', grade: '小心', note: '瞬间将目标拉近，然后施放延迟中等范围的钢铁。' }, // '漫步巨人' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14177: { detect: '视觉', grade: '简单', note: undefined }, // '漫步甲虫'
    14097: { detect: 'Boss', grade: '小心', note: '小仙人掌对自身所在格造成伤害。\n大仙人掌对自身及周围9格造成伤害' }, // '元祖马利克刺人仙' 60层BOSS

    // 61-70层
    14178: { detect: '视觉', grade: '危险', note: '左右刀，躲完立即穿到对侧！' }, // '得到宽恕的暴动' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14179: { detect: '视觉', grade: '小心', note: '几千针刺：延迟大范围直线AOE。' }, // '得到宽恕的争论' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14180: { detect: '视觉', grade: '简单', note: '未终针：延迟小范围前方直线AOE。\n终极针：血量低于10%时的点名狂暴攻击。\n可以打断。' }, // '漫步蜂后' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14181: { detect: undefined, grade: '危险', note: '水晶刺：血量低于25%时会反复释放全场AOE，可用视线阻挡。\n冰雹发射：延迟直线AOE。' }, // '得到宽恕的怨恨' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14182: { detect: '视觉', grade: '小心', note: '巡逻怪。\n执行贯穿：向前冲刺并在终点释放小范围钢铁，接地震（月环）。' }, // '漫步塔罗斯' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14183: { detect: '视觉', grade: '小心', note: '冲顶：快速施放的前方宽扇形延迟AOE。' }, // '漫步壁崖鼹鼠' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14184: { detect: '视觉', grade: '小心', note: '在两次“沉岛”圆形点名后会施放超大范围十字AOE！' }, // '得到宽恕的偏颇' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14185: { detect: '视觉', grade: '简单', note: '巡逻怪。\n掷锤：点名脚底黄圈' }, // '得到宽恕的恶作剧'
    14186: { detect: '视觉', grade: '小心', note: '无提示的前方石化攻击（无法背对躲避）。\n延迟小范围钢铁。' }, // '得到宽恕的贪食' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14187: { detect: '视觉', grade: '危险', note: '隐身敌人，接近后才会显形。\n会向你冲撞造成约40K伤害，随后施放快速且延迟小范围钢铁。\n仅出现于61-64层。' }, // '得到宽恕的疑虑' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14188: { detect: '视觉', grade: '危险', note: '【可能是需要诱导】延迟前（或后）方半圆AOE，随后立即在背后（或前面）再释放一次。\n可以打断。' }, // '得到宽恕的眷恋' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14189: { detect: '视觉', grade: '小心', note: '读条小钢铁' }, // '漫步诺姆' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14190: { detect: '视觉', grade: '小心', note: '泥石流：中等范围、延迟释放的宽扇形AOE。' }, // '漫步恩戈齐' 改编自nepufish/ff14-overlay-dungeon-cn项目
    13971: { detect: 'Boss', grade: '小心', note: '热切光芒：直线。\n热切之眼：月环。\n白球会按照出现顺序发动月环。\n二千迈纳回转：钢铁\n八重横扫：需要记忆预兆的8次连续扇形。' }, // '得到宽恕的狂热' 70层BOSS

    // 71-80层
    14191: { detect: '视觉', grade: '小心', note: '读条钢铁 或 正面超大扇形' }, // '得到宽恕的不和' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14192: { detect: '视觉', grade: '危险', note: '非战斗状态会释放全屏AOE\n进战后会读条释放正面扇形AOE' }, // '得到宽恕的腐化物' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14193: { detect: '视觉', grade: '危险', note: '两种读条，先月环后钢铁，或者先钢铁后月环' }, // '得到宽恕的恶意' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14194: { detect: '视觉', grade: '小心', note: '巡逻怪\n拉怪时会跳向玩家并击退，以及一个毒DOT' }, // '漫步食岩者' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14195: { detect: '视觉', grade: '危险', note: '巡逻怪\n读条钢铁，死了会自爆！！！！！！' }, // '漫步爆岩怪' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14196: { detect: '视觉', grade: '简单', note: '点名脚下黄圈' }, // '漫步奶油泡芙'
    14197: { detect: '范围', grade: '危险', note: '超级大月环或者十字！注意不要拉在过道上导致无路可走！' }, // '得到宽恕的虚夸' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14198: { detect: undefined, grade: '小心', note: '巡逻怪\n连续四次正面半圆顺劈' }, // '得到宽恕的傲慢' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14199: { detect: '范围', grade: '小心', note: '变质岩波：读条扇形\n造山风暴：点名一个人的脚下黄圈' }, // '得到宽恕的诽谤' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14200: { detect: '视觉', grade: '小心', note: '小范围直线AOE，并且偶尔会连续平A两次' }, // '得到宽恕的不信任' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14201: { detect: '视觉', grade: '小心', note: '推翻：延迟的小范围钢铁。' }, // '漫步阿米特' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14202: { detect: '听觉', grade: '小心', note: '读条中等范围钢铁' }, // '漫步蠕虫' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14203: { detect: '视觉', grade: '小心', note: '读条无提示的小扇形，秒杀级伤害' }, // '漫步铰颌蚁' 改编自nepufish/ff14-overlay-dungeon-cn项目
    13968: { detect: 'Boss', grade: '小心', note: '紫雷是月环，痛伤是钢铁。\n红色buff少移动 蓝色buff吃前后刀。' }, // '得到宽恕的亵渎' 80层BOSS

    // 81-90层
    14204: { detect: '视觉', grade: '小心', note: '踢击与扫尾：先读条小范围前方直线AOE，随后在背后顺劈' }, // '漫步卡马' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14205: { detect: '视觉', grade: '危险', note: '非战斗状态下会释放全场AOE。\n深渊射线：读条极大范围的直线AOE，穿墙！' }, // '被召唤的巴力' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14206: { detect: '范围', grade: '小心', note: '巡逻怪\n残杀：会连续击退四次\n风暴斩：前方扇形AOE' }, // '漫步骑士' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14207: { detect: undefined, grade: '危险', note: '巡逻怪\n会点名热病，不要移动。可通过视线阻挡来避免。' }, // '被召唤的梦魔' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14208: { detect: '视觉', grade: '小心', note: '巡逻怪\n连续施放3-4次双重平A后，立即发动秒杀顺劈' }, // '被召唤的洪巴巴' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14209: { detect: '视觉', grade: '简单', note: '读条小范围扇形顺劈' }, // '被召唤的格雷姆林' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14210: { detect: '视觉', grade: '小心', note: '读条中等范围扇形\n低血量时会施放长读条的狂暴技能，可能是点名秒杀攻击。' }, // '漫步异豺' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14211: { detect: '视觉', grade: '危险', note: '昏暗：长读条的可打断超宽扇形AOE，不要与“黑暗”混淆。' }, // '漫步卡部斯' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14212: { detect: '视觉', grade: '简单', note: '读条脚底黄圈' }, // '被召唤的小撒旦'
    14213: { detect: '视觉', grade: '小心', note: '读条宽扇形顺劈' }, // '被召唤的上级恶魔' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14214: { detect: '视觉', grade: '简单', note: '大凶眼：很大范围的背对' }, // '被召唤的盖因' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14215: { detect: '视觉', grade: '危险', note: '闪雷：读条前方圆形AOE。\n地狱爪击：读条前方扇形AOE。\n拍尾：隐藏的大范围后方扇形AOE。\n雷光：不可见的点某人脚下的黄圈' }, // '被召唤的刻耳柏洛斯' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14216: { detect: '范围', grade: '小心', note: '（远离时会释放）昏暗：很大范围扇形\n（靠近时会释放）心魔：小范围钢铁' }, // '被召唤的行吟诗人' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14090: { detect: 'Boss', grade: '小心', note: '发光手一侧的270°半场刀。\n横断冲：对boss左右的90°扇形攻击\n纵断冲：对boss前后的90°扇形攻击\nX断冲时，场边的魔法阵会对所在行或列发动直线攻击。' }, // '玛拉科达' 90层BOSS

    // 91-100层
    14217: { detect: undefined, grade: '小心', note: '读条三重/四重进行连续强化攻击，随后发动致命的小范围环形AOE。' }, // '漫步狼人' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14218: { detect: undefined, grade: '小心', note: '读条左右刀，记得穿' }, // '被召唤的古辛' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14219: { detect: undefined, grade: '危险', note: '梦祸视线：直线AOE\n死亡会自爆！！！' }, // '被召唤的梦祸' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14220: { detect: undefined, grade: '小心', note: '点名，必须用墙或者障碍物阻挡' }, // '被召唤的单身汉' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14221: { detect: undefined, grade: '小心', note: '石化需要背对\n怪光线：大范围直线AOE' }, // '被召唤的破坏本能' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14222: { detect: undefined, grade: '小心', note: '读条斜着的左右刀\n前方花蜜喷吐：前方大扇形AOE。' }, // '被召唤的锯齿花' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14223: { detect: '视觉', grade: '简单', note: '根系纠缠：点名脚底黄圈\n藤枝伏地：小扇形' }, // '漫步紫三裂'
    14224: { detect: '听觉', grade: '小心', note: '读条超长直线AOE（宽），穿墙！' }, // '漫步食人花' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14225: { detect: undefined, grade: '小心', note: '无读条小范围劈后面+读条顺劈，最好去侧面' }, // '被召唤的扎哈克' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14226: { detect: undefined, grade: '小心', note: '效果未知，建议使用视线阻挡以保安全。' }, // '被召唤的阿刻戎' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14227: { detect: undefined, grade: '简单', note: '读条钢铁' }, // '被召唤的傀儡' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14228: { detect: undefined, grade: '简单', note: '读条扇形顺劈' }, // '漫步恶念' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14229: { detect: undefined, grade: '小心', note: '黑暗神圣：点名某人的大黄圈\n生命停止：极快！前方超大扇形！' }, // '被召唤的古恶魔' 改编自nepufish/ff14-overlay-dungeon-cn项目
    14037: { detect: 'Boss', grade: '小心', note: '男，需吃白buff' }, // '至极悲痛' 99层BOSS（男）机制过多，自己看攻略
    14038: { detect: 'Boss', grade: '小心', note: '女，需吃黑buff' }, // '被侵蚀的食罪灵' 99层BOSS（女） 机制过多，自己看攻略
  },
  floorTips: {
    0: `第1~10层`,
    1: `第11~20层`,
    2: `第21~30层`,
    3: `第31~40层`,
    4: `第41~50层`,
    5: `第51~60层`,
    6: `第61~70层`,
    7: `第71~80层`,
    8: `第81~90层`,
    9: `第91~100层`,
  },
}

const data: Data[] = [PT, EO, HoH, PotD]

function getMaps(zoneID: number): DD_Info | undefined {
  const mapData = data.find((map) => map.zoneIDs.includes(zoneID))
  if (mapData) {
    return { enemiesData: mapData.enemiesData, floorTips: mapData.floorTips[mapData.zoneIDs.indexOf(zoneID) ?? 0] ?? '' }
  }
}

export { type EnemyData, type MapKey, getMaps, type DD_Info as DDInfo }
