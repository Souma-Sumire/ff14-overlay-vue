import{d as G,y as h,v as S,a0 as P,aF as X,A as F,o as k,b as N,a as m,u as n,a3 as d,g as t,G as x,H as B,w as V,f as w,I as A,W as Y,X as Q,L as W,aG as j,i as q,O as J,P as K,Q as M,D as E,F as T,aB as Z}from"./vendor-8ebccccd.js";import{_ as nn}from"./_plugin-vue_export-helper-c27b6911.js";const C=b=>(J("data-v-da8147d8"),b=b(),K(),b),sn={class:"app"},an={class:"pageSelection"},cn=["onClick"],tn={class:"blubook"},on=["onClick"],en=["src","onError"],pn={class:"Number"},rn=C(()=>t("span",{style:{display:"none"}},null,-1)),ln={class:"actionDetails"},mn={class:"Number"},Dn=["innerHTML"],yn=["src"],In=["innerHTML"],Ln={class:"Cast100ms"},fn=C(()=>t("span",{style:{color:"#00c2c2"}},"咏唱时间：",-1)),gn={class:"Recast100ms"},hn=C(()=>t("span",{style:{color:"#00c2c2"}},"复唱时间：",-1)),kn=["innerHTML"],Nn=["innerHTML"],An=["innerHTML"],bn=G({__name:"blubook",setup(b){const p=h("blubook-selectIndex",0),i=h("blubook-page",1),D=S(""),v=S(!1),y=h("blubook-notLearnedOnly",!1),u=h("blubook-grayNotLearned",!1),l=h("blubook-learned",{});P(y,()=>{X(()=>{i.value=1})});const e=S([{ID:3,ActionID:11385,Name:"水炮",Number:1,Stats:`攻击类型：魔法
攻击属性：水
评级：★`,Cast100ms:20,Description:'对目标发动水属性魔法攻击　<span style="color:#00cc22;">威力：</span>200',AozDescription:`从克拉肯身上学习到的青魔法。
放出高压水流对敌人造成冲击。因为是利用水属性以太凝聚空气中的水分，所以即使在看似没有水的地方也能够使用。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003253_hr1.png",Recast100ms:25,Learn:"自动习得 Lv.1"},{ID:20,ActionID:11402,Name:"火炎放射",Number:2,Stats:`攻击类型：魔法
攻击属性：火
评级：★★★★`,Cast100ms:20,Description:`向自身前方发动火属性扇形范围魔法攻击
<span style="color:#00cc22;">威力：</span>220
攻击复数敌人时，对第一个之外的敌人威力降低50%`,AozDescription:`向自身前方放出火焰的青魔法。
与咒术中的火炎原理相似，通过放出火属性以太来引起火焰燃烧的现象。也有兵器可以通过喷射可燃液体加以点燃来产生相似效果。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003270_hr1.png",Learn:`纷争要地布雷福洛克斯野营地 - 6号哥布林坦克 Lv.50
 幻龙残骸密约之塔 - 独爪妖禽、魔导炮艇 Lv.50`,Recast100ms:25},{ID:8,ActionID:11390,Name:"水流吐息",Number:3,Stats:`攻击类型：魔法
攻击属性：水
评级：★★★★`,Cast100ms:20,Description:`向自身前方发动水属性扇形范围魔法攻击　<span style="color:#00cc22;">威力：</span>140
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>水属性持续伤害
<span style="color:#00cc22;">威力：</span>20　<span style="color:#00cc22;">持续时间：</span>12秒`,AozDescription:`标志性的水属性青魔法。
以强大的魔力操纵周围的水分，制造出大量的水泡包裹住敌人。更能加入有毒成分，侵蚀被包裹的敌人。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003258_hr1.png",Learn:`艾玛吉娜杯斗技大会决赛 - 奥尔特罗斯 Lv.50
 假面狂欢20 - 奥尔特罗斯 Lv.50
 利维亚桑歼灭战 - 利维亚桑 Lv.50
 利维亚桑歼殛战 - 利维亚桑 Lv.50`,Recast100ms:25},{ID:7,ActionID:11389,Name:"狂乱",Number:4,Stats:`攻击类型：物理・打
攻击属性：无
评级：★★★`,Cast100ms:10,Description:`跃向目标并对目标及其周围敌人发动范围物理攻击
<span style="color:#00cc22;">威力：</span>150
攻击复数敌人时，对目标之外的敌人威力降低50%
止步状态下无法发动`,AozDescription:`祖使用的青魔法。
使用魔法操纵自身的精神，消除脑内的恐惧并增幅愤怒，以此解除肉体的枷锁，将全部力量发挥出来攻向敌人。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003257_hr1.png",Learn:`领航明灯天狼星灯塔 - 祖 Lv.50打破两个蛋后使用
 拉诺西亚外地 [A] - 角祖 Lv.50`,Recast100ms:25},{ID:16,ActionID:11398,Name:"钻头炮",Number:5,Stats:`攻击类型：物理・突
攻击属性：无
评级：★★`,Cast100ms:20,Description:`向目标所在方向发出无属性直线范围物理攻击　<span style="color:#00cc22;">威力：</span>200
攻击复数敌人时，对第一个之外的敌人威力降低50%
目标处于<span style="color:#ff7b1a;">石化</span>状态时威力提高
<span style="color:#00cc22;">目标处于石化状态时威力：</span>600
<span style="color:#00cc22;">追加效果：</span>解除敌对目标身上的<span style="color:#ff7b1a;">石化</span>状态`,AozDescription:`模仿魔导兵器攻击方式的青魔法。
让奔涌的魔力旋转起来，以此获得惊人的贯穿力。由于魔导兵器的这种攻击手段本身是从凿石机上得到的灵感，所以这个青魔法对被石化的敌人也有更加显著的效果。`,Learn:`北萨纳兰 - 逆向工程 - 废弃的魔导先锋 Lv.46
 北萨纳兰 (x:16, y:15) - 魔导先锋强化型 Lv.50血量低于 60% 后使用
 纷争要地布雷福洛克斯野营地 - 3号哥布林装甲 Lv.50
 帝国南方堡外围激战 - 魔导先锋、魔导先锋强袭型 Lv.50
 天幕魔导城最终决战 - 魔导先锋重装型 Lv.50`,Icon:"https://cafemaker.wakingsands.com/i/003000/003266_hr1.png",Recast100ms:25},{ID:5,ActionID:11387,Name:"高压电流",Number:6,Stats:`攻击类型：魔法
攻击属性：雷
评级：★★★★`,Cast100ms:20,Description:`对自身周围的敌人发动雷属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>180
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>麻痹　<span style="color:#00cc22;">持续时间：</span>15秒
<span style="color:#00cc22;">追加效果：</span>目标处于<span style="color:#ff7b1a;">水毒</span>状态时威力提高，持续时间增加
<span style="color:#00cc22;">目标处于水毒状态时威力：</span>220
<span style="color:#00cc22;">目标处于水毒状态时持续时间：</span>30秒`,AozDescription:`亚拉戈帝国开发出的机械魔法。
尝试让机械发动魔法的过程中诞生的产物。首先控制雷属性以太，然后提高电压，最后将电流向四周放射出去。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003255_hr1.png",Learn:`巴哈姆特大迷宫 邂逅之章1 - 自卫系统 Lv.50
 巴哈姆特大迷宫 邂逅之章2 - 监视/净化/防卫/焚烧/迎击/防疫/自卫系统 Lv.50
 假面狂欢15 - 斗兽系统 Lv.50`,Recast100ms:25},{ID:19,ActionID:11401,Name:"若隐若现",Number:7,Stats:`攻击类型：魔法
攻击属性：无
评级：★`,Cast100ms:10,Description:`迅速移动到指定地点
止步状态下无法发动`,AozDescription:`一种传送魔法。
将自身的魔力流出，以此制造简易的地脉，利用简易地脉进行传送。只能移动很短的距离，但需要紧急回避时十分有效。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003269_hr1.png",Recast100ms:25,Learn:`北萨纳兰 [B] - 永恒不灭的菲兰德副耀士 Lv.50
 腐坏遗迹无限城市街古迹 - 巴尔泽芬 Lv.50
 惨剧灵殿塔姆·塔拉墓园 - 但他林、幻影骑士 Lv.50`},{ID:25,ActionID:11407,Name:"终极针",Number:8,Stats:`攻击类型：物理・突
攻击属性：无
评级：★★`,Cast100ms:20,Description:`对目标发动无属性物理攻击　<span style="color:#00cc22;">威力：</span>2000
发动后自身陷入无法战斗状态
<span style="color:#00cc22;">追加效果：</span><span style="color:#ff7b1a;">意志薄弱</span>
即使进入无法战斗状态也不会解除<span style="color:#ff7b1a;">意志薄弱</span>
<span style="color:#00cc22;">持续时间：</span>600秒
<span style="color:#00cc22;">发动条件：</span>非<span style="color:#ff7b1a;">意志薄弱</span>状态中`,AozDescription:`胡蜂最后的一刺。
将自身的生命力全部转换成魔力，生成剧毒注入敌人体内。若没有玉石俱焚的气魄不建议使用。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003275_hr1.png",Learn:`中拉诺西亚 (x:15, y:15) - 杀手胡蜂 Lv.13
 古代遗迹喀恩埋没圣堂 - 圣堂蜂、粪便胡蜂 Lv.35`,Recast100ms:25},{ID:4,ActionID:11386,Name:"苦闷之歌",Number:9,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:20,Description:`对目标发动无属性魔法攻击　<span style="color:#00cc22;">威力：</span>50
<span style="color:#00cc22;">追加效果：</span>无属性持续伤害
<span style="color:#00cc22;">威力：</span>50　<span style="color:#00cc22;">持续时间：</span>30秒`,AozDescription:`塞壬所擅长的青魔法。
将恶毒的魔力融入歌声，污染听到的人的精神，由此引起敌人的幻痛，间接对肉体造成伤害。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003254_hr1.png",Learn:"领航明灯天狼星灯塔 - 塞壬 Lv.50",Recast100ms:25},{ID:22,ActionID:11404,Name:"怒视",Number:10,Stats:`攻击类型：魔法
攻击属性：雷
评级：★★★★`,Cast100ms:20,Description:`向目标所在方向发出雷属性直线范围魔法攻击　<span style="color:#00cc22;">威力：</span>220
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>麻痹　<span style="color:#00cc22;">持续时间：</span>6秒`,AozDescription:`独眼巨人发射的诡异光线。
原理与诡异视线相似，从以眼球为基础的魔法阵中放出魔法。不过怒视的集中度更高，可以使敌人如遭雷击麻痹当场。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003272_hr1.png",Learn:`毒雾洞窟黄金谷 - 数币巨人 Lv.47
 中萨纳兰 [S] - 布隆特斯 Lv.50`,Recast100ms:25},{ID:9,ActionID:11391,Name:"平原震裂",Number:11,Stats:`攻击类型：魔法
攻击属性：土
评级：★★`,Cast100ms:20,Description:`对自身周围的敌人发动土属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>220
攻击复数敌人时，对第一个之外的敌人威力降低50%`,AozDescription:`土属性的魔法生物使用的青魔法。
使用魔法操纵以太来引发局部地震。据说魔力强大的人使用时连地形都能改变。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003259_hr1.png",Recast100ms:25,Learn:`黑衣森林北部林区 (x:19, y:28) - 泥土巨像 Lv.28
 南萨纳兰 (x:24, y:13) - 砂石巨像 Lv.29
 拉诺西亚外地 (x:16, y:16) - 玄岩巨像 Lv.34
 骚乱坑道铜铃铜山 - 哥革巨像 Lv.50
 苏醒遗迹喀恩埋没圣堂 - 喀恩守护者 Lv.50
 假面狂欢25 - 启示者 Lv.50`},{ID:11,ActionID:11393,Name:"怒发冲冠",Number:12,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:10,Description:`效果时间内，自身发动的1次魔法威力提升50%
<span style="color:#00cc22;">持续时间：</span>30秒
无法与<span style="color:#ff7b1a;">攻击准备</span>效果共存`,AozDescription:`野生生物的斗争本能。
通过愤怒来增幅魔力，提高自身的战斗能力。青魔法师拿来用的话也许能提高魔法攻击的威力。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003261_hr1.png",Learn:"黑衣森林东部林区 (x:18, y:24) - 狂野疣猪 Lv.20",Recast100ms:25},{ID:24,ActionID:11406,Name:"白风",Number:13,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★`,Cast100ms:20,Description:"恢复自身及周围队员的体力，恢复量等同于自身当前的体力量",AozDescription:`原始的治疗魔法。
将纯净的以太用风吹向四周。不仅对自身、对周围的同伴也有着高效的治疗效果，代价是巨额的魔力消耗。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003274_hr1.png",Recast100ms:25,Learn:`学习 10 个技能后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.1
 无限城的死斗 - 恩奇都 Lv.50`},{ID:32,ActionID:11414,Name:"5级石化",Number:14,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:20,Description:`令自身前方扇形范围内等级为5的倍数的敌人陷入石化状态
<span style="color:#00cc22;">持续时间：</span>20秒
命中率较低
目标等级高于自身等级时无效`,AozDescription:`冥鬼之眼等妖异使用的诅咒。
可以找出特定成长阶段的对手的心灵破绽，污染对方的精神，以此停止其生命活动。魔法名中的“级”字可能是什么地方对成长阶段的叫法……`,Learn:`名门府邸静语庄园 - 庄园的守卫 Lv.28血量低于 20% 后使用
 水晶塔 古代人迷宫 - 诅咒之眼、腐朽之眼 Lv.50`,Icon:"https://cafemaker.wakingsands.com/i/003000/003282_hr1.png",Recast100ms:25},{ID:18,ActionID:11400,Name:"锋利菜刀",Number:15,Stats:`攻击类型：物理・斬
攻击属性：无
评级：★★★★`,Cast100ms:10,Description:`对目标发动无属性物理攻击　<span style="color:#00cc22;">威力：</span>220
目标处于<span style="color:#ff7b1a;">眩晕</span>状态时威力提高
<span style="color:#00cc22;">目标处于眩晕状态时威力：</span>450`,AozDescription:`冬贝利使用的青魔法。
用魔力聚集所有的怨恨之情，提高武器的锋利程度砍向敌人。对于无法动弹的敌人来说这种攻击非常可怕。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003268_hr1.png",Learn:`神灵圣域放浪神古神殿 - 冬贝利王 Lv.50
 拉诺西亚高地 [A] - 玛贝利 Lv.50`,Recast100ms:25},{ID:36,ActionID:11418,Name:"冰棘屏障",Number:16,Stats:`攻击类型：魔法
攻击属性：水
评级：★`,Cast100ms:20,Description:`一定时间内，自身受到物理攻击时会对对方造成冰属性魔法伤害
<span style="color:#00cc22;">威力：</span>40　<span style="color:#00cc22;">持续时间：</span>15秒
<span style="color:#00cc22;">追加效果（发动几率50%）：</span>减速20%
<span style="color:#00cc22;">持续时间：</span>15秒`,AozDescription:`部分妖异使用的青魔法。
是一种对施术者自身施加的诅咒，会将敌人对自己的敌意转换为冰属性以太，凝成冰柱反射出去。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003286_hr1.png",Learn:`黑衣森林中央林区 (x:27, y:24) - 捣蛋小鬼 Lv.9
 名门府邸静语庄园 - 庄园小丑 Lv.50
 假面狂欢25 - 启示者 Lv.50`,Recast100ms:25},{ID:13,ActionID:11395,Name:"吸血",Number:17,Stats:`攻击类型：魔法
攻击属性：无
评级：★`,Cast100ms:20,Description:`对目标发动无属性魔法攻击　<span style="color:#00cc22;">威力：</span>50
<span style="color:#00cc22;">追加效果：</span>恢复自身魔力`,AozDescription:`蝙蝠和沙蚤使用的青魔法。
通过血液吸收敌人的生命以太，并转化为自身的魔力。人们推测最初这种魔法是由摄取养分的吸血行为逐渐演变来的。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003263_hr1.png",Recast100ms:25,Learn:`拉诺西亚低地 (x:27, y:16) - 洞穴蝙蝠 Lv.7
 中萨纳兰 (x:26, y:18) - 烈阳蝙蝠 Lv.14
 西拉诺西亚 (x:28, y:24) - 黄昏蝙蝠 Lv.15
 黑衣森林东部林区 (x:17, y:23) - 漆黑蝙蝠、血蚤 Lv.21
 黑衣森林南部林区 (x:24, y:23) - 小狐蝠 Lv.37
 名门府邸静语庄园 - 阁楼蝙蝠 Lv.28
 古代遗迹喀恩埋没圣堂 - 圣堂蝙蝠 Lv.35
 流沙迷宫樵明洞 - 沙漠蝙蝠 Lv.38
 毒雾洞窟黄金谷 - 金谷蝙蝠 Lv.47
 剑斗领域日影地修炼所 - 日影地蝙蝠 Lv.50
 苏醒遗迹喀恩埋没圣堂 - 圣堂蝙蝠 Lv.50`},{ID:10,ActionID:11392,Name:"橡果炸弹",Number:18,Stats:`攻击类型：魔法
攻击属性：无
评级：★`,Cast100ms:20,Description:`令目标及其周围的敌人陷入睡眠状态　<span style="color:#00cc22;">持续时间：</span>30秒
发动之后会停止自动攻击`,AozDescription:`树精等草木纲魔物使用的青魔法。
撒出橡果状的魔力块并引起连锁爆炸，借此散布具有催眠效果的成分。这种魔法是为了从取食树液的百虫纲魔物手中保护自己而诞生的。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003260_hr1.png",Learn:`黑衣森林北部林区 (x:27, y:28) - 幼体树精 Lv.12
 黑衣森林中央林区 (x:27, y:15) - 幼体树精 Lv.12
 黑衣森林东部林区 (x:13, y:25) - 幼体树精 Lv.12
 黑衣森林中央林区 [S] - 乌尔迦鲁 Lv.50
 邪念妖地无限城古堡 - 多节树精 Lv.50`,Recast100ms:25},{ID:14,ActionID:11396,Name:"投弹",Number:19,Stats:`攻击类型：魔法
攻击属性：火
评级：★★`,Cast100ms:20,Description:`对指定地点发动火属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>200
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>眩晕　<span style="color:#00cc22;">持续时间：</span>3秒`,AozDescription:`模仿哥布林族投掷炸弹的青魔法。
哥布林族在炸弹的火药里加入魔力，以此提高爆炸威力。用青魔法模仿这种形式，造出虚假的炸弹进行燃烧攻击。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003264_hr1.png",Learn:`中拉诺西亚 (x:23, y:21) - 哥布林鱼师、哥布林赌徒 Lv.5
 西拉诺西亚 (x:27, y:23) - 哥布林猎手 Lv.18
 黑衣森林东部林区 (x:11, y:28) - 哥布林猎手 Lv.11
 黑衣森林南部林区 (x:28, y:21) - 哥布林暴徒 Lv.28
 纷争要地布雷福洛克斯野营地 - 青蓝之手滑翔兵 Lv.50`,Recast100ms:25},{ID:29,ActionID:11411,Name:"破防",Number:20,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:10,Description:`一定时间内，目标所受伤害提高5%
<span style="color:#00cc22;">持续时间：</span>15秒
该魔法有单独计算的复唱时间，不受其他魔法复唱时间的影响
与<span style="color:#ff7b1a;">惊奇光</span>共享复唱时间`,AozDescription:`新大陆的巨人种族使用的青魔法。
这是一种原始的诅咒，通过侵蚀敌人的精神来瓦解对方的防御。当敌人变得毫无防备后，己方攻击的效果将大幅提升。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003279_hr1.png",Learn:"学习 5 个技能后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.1",Recast100ms:600},{ID:26,ActionID:11408,Name:"自爆",Number:21,Stats:`攻击类型：魔法
攻击属性：火
评级：★`,Cast100ms:20,Description:`对自身周围的敌人发动火属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>1500
自身处于<span style="color:#ff7b1a;">油性分泌物</span>状态时威力提高至1800
发动后自身陷入无法战斗状态
<span style="color:#00cc22;">追加效果：</span><span style="color:#ff7b1a;">意志薄弱</span>
即使进入无法战斗状态也不会解除<span style="color:#ff7b1a;">意志薄弱</span>
<span style="color:#00cc22;">持续时间：</span>600秒
<span style="color:#00cc22;">发动条件：</span>非<span style="color:#ff7b1a;">意志薄弱</span>状态中`,AozDescription:`爆弹怪倾情代言的青魔法。
将构成生命的以太全部转换成火属性魔力引起大爆炸。在身上沾满油脂的情况下使用时，能够令火力更上一层楼。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003276_hr1.png",Learn:`西萨纳兰 (x:27, y:16) - 滑行爆弹怪 Lv.12
 封锁坑道铜铃铜山 - 爆破爆弹怪、烈火弹怪 Lv.17
 魔兽领域日影地修炼所 - 瓦斯弹怪 Lv.20
 名门府邸静语庄园 - 夫人手提灯 Lv.28
 流沙迷宫樵明洞 - 榴霰弹怪 Lv.38
 巴哈姆特大迷宫 真源之章2 - 护卫系统 Lv.50`,Recast100ms:25},{ID:27,ActionID:11409,Name:"融合",Number:22,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:20,Description:`令一名队员的体力与魔力完全恢复
发动后自身陷入无法战斗状态
<span style="color:#00cc22;">追加效果：</span><span style="color:#ff7b1a;">意志薄弱</span>
即使进入无法战斗状态也不会解除<span style="color:#ff7b1a;">意志薄弱</span>
<span style="color:#00cc22;">持续时间：</span>600秒
<span style="color:#00cc22;">发动条件：</span>非<span style="color:#ff7b1a;">意志薄弱</span>状态中`,AozDescription:`新大陆的死灵使用的青魔法。
将自己的生命力和魔力全部分给他人，献出生命来让对方完全恢复。牺牲自己，拯救他人。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003277_hr1.png",Learn:"学习 20 个技能后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.1",Recast100ms:25},{ID:21,ActionID:11403,Name:"拍掌",Number:23,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★`,Cast100ms:20,Description:`令自身前方扇形范围内的敌人陷入眩晕状态
<span style="color:#00cc22;">持续时间：</span>6秒`,AozDescription:`卢恩族擅长的青魔法。
为了从凶猛的肉食野兽口中保护自己而创造出的魔法，将魔力凝聚在手掌上，通过拍手产生的冲击波来惊吓敌人。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003271_hr1.png",Recast100ms:25,Learn:`中萨纳兰 (x:16, y:19) - 卢恩人护甲手 Lv.6
 东拉诺西亚 (x:26, y:32) - 卢恩人烘鸥手 Lv.32`},{ID:41,ActionID:11423,Name:"投掷沙丁鱼",Number:24,Stats:`攻击类型：物理・突
攻击属性：无
评级：★`,Cast100ms:0,Description:`对目标发动无属性物理攻击　<span style="color:#00cc22;">威力：</span>10
<span style="color:#00cc22;">追加效果：</span>中断目标的技能咏唱`,AozDescription:`碧企鹅擅长的青魔法。
把捕食时吞下的鱼一口气喷射出来，以此来惊吓敌人。用青魔法再现这个过程则是喷射出魔力制造的鱼，在施加冲击的同时来使对方动摇。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003291_hr1.png",Learn:`东拉诺西亚 (x:27, y:35) - 碧企鹅 Lv.30
 东拉诺西亚 [B] - 血腥玛丽 Lv.50`,Recast100ms:25},{ID:1,ActionID:11383,Name:"鼻息",Number:25,Stats:`攻击类型：魔法
攻击属性：风
评级：★★★★`,Cast100ms:20,Description:"将自身前方扇形范围内的敌人击退20米",AozDescription:`提丰老师的秘技。
喷出猛烈的鼻息来攻击正面敌人的青魔法。除了能让敌人受到狂风侵袭外，还可以微妙地造成一些精神伤害。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003251_hr1.png",Recast100ms:25,Learn:`艾玛吉娜杯斗技大会决赛 - 提丰 Lv.50
 假面狂欢20 - 提丰 Lv.50`},{ID:2,ActionID:11384,Name:"4星吨",Number:26,Stats:`攻击类型：物理・打
攻击属性：无
评级：★★★★`,Cast100ms:20,Description:`对指定地点发动无属性范围物理攻击　<span style="color:#00cc22;">威力：</span>200
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>40%加重　<span style="color:#00cc22;">持续时间：</span>30秒`,AozDescription:`奥尔特罗斯的绝招。
制造出虚幻的砝码并使其落下压向敌人。实际上砝码究竟是不是正好4星吨就不好说了。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003252_hr1.png",Learn:"艾玛吉娜杯斗技大会决赛 - 奥尔特罗斯 Lv.50",Recast100ms:25},{ID:17,ActionID:11399,Name:"诡异视线",Number:27,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:20,Description:`向自身前方发动无属性扇形范围魔法攻击
<span style="color:#00cc22;">威力：</span>220
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>提升仇恨`,AozDescription:`扎哈克等妖异使用的攻击方式。
以眼球为基础构筑魔法阵，凝聚魔力和恶意一并放射出去，因此可以引起敌人更大的敌意。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003267_hr1.png",Learn:`摩杜纳  - 理符任务：回收禁书《尖牙利齿的怪物》 暗黑扎哈克 Lv.50
 邪教驻地无限城古堡 - 阿难塔波嘉 Lv.50
 水晶塔 古代人迷宫 - 瓦力弗 Lv.50`,Recast100ms:25},{ID:6,ActionID:11388,Name:"臭气",Number:28,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★`,Cast100ms:20,Description:`向自身前方扇形范围内喷吐臭气
令范围内的敌人陷入中毒、伤害降低10%、加重40%、减速20%、失明、麻痹状态
<span style="color:#00cc22;">中毒威力：</span>20　<span style="color:#00cc22;">持续时间：</span>15秒
同时中断目标的技能咏唱`,AozDescription:`魔界花使用的青魔法。
操纵风土两种属性的以太，使以太转向灵极性，由此向口中吐出的气息中加入毒素大范围喷射。被称为是最臭的青魔法。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003256_hr1.png",Learn:`黑衣森林中央林区 (x:18, y:21) - 套索花、臭套索花 Lv.31
 摩杜纳 (x:14, y:14) - 魔界花 Lv.44
 毒雾洞窟黄金谷 - 魔界花、守财夫人 Lv.47`,Recast100ms:25},{ID:42,ActionID:11424,Name:"超硬化",Number:29,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★★`,Cast100ms:20,Description:`一定时间内，将自身所受的伤害减轻90%，同时除特定攻击之外其他所有击退与吸引效果失效
但是持续时间内无法移动或使用技能　<span style="color:#00cc22;">持续时间：</span>10秒
<span style="color:#00cc22;">追加效果：</span>解除自身的<span style="color:#ff7b1a;">狂战士化</span>状态
此技能发动后无法主动中断`,AozDescription:`龟甲龙擅长的青魔法。
操纵土属性以太来展开含有金属成分的魔法障壁，以此来强化铠甲和服装。不过由于重量增加会导致强化效果中无法移动。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003292_hr1.png",Learn:`激战城塞石卫塔 - 库卡龙龟 Lv.50
 皇都伊修加德保卫战 - 部落龙龟 Lv.50
 龙堡参天高地 - 坚甲铁龙——塔拉斯克 - 塔拉斯克 Lv.53`,Recast100ms:25},{ID:35,ActionID:11417,Name:"强力守护",Number:30,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★★`,Cast100ms:20,Description:`令自身所受到的伤害减轻40%，同时以令攻击造成的伤害降低40%为代价提升自身仇恨
持续时间内咏唱不会因受到伤害而中断
再次发动时则取消该状态　<span style="color:#00cc22;">持续时间：</span>永久`,AozDescription:`新大陆的海洋生物使用的青魔法。
皮肤很薄的海洋生物为了保护自身而进化出了高超的以太操纵技术。将用于攻击的以太分出一部分加强防御，创造出可以保护自身的魔法障壁。`,Learn:"学习 10 个技能后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.1",Icon:"https://cafemaker.wakingsands.com/i/003000/003285_hr1.png",Recast100ms:25},{ID:30,ActionID:11412,Name:"滑舌",Number:31,Stats:`攻击类型：物理・打
攻击属性：无
评级：★★★★`,Cast100ms:20,Description:`将目标拉向自身，同时令目标陷入眩晕状态　<span style="color:#00cc22;">持续时间：</span>4秒
<span style="color:#00cc22;">追加效果：</span>提升仇恨`,AozDescription:`巨蟾蜍擅长的青魔法。
本来是伸出粘粘的舌头捕获远处猎物的捕食技能。青魔法则是用魔力制造出无形的舌头来模仿这一效果。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003280_hr1.png",Learn:`中萨纳兰 (x:27, y:19) - 毒蟾蜍 Lv.14
 西萨纳兰 (x:15, y:7) - 痴笑巨蟾蜍 Lv.14
 东拉诺西亚 (x:17, y:27) - 巨蟾蜍 Lv.33`,Recast100ms:25},{ID:28,ActionID:11410,Name:"油性分泌物",Number:32,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★`,Cast100ms:20,Description:`一定时间内，自身的回避率提高20%
<span style="color:#00cc22;">持续时间：</span>180秒`,AozDescription:`巨蟾蜍使用的青魔法。
给自己涂上油脂，得以让自己变得滑溜溜的，以此回避敌人的攻击。使用起来有点恶心，但也有十分狂热的爱好者。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003278_hr1.png",Recast100ms:25,Learn:"西萨纳兰 (x:15, y:7) - 痴笑巨蟾蜍 Lv.24"},{ID:37,ActionID:11419,Name:"寒冰咆哮",Number:33,Stats:`攻击类型：魔法
攻击属性：水
评级：★★`,Cast100ms:20,Description:`对自身周围的敌人发动冰属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>220
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>冻结　<span style="color:#00cc22;">持续时间：</span>12秒`,AozDescription:`奇美拉使用的青魔法。
据说是合成时所用的原产自极北之地的山羊为保护自己不受冰雪侵袭而练就了冰属性以太操控能力，后来将这种能力发展成了攻击手段。`,Learn:`流沙迷宫樵鸣洞 - 奇美拉 Lv.38
 死化奇美拉讨伐战 - 死化奇美拉 Lv.50
 北萨纳兰 - 狂暴巨兽——强化奇美拉 - 强化奇美拉 Lv.49`,Icon:"https://cafemaker.wakingsands.com/i/003000/003287_hr1.png",Recast100ms:25},{ID:38,ActionID:11420,Name:"雷电咆哮",Number:34,Stats:`攻击类型：魔法
攻击属性：雷
评级：★★`,Cast100ms:20,Description:`对自身周围的敌人发动雷属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>200
无法攻击到自身周围8米以内的敌人
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>麻痹　<span style="color:#00cc22;">持续时间：</span>9秒
目标处于<span style="color:#ff7b1a;">冻结</span>状态时威力提高，对特定敌人无效
<span style="color:#00cc22;">冻结状态时威力：</span>400
<span style="color:#00cc22;">追加效果：</span>解除目标身上的<span style="color:#ff7b1a;">冻结</span>状态，对特定敌人无效`,AozDescription:`奇美拉使用的青魔法。
据说是通过合成擅长操控雷电的龙族而使奇美拉获得的能力。使用时会在周围引发激烈的放电现象。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003288_hr1.png",Learn:`流沙迷宫樵鸣洞 - 奇美拉 Lv.38
 死化奇美拉讨伐战 - 奇美拉 Lv.50
 北萨纳兰 - 狂暴巨兽——强化奇美拉 - 强化奇美拉 Lv.49
 假面狂欢21 - 阿皮狄马 Lv.50
 假面狂欢25 - 阿波卡里普斯 Lv.50`,Recast100ms:25},{ID:23,ActionID:11405,Name:"导弹",Number:35,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★★`,Cast100ms:20,Description:`给予目标等同其当前体力50%的伤害
命中率较低
目标等级高于自身等级时无效`,AozDescription:`模仿导弹的青魔法。
发射以太构成的虚假导弹。中弹时的冲击力十分强劲，对于越是顽强的敌人越能造成更多伤害。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003273_hr1.png",Recast100ms:25,Learn:"无限城的死斗 - 恩奇都 Lv.50"},{ID:15,ActionID:11397,Name:"千针刺",Number:36,Stats:`攻击类型：物理・突
攻击属性：无
评级：★★★★`,Cast100ms:60,Description:`对自身周围的敌人发动无属性范围物理攻击
<span style="color:#00cc22;">固定伤害：</span>1000
伤害由范围内的敌人分摊`,AozDescription:`仙人刺擅长的射出针刺的攻击。
不过实际上并不会真的射出针刺，而是将细长的魔力块快速射出，使敌人受到如同针扎般的痛楚。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003265_hr1.png",Recast100ms:25,Learn:`南萨纳兰 (x:16, y:15) - 仙人刺舞蹈家 Lv.24
 流沙迷宫樵鸣洞 - 仙人刺逃兵 Lv.24`},{ID:40,ActionID:11422,Name:"喷墨",Number:37,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★`,Cast100ms:20,Description:`向自身前方发动无属性扇形范围魔法攻击　<span style="color:#00cc22;">威力：</span>200
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>失明　<span style="color:#00cc22;">持续时间：</span>30秒`,AozDescription:`克拉肯使用的青魔法。
将青魔法水炮进一步强化，向魔力聚集出的水分中加入不纯物质，制造出魔法的墨汁并发射，可以遮蔽敌人的视野。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003290_hr1.png",Learn:"逆转要害沙斯塔夏溶洞 - 克拉肯 Lv.50",Recast100ms:25},{ID:43,ActionID:11425,Name:"火投枪",Number:38,Stats:`攻击类型：物理・突
攻击属性：火
评级：★★★`,Cast100ms:10,Description:`对目标及其周围的敌人发动火属性范围物理攻击　<span style="color:#00cc22;">威力：</span>200
攻击复数敌人时，对目标之外的敌人威力降低50%`,AozDescription:`从新大陆的辉鳞人身上继承而来的战斗技术。
向投枪里注入火属性以太后进行投掷的技巧。青魔法中则需要用魔力制造出投枪进行再现。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003293_hr1.png",Recast100ms:25,Learn:"武装圣域放浪神古神殿 - 折角骑士 寇黑加 Lv.50"},{ID:33,ActionID:11415,Name:"月之笛",Number:39,Stats:`攻击类型：魔法
攻击属性：无
评级：★`,Cast100ms:20,Description:`令自身发动攻击造成的伤害提高50%，同时移动速度提高30%
<span style="color:#00cc22;">持续时间：</span>15秒
效果结束后对自身附加<span style="color:#ff7b1a;">狂战士化的副作用</span>状态
<span style="color:#00cc22;">持续时间：</span>15秒
<span style="color:#00cc22;">狂战士化的副作用效果：</span>无法发动自动攻击、魔法、战技、能力`,AozDescription:`新大陆的妖异使用的青魔法。
作为信仰月亮的少数部族的神而君临于世的妖异，为了支配信徒所利用的某种可以使精神亢奋的笛声。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003283_hr1.png",Learn:"完成 10 种假面狂欢关卡后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.1",Recast100ms:25},{ID:31,ActionID:11413,Name:"螺旋尾",Number:40,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★★`,Cast100ms:20,Description:`令目标的体力降至个位数
命中率较低
目标等级高于自身等级时无效`,AozDescription:`真红龙虾使用的青魔法。
将魔力凝聚在尾巴尖上，放出螺旋状的以太来侵蚀敌人的生命力。由于需要有高超的以太操纵技术，很难成功施放。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003281_hr1.png",Recast100ms:25,Learn:`逆转要害沙斯塔夏溶洞 - 真红龙虾 Lv.50
 基拉巴尼亚山区 (x:26, y:8) - 峭壁巨钳虾 Lv.61`},{ID:12,ActionID:11394,Name:"精神冲击",Number:41,Stats:`攻击类型：魔法
攻击属性：无
评级：★`,Cast100ms:10,Description:`对自身周围的敌人发动无属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>200
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>麻痹　<span style="color:#00cc22;">持续时间：</span>30秒`,AozDescription:`夺魂魔使用的精神攻击魔法。
使敌人产生身体遭到切割的错觉，伴随着麻痹对敌人的身体造成伤害。据说擅长限制对手的忍术兵爆破者也会使用。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003262_hr1.png",Learn:`地下灵殿塔姆·塔拉墓园 - 主宰者 加尔梵斯 Lv.16
 黑衣森林南部林区 [S] - 夺心魔 Lv.50`,Recast100ms:25},{ID:34,ActionID:11416,Name:"死亡宣告",Number:42,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★★`,Cast100ms:20,Description:`令目标陷入<span style="color:#ff7b1a;">死亡宣告</span>状态　<span style="color:#00cc22;">持续时间：</span>15秒
持续时间结束后，目标陷入无法战斗状态
命中率较低
目标等级高于自身等级时无效`,AozDescription:`新大陆的妖异使用的青魔法。
是一种强有力的诅咒，对敌人宣言其生命所剩无几，通过暗示来实行咒杀。只不过由于可以左右生死的效果过于强力，所以成功率也相应的很低。`,Learn:"完成 20 种假面狂欢关卡后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.1",Icon:"https://cafemaker.wakingsands.com/i/003000/003284_hr1.png",Recast100ms:25},{ID:39,ActionID:11421,Name:"惊奇光",Number:43,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:10,Description:`令自身周围的敌人所受到的魔法伤害提高5%
<span style="color:#00cc22;">持续时间：</span>15秒
该魔法有单独计算的复唱时间，不受其他魔法复唱时间的影响
与<span style="color:#ff7b1a;">破防</span>共享复唱时间`,AozDescription:`蝾螈擅长的青魔法。
利用放出魔力时的发光现象来暂时夺取敌人的视力。将融入恶意的光线进行漫反射，致使敌人陷入魔力过敏状态。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003289_hr1.png",Learn:`摩杜纳 (x:13, y:10) - 静水泥沼蝾螈 Lv.45
 休养胜地布雷福洛克斯野营地 - 水栖蝾螈 Lv.32`,Recast100ms:600},{ID:44,ActionID:11426,Name:"飞翎雨",Number:44,Stats:`攻击类型：魔法
攻击属性：风
评级：★★★★★`,Cast100ms:0,Description:`对指定地点发动风属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>220
<span style="color:#00cc22;">追加效果：</span>风属性持续伤害
<span style="color:#00cc22;">威力：</span>40　<span style="color:#00cc22;">持续时间：</span>6秒
与部分青魔法共享复唱时间`,AozDescription:`迦楼罗的绝招。
散布魔法羽毛的同时引发暴风来撕裂敌人。通过对敌人造成无数的裂伤来维持持续的疼痛感，十分冷酷无情。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003294_hr1.png",Learn:"迦楼罗歼殛战 - 迦楼罗 Lv.50",Recast100ms:300},{ID:45,ActionID:11427,Name:"地火喷发",Number:45,Stats:`攻击类型：魔法
攻击属性：火
评级：★★★★★`,Cast100ms:0,Description:`对指定地点发动火属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>300
与部分青魔法共享复唱时间`,AozDescription:`伊弗利特的绝招。
操纵地脉来增强火属性之力，从而使地面上出现火柱。那副光景仿佛火山喷发。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003295_hr1.png",Recast100ms:300,Learn:`伊弗利特讨伐战 - 伊弗利特 Lv.20
 伊弗利特歼灭战 - 伊弗利特 Lv.50
 伊弗利特歼殛战 - 伊弗利特 Lv.50`},{ID:46,ActionID:11428,Name:"山崩",Number:46,Stats:`攻击类型：物理・打
攻击属性：土
评级：★★★★★`,Cast100ms:0,Description:`向自身前方发动土属性扇形范围物理攻击　<span style="color:#00cc22;">威力：</span>400
攻击复数敌人时，对第一个之外的敌人威力降低50%
与部分青魔法共享复唱时间`,AozDescription:`泰坦的绝招。
通过放出强力的土属性以太来制造出岩石块，给予敌人剧烈的打击。如同山崩地裂般的可怕光景导致的冲击感无法估量。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003296_hr1.png",Learn:`泰坦歼灭战 - 泰坦 Lv.50
 泰坦歼殛战 - 泰坦 Lv.50`,Recast100ms:600},{ID:47,ActionID:11429,Name:"轰雷",Number:47,Stats:`攻击类型：魔法
攻击属性：雷
评级：★★★★★`,Cast100ms:0,Description:`对目标及其周围的敌人发动雷属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>400
攻击复数敌人时，对目标之外的敌人威力降低50%
与部分青魔法共享复唱时间`,AozDescription:`拉姆的绝招。
从空中放出强有力的落雷。其电压远高于自然现象所产生的雷电，其轨迹仿佛是巨大的战锤落下般贯穿敌人。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003297_hr1.png",Learn:`拉姆歼灭战 - 拉姆 Lv.50
 拉姆歼殛战 - 拉姆 Lv.50`,Recast100ms:600},{ID:48,ActionID:11430,Name:"冰雪乱舞",Number:48,Stats:`攻击类型：魔法
攻击属性：水
评级：★★★★★`,Cast100ms:0,Description:`向自身前方与两侧发动冰属性扇形范围魔法攻击
<span style="color:#00cc22;">威力：</span>350
攻击复数敌人时，对第一个之外的敌人威力降低50%
与部分青魔法共享复唱时间`,AozDescription:`希瓦的绝招。
制造出魔法的弓，放出冰柱箭雨。这一技能受到了冰之巫女伊塞勒在尾羽集落见到的猎人箭术的深刻影响。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003298_hr1.png",Learn:"希瓦歼殛战 - 希瓦 Lv.50",Recast100ms:900},{ID:49,ActionID:11431,Name:"水神的面纱",Number:49,Stats:`攻击类型：魔法
攻击属性：水
评级：★★★★★`,Cast100ms:0,Description:`一定时间内，自身受到攻击时会对对方造成水属性魔法伤害
<span style="color:#00cc22;">威力：</span>50　<span style="color:#00cc22;">持续时间：</span>30秒
与部分青魔法共享复唱时间`,AozDescription:`利维亚桑的绝招。
收集大气中的水分来制造蕴含魔力的水膜。这层如同面纱般的水膜既是反弹伤害的魔法镜，也是保护施术者的盾。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003299_hr1.png",Learn:`利维亚桑歼灭战 - 利维亚桑 Lv.50
 利维亚桑歼殛战 - 利维亚桑 Lv.50`,Recast100ms:900},{ID:50,ActionID:18295,Name:"高山气流",Number:50,Stats:`攻击类型：魔法
攻击属性：风
评级：★★`,Cast100ms:20,Description:`向目标所在方向发出风属性直线范围魔法攻击　<span style="color:#00cc22;">威力：</span>220
攻击复数敌人时，对第一个之外的敌人威力降低50%`,AozDescription:`狮鹫使用的青魔法。
主要是在争夺地盘抵御外敌的时候使用的魔法，有如阿巴拉提亚山脉高地的劲风般强烈。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003300_hr1.png",Recast100ms:25,Learn:`阿巴拉提亚云海 (x:35, y:10) - 狮鹫 Lv.59
 冰雪废堡暮卫塔 - 狮身巨鹰 Lv.51`},{ID:51,ActionID:18296,Name:"万变水波",Number:51,Stats:`攻击类型：魔法
攻击属性：水
评级：★★★`,Cast100ms:20,Description:`向自身前方发动水属性扇形范围魔法攻击　<span style="color:#00cc22;">威力：</span>220
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>将范围内的敌人击退15米`,AozDescription:`有生命活水的特殊攻击。
机械装置“水合核心”通过操控流体创造了激流。如果能用魔法进行再现，就算再巨大的敌人也都可以冲走了。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003301_hr1.png",Learn:`亚历山大机神城 启动之章3 - 有生命活水 Lv.60
 零式亚历山大机神城 启动之章3 - 有生命活水 Lv.60
 假面狂欢29 - 水之式神、水龙卷 Lv.60`,Recast100ms:25},{ID:52,ActionID:18297,Name:"狂风暴雪",Number:52,Stats:`攻击类型：魔法
攻击属性：水
评级：★★★★`,Cast100ms:20,Description:`向自身前方发动冰属性扇形范围魔法攻击　<span style="color:#00cc22;">威力：</span>220
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>敌人处于<span style="color:#ff7b1a;">水毒</span>状态时解除该状态，同时附加<span style="color:#ff7b1a;">冻结</span>状态
<span style="color:#00cc22;">持续时间：</span>20秒`,AozDescription:`雪人使用的青魔法。
将体内生成的冰冷媒介融入吐息之中，就可以产生有如狂风暴雪般的冷风。如果吹向被水毒侵蚀的敌人，则可以使其从体内开始全身冰冻。`,Learn:"库尔扎斯西部高地 (x:25, y:32) - 大脚板岩雪人 Lv.56",Icon:"https://cafemaker.wakingsands.com/i/003000/003302_hr1.png",Recast100ms:25},{ID:53,ActionID:18298,Name:"生物电",Number:53,Stats:`攻击类型：魔法
攻击属性：雷
评级：★★`,Cast100ms:20,Description:`对目标及其周围的敌人发动雷属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>220
攻击复数敌人时，对目标之外的敌人威力降低50%`,AozDescription:`大海蛇使用的青魔法。
将积累的雷属性以太与吐出的水块结合，使其成为带电水块。它可以使猎物变虚弱从而便于捕获。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003303_hr1.png",Recast100ms:25,Learn:"阿巴拉提亚云海 (x:26, y:33) - 雷牙 Lv.50"},{ID:54,ActionID:18299,Name:"寒光",Number:54,Stats:`攻击类型：物理・斬
攻击属性：无
评级：★★`,Cast100ms:20,Description:`向自身前方发出无属性扇形范围物理攻击　<span style="color:#00cc22;">威力：</span>220
攻击复数敌人时，对第一个之外的敌人威力降低50%`,AozDescription:`装甲人偶的特殊攻击。
如闪光般快速挥动长枪型的武器，从而横扫前方的敌人。如果要用青魔法再现这种攻击，需要从生成以太长枪开始。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003304_hr1.png",Recast100ms:25,Learn:`亚历山大机神城 启动之章1 - 浮士德 Lv.60
 亚历山大机神城 启动之章2 - 浮士德 Lv.60`},{ID:55,ActionID:18300,Name:"深渊贯穿",Number:55,Stats:`攻击类型：物理・突
攻击属性：无
评级：★★★★`,Cast100ms:20,Description:`对目标发动无属性物理攻击　<span style="color:#00cc22;">威力：</span>220
<span style="color:#00cc22;">追加效果：</span>麻痹　<span style="color:#00cc22;">持续时间：</span>30秒`,AozDescription:`上级恶魔的绝招。
通过以太炼成无数的剑，从各个方位刺向敌人。这也可以通过刺伤敌人的神经系统，使其产生麻痹。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003305_hr1.png",Learn:`龙堡内陆低地  - 焚书任务：回收禁书《青眼怪物》 上级恶魔 Lv.58
 学识宝库迦巴勒幻想图书馆 - 偷书者 Lv.59最终 BOSS 第三次踩塔（虚无召唤）失败后出现的小怪`,Recast100ms:25},{ID:56,ActionID:18301,Name:"唧唧咋咋",Number:56,Stats:`攻击类型：魔法
攻击属性：无
评级：★`,Cast100ms:20,Description:`令自身周围的敌人陷入睡眠状态　<span style="color:#00cc22;">持续时间：</span>40秒
发动之后会停止自动攻击`,AozDescription:`猴面雀使用的青魔法。
听到这奇妙的叫声后会有一种领悟了宇宙神秘的感觉。因为宇宙的情报量过多大脑处理不过来，所以会陷入深沉的睡眠。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003306_hr1.png",Recast100ms:25,Learn:"阿巴拉提亚云海 (x:21, y:32) - 猴面雀 Lv.50"},{ID:57,ActionID:18302,Name:"怪音波",Number:57,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:20,Description:"解除自身周围敌人身上强化效果中的一种",AozDescription:`疫虫等魔物使用的青魔法。
通过震动身体的一部分，发出令人不适的音波。据说该震动发出的音波能打消一部分以太波长，从而解除部分强化魔法。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003307_hr1.png",Recast100ms:25,Learn:"魔大陆阿济兹拉 (x:30, y:12) - 疫虫 Lv.59"},{ID:58,ActionID:18303,Name:"绒绒治疗",Number:58,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★`,Cast100ms:15,Description:`恢复目标的体力　<span style="color:#00cc22;">恢复力：</span>100
自身处于<span style="color:#ff7b1a;">以太复制：治疗</span>状态时　<span style="color:#00cc22;">恢复力：</span>500`,AozDescription:`部分莫古力使用的治疗魔法。
原理和幻术的治疗没有区别，不过理论却很随便。大概就是用头上的绒球聚集魔力，然后随便一用就可以治疗他人了。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003308_hr1.png",Learn:`莫古力贤王歼灭战 - 茸茸之愈 库普洛·奇普 Lv.50
 莫古力贤王歼殛战 - 茸茸之愈 库普洛·奇普 Lv.50`,Recast100ms:25},{ID:59,ActionID:18304,Name:"哥布防御",Number:59,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★★`,Cast100ms:20,Description:`为自身和周围队员附加能够抵御一定伤害的防护罩
该防护罩能够抵消相当于恢复力100的伤害量
<span style="color:#00cc22;">持续时间：</span>30秒
自身处于<span style="color:#ff7b1a;">以太复制：治疗</span>状态时
该防护罩能够抵消相当于恢复力250的伤害量
无法与学者的鼓舞和贤者的均衡诊断及均衡预后效果共存`,AozDescription:`部分哥布林使用的青魔法。
科学家集团青蓝之手在用科学原理研究分析魔法的过程中创造出的新魔法，通过在身体表面展开如皮肤般轻薄的魔法障壁，可以吸收外界带来的冲击。`,Learn:`龙堡内陆低地 [A] - 机工兵 斯利普金克斯 Lv.60
 亚历山大机神城 天动之章2 - 亚历山大伏兵、亚历山大挥刀兵 Lv.60`,Icon:"https://cafemaker.wakingsands.com/i/003000/003309_hr1.png",Recast100ms:25},{ID:60,ActionID:18305,Name:"魔法锤",Number:60,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:10,Description:`对目标及其周围的敌人发动无属性魔法攻击　<span style="color:#00cc22;">威力：</span>250
攻击复数敌人时，对目标之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>令目标的智力与精神降低10%
<span style="color:#00cc22;">持续时间：</span>10秒
<span style="color:#00cc22;">追加效果：</span>恢复自身最大魔力的10%
该魔法有单独计算的复唱时间`,AozDescription:`比布鲁斯等魔物使用的青魔法。
用物理或魔法的锤子敲打敌人头部，使其变得虚脱，从而强制放出体内的魔力，是非常可怕的招式。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003310_hr1.png",Learn:`秘本宝库迦巴勒幻想图书馆 - 阿班达 Lv.60
 假面狂欢24 - 艾匹罗基 Lv.50`,Recast100ms:900},{ID:61,ActionID:18306,Name:"防御指示",Number:61,Stats:`攻击类型：魔法
攻击属性：无
评级：★`,Cast100ms:10,Description:`让目标队员替自己承受来自敌人的攻击
但对部分攻击无效
<span style="color:#00cc22;">持续时间：</span>12秒
与目标的距离不能超过10米
该魔法有单独计算的复唱时间`,AozDescription:`鹰蜂女王使用的青魔法。
通过释放特殊的荷尔蒙，可以命令蜂群守护自己。学会此青魔法后，经常会把队友看成肉盾。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003311_hr1.png",Learn:"草木庭园圣茉夏娜植物园 - 鹰锋女王 Lv.60",Recast100ms:1200},{ID:62,ActionID:18307,Name:"蛙腿",Number:62,Stats:`攻击类型：魔法
攻击属性：无
评级：★`,Cast100ms:10,Description:"向周围的敌人进行挑衅，令自身的仇恨变为最高",AozDescription:`智蛙使用的青魔法。
这魔法之歌可以将周围敌人的仇恨瞬间聚集到自己身上。假扮成普通的青蛙，以傻傻的音调放声歌唱即可。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003312_hr1.png",Recast100ms:25,Learn:"龙堡内陆低地 (x:12, y:35) - 智蛙 Lv.59需要靠近才会使用"},{ID:63,ActionID:18308,Name:"音爆",Number:63,Stats:`攻击类型：魔法
攻击属性：风
评级：★★★★`,Cast100ms:10,Description:'对目标发动风属性魔法攻击　<span style="color:#00cc22;">威力：</span>210',AozDescription:`祖使用的青魔法。
挥动巨大翅膀产生的冲击波，在风属性以太的操控下压缩成了风刃飞向敌人。其威力有如名刀一击。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003313_hr1.png",Recast100ms:25,Learn:`阿巴拉提亚云海 - 黑色怪鸟 - 安祖主母 Lv.47
 阿巴拉提亚云海 (x:37, y:36) - 安祖 Lv.59
 领航明灯天狼星灯塔 - 祖 Lv.50`},{ID:64,ActionID:18309,Name:"口笛",Number:64,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★`,Cast100ms:10,Description:`效果时间内自身发动的1次魔法为物理攻击时，威力提升80%
<span style="color:#00cc22;">持续时间：</span>30秒
无法与<span style="color:#ff7b1a;">蓄力</span>效果共存`,AozDescription:`长颈驼使用的青魔法。
通过自我暗示提升力量，是一种强化魔法。繁殖期的长颈驼会一边发出口笛的声音，一边用该魔法强化自己，以向异性展示自己。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003314_hr1.png",Learn:"阿巴拉提亚云海 (x:19, y:30) - 长颈驼 Lv.56",Recast100ms:25},{ID:65,ActionID:18310,Name:"白骑士之旅",Number:65,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:20,Description:`向目标所在方向发出无属性直线范围魔法攻击　<span style="color:#00cc22;">威力：</span>200
敌人处于<span style="color:#ff7b1a;">止步</span>状态时解除该状态，同时提升威力
<span style="color:#00cc22;">敌人处于止步状态时威力：</span>400
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>减速20%　<span style="color:#00cc22;">持续时间：</span>20秒`,AozDescription:`捕获异端者用人偶骑士的特殊攻击。
通过照射特定波长的以太，可以侵蚀对方的肉体，使其动作变得迟缓。如果对方精神也被侵蚀，那么威力会更加强大。`,Learn:"圣教中枢伊修加德教皇厅 - 白骑士 Lv.57",Icon:"https://cafemaker.wakingsands.com/i/003000/003315_hr1.png",Recast100ms:25},{ID:66,ActionID:18311,Name:"黑骑士之旅",Number:66,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:20,Description:`向目标所在方向发出无属性直线范围魔法攻击　<span style="color:#00cc22;">威力：</span>200
敌人处于<span style="color:#ff7b1a;">减速</span>状态时解除该状态，同时提升威力
<span style="color:#00cc22;">敌人处于减速状态时威力：</span>400
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>止步　<span style="color:#00cc22;">持续时间：</span>20秒`,AozDescription:`拷问异端者用人偶骑士的特殊攻击。
通过照射特定波长的以太，可以侵蚀对方的精神，从而夺取对方行动的自由。如果对方肉体也被侵蚀，那么威力会更加强大。`,Learn:"圣教中枢伊修加德教皇厅 - 黑骑士 Lv.57",Icon:"https://cafemaker.wakingsands.com/i/003000/003316_hr1.png",Recast100ms:25},{ID:67,ActionID:18312,Name:"5级即死",Number:67,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★★`,Cast100ms:20,Description:`令自身周围等级为5的倍数的敌人陷入无法战斗状态
命中率较低
目标等级高于自身等级时无效
该魔法有单独计算的复唱时间，并与部分青魔法共享复唱时间`,AozDescription:`部分妖异使用的青魔法。
侵蚀成长到特定阶段的对象，对他们的心灵与精神进行污染，强制停止肉体的自净作用，夺取他们的性命。宛如死神般的招式。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003317_hr1.png",Learn:"学识宝库加巴勒幻想图书馆 - 64页 Lv.59",Recast100ms:1800},{ID:68,ActionID:18313,Name:"火箭炮",Number:68,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:20,Description:`给予自身周围敌人等同其当前体力50%或30%或20%或10%的伤害
目标等级高于自身等级时无效`,AozDescription:`模仿魔导兵器攻击方式的青魔法。
发射用魔力创造出的幻影导弹，让敌人产生错觉以为自己被攻击了。错觉越是强烈，实际受到的伤害就越大。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003318_hr1.png",Recast100ms:25,Learn:"监牢铁臂巴埃萨长城 - 武装重甲 Lv.60"},{ID:69,ActionID:18314,Name:"永恒射线",Number:69,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★★`,Cast100ms:30,Description:`对目标发动无属性魔法攻击　<span style="color:#00cc22;">威力：</span>220
<span style="color:#00cc22;">追加效果：</span>眩晕　<span style="color:#00cc22;">持续时间：</span>1秒
该技能的眩晕效果不受其他眩晕影响`,AozDescription:`模仿蛮神兵器使用的破坏光线的青魔法。
用极细的热光线将目标的神经系统与动力传达系统烧毁，从而夺取对方行动的自由。重要的是，只要能够攻击到对方，无论多少次都能夺取对方行动的自由。`,Learn:`亚历山大机神城 启动之章4 - 操纵者 Lv.60
 零式亚历山大机神城 启动之章4 - 操纵者 Lv.60`,Icon:"https://cafemaker.wakingsands.com/i/003000/003319_hr1.png",Recast100ms:25},{ID:70,ActionID:18315,Name:"仙人盾",Number:70,Stats:`攻击类型：魔法
攻击属性：无
评级：★`,Cast100ms:10,Description:`指定一名队员，令其受到的伤害减轻5%
<span style="color:#00cc22;">持续时间：</span>6秒
自身处于<span style="color:#ff7b1a;">以太复制：防护</span>状态时
队员受到的伤害减轻15%`,AozDescription:`某种仙人刺使用的青魔法。
偶尔会有仙人刺将自己的魔力献给拥有更多种子的仙人刺。这是它们在严酷的荒野中为了让种族延续而获得的某种本能。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003320_hr1.png",Learn:"苏醒遗迹喀恩埋没圣堂 - 仙人刺守卫 Lv.50",Recast100ms:25},{ID:71,ActionID:18316,Name:"复仇冲击",Number:71,Stats:`攻击类型：物理・打
攻击属性：无
评级：★★`,Cast100ms:20,Description:`对目标发动无属性物理攻击　<span style="color:#00cc22;">威力：</span>50
自身剩余体力在20%以下时威力提升
<span style="color:#00cc22;">体力在20%以下时：</span>500`,AozDescription:`瓦拉其族代代相传的攻击魔法。
濒死状态下才能发挥该魔法的真正威力，主要是利用了攻击者濒死时心理产生的负荷，从而大幅提升攻击威力。该青魔法源自哪种生物则是族里的秘密。`,Learn:"学习 50 个技能后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.1",Icon:"https://cafemaker.wakingsands.com/i/003000/003321_hr1.png",Recast100ms:25},{ID:72,ActionID:18317,Name:"天使低语",Number:72,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★★`,Cast100ms:100,Description:`令无法战斗的目标以衰弱状态重新振作起来
该魔法有单独计算的复唱时间`,AozDescription:`瓦拉其族代代相传的复活魔法。
将像天使一样的使魔作为媒介把魔力注入对象，可以使其复活。不过，瓦拉其族的宗教信仰中没有天使，有关天使的起源仍是谜团。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003322_hr1.png",Learn:"完成 30 个假面狂欢关卡后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.1",Recast100ms:3e3},{ID:73,ActionID:18318,Name:"蜕皮",Number:73,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:20,Description:`恢复自身及周围队员的体力　<span style="color:#00cc22;">恢复力：</span>50
<span style="color:#00cc22;">追加效果：</span>解除部分弱化效果中的一种
自身处于<span style="color:#ff7b1a;">以太复制：治疗</span>状态时　<span style="color:#00cc22;">恢复力：</span>300`,AozDescription:`瓦魔蛾使用的青魔法。
通过活化自身的治愈能力，可以排除体内的代谢物和毒素。使用此魔法后，会有一种类似蜕皮的感觉。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003323_hr1.png",Learn:`腐坏遗迹无限城市街古迹 - 瓦魔蛾 Lv.50
 阿巴拉提亚云海 (x:10, y:17) - 阿巴拉提亚瓦魔蛾 Lv.57`,Recast100ms:25},{ID:74,ActionID:18319,Name:"逆流",Number:74,Stats:`攻击类型：魔法
攻击属性：雷
评级：★★★`,Cast100ms:20,Description:`对目标发动雷属性魔法攻击　<span style="color:#00cc22;">威力：</span>220
<span style="color:#00cc22;">追加效果：</span>40%加重　<span style="color:#00cc22;">持续时间：</span>10秒
该技能的加重效果不受其他加重影响`,AozDescription:`古老双足飞龙使用的青魔法。
将云中飞行时积攒的雷电逆流放出。被击中的人会一时间有如重物压身般，无法正常行动。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003324_hr1.png",Learn:`翻云雾海 (x:25, y:28) - 云上双足飞龙 Lv.56
 邪龙王座龙巢神殿 - 雷雅克魔龙 Lv.55`,Recast100ms:25},{ID:75,ActionID:18320,Name:"捕食",Number:75,Stats:`攻击类型：魔法
攻击属性：无
评级：★`,Cast100ms:10,Description:`对目标发动无属性魔法攻击　<span style="color:#00cc22;">威力：</span>250
<span style="color:#00cc22;">追加效果：</span>一定时间内，自身的最大体力提高20%
<span style="color:#00cc22;">持续时间：</span>15秒
<span style="color:#ff7b1a;">以太复制：防护</span>状态下的持续时间变为70秒
<span style="color:#00cc22;">追加效果：</span>恢复伤害量100%的体力
该魔法有单独计算的复唱时间`,AozDescription:`野生生物的捕食行动。
不过运用到青魔法时不是直接吸取对方的血肉，而是夺取对方的以太。可以恢复自身的体力以及暂时提高自己的最大体力。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003325_hr1.png",Learn:`腐坏遗迹无限城市街古迹 - 腐坏贪吃鬼 Lv.50
 巴哈姆特大迷宫 邂逅之章1 - 神杖巨蛇 Lv.50`,Recast100ms:600},{ID:76,ActionID:18321,Name:"小侦测",Number:76,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★`,Cast100ms:20,Description:`对目标随机附加<span style="color:#ff7b1a;">星极性耐性降低</span>、<span style="color:#ff7b1a;">灵极性耐性降低</span>、<span style="color:#ff7b1a;">物理受伤加重</span>状态　<span style="color:#00cc22;">持续时间：</span>30秒
<span style="color:#00cc22;">星极性耐性降低效果：</span>所受火、风、雷属性伤害提高5%
<span style="color:#00cc22;">灵极性耐性降低效果：</span>所受水、土、冰属性伤害提高5%
<span style="color:#00cc22;">物理受伤加重效果：</span>所受物理伤害提高5%
以上状态无法叠加`,AozDescription:`自走人偶抄写员使用的特殊魔法。
调查对方的弱点，暂时扩大弱点范围。某人偶师为了调查对象是否有外遇而制作的自走人偶，调查弱点的功能纯属偶然。`,Learn:`假面狂欢24 - 斗场抄写员 Lv.50
 秘本宝库迦巴勒幻想图书馆 - 自走人偶抄写员 Lv.60`,Icon:"https://cafemaker.wakingsands.com/i/003000/003326_hr1.png",Recast100ms:25},{ID:77,ActionID:18322,Name:"以太复制",Number:77,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★★`,Cast100ms:10,Description:`指定一名除自身外的玩家，复制其以太特性
对自身附加<span style="color:#ff7b1a;">以太复制：防护</span>、<span style="color:#ff7b1a;">以太复制：进攻</span>、<span style="color:#ff7b1a;">以太复制：治疗</span>状态中的一种
指定玩家的职能将决定附加的状态
<span style="color:#ff7b1a;">以太复制：防护</span>状态下，自身的防御力上升，同时强化部分青魔法
<span style="color:#ff7b1a;">以太复制：进攻</span>状态下，自身的暴击发动率和直击发动率提高20%，同时强化部分青魔法
<span style="color:#ff7b1a;">以太复制：治疗</span>状态下，自身发动治疗魔法的治疗量提高20%，同时强化部分青魔法
再次发动时则取消该状态　<span style="color:#00cc22;">持续时间：</span>永久`,AozDescription:`晶片使用的青魔法。
分析对方以太的同时，将自身的以太波长与其靠拢。从而可以暂时获得对方以太的所带来的优势。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003327_hr1.png",Learn:"地脉灵灯天狼星灯塔 - 被腐化连线后产生的小怪 Lv.60",Recast100ms:25},{ID:78,ActionID:18323,Name:"穿甲散弹",Number:78,Stats:`攻击类型：魔法
攻击属性：土
评级：★★★★★`,Cast100ms:0,Description:`向自身前方发出土属性扇形范围魔法攻击　<span style="color:#00cc22;">威力：</span>200
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">积蓄次数：</span>4
<span style="color:#00cc22;">追加效果：</span>穿甲散弹的威力提高50%
<span style="color:#00cc22;">最大档数：</span>3档　<span style="color:#00cc22;">持续时间：</span>3秒
若在持续时间中发动穿甲散弹之外的技能，会立即解除该状态`,AozDescription:`罗波那的绝招。
操纵土属性以太，从周围的矿物中吸取所需物质，生成无数的金属颗粒。释放该金属颗粒，可以将前方的敌人一网打尽。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003328_hr1.png",Learn:`罗波那歼灭战 - 罗波那 Lv.53
 罗波那歼殛战 - 罗波那 Lv.60`,Recast100ms:300},{ID:79,ActionID:18324,Name:"类星体",Number:79,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★★★`,Cast100ms:0,Description:`对自身周围的敌人发动无属性魔法攻击　<span style="color:#00cc22;">威力：</span>300
攻击复数敌人时，对第一个之外的敌人威力降低50%
与部分青魔法共享复唱时间`,AozDescription:`索菲娅的绝招。
重视“调和”的女神索菲娅会对破坏“均衡”的人们落下神罚的流星。那象征着毁灭命运的流星，宛如凶星一般。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003329_hr1.png",Learn:`索菲娅歼灭战 - 索菲娅 Lv.60
 索菲娅歼殛战 - 索菲娅 Lv.60`,Recast100ms:600},{ID:80,ActionID:18325,Name:"正义飞踢",Number:80,Stats:`攻击类型：物理・打
攻击属性：无
评级：★★★★★`,Cast100ms:0,Description:`跳起接近目标并发动无属性范围物理攻击　<span style="color:#00cc22;">威力：</span>300
攻击复数敌人时，对目标之外的敌人威力降低50%
<span style="color:#ff7b1a;">止步</span>状态下无法发动
与部分青魔法共享复唱时间`,AozDescription:`残暴正义号的必杀技。
飞翔吧，正义号，穿越天空！我们的梦想、希望、友情与爱和勇气合体，惩戒作恶的坏人！接招吧，正义飞踢！！`,Icon:"https://cafemaker.wakingsands.com/i/003000/003330_hr1.png",Learn:`亚历山大机神城 律动之章4 - 残暴正义号 Lv.60
 零式亚历山大机神城 律动之章4 - 残暴正义号 Lv.60`,Recast100ms:600},{ID:81,ActionID:23264,Name:"渔叉三段",Number:81,Stats:`攻击类型：物理・突
攻击属性：无
评级：★`,Cast100ms:20,Description:`对目标发动连续3次物理攻击　<span style="color:#00cc22;">威力：</span>150
该魔法有单独计算的复唱时间`,AozDescription:`鲶鱼精族擅长的传统捕鱼技。
用捕鱼的尖枪刺出三连击。本来是捕鱼用的技巧，后来发展成了防身术。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003331_hr1.png",Recast100ms:900,Learn:`延夏 (x:28, y:8) - 惠比寿鲶鱼精 Lv.67
 延夏 [B] - 闪雷击 鱼雷 Lv.70`},{ID:82,ActionID:23265,Name:"哔哩哔哩",Number:82,Stats:`攻击类型：魔法
攻击属性：雷
评级：★★`,Cast100ms:20,Description:`对目标及其周围敌人发动雷属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>100
攻击复数敌人时，对目标之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>效果时间内自身发动的1次魔法为物理攻击时，威力提升100
<span style="color:#00cc22;">持续时间：</span>15秒`,AozDescription:`鲶鱼精族释放的雷击。
懒惰的鲶鱼精为了轻松捕鱼，会使用这种雷击魔法将鱼儿电翻。此外，释放的雷击还会促进血液循环，增强自身力量。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003332_hr1.png",Learn:`延夏 (x:28, y:8) - 惠比寿鲶鱼精 Lv.67
 延夏 [B] - 闪雷击 鱼雷 Lv.70`,Recast100ms:25},{ID:83,ActionID:23266,Name:"掀地板之术",Number:83,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★`,Cast100ms:20,Description:`向目标所在方向发出无属性直线范围魔法攻击　<span style="color:#00cc22;">威力：</span>220
<span style="color:#00cc22;">追加效果：</span>眩晕　<span style="color:#00cc22;">持续时间：</span>3秒
攻击复数敌人时，对目标之外的敌人威力降低50%`,AozDescription:`模仿道顺丸忍众妨碍技的青魔法。
用魔力制造出幻影的草席，然后再将其翻转过来，从而使敌人失去平衡。如果使用熟练的话，就连草席的香气都能再现出来。`,Learn:"恶党孤城黄金阁 - 道顺丸 Lv.70",Icon:"https://cafemaker.wakingsands.com/i/003000/003333_hr1.png",Recast100ms:25},{ID:84,ActionID:23267,Name:"彻骨雾寒",Number:84,Stats:`攻击类型：魔法
攻击属性：水
评级：★★★★`,Cast100ms:20,Description:`对自身附加<span style="color:#ff7b1a;">彻骨雾寒</span>状态　<span style="color:#00cc22;">持续时间：</span>5秒
持续时间内如果受到敌人的攻击，则效果会变化成<span style="color:#ff7b1a;">冰雾</span>
<span style="color:#00cc22;">冰雾效果：</span>技能<span style="color:#ff7b1a;">彻骨雾寒</span>变化为<span style="color:#ff7b1a;">冰雾</span>
<span style="color:#00cc22;">持续时间：</span>15秒
该魔法有单独计算的复唱时间

<span style="color:#ff7b1a;">冰雾</span>
对目标发动冰属性魔法攻击　<span style="color:#00cc22;">威力：</span>400
<span style="color:#00cc22;">追加效果：</span>冻结　<span style="color:#00cc22;">持续时间：</span>10秒
<span style="color:#00cc22;">发动条件：</span><span style="color:#ff7b1a;">冰雾</span>状态中`,AozDescription:`雾龙在自我保护时使用的技能。
使自身周围环绕冷气，让攻击自己的敌人冻冰。此时还需要制作一张空气膜保护自己，这样就不会波及到自身了。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003334_hr1.png",Learn:"死亡大地终末焦土 - 雾龙 Lv.70",Recast100ms:900},{ID:85,ActionID:23269,Name:"赞歌",Number:85,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:20,Description:`对周围的敌人发动无属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>140
自身处于<span style="color:#ff7b1a;">以太复制：治疗</span>状态时效果变为
恢复自身及周围队员的体力　<span style="color:#00cc22;">恢复力：</span>300`,AozDescription:`吉祥天女的绝招。
这是爱的赞歌。不知爱为何物之人唱出此歌，会将周围燃烧殆尽。心怀慈爱之人唱出此歌，会绽放治愈之光。此曲完美展现了爱为何物。`,Learn:`吉祥天女歼灭战 - 吉祥天女 Lv.67
 吉祥天女歼殛战 - 吉祥天女 Lv.70`,Icon:"https://cafemaker.wakingsands.com/i/003000/003336_hr1.png",Recast100ms:25},{ID:86,ActionID:23270,Name:"圣光射线",Number:86,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:20,Description:`对目标及其周围的敌人发动无属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>100
目标为不死系怪物时，威力提高
<span style="color:#00cc22;">对不死系怪物的威力：</span>500`,AozDescription:`魔列车释放的净化之光。
会将亡灵和不净之物的灵魂净化。发明了魔导列车的加雷马帝国有着一个奇怪的传说，那就是有种专门承载死者的列车……这究竟是？`,Learn:`欧米茄时空狭缝 西格玛幻境1 - 魔列车 Lv.70
 欧米茄零式时空狭缝 西格玛幻境1 - 魔列车 Lv.70`,Icon:"https://cafemaker.wakingsands.com/i/003000/003337_hr1.png",Recast100ms:25},{ID:87,ActionID:23271,Name:"污泥泼洒",Number:87,Stats:`攻击类型：魔法
攻击属性：土
评级：★`,Cast100ms:20,Description:`向目标所在方向发出土属性直线范围魔法攻击　<span style="color:#00cc22;">威力：</span>220
攻击复数敌人时，对目标之外的敌人威力降低50%`,AozDescription:`枯腐泥妖擅长的绝技。
操控土属性以太制作出泥土，再将泥土投向敌人。会对身穿白色衣物的敌人带来极大的精神创伤。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003338_hr1.png",Recast100ms:25,Learn:`污染庭园圣茉夏娜植物园 - 枯腐泥妖 Lv.70
 伊尔美格 [A] - 泥人 Lv.80`},{ID:88,ActionID:23272,Name:"天使的点心",Number:88,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★`,Cast100ms:20,Description:`恢复自身及周围队员的体力　<span style="color:#00cc22;">恢复力：</span>400
自身处于<span style="color:#ff7b1a;">以太复制：治疗</span>状态时
<span style="color:#00cc22;">追加效果：</span>令目标体力持续恢复
<span style="color:#00cc22;">恢复力：</span>200　<span style="color:#00cc22;">持续时间：</span>15秒
该魔法有单独计算的复唱时间，并与部分青魔法共享复唱时间`,AozDescription:`新大陆的守护像使用的青魔法。
用魔法生成类似万能药的物质，可以活化自身治愈能力。如果拥有治愈知识之人使用此魔法，会带来更强大的效果。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003339_hr1.png",Learn:"达到 70 级后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.70",Recast100ms:1200},{ID:89,ActionID:23273,Name:"玄结界",Number:89,Stats:`攻击类型：魔法
攻击属性：水
评级：★★★★`,Cast100ms:20,Description:`展开玄结界，令自身所受的伤害减轻20%
<span style="color:#00cc22;">持续时间：</span>10秒
<span style="color:#00cc22;">追加效果：</span>持续时间内如果受到超过自身最大体力30%的伤害，则对自身附加<span style="color:#ff7b1a;">玄天武水壁</span>
<span style="color:#00cc22;">玄天武水壁效果：</span>技能<span style="color:#ff7b1a;">玄结界</span>变化为<span style="color:#ff7b1a;">玄天武水壁</span>
效果时间内发动技能或进行移动、转身都会使玄结界立即消失
此外当玄结界消失时，玄天武水壁也会同时消失
该魔法有单独计算的复唱时间，并与部分青魔法共享复唱时间

<span style="color:#ff7b1a;">玄天武水壁</span>
对自身周围的敌人发动水属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>500
自身处于<span style="color:#ff7b1a;">以太复制：防护</span>状态时　<span style="color:#00cc22;">威力：</span>1000
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">效果发动条件：</span><span style="color:#ff7b1a;">玄天武水壁</span>状态中`,AozDescription:`玄武的绝招。
展开水属性以太制作的魔法屏障。可以吸收并积攒受到的冲击，再将其一并释放，是一个攻防兼备的魔法。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003340_hr1.png",Learn:"红玉火山狱之盖 - 玄武 Lv.70",Recast100ms:300},{ID:90,ActionID:23275,Name:"斗灵弹",Number:90,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:20,Description:`对目标发动无属性魔法攻击
<span style="color:#00cc22;">威力：</span>400
<span style="color:#00cc22;">追加效果：</span>击退10米
该魔法有单独计算的复唱时间，并与部分青魔法共享复唱时间`,AozDescription:`模仿双豹伊沃恩武技的青魔法。
用双拳击出聚集的以太。于山中修行的伊沃恩，在模仿长须豹释放的冲击波时创造出的技能。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003342_hr1.png",Learn:"修行古刹星导寺 - 双豹伊沃恩 Lv.70",Recast100ms:300},{ID:91,ActionID:23276,Name:"斗争本能",Number:91,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:20,Description:`此技能仅限在非单人任务中，且由自己单独进行攻略时或除自身外其他小队成员均陷入无法战斗状态时才会生效

令自身的移动速度提升30%，自身攻击造成的伤害及治疗魔法的治疗量提高100%，并无视<span style="color:#ff7b1a;">强力守护</span>所造成的伤害降低效果
<span style="color:#00cc22;">持续时间：</span>永久
此效果在小队成员回归战斗状态后立即解除`,AozDescription:`部分长须豹使用的青魔法。
在同伴纷纷倒下的时候，唤醒斗争的本能提高自身能力的技巧。只身前往需要多人才能挑战的战斗时，也会产生同样的效果。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003343_hr1.png",Learn:`修行古刹星导寺 - 凶豹所闻，凶豹所忆 Lv.70
 拉诺西亚高地 (x:9, y:21.5) - 高阶长须豹 Lv.24`,Recast100ms:25},{ID:92,ActionID:23277,Name:"超振动",Number:92,Stats:`攻击类型：魔法
攻击属性：无
评级：★`,Cast100ms:20,Description:`在自身周围产生超音波，令<span style="color:#ff7b1a;">冻结</span>或<span style="color:#ff7b1a;">石化</span>状态中的敌人必定陷入无法战斗状态
对部分敌人无效
目标等级高于自身等级时无效
该魔法有单独计算的复唱时间，并与部分青魔法共享复唱时间`,AozDescription:`模仿恐甲蚂蜓特技的青魔法。
将身体的一部分视为翅膀，通过细微的震动产生超音波。如果震动传到了被冻结或被石化的敌人那里，则会将敌人震成细小的碎片。`,Learn:`基拉巴尼亚山区 (x:11, y:26) - 恐甲蚂蜓 Lv.68
 基拉巴尼亚山区 [B] - 蛇仆蚂蜓 Lv.70`,Icon:"https://cafemaker.wakingsands.com/i/003000/003344_hr1.png",Recast100ms:1200},{ID:93,ActionID:23278,Name:"冰焰",Number:93,Stats:`攻击类型：魔法
攻击属性：水
评级：★★`,Cast100ms:20,Description:`对目标及其周围的敌人发动冰属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>220
攻击复数敌人时，对目标之外的敌人威力降低50%`,AozDescription:`老者使用的魔法。
明明是冰属性魔法，名字中却带着焰字。该魔法和老者的原型都出自一本古典小说。不知道“冰焰”是得名于作者的玩笑，还是它造成的烧伤般的重度冻伤。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003345_hr1.png",Learn:`欧米茄时空狭缝 德尔塔幻境1 - 老者 Lv.70
 欧米茄零式时空狭缝 德尔塔幻境1 - 老者 Lv.70`,Recast100ms:25},{ID:94,ActionID:23279,Name:"芥末爆弹",Number:94,Stats:`攻击类型：魔法
攻击属性：火
评级：★★★★`,Cast100ms:20,Description:`对目标及其周围的敌人发动火属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>220
攻击复数敌人时，对目标之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>如果目标处于<span style="color:#ff7b1a;">头晕</span>状态中，则附加火属性持续伤害　<span style="color:#00cc22;">威力：</span>50
<span style="color:#00cc22;">持续时间：</span>15秒`,AozDescription:`模仿欧米茄使用的化学兵器的青魔法。
用魔法合成有害成分，再通过爆炸将其散播出去。本来是无味的毒素，但因混入了不纯物，有了类似芥末的味道，从而得名。`,Learn:`欧米茄时空狭缝 阿尔法幻境3 - 欧米茄 Lv.70
 欧米茄零式时空狭缝 阿尔法幻境3 - 欧米茄 Lv.70`,Icon:"https://cafemaker.wakingsands.com/i/003000/003346_hr1.png",Recast100ms:25},{ID:95,ActionID:23280,Name:"龙之力",Number:95,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★`,Cast100ms:20,Description:`一定时间内，将自身所受的伤害减轻20%
<span style="color:#00cc22;">持续时间：</span>15秒
<span style="color:#ff7b1a;">以太复制：防护</span>状态下的伤害减轻变为40%
该魔法有单独计算的复唱时间，并与部分青魔法共享复唱时间`,AozDescription:`新大陆的龙族使用的青魔法。
将以太膜覆盖全身，从而降低外部来的刺激，使防御力提高。目前还不能确定是否真的有使用此技能的龙族，也或许是与龙族长得很像的甲鳞纲魔物在使用。`,Learn:"学习 100 个技能后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.70",Icon:"https://cafemaker.wakingsands.com/i/003000/003347_hr1.png",Recast100ms:1200},{ID:96,ActionID:23281,Name:"以太火花",Number:96,Stats:`攻击类型：魔法
攻击属性：无
评级：★`,Cast100ms:20,Description:`向目标所在方向发出无属性直线范围魔法攻击　<span style="color:#00cc22;">威力：</span>50
<span style="color:#00cc22;">追加效果：</span>无属性持续伤害
<span style="color:#00cc22;">威力：</span>50　<span style="color:#00cc22;">持续时间：</span>15秒`,AozDescription:`陀鲁婆使用的青魔法。
射出环境以太，给敌人体表造成无数细小的伤痕。这些错综复杂的伤痕，会慢慢折磨敌人，使其血流不止。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003348_hr1.png",Learn:`基拉巴尼亚湖区 (x:22, y:22) - 陀鲁婆 Lv.69
 基拉巴尼亚湖区 [A] - 泛光晶体 Lv.70`,Recast100ms:25},{ID:97,ActionID:23282,Name:"水力吸引",Number:97,Stats:`攻击类型：魔法
攻击属性：水
评级：★★★★`,Cast100ms:20,Description:`对自身周围的敌人发动水属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>220
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>把敌人吸引到身边`,AozDescription:`凯尔派擅长的青魔法。
用魔法的水流吸引周围的敌人。至于为什么连飞在空中的鸟都能吸引过来……这或许就是魔法被称为魔法的原因吧。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003349_hr1.png",Learn:"沉没神殿斯卡拉遗迹 - 凯尔派 Lv.70",Recast100ms:25},{ID:98,ActionID:23283,Name:"水脉诅咒",Number:98,Stats:`攻击类型：魔法
攻击属性：水
评级：★★`,Cast100ms:20,Description:`向自身前方发出水属性直线范围魔法攻击　<span style="color:#00cc22;">威力：</span>200
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>将范围内的敌人与小队成员击退10米
目标身中部分弱化效果或处于非战斗状态时无效`,AozDescription:`赛太岁使用的一种风水术。
将以太传入地下，从而创造出人造水脉，可以推走水脉上的人。如果随意使用，很可能会波及到同伴，这会导致某种意义上真的被人诅咒。`,Learn:"风水灵庙岩燕庙 - 赛太岁 Lv.70",Icon:"https://cafemaker.wakingsands.com/i/003000/003350_hr1.png",Recast100ms:25},{ID:99,ActionID:23284,Name:"陆行鸟陨石",Number:99,Stats:`攻击类型：魔法
攻击属性：无
评级：★`,Cast100ms:20,Description:`对目标及其周围的敌人发动无属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>200
如果小队中存在自己的<span style="color:#ff7b1a;">专属陆行鸟</span>，则技能威力上升
<span style="color:#00cc22;">专属陆行鸟在小队时威力：</span>300
攻击复数敌人时，对目标之外的敌人威力降低50%`,AozDescription:`一种名为红陆行鸟的追猎种的绝招。
用周围环境中的沙尘制作岩块，再将其烧至通红后坠落地面。正是因为此技能，所以红陆行鸟才会被世界各地的人们惧怕。`,Learn:`失落之都拉巴纳斯塔 - ? Lv.70
 龙堡参天高地 (x:34.7, y:28.8) - 追猎种陆行鸟 Lv.53`,Icon:"https://cafemaker.wakingsands.com/i/003000/003351_hr1.png",Recast100ms:25},{ID:100,ActionID:23285,Name:"马特拉魔术",Number:100,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★`,Cast100ms:20,Description:`对目标发动连续8次无属性魔法攻击　<span style="color:#00cc22;">威力：</span>50
自身处于<span style="color:#ff7b1a;">以太复制：进攻</span>状态时　<span style="color:#00cc22;">威力：</span>100
该魔法有单独计算的复唱时间，并与部分青魔法共享复唱时间`,AozDescription:`新大陆的妖异使用的青魔法。
连续发射光弹。名字与瓦拉其族将对手逼入绝境的诅咒，以及将体力和魔力相互转换的秘术的名字相同。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003352_hr1.png",Learn:"学习 100 个技能后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.70",Recast100ms:1200},{ID:101,ActionID:23286,Name:"生成外设",Number:101,Stats:`攻击类型：物理・打
攻击属性：无
评级：★★★★`,Cast100ms:20,Description:`向目标所在方向发出无属性直线范围物理攻击　<span style="color:#00cc22;">威力：</span>220
<span style="color:#00cc22;">追加效果：</span>附加<span style="color:#ff7b1a;">头晕</span>　<span style="color:#00cc22;">持续时间：</span>5秒
短时间内对同一目标重复使用时，每次可令目标头晕的时间都会减少，直至完全无效
令目标陷入头晕状态时威力上升
<span style="color:#00cc22;">令目标陷入头晕状态时威力：</span>400
攻击复数敌人时，对目标之外的敌人威力降低50%`,AozDescription:`模仿欧米茄使用技术的青魔法。
完全掌握了时空狭缝的欧米茄，可以用数据创造出任意的东西。现在将此技术用魔法再现，创造出铁拳的幻影，攻击敌人。`,Learn:`欧米茄时空狭缝 阿尔法幻境3 - 欧米茄 Lv.70
 欧米茄零式时空狭缝 阿尔法幻境3 - 欧米茄 Lv.70`,Icon:"https://cafemaker.wakingsands.com/i/003000/003353_hr1.png",Recast100ms:25},{ID:102,ActionID:23287,Name:"如意大旋风",Number:102,Stats:`攻击类型：物理・打
攻击属性：无
评级：★★★★★`,Cast100ms:0,Description:`对自身周围的敌人发动无属性范围物理攻击　<span style="color:#00cc22;">威力：</span>600
与部分青魔法共享复唱时间`,AozDescription:`齐天大圣的绝招。
神通力创造出的可伸缩自如的武器——如意棒，现在用魔法将其再现。通过高速挥动如意棒，可以带动四周的空气，产生旋风。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003354_hr1.png",Recast100ms:1200,Learn:"风水灵庙岩燕庙 - 齐天大圣 Lv.70"},{ID:103,ActionID:23288,Name:"鬼宿脚",Number:103,Stats:`攻击类型：物理・打
攻击属性：无
评级：★★★★★`,Cast100ms:0,Description:`持续向自身前方发出扇形范围攻击
每秒对范围内的敌人造成伤害　<span style="color:#00cc22;">威力：</span>200　<span style="color:#00cc22;">持续时间：</span>5秒
持续时间内再次使用时，向自身前方发出无属性扇形范围攻击
<span style="color:#00cc22;">威力：</span>600
攻击复数敌人时，对第一个之外的敌人威力降低50%
效果时间内发动鬼宿脚以外的技能或进行移动、转身都会使鬼宿脚立即消失`,AozDescription:`朱雀的绝招。
以电光石火般的速度连续踢向敌人。鬼宿为东方占卜术中天球的一角，虽然几乎所有事情都象征着吉兆，但只有婚姻象征着凶兆。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003355_hr1.png",Learn:`朱雀镇魂战 - 朱雀 Lv.70
 朱雀诗魂战 - 朱雀 Lv.70`,Recast100ms:1200},{ID:104,ActionID:23290,Name:"月下彼岸花",Number:104,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★★★`,Cast100ms:0,Description:`对周围的敌人发动无属性范围魔法攻击　<span style="color:#00cc22;">威力：</span>400
攻击复数敌人时，对第一个之外的敌人威力降低50%
<span style="color:#00cc22;">追加效果：</span>对目标附加无属性持续伤害状态
<span style="color:#00cc22;">威力：</span>75　<span style="color:#00cc22;">持续时间：</span>60秒
与部分青魔法共享复唱时间`,AozDescription:`月读的绝招。
让混有恶意的魔力聚为花束，再使其爆炸。将一年只开花一次的月下美人，喻为亲手葬送自己的彼岸花，这种决意正是此魔法的力量之源。`,Icon:"https://cafemaker.wakingsands.com/i/003000/003357_hr1.png",Learn:`月读歼灭战 - 月读 Lv.70
 月读幽夜歼灭战 - 月读 Lv.70`,Recast100ms:1200},{ID:105,ActionID:34563,Name:"哥布林乱拳",Number:105,Stats:`攻击类型：物理・打
攻击属性：无
评级：★`,Cast100ms:0,Description:`对目标进行无属性物理攻击。<span style='color:#00cc22;'>威力：</span>120
<span style='color:#00cc22;'>正面攻击时威力：</span>220
如果自身被给予「强力守护」效果，则威力提升。
<span style='color:#00cc22;'>强力守护时威力：</span>220
<span style='color:#00cc22;'>强力守护且正面攻击时威力：</span>320`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003358_hr1.png",Learn:"珂露西亚岛(X:34,Y:30)  大哥布林",Recast100ms:25},{ID:106,ActionID:34564,Name:"大回旋",Number:106,Stats:`攻击类型：物理・打
攻击属性：无
评级：★★`,Cast100ms:20,Description:`自身周围的敌人进行无属性范围物理攻击。<span style='color:#00cc22;'>威力：</span>110
<span style='color:#00cc22;'>追加效果：</span>将范围内的敌人和队伍成员击退10米。
如果目标处于某些异常状态或非战斗状态，则效果无效。`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003359_hr1.png",Learn:"避暑离宫马利卡大井  1号BOSS",Recast100ms:25},{ID:107,ActionID:34565,Name:"刺阵",Number:107,Stats:`攻击类型：魔法
攻击属性：无
评级：★`,Cast100ms:20,Description:`在一定时间内，当自身受到物理攻击时，对攻击者造成无属性魔法伤害。<span style='color:#00cc22;'>威力：</span>50。<span style='color:#00cc22;'>持续时间：</span>15秒
如果自身受到<span style='color:#ff7b1a;'>以太复制：防护</span>效果影响，则威力增加。
<span style='color:#00cc22;'>以太复制：防护时威力：</span>100
无法与<span style='color:#ff7b1a;'>冰棘屏障</span>、<span style='color:#ff7b1a;'>水神的面纱</span>效果共存。`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003360_hr1.png",Learn:"安穆·艾兰(X:17,Y:29)  长尾犰狳",Recast100ms:25},{ID:108,ActionID:34566,Name:"补水",Number:108,Stats:`攻击类型：魔法
攻击属性：无
评级：★`,Cast100ms:50,Description:"恢复自身的生命值。<span style='color:#00cc22;'>恢复力：</span>600",AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003361_hr1.png",Recast100ms:25,Learn:`安穆·艾兰(X:32,Y:9)  湿滑犰狳/slippery armadillo/スリッパリー・アルマジロ
提示：新出的体型大的那个`},{ID:109,ActionID:34567,Name:"魔法呼吸",Number:109,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★`,Cast100ms:20,Description:`自身对前方扇形范围内的敌人吹出魔力气息。
给范围内的敌人造成无属性持续伤害。
<span style='color:#00cc22;'>威力：</span>120　<span style='color:#00cc22;'>持续时间：</span>60秒
此行动的效果只能同时应用一次。`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003362_hr1.png",Recast100ms:25,Learn:"青魔法师80级达成 图腾兑换"},{ID:110,ActionID:34568,Name:"兽魂的愤怒",Number:110,Stats:`攻击类型：物理・打
攻击属性：无
评级：★★★★`,Cast100ms:50,Description:`自身对周围的敌人进行无属性范围物理攻击。<span style='color:#00cc22;'>威力：</span>500
对第二个目标及后续目标的威力降低50%。
执行此行动时消耗最大生命值的50%。`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003363_hr1.png",Recast100ms:25,Learn:"暗影决战诺弗兰特 3号BOSS"},{ID:111,ActionID:34569,Name:"玩泥球",Number:111,Stats:`攻击类型：魔法
攻击属性：土
评级：★★`,Cast100ms:20,Description:`对目标及其周围的敌人进行土属性范围魔法攻击。<span style='color:#00cc22;'>威力：</span>100
对第二个目标及后续目标的威力降低50%。
对目标附加<span style='color:#ff7b1a;'>泥污</span>效果。
<span style='color:#00cc22;'>泥污效果：</span>给予目标土属性持续伤害。
<span style='color:#00cc22;'>威力：</span>10　<span style='color:#00cc22;'>持续时间：</span>9秒`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003364_hr1.png",Learn:"魔术工房玛托雅工作室 1号BOSS",Recast100ms:25},{ID:112,ActionID:34570,Name:"大扫除",Number:112,Stats:`攻击类型：物理・打
攻击属性：无
评级：★★★`,Cast100ms:20,Description:`对目标及其周围的敌人进行无属性范围物理攻击。<span style='color:#00cc22;'>威力：</span>220
对第二个目标及后续目标的威力降低50%。
<span style='color:#00cc22;'>追加效果：</span>如果目标已被<span style='color:#ff7b1a;'>泥污</span>效果影响，则解除该效果并给予自身<span style='color:#ff7b1a;'>大扫除</span>效果。
<span style='color:#00cc22;'>最大档数：</span>6
<span style='color:#00cc22;'>大扫除效果：</span>持续回复目标的生命值。
该效果的回复量根据自身受到的<span style='color:#ff7b1a;'>大扫除</span>叠加数而变化。
<span style='color:#00cc22;'>恢复力：</span>50～300　<span style='color:#00cc22;'>持续时间：</span>15秒
大扫除的效果时间不会随叠加数增加而更新。`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003365_hr1.png",Learn:"魔法宫殿宇宙宫 1号BOSS",Recast100ms:25},{ID:113,ActionID:34571,Name:"红宝石电圈",Number:113,Stats:`攻击类型：物理・斬
攻击属性：无
评级：★★★★`,Cast100ms:20,Description:`自身对前方进行无属性范围物理攻击。<span style='color:#00cc22;'>威力：</span>220
该魔法有单独计算的复唱时间，并与<span style='color:#ff7b1a;'>玄结界</span>、<span style='color:#ff7b1a;'>斗灵弹</span>共享复唱时间。`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003366_hr1.png",Recast100ms:300,Learn:"红宝石神兵破坏作战 p1"},{ID:114,ActionID:34572,Name:"魔之符文",Number:114,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★★`,Cast100ms:20,Description:`自身对前方进行无属性扇形范围魔法攻击。<span style='color:#00cc22;'>威力：</span>100
<span style='color:#00cc22;'>追加效果：</span>回复自身的魔力值。`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003367_hr1.png",Recast100ms:25,Learn:"缇坦妮雅歼灭战"},{ID:115,ActionID:34573,Name:"空间转换",Number:115,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★★`,Cast100ms:50,Description:`对自身周围的敌人造成目标当前生命值的30%伤害。
如果目标的等级高于自身，则无效化。`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003368_hr1.png",Recast100ms:25,Learn:"伊甸希望乐园 觉醒之章1"},{ID:116,ActionID:34574,Name:"坚定判罪",Number:116,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★`,Cast100ms:20,Description:`对目标进行无属性前方直线范围魔法攻击。<span style='color:#00cc22;'>威力：</span>220
对第二个目标及后续目标的威力降低50%。
如果自身被<span style='color:#ff7b1a;'>全能者的祝福</span>效果影响，则威力增加。
<span style='color:#00cc22;'>全能者的祝福时威力：</span>440`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003369_hr1.png",Learn:"伪造天界格鲁格火山  3号BOSS",Recast100ms:25},{ID:117,ActionID:34575,Name:"力场",Number:117,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★`,Cast100ms:20,Description:`给自身附加<span style='color:#ff7b1a;'>物理受伤减轻</span>或<span style='color:#ff7b1a;'>魔法受伤减轻</span>之一效果。<span style='color:#00cc22;'>持续时间：</span>10秒
<span style='color:#00cc22;'>物理受伤减轻效果：</span>减少所受物理伤害50%。
<span style='color:#00cc22;'>魔法受伤减轻效果：</span>减少所受魔法伤害50%。
该魔法有单独计算的复唱时间。`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003370_hr1.png",Learn:"青魔法习得120种 图腾兑换",Recast100ms:1200},{ID:118,ActionID:34576,Name:"断罪飞翔",Number:118,Stats:`攻击类型：物理・突
攻击属性：无
评级：★★★`,Cast100ms:10,Description:`对目标进行无属性前方直线范围物理攻击。<span style='color:#00cc22;'>威力：</span>300
对第二个目标及后续目标的威力降低50%。
<span style='color:#00cc22;'>追加效果：</span>立即解除此行动的再次冷却时间，并给予自身<span style='color:#ff7b1a;'>断罪飞翔</span>效果。
<span style='color:#00cc22;'>最大档数：</span>4
<span style='color:#00cc22;'>持续时间：</span>永久
当断罪飞翔叠加到3层时，执行此行动不再解除冷却时间，而是威力增加到400。
当断罪飞翔附加并达到最大叠加层数时，断罪飞翔变为全能者的祝福。<span style='color:#00cc22;'>持续时间：</span>10秒
<span style='color:#00cc22;'>全能者的祝福效果：</span>增加坚定判罪的威力。
该魔法有单独计算的复唱时间。`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003371_hr1.png",Learn:"无瑕灵君歼灭战",Recast100ms:900},{ID:119,ActionID:34577,Name:"激射眼",Number:119,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★`,Cast100ms:20,Description:`对目标及其周围的敌人进行无属性范围魔法攻击。<span style='color:#00cc22;'>威力：</span>220
对第二个目标及后续目标的威力降低50%。
<span style='color:#00cc22;'>追加效果：</span>击退效果，将范围内的敌人击退5米。`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003372_hr1.png",Recast100ms:25,Learn:"伊甸希望乐园 再生之章4"},{ID:120,ActionID:34578,Name:"糖果手杖",Number:120,Stats:`攻击类型：魔法
攻击属性：无
评级：★★`,Cast100ms:10,Description:`对目标及其周围的敌人进行无属性范围魔法攻击。<span style='color:#00cc22;'>威力：</span>250
对第二个目标及后续目标的威力降低50%。
<span style='color:#00cc22;'>追加效果：</span>减少目标的力量和灵巧属性10%。
<span style='color:#00cc22;'>持续时间：</span>10秒
<span style='color:#00cc22;'>追加效果：</span>回复自身最大MP的10%。
该魔法具有固有的冷却时间，并与<span style='color:#ff7b1a;'>魔法锤</span>共享。`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003373_hr1.png",Learn:"水妖幻园多恩美格禁园 1号BOSS",Recast100ms:900},{ID:121,ActionID:34579,Name:"必灭之炎",Number:121,Stats:`攻击类型：魔法
攻击属性：火
评级：★★★`,Cast100ms:20,Description:`对目标施加火属性的持续伤害。
<span style='color:#00cc22;'>威力：</span>40　<span style='color:#00cc22;'>持续时间：</span>永久
该行动的效果只能同时施加一个。
如果目标处于非战斗状态，则无效。
另外，如果目标的战斗状态解除，则附加的<span style='color:#ff7b1a;'>必灭之炎</span>效果也会解除。`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003374_hr1.png",Learn:"魔法宫殿宇宙宫 3号BOSS",Recast100ms:25},{ID:122,ActionID:34580,Name:"咕噜咕噜",Number:122,Stats:`攻击类型：魔法
攻击属性：水
评级：★★★★★`,Cast100ms:0,Description:`对自身周围的敌人进行水属性范围魔法攻击。<span style='color:#00cc22;'>威力：</span>500
<span style='color:#00cc22;'>追加效果：</span>当天气为「雨」「暴雨」「雷雨」时，威力增加。
<span style='color:#00cc22;'>雨天时威力：</span>1000`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003375_hr1.png",Recast100ms:1200,Learn:"魔术工房玛托雅工作室 2号BOSS"},{ID:123,ActionID:34581,Name:"启示录",Number:123,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★★★`,Cast100ms:0,Description:`对自身前方直线范围持续进行攻击。
对范围内的敌人每秒造成伤害。
<span style='color:#00cc22;'>威力：</span>140　<span style='color:#00cc22;'>持续时间：</span>10秒
如果在效果时间内执行其他行动、移动或转身，则启示录将立即解除。
该行动与<span style='color:#ff7b1a;'>终有一死</span>共享冷却时间。`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003376_hr1.png",Learn:"末日暗影亚马乌罗提 3号BOSS",Recast100ms:1200},{ID:124,ActionID:34582,Name:"终有一死",Number:124,Stats:`攻击类型：魔法
攻击属性：无
评级：★★★★★`,Cast100ms:0,Description:`对自身周围的敌人进行无属性范围魔法攻击。<span style='color:#00cc22;'>威力：</span>800
对第二个目标及后续目标的威力降低50%。
该行动与<span style='color:#ff7b1a;'>启示录</span>共享冷却时间。`,AozDescription:"",Icon:"https://cafemaker.wakingsands.com/i/003000/003377_hr1.png",Recast100ms:1200,Learn:"缇坦妮雅歼灭战"}]);for(const c of e.value)c.Stats=c.Stats.replaceAll(/(攻击类型|攻击属性|评级)：/g,'<span style="color:#00cc22;">$1：</span>'),c.Number>=105&&(c.Icon=c.Icon.replace("cafemaker.wakingsands.com","xivapi.com"));const z=F(()=>D.value.trim().length===0?e.value.filter(c=>y.value?!l.value[c.Number.toString()]:!0):e.value.filter(s=>{const o=new RegExp(D.value);return(y.value?!l.value[s.Number.toString()]:!0)&&(o.test(s.Name)||o.test(s.Number.toString())||o.test(s.Description)||o.test(s.Stats)||o.test(s.AozDescription)||o.test(s.Learn))}));function L(c){const s=D.value.trim();if(s){const o=new RegExp(s,"g");c=c.replace(o,r=>`<em>${r}</em>`)}return c}function R(c,s){const o=c.target;/xivapi.com/.test(o.src)||(e.value[s-1].Icon=e.value[s-1].Icon.replace("cafemaker.wakingsands.com","xivapi.com"))}function O(c,s){p.value=s-1}function H(c,s){i.value=s}const $=/^\b(?:\d+(?:-\d+)?(?:,(?=\d)|~\d+)?)+\b$/;function U(c){Y.prompt('输入字符串 例如 "1~104"、"1,3,21,24"',"Tip",{confirmButtonText:"确认",cancelButtonText:"取消",inputPattern:$,inputErrorMessage:"格式错误"}).then(({value:s})=>{for(const o of s.split(","))if(/^\d+[\-~]\d+$/.test(o)){const[r,_]=o.split(/[\-~]/).map(Number);for(let f=r;f<=_;f++)l.value[f.toString()]=!0}else l.value[o]=!0}).catch(()=>{Q({type:"info",message:"Input canceled"})})}return(c,s)=>{const o=W,r=j,_=q,f=Z;return k(),N("div",sn,[m(o,{modelValue:n(D),"onUpdate:modelValue":s[0]||(s[0]=a=>d(D)?D.value=a:null),placeholder:"搜索技能名称或序号或描述",class:"search"},null,8,["modelValue"]),t("div",an,[(k(!0),N(x,null,B(Math.ceil(n(z).length/16),a=>(k(),N("div",{onClick:I=>H(I,a),class:M(n(i)===a?"selected":"")},A(a),11,cn))),256))]),m(r,{modelValue:n(v),"onUpdate:modelValue":s[1]||(s[1]=a=>d(v)?v.value=a:null),label:"编辑模式",class:"toggleEdingMode",color:"white"},null,8,["modelValue"]),m(r,{modelValue:n(u),"onUpdate:modelValue":s[2]||(s[2]=a=>d(u)?u.value=a:null),label:"没学会的灰度显示",class:"toggleGrayNotLearned",color:"white"},null,8,["modelValue"]),m(r,{modelValue:n(y),"onUpdate:modelValue":s[3]||(s[3]=a=>d(y)?y.value=a:null),label:"只显示没学会的",class:"toggleNotLearnedOnly",color:"white"},null,8,["modelValue"]),m(_,{type:"primary",class:"batchLearning",size:"small",onClick:U},{default:V(()=>[w("批量学习")]),_:1}),t("div",tn,[(k(!0),N(x,null,B(n(z),(a,I)=>(k(),N("div",{key:a.ID,class:"actionGrid"},[m(f,{class:"box-item",effect:"dark",content:a.Name,placement:"top",offset:0,"hide-after":0,"show-arrow":!1,enterable:!1},{default:V(()=>[E(t("div",{class:"grid-item",onClick:g=>O(g,a.Number)},[t("img",{class:M(`IconHD ${!n(l)[a.Number]&&n(u)?"notLearned":"learned"}`),draggable:"false",src:(n(i)-1)*16<=I&&n(i)*16>I?`${a.Icon}`:void 0,onError:g=>R(g,a.Number)},null,42,en),t("div",pn,A(a.Number),1),E(m(r,{modelValue:n(l)[a.Number],"onUpdate:modelValue":g=>n(l)[a.Number]=g,label:a.Number,size:"small",class:"learnedSwitch",color:"white",fill:"#f00"},null,8,["modelValue","onUpdate:modelValue","label"]),[[T,n(v)]])],8,on),[[T,(n(i)-1)*16<=I&&n(i)*16>I]]),rn]),_:2},1032,["content"])]))),128)),t("div",ln,[t("div",mn,A(n(e)[n(p)].Number),1),t("div",{class:"Name",innerHTML:L(n(e)[n(p)].Name)},null,8,Dn),t("img",{class:"IconHD",src:`${n(e)[n(p)].Icon}`,onError:s[4]||(s[4]=a=>R(a,n(p))),draggable:"false"},null,40,yn),t("div",{class:"Stats",innerHTML:L(n(e)[n(p)].Stats)},null,8,In),t("div",Ln,[fn,w(A(n(e)[n(p)].Cast100ms/10),1)]),t("div",gn,[hn,w(A(n(e)[n(p)].Recast100ms/10),1)]),t("div",{class:"Description",innerHTML:L(n(e)[n(p)].Description)},null,8,kn),t("div",{class:"AozDescription",innerHTML:L(n(e)[n(p)].AozDescription)},null,8,Nn),t("div",{class:"Learn",innerHTML:L(n(e)[n(p)].Learn)},null,8,An)])])])}}});const _n=nn(bn,[["__scopeId","data-v-da8147d8"]]);export{_n as default};
