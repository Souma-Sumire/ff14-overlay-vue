<script setup lang="ts">
import type { MessageBoxInputData } from "element-plus";
import type { Ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { completeIcon } from "@/resources/logic/status";
import { computed, nextTick, ref, watch } from "vue";
import { useStorage } from "@vueuse/core";
import { ElButton, ElCheckbox, ElInput, ElTooltip } from "element-plus";

interface AozAction {
  ID: number;
  ActionID: number;
  Name: string;
  Number: number;
  Stats: string;
  Cast100ms: number;
  Description: string;
  AozDescription: string;
  Icon: string;
  Recast100ms: number;
  Learn: string;
}

const selectIndex = useStorage("blubook-selectIndex", 0);
const page = useStorage("blubook-page", 1);
const searchStr = ref("");
const editingMode = ref(false);
const notLearnedOnly = useStorage("blubook-notLearnedOnly", false);
const grayNotLearned = useStorage("blubook-grayNotLearned", false);
const learned = useStorage("blubook-learned", {} as Record<string, boolean>);

watch(notLearnedOnly, () => {
  nextTick(() => {
    // page.value = Math.min(page.value, Math.ceil(showAozAction.value.length / 16));
    page.value = 1;
  });
});

watch(searchStr, () => {
  nextTick(() => {
    page.value = 1;
  });
});

const tempIcon: Ref<string | undefined> = ref(undefined);

const learnMap: Record<string, string> = {
  "1": "自动习得 Lv.1",
  "2": "纷争要地布雷福洛克斯野营地 - 6号哥布林坦克 Lv.50\n 幻龙残骸密约之塔 - 独爪妖禽、魔导炮艇 Lv.50",
  "3": "艾玛吉娜杯斗技大会决赛 - 奥尔特罗斯 Lv.50\n 假面狂欢20 - 奥尔特罗斯 Lv.50\n 利维亚桑歼灭战 - 利维亚桑 Lv.50\n 利维亚桑歼殛战 - 利维亚桑 Lv.50",
  "4": "领航明灯天狼星灯塔 - 祖 Lv.50打破两个蛋后使用\n 拉诺西亚外地 [A] - 角祖 Lv.50",
  "5": "北萨纳兰 - 逆向工程 - 废弃的魔导先锋 Lv.46\n 北萨纳兰 (x:16, y:15) - 魔导先锋强化型 Lv.50血量低于 60% 后使用\n 纷争要地布雷福洛克斯野营地 - 3号哥布林装甲 Lv.50\n 帝国南方堡外围激战 - 魔导先锋、魔导先锋强袭型 Lv.50\n 天幕魔导城最终决战 - 魔导先锋重装型 Lv.50",
  "6": "巴哈姆特大迷宫 邂逅之章1 - 自卫系统 Lv.50\n 巴哈姆特大迷宫 邂逅之章2 - 监视/净化/防卫/焚烧/迎击/防疫/自卫系统 Lv.50\n 假面狂欢15 - 斗兽系统 Lv.50",
  "7": "北萨纳兰 [B] - 永恒不灭的菲兰德副耀士 Lv.50\n 腐坏遗迹无限城市街古迹 - 巴尔泽芬 Lv.50\n 惨剧灵殿塔姆·塔拉墓园 - 但他林、幻影骑士 Lv.50",
  "8": "中拉诺西亚 (x:15, y:15) - 杀手胡蜂 Lv.13\n 古代遗迹喀恩埋没圣堂 - 圣堂蜂、粪便胡蜂 Lv.35",
  "9": "领航明灯天狼星灯塔 - 塞壬 Lv.50",
  "10": "毒雾洞窟黄金谷 - 数币巨人 Lv.47\n 中萨纳兰 [S] - 布隆特斯 Lv.50",
  "11": "黑衣森林北部林区 (x:19, y:28) - 泥土巨像 Lv.28\n 南萨纳兰 (x:24, y:13) - 砂石巨像 Lv.29\n 拉诺西亚外地 (x:16, y:16) - 玄岩巨像 Lv.34\n 骚乱坑道铜铃铜山 - 哥革巨像 Lv.50\n 苏醒遗迹喀恩埋没圣堂 - 喀恩守护者 Lv.50\n 假面狂欢25 - 启示者 Lv.50",
  "12": "黑衣森林东部林区 (x:18, y:24) - 狂野疣猪 Lv.20",
  "13": "学习 10 个技能后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.1\n 无限城的死斗 - 恩奇都 Lv.50",
  "14": "名门府邸静语庄园 - 庄园的守卫 Lv.28血量低于 20% 后使用\n 水晶塔 古代人迷宫 - 诅咒之眼、腐朽之眼 Lv.50",
  "15": "神灵圣域放浪神古神殿 - 冬贝利王 Lv.50\n 拉诺西亚高地 [A] - 玛贝利 Lv.50",
  "16": "黑衣森林中央林区 (x:27, y:24) - 捣蛋小鬼 Lv.9\n 名门府邸静语庄园 - 庄园小丑 Lv.50\n 假面狂欢25 - 启示者 Lv.50",
  "17": "拉诺西亚低地 (x:27, y:16) - 洞穴蝙蝠 Lv.7\n 中萨纳兰 (x:26, y:18) - 烈阳蝙蝠 Lv.14\n 西拉诺西亚 (x:28, y:24) - 黄昏蝙蝠 Lv.15\n 黑衣森林东部林区 (x:17, y:23) - 漆黑蝙蝠、血蚤 Lv.21\n 黑衣森林南部林区 (x:24, y:23) - 小狐蝠 Lv.37\n 名门府邸静语庄园 - 阁楼蝙蝠 Lv.28\n 古代遗迹喀恩埋没圣堂 - 圣堂蝙蝠 Lv.35\n 流沙迷宫樵明洞 - 沙漠蝙蝠 Lv.38\n 毒雾洞窟黄金谷 - 金谷蝙蝠 Lv.47\n 剑斗领域日影地修炼所 - 日影地蝙蝠 Lv.50\n 苏醒遗迹喀恩埋没圣堂 - 圣堂蝙蝠 Lv.50",
  "18": "黑衣森林北部林区 (x:27, y:28) - 幼体树精 Lv.12\n 黑衣森林中央林区 (x:27, y:15) - 幼体树精 Lv.12\n 黑衣森林东部林区 (x:13, y:25) - 幼体树精 Lv.12\n 黑衣森林中央林区 [S] - 乌尔迦鲁 Lv.50\n 邪念妖地无限城古堡 - 多节树精 Lv.50",
  "19": "中拉诺西亚 (x:23, y:21) - 哥布林鱼师、哥布林赌徒 Lv.5\n 西拉诺西亚 (x:27, y:23) - 哥布林猎手 Lv.18\n 黑衣森林东部林区 (x:11, y:28) - 哥布林猎手 Lv.11\n 黑衣森林南部林区 (x:28, y:21) - 哥布林暴徒 Lv.28\n 纷争要地布雷福洛克斯野营地 - 青蓝之手滑翔兵 Lv.50",
  "20": "学习 5 个技能后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.1",
  "21": "西萨纳兰 (x:27, y:16) - 滑行爆弹怪 Lv.12\n 封锁坑道铜铃铜山 - 爆破爆弹怪、烈火弹怪 Lv.17\n 魔兽领域日影地修炼所 - 瓦斯弹怪 Lv.20\n 名门府邸静语庄园 - 夫人手提灯 Lv.28\n 流沙迷宫樵明洞 - 榴霰弹怪 Lv.38\n 巴哈姆特大迷宫 真源之章2 - 护卫系统 Lv.50",
  "22": "学习 20 个技能后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.1",
  "23": "中萨纳兰 (x:16, y:19) - 卢恩人护甲手 Lv.6\n 东拉诺西亚 (x:26, y:32) - 卢恩人烘鸥手 Lv.32",
  "24": "东拉诺西亚 (x:27, y:35) - 碧企鹅 Lv.30\n 东拉诺西亚 [B] - 血腥玛丽 Lv.50",
  "25": "艾玛吉娜杯斗技大会决赛 - 提丰 Lv.50\n 假面狂欢20 - 提丰 Lv.50",
  "26": "艾玛吉娜杯斗技大会决赛 - 奥尔特罗斯 Lv.50",
  "27": "摩杜纳  - 理符任务：回收禁书《尖牙利齿的怪物》 暗黑扎哈克 Lv.50\n 邪教驻地无限城古堡 - 阿难塔波嘉 Lv.50\n 水晶塔 古代人迷宫 - 瓦力弗 Lv.50",
  "28": "黑衣森林中央林区 (x:18, y:21) - 套索花、臭套索花 Lv.31\n 摩杜纳 (x:14, y:14) - 魔界花 Lv.44\n 毒雾洞窟黄金谷 - 魔界花、守财夫人 Lv.47",
  "29": "激战城塞石卫塔 - 库卡龙龟 Lv.50\n 皇都伊修加德保卫战 - 部落龙龟 Lv.50\n 龙堡参天高地 - 坚甲铁龙——塔拉斯克 - 塔拉斯克 Lv.53",
  "30": "学习 10 个技能后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.1",
  "31": "中萨纳兰 (x:27, y:19) - 毒蟾蜍 Lv.14\n 西萨纳兰 (x:15, y:7) - 痴笑巨蟾蜍 Lv.14\n 东拉诺西亚 (x:17, y:27) - 巨蟾蜍 Lv.33",
  "32": "西萨纳兰 (x:15, y:7) - 痴笑巨蟾蜍 Lv.24",
  "33": "流沙迷宫樵鸣洞 - 奇美拉 Lv.38\n 死化奇美拉讨伐战 - 死化奇美拉 Lv.50\n 北萨纳兰 - 狂暴巨兽——强化奇美拉 - 强化奇美拉 Lv.49",
  "34": "流沙迷宫樵鸣洞 - 奇美拉 Lv.38\n 死化奇美拉讨伐战 - 奇美拉 Lv.50\n 北萨纳兰 - 狂暴巨兽——强化奇美拉 - 强化奇美拉 Lv.49\n 假面狂欢21 - 阿皮狄马 Lv.50\n 假面狂欢25 - 阿波卡里普斯 Lv.50",
  "35": "无限城的死斗 - 恩奇都 Lv.50",
  "36": "南萨纳兰 (x:16, y:15) - 仙人刺舞蹈家 Lv.24\n 流沙迷宫樵鸣洞 - 仙人刺逃兵 Lv.24",
  "37": "逆转要害沙斯塔夏溶洞 - 克拉肯 Lv.50",
  "38": "武装圣域放浪神古神殿 - 折角骑士 寇黑加 Lv.50",
  "39": "完成 10 种假面狂欢关卡后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.1",
  "40": "逆转要害沙斯塔夏溶洞 - 真红龙虾 Lv.50\n 基拉巴尼亚山区 (x:26, y:8) - 峭壁巨钳虾 Lv.61",
  "41": "地下灵殿塔姆·塔拉墓园 - 主宰者 加尔梵斯 Lv.16\n 黑衣森林南部林区 [S] - 夺心魔 Lv.50",
  "42": "完成 20 种假面狂欢关卡后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.1",
  "43": "摩杜纳 (x:13, y:10) - 静水泥沼蝾螈 Lv.45\n 休养胜地布雷福洛克斯野营地 - 水栖蝾螈 Lv.32",
  "44": "迦楼罗歼殛战 - 迦楼罗 Lv.50",
  "45": "伊弗利特讨伐战 - 伊弗利特 Lv.20\n 伊弗利特歼灭战 - 伊弗利特 Lv.50\n 伊弗利特歼殛战 - 伊弗利特 Lv.50",
  "46": "泰坦歼灭战 - 泰坦 Lv.50\n 泰坦歼殛战 - 泰坦 Lv.50",
  "47": "拉姆歼灭战 - 拉姆 Lv.50\n 拉姆歼殛战 - 拉姆 Lv.50",
  "48": "希瓦歼殛战 - 希瓦 Lv.50",
  "49": "利维亚桑歼灭战 - 利维亚桑 Lv.50\n 利维亚桑歼殛战 - 利维亚桑 Lv.50",
  "50": "阿巴拉提亚云海 (x:35, y:10) - 狮鹫 Lv.59\n 冰雪废堡暮卫塔 - 狮身巨鹰 Lv.51",
  "51": "亚历山大机神城 启动之章3 - 有生命活水 Lv.60\n 零式亚历山大机神城 启动之章3 - 有生命活水 Lv.60\n 假面狂欢29 - 水之式神、水龙卷 Lv.60",
  "52": "库尔扎斯西部高地 (x:25, y:32) - 大脚板岩雪人 Lv.56",
  "53": "阿巴拉提亚云海 (x:26, y:33) - 雷牙 Lv.50",
  "54": "亚历山大机神城 启动之章1 - 浮士德 Lv.60\n 亚历山大机神城 启动之章2 - 浮士德 Lv.60",
  "55": "龙堡内陆低地  - 焚书任务：回收禁书《青眼怪物》 上级恶魔 Lv.58\n 学识宝库迦巴勒幻想图书馆 - 偷书者 Lv.59最终 BOSS 第三次踩塔（虚无召唤）失败后出现的小怪",
  "56": "阿巴拉提亚云海 (x:21, y:32) - 猴面雀 Lv.50",
  "57": "魔大陆阿济兹拉 (x:30, y:12) - 疫虫 Lv.59",
  "58": "莫古力贤王歼灭战 - 茸茸之愈 库普洛·奇普 Lv.50\n 莫古力贤王歼殛战 - 茸茸之愈 库普洛·奇普 Lv.50",
  "59": "龙堡内陆低地 [A] - 机工兵 斯利普金克斯 Lv.60\n 亚历山大机神城 天动之章2 - 亚历山大伏兵、亚历山大挥刀兵 Lv.60",
  "60": "秘本宝库迦巴勒幻想图书馆 - 阿班达 Lv.60\n 假面狂欢24 - 艾匹罗基 Lv.50",
  "61": "草木庭园圣茉夏娜植物园 - 鹰锋女王 Lv.60",
  "62": "龙堡内陆低地 (x:12, y:35) - 智蛙 Lv.59需要靠近才会使用",
  "63": "阿巴拉提亚云海 - 黑色怪鸟 - 安祖主母 Lv.47\n 阿巴拉提亚云海 (x:37, y:36) - 安祖 Lv.59\n 领航明灯天狼星灯塔 - 祖 Lv.50",
  "64": "阿巴拉提亚云海 (x:19, y:30) - 长颈驼 Lv.56",
  "65": "圣教中枢伊修加德教皇厅 - 白骑士 Lv.57",
  "66": "圣教中枢伊修加德教皇厅 - 黑骑士 Lv.57",
  "67": "学识宝库加巴勒幻想图书馆 - 64页 Lv.59",
  "68": "监牢铁臂巴埃萨长城 - 武装重甲 Lv.60",
  "69": "亚历山大机神城 启动之章4 - 操纵者 Lv.60\n 零式亚历山大机神城 启动之章4 - 操纵者 Lv.60",
  "70": "苏醒遗迹喀恩埋没圣堂 - 仙人刺守卫 Lv.50",
  "71": "学习 50 个技能后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.1",
  "72": "完成 30 个假面狂欢关卡后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.1",
  "73": "腐坏遗迹无限城市街古迹 - 瓦魔蛾 Lv.50\n 阿巴拉提亚云海 (x:10, y:17) - 阿巴拉提亚瓦魔蛾 Lv.57",
  "74": "翻云雾海 (x:25, y:28) - 云上双足飞龙 Lv.56\n 邪龙王座龙巢神殿 - 雷雅克魔龙 Lv.55",
  "75": "腐坏遗迹无限城市街古迹 - 腐坏贪吃鬼 Lv.50\n 巴哈姆特大迷宫 邂逅之章1 - 神杖巨蛇 Lv.50",
  "76": "假面狂欢24 - 斗场抄写员 Lv.50\n 秘本宝库迦巴勒幻想图书馆 - 自走人偶抄写员 Lv.60",
  "77": "地脉灵灯天狼星灯塔 - 被腐化连线后产生的小怪 Lv.60",
  "78": "罗波那歼灭战 - 罗波那 Lv.53\n 罗波那歼殛战 - 罗波那 Lv.60",
  "79": "索菲娅歼灭战 - 索菲娅 Lv.60\n 索菲娅歼殛战 - 索菲娅 Lv.60",
  "80": "亚历山大机神城 律动之章4 - 残暴正义号 Lv.60\n 零式亚历山大机神城 律动之章4 - 残暴正义号 Lv.60",
  "81": "延夏 (x:28, y:8) - 惠比寿鲶鱼精 Lv.67\n 延夏 [B] - 闪雷击 鱼雷 Lv.70",
  "82": "延夏 (x:28, y:8) - 惠比寿鲶鱼精 Lv.67\n 延夏 [B] - 闪雷击 鱼雷 Lv.70",
  "83": "恶党孤城黄金阁 - 道顺丸 Lv.70",
  "84": "死亡大地终末焦土 - 雾龙 Lv.70",
  "85": "吉祥天女歼灭战 - 吉祥天女 Lv.67\n 吉祥天女歼殛战 - 吉祥天女 Lv.70",
  "86": "欧米茄时空狭缝 西格玛幻境1 - 魔列车 Lv.70\n 欧米茄零式时空狭缝 西格玛幻境1 - 魔列车 Lv.70",
  "87": "污染庭园圣茉夏娜植物园 - 枯腐泥妖 Lv.70\n 伊尔美格 [A] - 泥人 Lv.80",
  "88": "达到 70 级后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.70",
  "89": "红玉火山狱之盖 - 玄武 Lv.70",
  "90": "修行古刹星导寺 - 双豹伊沃恩 Lv.70",
  "91": "修行古刹星导寺 - 凶豹所闻，凶豹所忆 Lv.70\n 拉诺西亚高地 (x:9, y:21.5) - 高阶长须豹 Lv.24",
  "92": "基拉巴尼亚山区 (x:11, y:26) - 恐甲蚂蜓 Lv.68\n 基拉巴尼亚山区 [B] - 蛇仆蚂蜓 Lv.70",
  "93": "欧米茄时空狭缝 德尔塔幻境1 - 老者 Lv.70\n 欧米茄零式时空狭缝 德尔塔幻境1 - 老者 Lv.70",
  "94": "欧米茄时空狭缝 阿尔法幻境3 - 欧米茄 Lv.70\n 欧米茄零式时空狭缝 阿尔法幻境3 - 欧米茄 Lv.70",
  "95": "学习 100 个技能后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.70",
  "96": "基拉巴尼亚湖区 (x:22, y:22) - 陀鲁婆 Lv.69\n 基拉巴尼亚湖区 [A] - 泛光晶体 Lv.70",
  "97": "沉没神殿斯卡拉遗迹 - 凯尔派 Lv.70",
  "98": "风水灵庙岩燕庙 - 赛太岁 Lv.70",
  "99": "失落之都拉巴纳斯塔 - ? Lv.70\n 龙堡参天高地 (x:34.7, y:28.8) - 追猎种陆行鸟 Lv.53",
  "100": "学习 100 个技能后可从[乌尔达哈来生回廊]的[异男子嘎希迦]处获得[天青图腾] Lv.70",
  "101":
    "欧米茄时空狭缝 阿尔法幻境3 - 欧米茄 Lv.70\n 欧米茄零式时空狭缝 阿尔法幻境3 - 欧米茄 Lv.70",
  "102": "风水灵庙岩燕庙 - 齐天大圣 Lv.70",
  "103": "朱雀镇魂战 - 朱雀 Lv.70\n 朱雀诗魂战 - 朱雀 Lv.70",
  "104": "月读歼灭战 - 月读 Lv.70\n 月读幽夜歼灭战 - 月读 Lv.70",
  "105": "珂露西亚岛(X:34,Y:30)  大哥布林",
  "106": "避暑离宫马利卡大井  1号BOSS",
  "107": "安穆·艾兰(X:17,Y:29)  长尾犰狳",
  "108":
    "安穆·艾兰(X:32,Y:9)  湿滑犰狳/slippery armadillo/スリッパリー・アルマジロ\n提示：新出的体型大的那个",
  "109": "青魔法师80级达成 图腾兑换",
  "110": "暗影决战诺弗兰特 3号BOSS",
  "111": "魔术工房玛托雅工作室 1号BOSS",
  "112": "魔法宫殿宇宙宫 1号BOSS",
  "113": "红宝石神兵破坏作战 p1",
  "114": "缇坦妮雅歼灭战",
  "115": "伊甸希望乐园 觉醒之章1",
  "116": "伪造天界格鲁格火山  3号BOSS",
  "117": "青魔法习得120种 图腾兑换",
  "118": "无瑕灵君歼灭战",
  "119": "伊甸希望乐园 再生之章4",
  "120": "水妖幻园多恩美格禁园 1号BOSS",
  "121": "魔法宫殿宇宙宫 3号BOSS",
  "122": "魔术工房玛托雅工作室 2号BOSS",
  "123": "末日暗影亚马乌罗提 3号BOSS",
  "124": "缇坦妮雅歼灭战",
};

// 从 JSON 加载自动生成的数据，合并手动维护的 learnMap
import aozActionsData from "@/assets/data/aozActions.json";
interface AozActionJson {
  ID: number;
  ActionID: number;
  Name: string;
  Number: number;
  Stats: string;
  Cast100ms: number;
  Description: string;
  AozDescription: string;
  Icon: number;
  Recast100ms: number;
}
const aozActions: AozAction[] = (aozActionsData as AozActionJson[])
  .map((item) => ({
    ID: item.ID,
    ActionID: item.ActionID,
    Name: item.Name,
    Number: item.Number,
    Stats: item.Stats,
    Cast100ms: item.Cast100ms,
    Description: item.Description,
    AozDescription: item.AozDescription,
    Icon: `//cafemaker.wakingsands.com/i/${completeIcon(item.Icon)}_hr1.png`,
    Recast100ms: item.Recast100ms,
    Learn: learnMap[item.Number.toString()] ?? "",
  }))
  .sort((a, b) => a.Number - b.Number);

const aozActionRef = ref(aozActions);

for (const i of aozActionRef.value) {
  i.Stats = i.Stats.replaceAll(
    "<hex:024804F201F803><hex:024904F201F903>",
    '<span style="color:#00cc22;">',
  )
    .replaceAll("<hex:0249020103><hex:0248020103>", "</span>")
    .replaceAll("<hex:02100103>", "\n");
  i.Description = i.Description.replaceAll(
    "<hex:024804F201F803><hex:024904F201F903>",
    '<span style="color:#00cc22;">',
  )
    .replaceAll("<hex:0249020103><hex:0248020103>", "</span>")
    .replaceAll("<hex:02100103>", "\n")
    .replaceAll("<hex:024804F201F403><hex:024904F201F503>", '<span style="color:#ff7b1a;">');
  i.AozDescription = i.AozDescription.replaceAll("<hex:02100103>", "\n");
}

const showAozAction = computed(() => {
  if (searchStr.value.trim().length === 0) {
    return aozActionRef.value.filter((v) => {
      return notLearnedOnly.value ? !learned.value[v.Number.toString()] : true;
    });
  }
  const res = aozActionRef.value.filter((v) => {
    const reg = new RegExp(searchStr.value);
    return (
      (notLearnedOnly.value ? !learned.value[v.Number.toString()] : true) &&
      (reg.test(v.Name) ||
        reg.test(v.Number.toString()) ||
        reg.test(v.Description) ||
        reg.test(v.Stats) ||
        reg.test(v.AozDescription) ||
        reg.test(v.Learn))
    );
  });
  return res;
});

function highlight(str: string): string {
  const key = searchStr.value.trim();
  if (key) {
    const reg = new RegExp(key, "g");
    return str.replace(reg, (key) => `<em>${key}</em>`);
  }
  return str;
}

function handleError(e: Event, index: number): void {
  const imageElement = e.target as HTMLImageElement;
  if (/xivapi.com/.test(imageElement.src)) return;
  const item = aozActionRef.value.find((v) => v.Number === index);
  if (!item) return;
  item.Icon = item.Icon.replace("cafemaker.wakingsands.com", "xivapi.com");
}

function handleActionClick(_e: Event, index: number): void {
  tempIcon.value = "";
  selectIndex.value = index - 1;
  nextTick(() => {
    tempIcon.value = undefined;
  });
}

function handlePageSelect(_e: Event, i: number): void {
  page.value = i;
}

const batchReg = /^(?:\d+(?:[~-]\d+)?,)*\d+(?:[~-]\d+)?$/;

function handleBatchLearning(): void {
  ElMessageBox.prompt('输入字符串 例如 "1~104"、"1,3,21,24"', "Tip", {
    confirmButtonText: "确认",
    cancelButtonText: "取消",
    inputPattern: batchReg,
    inputErrorMessage: "格式错误",
  })
    .then((res) => {
      const { value } = res as MessageBoxInputData;
      for (const n of value.split(",")) {
        if (/^\d+[-~]\d+$/.test(n)) {
          const [min, max] = n.split(/[-~]/).map(Number);
          for (let i = min!; i <= max!; i++) learned.value[i.toString()] = true;
        } else {
          learned.value[n] = true;
        }
      }
    })
    .catch(() => {
      ElMessage({
        type: "info",
        message: "Input canceled",
      });
    });
}
</script>

<template>
  <div class="app">
    <div class="blubook-wrapper">
      <el-input v-model="searchStr" placeholder="搜索技能名称或序号或描述" class="search" />
      <div class="pageSelection">
        <div
          v-for="i in Math.ceil(showAozAction.length / 16)"
          :key="i"
          :class="page === i ? 'selected' : ''"
          @click="handlePageSelect($event, i)"
        >
          {{ i }}
        </div>
      </div>
      <el-checkbox v-model="editingMode" label="编辑模式" class="toggleEdingMode" color="white" />
      <el-checkbox
        v-model="grayNotLearned"
        label="没学会的灰度显示"
        class="toggleGrayNotLearned"
        color="white"
      />
      <el-checkbox
        v-model="notLearnedOnly"
        label="只显示没学会的"
        class="toggleNotLearnedOnly"
        color="white"
      />
      <el-button type="primary" class="batchLearning" size="small" @click="handleBatchLearning">
        批量学习
      </el-button>
      <div class="blubook">
        <div v-for="(item, index) in showAozAction" :key="item.ID" class="actionGrid">
          <el-tooltip
            class="box-item"
            effect="dark"
            :content="item.Name"
            placement="top"
            :offset="0"
            :hide-after="0"
            :show-arrow="false"
            :enterable="false"
          >
            <div
              v-show="(page - 1) * 16 <= index && page * 16 > index"
              class="grid-item"
              @click="handleActionClick($event, item.Number)"
            >
              <img
                :class="`IconHD ${!learned[item.Number] && grayNotLearned ? 'notLearned' : 'learned'}`"
                draggable="false"
                :src="(page - 1) * 16 <= index && page * 16 > index ? `${item.Icon}` : undefined"
                @error="handleError($event, item.Number)"
              />
              <div v-show="!editingMode" class="Number">
                {{ item.Number }}
              </div>
              <el-checkbox
                v-show="editingMode"
                v-model="learned[item.Number]"
                :label="item.Number"
                size="small"
                class="learnedSwitch"
                color="white"
                fill="#f00"
              />
            </div>
            <span style="display: none" />
          </el-tooltip>
        </div>
        <div class="actionDetails">
          <div class="Number">
            {{ aozActionRef[selectIndex]!.Number }}
          </div>
          <div class="Name" v-html="highlight(aozActionRef[selectIndex]!.Name)" />
          <img
            class="IconHD"
            :src="`${tempIcon ?? aozActionRef[selectIndex]!.Icon}`"
            draggable="false"
            @error="handleError($event, aozActionRef[selectIndex]!.Number)"
          />
          <div class="Stats" v-html="highlight(aozActionRef[selectIndex]!.Stats)" />
          <div class="Cast100ms">
            <span style="color: #00c2c2">咏唱时间：</span
            >{{ aozActionRef[selectIndex]!.Cast100ms / 10 }}
          </div>
          <div class="Recast100ms">
            <span style="color: #00c2c2">复唱时间：</span
            >{{ aozActionRef[selectIndex]!.Recast100ms / 10 }}
          </div>
          <div
            class="Description"
            :style="{
              height: `${(aozActionRef[selectIndex]!.AozDescription.length === 0 ? 64 : 0) + 96}px`,
            }"
            v-html="highlight(aozActionRef[selectIndex]!.Description)"
          />
          <div
            class="AozDescription"
            :style="{
              height: `${aozActionRef[selectIndex]!.AozDescription.length > 0 ? 64 : 0}px`,
            }"
            v-html="highlight(aozActionRef[selectIndex]!.AozDescription)"
          />
          <div class="Learn" v-html="highlight(aozActionRef[selectIndex]!.Learn)" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "sass:math";

