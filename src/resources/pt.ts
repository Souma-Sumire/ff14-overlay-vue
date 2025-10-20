type EnemyData = {
  grade?: '简单' | '中等' | '困难' | '危险' | '小心'
  detect?: '视觉' | '听觉' | '范围'
  note?: string
}

type EnemyDataRecord = Record<number, EnemyData | undefined>

// TODO: 所有的 undefined 都代表数据缺失，需要补充完整
const PtEnemies: EnemyDataRecord = {
  // 通用
  14265: { grade: '小心', note: '尽快击杀，打断怨念' }, // '拟态怪'
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
  13979: { detect: '视觉', grade: '小心', note: '10层BOSS：召唤小怪，会复制BOSS的技能，可选中后尽快击杀。BOSS还会释放捕食，记好预兆寻找安全区。' }, // '花人' 10层BOSS

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
  13863: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的叛逆'
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
  14137: { detect: '视觉', grade: '小心', note: '在血量<25%后，会读条使下一次平A成为秒杀。可以打断。' }, // '漫步冰海天使'
  14138: { detect: '视觉', grade: '简单', note: '读条直线攻击' }, // '得到宽恕的不容忍'

  // 31-40层
  13977: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的纯真'
  13978: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的奉承'
  14139: { detect: undefined, grade: '小心', note: '重拳波：跳跃至AOE区域后立刻释放更大的AOE，造成约70K伤害。强冲拳：在近战范围内会被强力击退。' }, // '漫步石兵' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14140: { detect: '视觉', grade: '小心', note: '先在前方释放扇形AOE，随后立刻在背后再释放一次。' }, // '得到宽恕的瘟疫' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14141: { detect: '视觉', grade: '小心', note: '归于尘土：血量低于25%时反复施放全场AOE，致命。平时会为自己增加攻击力造成可观伤害。' }, // '得到宽恕的堕落' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14142: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的勒索'
  14143: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的偏见'
  14144: { detect: '视觉', grade: '小心', note: '前方扇形AOE，范围极大！' }, // '得到宽恕的伪善' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14145: { detect: undefined, grade: '小心', note: '左/右触手：隐藏的半场刀，范围极大！' }, // '得到宽恕的任性' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14146: { detect: '视觉', grade: '简单', note: '非战斗状态下会对你释放小范围圆形攻击，造成非致命伤害（约62K）。' }, // '得到宽恕的嘲弄' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14147: { detect: '视觉', grade: '小心', note: '在低血量时会快速连续释放直线AOE。' }, // '漫步异端审问官' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14148: { detect: '视觉', grade: '简单', note: '远距离时会使用中等范围的扇形AOE，近距离则为小范围环形AOE。' }, // '漫步鸟' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14149: { detect: '视觉', grade: '简单', note: '先是小扇形提示，随后接着大范围扇形AOE。' }, // '漫步石狮' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14150: { detect: undefined, grade: undefined, note: undefined }, // '漫步亚克鲁斯'
  14151: { detect: '视觉', grade: '小心', note: '飞驰：强力击退，可通过视线躲避。天马嘶啸：延迟小范围钢铁，可通过视线躲避。' }, // '漫步飞马' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证

  // 41-50层
  14152: { detect: '视觉', grade: '小心', note: '吸引+延迟钢铁' }, // '漫步替身' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14153: { detect: '视觉', grade: '危险', note: '移动极慢，但伤害极高。不要被它碰到！攻击会叠加易伤。还会使用隐藏的步进式环形地震攻击。' }, // '漫步托尔巴龟' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14154: { detect: undefined, grade: undefined, note: undefined }, // '漫步水蚺'
  14155: { detect: undefined, grade: '简单', note: '延迟小范围前方扇形AOE' }, // '漫步三裂' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14156: { detect: undefined, grade: undefined, note: undefined }, // '漫步蜥蜴'
  14157: { detect: '视觉', grade: '简单', note: '加速自身，提高攻速。' }, // '漫步白蚁' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14158: { detect: '视觉', grade: '小心', note: '先在前方释放冲刺直线AOE，随后无提示地回头再冲刺一次。' }, // '漫步蚁狮' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14159: { detect: undefined, grade: undefined, note: undefined }, // '漫步钳嘴鸟'
  14160: { detect: undefined, grade: undefined, note: undefined }, // '漫步壁崖飞鸢'
  14161: { detect: '视觉', grade: '小心', note: '愤怒旋风：延迟圆形AOE，会造成无法净化的眩晕，伤害约65K。愤怒一击：延迟小范围直线AOE，伤害约70K。' }, // '漫步武器' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14162: { detect: undefined, grade: undefined, note: undefined }, // '漫步龙舌兰'
  14163: { detect: undefined, grade: undefined, note: undefined }, // '漫步发芽大口花'
  14164: { detect: undefined, grade: undefined, note: undefined }, // '漫步螳螂'
  14263: { detect: undefined, grade: undefined, note: undefined }, // '奥古布纳巴里'

  // 51-60层
  14097: { detect: undefined, grade: undefined, note: undefined }, // '元祖马利克刺人仙'
  14098: { detect: undefined, grade: undefined, note: undefined }, // '埃米尔仙人刺'
  14099: { detect: undefined, grade: undefined, note: undefined }, // '艾米拉仙人花'
  14165: { detect: undefined, grade: undefined, note: undefined }, // '漫步褐爪'
  14166: { detect: '视觉', grade: '简单', note: undefined }, // '漫步守护者'
  14167: { detect: '视觉', grade: '危险', note: '无提示的全场AOE，为270度环形范围，可站在背后或其命中区域内躲避，可利用视线阻挡。可被眩晕。' }, // '漫步沙蛇' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14168: { detect: '视觉', grade: '危险', note: '使所有人进入目押状态，然后释放延迟中等范围AOE。若不熟悉方向错乱机制，建议提前远离' }, // '漫步美甲兽' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14169: { detect: '视觉', grade: '小心', note: '非战斗状态下会施放反击屏障，攻击它会受到秒杀级伤害！' }, // '漫步巨蜥' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14170: { detect: undefined, grade: undefined, note: undefined }, // '漫步邪恶海鸟'
  14171: { detect: '视觉', grade: '简单', note: '读条小扇形' }, // '漫步帕查玛玛'
  14172: { detect: '视觉', grade: '简单', note: '中等宽度的前方扇形提示AOE。' }, // '漫步神香草' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14173: { detect: '视觉', grade: '小心', note: '可被眩晕，会施放超大范围环形AOE及前方扇形攻击。' }, // '漫步恐鹤' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14174: { detect: '视觉', grade: '危险', note: '外环雷：无提示的全场环形AOE。尾镰：隐藏的中等范围钢铁。高速撞击：直线攻击。' }, // '漫步吼叫的小豹' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14175: { detect: '视觉', grade: '简单', note: '读条小钢铁或大范围扫尾' }, // '漫步狞猫'
  14176: { detect: '视觉', grade: '小心', note: '瞬间将目标拉近，然后施放延迟中等范围的钢铁。' }, // '漫步巨人' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14177: { detect: undefined, grade: undefined, note: undefined }, // '漫步甲虫'

  // 61-70层
  13971: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的狂热'
  14178: { detect: '视觉', grade: '小心', note: '左右刀' }, // '得到宽恕的暴动' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14179: { detect: undefined, grade: '小心', note: '几千针刺：延迟大范围直线AOE。' }, // '得到宽恕的争论' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14180: { detect: undefined, grade: '简单', note: '未终针延迟小范围前方直线AOE。终极针：血量低于10%时的点名狂暴攻击。' }, // '漫步蜂后' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14181: { detect: undefined, grade: '危险', note: '水晶刺：血量低于25%时会反复释放全场AOE，可用视线阻挡。冰雹发射：延迟直线AOE。' }, // '得到宽恕的怨恨' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14182: { detect: '视觉', grade: '小心', note: '执行贯穿：向前冲刺并在终点释放小范围圆形AOE。随后会释放延迟大范围钢铁。' }, // '漫步塔罗斯' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14183: { detect: '视觉', grade: '小心', note: '冲顶：快速施放的前方宽扇形延迟AOE。' }, // '漫步壁崖鼹鼠' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14184: { detect: undefined, grade: '简单', note: '在两次“沉岛”圆形提示后施放“岩石崩溃”：延迟全屏大范围十字AOE。' }, // '得到宽恕的偏颇' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14185: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的恶作剧'
  14186: { detect: undefined, grade: '小心', note: '无提示的前方石化攻击（无法背对躲避）。延迟小范围钢铁。' }, // '得到宽恕的贪食' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14187: { detect: '视觉', grade: '危险', note: '隐藏敌人，接近后才会显形。会向你冲撞造成约40K伤害，随后施放快速且延迟小范围钢铁。仅出现于61-64层。' }, // '得到宽恕的疑虑' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14188: { detect: undefined, grade: '危险', note: '【可能是需要诱导】延迟前（或后）方半圆AOE，随后立即在背后（或前面）再释放一次。' }, // '得到宽恕的眷恋' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14189: { detect: '视觉', grade: '小心', note: '读条小钢铁' }, // '漫步诺姆' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14190: { detect: undefined, grade: '小心', note: '泥石流：中等范围、延迟释放的宽扇形AOE。' }, // '漫步恩戈齐' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证

  // 71-80层
  13968: { detect: undefined, grade: undefined, note: undefined }, // '得到宽恕的亵渎'
  14191: { detect: '视觉', grade: '小心', note: '（多智兽）读条钢铁，或者读条正面超大扇形' }, // '得到宽恕的不和' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14192: { detect: '视觉', grade: '危险', note: '非战斗状态会释放全屏AOE，进战后会读条释放正面扇形AOE' }, // '得到宽恕的腐化物' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14193: { detect: '视觉', grade: '危险', note: '两种读条，先月环后钢铁，或者先钢铁后月环' }, // '得到宽恕的恶意' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14194: { detect: '视觉', grade: '小心', note: '拉怪时会跳向玩家并击退，以及一个毒DOT' }, // '漫步食岩者' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14195: { detect: '视觉', grade: '危险', note: '读条钢铁，死了会自爆！！！！！！' }, // '漫步爆岩怪' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14196: { detect: undefined, grade: undefined, note: undefined }, // '漫步奶油泡芙'
  14197: { detect: '范围', grade: '危险', note: '超级大月环或者十字！注意不要拉在过道上导致无路可走！' }, // '得到宽恕的虚夸' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14198: { detect: undefined, grade: '小心', note: '连续四次正面半圆顺劈' }, // '得到宽恕的傲慢' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14199: { detect: undefined, grade: '小心', note: '读条扇形，或者读条点名一个人的脚下黄圈' }, // '得到宽恕的诽谤' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14200: { detect: '视觉', grade: '小心', note: '小范围直线AOE，并且偶尔会连续平A两次' }, // '得到宽恕的不信任' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14201: { detect: undefined, grade: '小心', note: '推翻：延迟的小范围钢铁。' }, // '漫步阿米特' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14202: { detect: '听觉', grade: '小心', note: '读条中等范围钢铁' }, // '漫步蠕虫' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14203: { detect: '视觉', grade: '简单', note: '读条小范围顺劈' }, // '漫步铰颌蚁' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证

  // 81-90层
  14090: { detect: undefined, grade: undefined, note: undefined }, // '玛拉科达'
  14204: { detect: '视觉', grade: '小心', note: '踢击与扫尾：先读条小范围前方直线AOE，随后在背后顺劈' }, // '漫步卡马' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14205: { detect: '视觉', grade: '危险', note: '非战斗状态下会释放全场AOE。深渊射线：读条极大范围的直线AOE，穿墙！' }, // '被召唤的巴力' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14206: { detect: '范围', grade: '小心', note: '会连续击退四次，然后使用延迟的小范围前方扇形AOE。' }, // '漫步骑士' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14207: { detect: undefined, grade: '危险', note: '会点名热病，不要移动。可通过视线阻挡来避免。' }, // '被召唤的梦魔' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14208: { detect: '视觉', grade: '小心', note: '连续施放3-4次双重平A后，立即发动秒杀顺劈' }, // '被召唤的洪巴巴' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14209: { detect: '视觉', grade: '简单', note: '读条小范围扇形顺劈' }, // '被召唤的格雷姆林' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14210: { detect: '视觉', grade: '小心', note: '读条中等范围扇形，低血量时会施放长读条的狂暴技能，可能是点名秒杀攻击。' }, // '漫步异豺' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14211: { detect: '视觉', grade: '危险', note: '昏暗：长读条的可打断超宽扇形AOE，不要与“黑暗”混淆。' }, // '漫步卡部斯' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14212: { detect: undefined, grade: undefined, note: undefined }, // '被召唤的小撒旦'
  14213: { detect: '视觉', grade: '小心', note: '读条宽扇形顺劈' }, // '被召唤的上级恶魔' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14214: { detect: '视觉', grade: '简单', note: '大凶眼：很大范围的背对' }, // '被召唤的盖因' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14215: { detect: '视觉', grade: '危险', note: '闪雷：读条前方圆形AOE。地狱爪击：读条前方扇形AOE。拍尾：隐藏的大范围后方扇形AOE。' }, // '被召唤的刻耳柏洛斯' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14216: { detect: '范围', grade: '小心', note: '离他远的时候快速读条大范围扇形AOE，靠近时小范围钢铁' }, // '被召唤的行吟诗人' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证

  // 91-100层
  14037: { detect: undefined, grade: undefined, note: undefined }, // '至极悲痛' 99层BOSS（男）
  14038: { detect: undefined, grade: undefined, note: undefined }, // '被侵蚀的食罪灵' 99层BOSS（女）
  14217: { detect: undefined, grade: '小心', note: '读条三重/四重进行连续强化攻击，随后发动致命的小范围环形AOE。' }, // '漫步狼人' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14218: { detect: undefined, grade: '小心', note: '读条左右刀，记得穿' }, // '被召唤的古辛' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14219: { detect: undefined, grade: '危险', note: '读条穿墙AOE+自爆' }, // '被召唤的梦祸' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14220: { detect: undefined, grade: '小心', note: '点名，必须用墙或者障碍物阻挡' }, // '被召唤的单身汉' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14221: { detect: undefined, grade: '小心', note: '读条大范围直线AOE' }, // '被召唤的破坏本能' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14222: { detect: undefined, grade: '小心', note: '读条斜着的左右刀，记得穿。还有一个读条前方扇形AOE。' }, // '被召唤的锯齿花' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14223: { detect: undefined, grade: undefined, note: undefined }, // '漫步紫三裂'
  14224: { detect: '听觉', grade: '小心', note: '读条超长直线AOE，穿墙！' }, // '漫步食人花' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14225: { detect: undefined, grade: '小心', note: '无读条小范围劈后面+读条顺劈， 最好去侧面' }, // '被召唤的扎哈克' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14226: { detect: undefined, grade: '小心', note: '效果未知，建议使用视线阻挡以保安全。' }, // '被召唤的阿刻戎' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14227: { detect: undefined, grade: '简单', note: '读条钢铁' }, // '被召唤的傀儡' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14228: { detect: undefined, grade: '简单', note: '读条扇形顺劈' }, // '漫步恶念' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
  14229: { detect: undefined, grade: '小心', note: '读条超大扇形，或者读条钢铁' }, // '被召唤的古恶魔' 改编自nepufish/ff14-overlay-dungeon-cn项目 未验证
} as const

export { PtEnemies, type EnemyData }