:deep(em) {
  font-style: normal;
  background-color: rgb(255, 150, 0);
}

.app {
  font-family:
    Microsoft YaHei,
    sans-serif;
  display: flex;
  justify-content: center;
  .blubook-wrapper {
    position: relative;
    width: 1280px;
    .search {
      position: absolute;
      width: 20em;
      left: 278px;
      top: 88px;
      z-index: 10;
    }
    .pageSelection {
      user-select: none;
      position: absolute;
      left: 150px;
      top: 130px;
      z-index: 10;
      color: rgb(193, 193, 193);
      font-size: 20px;
      font-weight: bold;
      cursor: pointer;
      div:hover {
        background-color: gray;
      }
      div {
        display: inline-block;
        padding: 0px 10px;
        margin: 0 2px;
        border: 1px solid rgba(0, 0, 0, 0.33);
        &.selected {
          $color: rgba(yellow, 0.75);
          border: 1px solid $color;
        }
      }
    }
    .toggleEdingMode {
      position: absolute;
      left: 175px;
      top: 620px;
      z-index: 10;
    }
    .toggleGrayNotLearned {
      position: absolute;
      left: 280px;
      top: 620px;
      z-index: 10;
    }
    .toggleNotLearnedOnly {
      position: absolute;
      left: 435px;
      top: 620px;
      z-index: 10;
    }
    .batchLearning {
      position: absolute;
      left: 82px;
      top: 693px;
      z-index: 10;
    }
    .blubook {
      height: 720px;
      width: 1280px;
      background-image: url("@/assets/blubook.webp");
      background-repeat: no-repeat;
      position: relative;
      .actionGrid {
        user-select: none;
        position: absolute;
        @for $i from 1 through 200 {
          &:nth-child(#{$i}) {
            $j: ($i - 1) % 16 + 1;
            top: calc(156px + (96px) * #{math.floor(calc(($j - 1) / 4))});
            left: calc(174px + (108px) * #{($j - 1) % 4});
          }
        }
        .grid-item {
          cursor: pointer;
          height: 96px;
          width: 108px;
          transform: translateX(-22px) translateY(-9px);
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          .notLearned {
            filter: grayscale(1) brightness(0.5);
          }
          .learnedSwitch {
            font-size: 12px;
          }
          &:hover {
            background-color: rgba(gray, 0.5);
          }
          .IconHD {
            position: absolute;
            left: 22px;
            top: 9px;
            border-radius: 12.5%;
            height: 63px;
          }
          &::after {
            content: "";
            background: url(@/assets/frame.png) no-repeat;
            background-size: cover;
            width: 74px;
            height: 74px;
            position: absolute;
            top: 5px;
            left: 16px;
            z-index: 2;
          }
          .Number {
            color: lightyellow;
          }
        }
      }
      .actionDetails {
        position: absolute;
        left: 650px;
        top: 50px;
        color: lightyellow;
        font-size: 16px;
        .Number {
          position: absolute;
          left: 18px;
          top: 18px;
          opacity: 1;
          width: 3em;
          text-align: center;
          user-select: none;
        }
        .Name {
          position: absolute;
          left: 95px;
          top: 18px;
          opacity: 1;
          width: 25em;
        }
        .IconHD {
          user-select: none;
          position: absolute;
          left: 8px;
          top: 52px;
          width: 121px;
        }
        .Stats {
          position: absolute;
          left: 150px;
          top: 60px;
          width: 18em;
          white-space: pre-line;
        }
        .Cast100ms {
          position: absolute;
          left: 150px;
          top: 150px;
          width: 18em;
        }
        .Recast100ms {
          position: absolute;
          left: 280px;
          top: 150px;
          width: 18em;
        }
        .Description {
          font-size: 12px;
          overflow: auto;
          position: absolute;
          left: 15px;
          top: 200px;
          white-space: pre-line;
          width: 430px;
        }
        .AozDescription {
          font-size: 12px;
          color: gray;
          overflow: auto;
          position: absolute;
          left: 15px;
          top: 302px;
          white-space: pre-line;
          width: 430px;
        }
        .Description,
        .AozDescription,
        .Learn {
          &::-webkit-scrollbar {
            width: 8px;
          }
          &::-webkit-scrollbar-thumb {
            border-radius: 4px;
            background-color: #aaa;
          }
          &:-webkit-scrollbar-track {
            border-radius: 4px;
            background-color: #e7e7e7;
            border: 1px solid #cacaca;
          }
        }
        .Learn {
          font-size: 14px;
          position: absolute;
          top: 420px;
          left: 15px;
          height: 190px;
          width: 430px;
          white-space: pre-line;
          line-height: 1.75em;
          overflow: auto;
        }
      }
    }
  }
}
</style>
