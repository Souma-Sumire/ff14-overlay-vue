(function() {
	const t = [
		"Dev",
		"Ravana",
		"Bismarck",
		"Asura",
		"Belias",
		"Chaos",
		"Hecatoncheir",
		"Moomba",
		"Pandaemonium",
		"Shinryu",
		"Unicorn",
		"Yojimbo",
		"Zeromus",
		"Twintania",
		"Brynhildr",
		"Famfrit",
		"Lich",
		"Mateus",
		"Shemhazai",
		"Omega",
		"Jenova",
		"Zalera",
		"Zodiark",
		"Alexander",
		"Anima",
		"Carbuncle",
		"Fenrir",
		"Hades",
		"Ixion",
		"Kujata",
		"Typhon",
		"Ultima",
		"Valefor",
		"Exodus",
		"Faerie",
		"Lamia",
		"Phoenix",
		"Siren",
		"Garuda",
		"Ifrit",
		"Ramuh",
		"Titan",
		"Diabolos",
		"Gilgamesh",
		"Leviathan",
		"Midgardsormr",
		"Odin",
		"Shiva",
		"Atomos",
		"Bahamut",
		"Chocobo",
		"Moogle",
		"Tonberry",
		"Adamantoise",
		"Coeurl",
		"Malboro",
		"Tiamat",
		"Ultros",
		"Behemoth",
		"Cactuar",
		"Cerberus",
		"Goblin",
		"Mandragora",
		"Louisoix",
		"Spriggan",
		"Sephirot",
		"Sophia",
		"Zurvan",
		"Aegis",
		"Balmung",
		"Durandal",
		"Excalibur",
		"Gungnir",
		"Hyperion",
		"Masamune",
		"Ragnarok",
		"Ridill",
		"Sargatanas",
		"陆行鸟s-bella",
		"陆行鸟",
		"s-contents",
		"chs-contents",
		"s-contents2",
		"陆行鸟s-guttata",
		"莫古力",
		"chs-contents2",
		"鲶鱼精",
		"chs-contents3",
		"猫小胖s-poliogenys",
		"猫小胖s-haematina",
		"s-contents3",
		"s-contents4",
		"s-public1",
		"s-public2",
		"s-public3",
		"s-public4",
		"s-public5",
		"s-public6",
		"s-public7",
		"s-public8",
		"s-macropus",
		"s-contents7",
		"s-latrans",
		"s-contents8",
		"莫古力s-cucullatus",
		"豆豆柴s-bicolor",
		"s-contents5",
		"s-contents6",
		"豆豆柴",
		"chs-contents4",
		"Nacontents01",
		"Nacontents02",
		"Nacontents03",
		"Nacontents04",
		"Nacontents05",
		"Nacontents06",
		"Nacontents07",
		"Nacontents08",
		"Nacontents09",
		"Nacontents10",
		"Nacontents11",
		"Nacontents12",
		"Nacontents13",
		"Nacontents14",
		"Nacontents15",
		"Nacontents16",
		"Nacontents17",
		"Nacontents18",
		"Nacontents19",
		"Nacontents20",
		"Nacontents21",
		"Nacontents22",
		"Nacontents23",
		"Nacontents24",
		"Jpcontents01",
		"Jpcontents02",
		"Jpcontents03",
		"Jpcontents04",
		"Jpcontents05",
		"Jpcontents06",
		"Jpcontents07",
		"Jpcontents08",
		"Jpcontents09",
		"Jpcontents10",
		"Jpcontents11",
		"Jpcontents12",
		"Jpcontents13",
		"Jpcontents14",
		"Jpcontents15",
		"Jpcontents16",
		"Jpcontents17",
		"Jpcontents18",
		"Jpcontents19",
		"Jpcontents20",
		"Jpcontents21",
		"Jpcontents22",
		"Jpcontents23",
		"Jpcontents24",
		"Jpcontents25",
		"Jpcontents26",
		"Jpcontents27",
		"Jpcontents28",
		"Jpcontents29",
		"Jpcontents30",
		"Nacontents25",
		"Nacontents26",
		"Nacontents27",
		"Nacontents28",
		"Nacontents29",
		"Nacontents30",
		"Nacontents31",
		"Nacontents32",
		"Nacontents33",
		"Nacontents34",
		"Jpcontents31",
		"Jpcontents32",
		"Jpcontents33",
		"Jpcontents34",
		"Jpcontents35",
		"Jpcontents36",
		"Nacontents36",
		"Nacontents37",
		"Nacontents38",
		"Nacontents39",
		"Nacontents40",
		"Nacontents41",
		"Nacontents42",
		"Nacontents43",
		"Nacontents44",
		"Nacontents45",
		"Occontents01",
		"Occontents02",
		"Occontents03",
		"Occontents04",
		"Occontents05",
		"Eucontents01",
		"Eucontents02",
		"Eucontents03",
		"Eucontents04",
		"Eucontents05",
		"Eucontents06",
		"Eucontents07",
		"Eucontents08",
		"Eucontents11",
		"Eucontents12",
		"Eucontents13",
		"Eucontents14",
		"Eucontents15",
		"Eucontents16",
		"Eucontents17",
		"Eucontents18",
		"Eucontents21",
		"Eucontents22",
		"Eucontents23",
		"Eucontents24",
		"Eucontents25",
		"Eucontents26",
		"Eucontents27",
		"Eucontents28",
		"Sagittarius",
		"Phantom",
		"Alpha",
		"Raiden",
		"Marilith",
		"Seraph",
		"Halicarnassus",
		"Maduin",
		"Cuchulainn",
		"Kraken",
		"Rafflesia",
		"Golem",
		"Titania",
		"Innocence",
		"Pixie",
		"Tycoon",
		"Wyvern",
		"Lakshmi",
		"Eden",
		"Syldra",
		"test1",
		"test2",
		"地平关",
		"迷雾湿地",
		"拉诺西亚",
		"紫水栈桥",
		"幻影群岛",
		"摩杜纳",
		"魔兽领域",
		"封魔洞",
		"太阳海岸",
		"小麦酒港",
		"银泪湖",
		"盛夏滩",
		"葡萄酒港",
		"黑衣森林",
		"青磷泉",
		"金锤台地",
		"红茶川",
		"伊修加德",
		"雪松原",
		"妖精领",
		"萌芽池",
		"执掌峡谷",
		"密约之塔",
		"莫拉比湾",
		"月牙湾",
		"摇篮树",
		"樵鸣洞",
		"尼姆河",
		"黄金谷",
		"百灵啼",
		"天狼星灯塔",
		"灼热走廊",
		"私语巨木",
		"月影岛",
		"水晶塔",
		"梦想宫",
		"白金幻象",
		"黑金湖",
		"龙息瀑布",
		"石卫塔",
		"铜铃铜山",
		"神意之地",
		"狮鹫大桥",
		"永恒川",
		"海雾沙滩",
		"和风流地",
		"泽梅尔要塞",
		"巨石丘",
		"剑斗领域",
		"黑尘驿站",
		"睡莲岩",
		"领航明灯",
		"海词石窟",
		"翡翠湖",
		"雄心广场",
		"库尔札斯",
		"流沙迷宫",
		"芳香堂",
		"花蜜栈桥",
		"蓝雾涌泉",
		"神灵圣域",
		"白云崖",
		"海将水渠",
		"元灵幼树",
		"沙钟旅亭",
		"姐妹丘",
		"静语庄园",
		"足迹谷",
		"珊瑚塔",
		"横断崖",
		"水上庭院",
		"无限回廊",
		"金锭池",
		"旅人栈桥",
		"龙纹岩",
		"海鳗桥廊",
		"源泉之梯",
		"秘石塔",
		"日升门",
		"西风岬",
		"审理之门",
		"拂晓之间",
		"海狼洞",
		"橡树原",
		"魔女咖啡馆",
		"巨龙首营地",
		"低语河谷",
		"芙蓉圆桌",
		"神握角",
		"黄金广场",
		"弯枝牧场",
		"桤木泉",
		"镜池栈桥",
		"白鸥塔",
		"消逝王都",
		"跨天桥",
		"圣人泪",
		"剑峰",
		"后桅塔",
		"白银集市",
		"来生回廊",
		"暴风陆门",
		"幽灵湖",
		"石绿湖",
		"黄昏湾",
		"小阿拉米格",
		"放浪神礼堂",
		"荆棘森",
		"狼烟丘",
		"圣人旅道",
		"不悔战泉",
		"九藤",
		"荣耀溪",
		"境树",
		"狱门蚁穴",
		"遗忘绿洲",
		"炎帝陵",
		"歌咏裂谷",
		"流沙屋",
		"八剑士前庭",
		"巴哈姆特",
		"诸神黄昏",
		"王者之剑",
		"神圣裁判所",
		"冰天宫",
		"龙巢神殿",
		"红玉海",
		"クガネ",
		"延夏",
		"潮风亭",
		"神拳痕",
		"白银乡",
		"宇宙和音",
		"沃仙曦染",
		"晨曦王座",
		"梦羽宝境",
		"海猫茶屋",
		"柔风海湾",
		"琥珀原",
		"珊瑚塔\xA0",
		"亚马乌罗提",
		"萨雷安",
		"加雷马",
		"contentstest1",
		"contentstest2",
		"sdocontents1",
		"sdocontents2",
		"sdocontents3",
		"sdocontents4",
		"sdocontents5",
		"sdocontents6",
		"sdocontents7",
		"sdocontents8",
		"sdocontents9",
		"sdocontents10",
		"sdocontents11",
		"sdocontents12",
		"sdocontents13",
		"sdocontents14",
		"sdocontents15",
		"sdocontents16",
		"sdocontents17",
		"sdocontents18",
		"sdocontents19",
		"sdocontents20",
		"sdocontents21",
		"sdocontents22",
		"sdocontents23",
		"sdocontents24",
		"sdocontents25",
		"sdocontents26",
		"sdocontents27",
		"sdocontents28",
		"sdocontents29",
		"sdocontents30",
		"sdocontents31",
		"sdocontents32",
		"sdocontents33",
		"sdocontents34",
		"sdocontents35",
		"sdocontents36",
		"sdocontents37",
		"sdocontents38",
		"sdocontents39",
		"sdocontents40",
		"sdocontents41",
		"sdocontents42",
		"sdocontents43",
		"sdocontents44",
		"sdocontents45",
		"sdocontents46",
		"sdocontents47",
		"sdocontents48",
		"sdocontents49",
		"sdocontents50",
		"sdocontents51",
		"sdocontents52",
		"sdocontents53",
		"sdocontents54",
		"sdocontents55",
		"sdocontents56",
		"sdocontents57",
		"sdocontents58",
		"sdocontents59",
		"sdocontents60",
		"sdocontents61",
		"sdocontents62",
		"sdocontents63",
		"sdocontents64",
		"sdocontents65",
		"sdocontents66",
		"sdocontents67",
		"sdocontents68",
		"sdocontents69",
		"sdocontents70",
		"sdocontents71",
		"sdocontents72",
		"sdocontents73",
		"sdocontents74",
		"sdocontents75",
		"sdocontents76",
		"sdocontents77",
		"sdocontents78",
		"sdocontents79",
		"sdocontents80",
		"sdocontents81",
		"sdocontents82",
		"sdocontents83",
		"sdocontents84",
		"sdocontents85",
		"sdocontents86",
		"sdocontents87",
		"sdocontents88",
		"sdocontents89",
		"sdocontents90",
		"sdocontents91",
		"sdocontents92",
		"sdocontents93",
		"sdocontents94",
		"sdocontents95",
		"sdocontents96",
		"sdocontents97",
		"sdocontents98",
		"sdocontents99",
		"sdocontents100",
		"sdocontents101",
		"sdocontents102",
		"sdocontents103",
		"sdocontents104",
		"sdocontents105",
		"sdocontents106",
		"sdocontents107",
		"sdocontents108",
		"sdocontents109",
		"sdocontents110",
		"sdocontents111",
		"sdocontents112",
		"sdocontents113",
		"sdocontents114",
		"sdocontents115",
		"sdocontents116",
		"sdocontents117",
		"sdocontents118",
		"sdocontents119",
		"sdocontents120",
		"바하무트",
		"이프리트",
		"가루다",
		"라무",
		"오딘",
		"알테마",
		"만드라고라",
		"旧톤베리",
		"엑스칼리버",
		"피닉스",
		"알렉산더",
		"타이탄",
		"리바이어선",
		"시바",
		"베히모스",
		"길가메시",
		"사보텐더",
		"유니콘",
		"라그나로크",
		"라미아",
		"KrNewPublic1",
		"KrNewPublic2",
		"KrNewPublic3",
		"KrNewPublic4",
		"KrNewPublic5",
		"카벙클",
		"초코보",
		"모그리",
		"톤베리",
		"캐트시",
		"펜리르",
		"오메가",
		"krcontents1",
		"krcontents2",
		"krcontents3",
		"krcontents4",
		"krcontents5",
		"krcontents6",
		"krcontents7",
		"krcontents8",
		"krcontents9",
		"krcontents10",
		"krcontents11",
		"krcontents12",
		"krcontents13",
		"krcontents14",
		"krcontents15",
		"krcontents16",
		"krcontents17",
		"krcontents18",
		"krcontents19",
		"krcontents20",
		"krcontents21",
		"krcontents22",
		"Cloudtest01",
		"Cloudtest02",
		"Clcontents01",
		"Clcontents02",
		"Clcontents03"
	], n = /[\uE000-\uF8FF]/g, e = /^["「『]|["」』]$/g;
	function s(t, n, e) {
		t.size >= 1e4 && t.clear(), t.set(n, e);
	}
	const o = /* @__PURE__ */ new Map();
	function c(t) {
		const c = o.get(t);
		if (void 0 !== c) return c;
		const a = t.replace(n, "").replace(e, "").trim();
		return s(o, t, a), a;
	}
	const a = /* @__PURE__ */ new Map(), r = (() => {
		const n = /* @__PURE__ */ new Map();
		for (const e of t) {
			const t = e.charAt(e.length - 1), s = n.get(t);
			s ? s.push(e) : n.set(t, [e]);
		}
		return n;
	})();
	function i(t) {
		const e = a.get(t);
		if (void 0 !== e) return e;
		let o = t.replace(n, "");
		const c = r.get(o.charAt(o.length - 1));
		if (c) {
			for (const n of c) if (o.length > n.length && o.endsWith(n)) {
				o = o.slice(0, -n.length);
				break;
			}
		}
		const i = o.trim();
		return s(a, t, i), i;
	}
	let d = function(t) {
		return t.WeaponBox = "武器箱", t.RandomWeapon = "随武", t.HeadBox = "头部装备箱", t.BodyBox = "身体装备箱", t.HandsBox = "手臂装备箱", t.LegsBox = "腿部装备箱", t.FeetBox = "脚部装备箱", t.EarringBox = "耳部装备箱", t.NecklaceBox = "颈部装备箱", t.BraceletBox = "腕部装备箱", t.RingBox = "指环装备箱", t.Twine = "硬化药", t.Coating = "强化纤维", t.Tome = "神典石", t.Solvent = "强化药", t.Mount = "跳跳车T1启动钥匙", t.Minion = "摇摆绿光", t;
	}({});
	Object.values(d);
	let l = function(t) {
		return t.EarringBox = "耳部装备箱", t.NecklaceBox = "颈部装备箱", t.BraceletBox = "腕部装备箱", t.RingBox = "指环装备箱", t.HeadBox = "头部装备箱", t.HandsBox = "手臂装备箱", t.FeetBox = "脚部装备箱", t.Tome = "神典石", t.Twine = "硬化药", t.BodyBox = "身体装备箱", t.LegsBox = "腿部装备箱", t.Solvent = "强化药", t.Coating = "强化纤维", t.WeaponBox = "武器箱", t.RandomWeapon = "随武", t.Mount = "跳跳车T1启动钥匙", t.Minion = "摇摆绿光", t;
	}({});
	Object.values(l);
	const u = { "zh-CN": {
		obtainPattern: /^([^|，。]+?)获得了“(.*?)”(?:[×x*](\d+))?/,
		assignPattern: /^(.+?)分配给了(.+?)[。.]?$/,
		rollPattern: /^([^|，。]+?)在(需求|贪婪)条件下对“?(.*?)”掷出了(\d+)点/,
		rollNeedLabel: "需求"
	} };
	function p(t) {
		return t.trim().toUpperCase();
	}
	function f(t, n) {
		if (n < 0) return "";
		let e = -1;
		for (let c = 0; c < n; c++) if (e = t.indexOf("|", e + 1), -1 === e) return "";
		const s = e + 1, o = t.indexOf("|", s);
		return -1 === o ? t.slice(s) : t.slice(s, o);
	}
	function g(t, n, e, s, o, a, r, d) {
		const l = t.indexOf("|");
		if (-1 === l) return;
		const u = t.slice(0, l);
		if ("11" === u) return void function(t, n, e, s) {
			const o = t.split("|");
			if (o.length < 4 || "11" !== o[0]) return;
			const c = Number.parseInt(o[2] || "", 10);
			if (!Number.isFinite(c) || c <= 0) return;
			const a = Math.min(24, c);
			for (let r = 0; r < a; r++) {
				const t = o[3 + r];
				if (!t) continue;
				const c = p(t);
				if (!c) continue;
				n.add(c);
				const a = e.get(c);
				a && s.add(a);
			}
		}(t, o, a, s);
		if ("03" === u) return void function(t, n, e, s) {
			const o = f(t, 2), c = f(t, 3);
			if (!o || !c) return;
			const a = p(o), r = i(c);
			a && r && (a.startsWith("10") && e.set(a, r), n.has(a) && s.add(r));
		}(t, o, a, s);
		if ("00" !== u) return;
		const g = function(t) {
			const n = [
				-1,
				-1,
				-1,
				-1
			];
			let e = -1;
			for (let u = 0; u < n.length; u++) {
				if (e = t.indexOf("|", e + 1), -1 === e) return null;
				n[u] = e;
			}
			const [s, o, c, a] = n, r = t.indexOf("|", a + 1), i = t.slice(s + 1, o), d = t.slice(o + 1, c), l = -1 === r ? t.slice(a + 1) : t.slice(a + 1, r);
			return i && d && l ? {
				timestampStr: i,
				code: d,
				message: l
			} : null;
		}(t);
		if (!g) return;
		const { timestampStr: m, code: h, message: N } = g;
		if (function(t) {
			return "083E" === t || "103E" === t || "203E" === t;
		}(h)) {
			let t = "", o = "", a = 1, l = !1;
			const u = N.match(d.obtainPattern);
			if (u) t = i(u[1]), o = c(u[2]), a = u[3] ? Number.parseInt(u[3], 10) : 1;
			else {
				const n = N.match(d.assignPattern);
				if (!n) return;
				o = c(n[1]), t = i(n[2]), l = !0;
			}
			e.add(o), s.add(t);
			const p = n.get(o);
			p && n.delete(o);
			const f = p ? [...p] : [], g = new Date(m);
			if (a > 1) {
				for (let n = 0; n < a; n++) r.push({
					key: `${m}-${t}-${o}-${n}`,
					timestamp: new Date(g),
					player: t,
					item: o,
					rolls: 0 === n ? f : [],
					isAssign: l
				});
				return;
			}
			r.push({
				key: `${m}-${t}-${o}`,
				timestamp: g,
				player: t,
				item: o,
				rolls: f,
				isAssign: l
			});
			return;
		}
		if (function(t) {
			return "1041" === t || "2041" === t || "0841" === t || "0041" === t || "0840" === t || "0044" === t;
		}(h)) {
			const t = N.match(d.rollPattern);
			if (t) {
				const e = i(t[1]), o = c(t[3]), a = Number.parseInt(t[4], 10), r = t[2] === d.rollNeedLabel ? "need" : "greed";
				n.has(o) || n.set(o, []);
				const l = n.get(o);
				l.some((t) => t.player === e) || (s.add(e), l.push({
					player: e,
					type: r,
					value: a
				}));
			}
		}
	}
	const m = new TextDecoder("utf-8"), h = new Uint8Array(0), N = /* @__PURE__ */ new Map();
	function y(t) {
		return {
			tempRolls: /* @__PURE__ */ new Map(),
			newRecords: [],
			players: /* @__PURE__ */ new Set(),
			items: /* @__PURE__ */ new Set(),
			partyIds: /* @__PURE__ */ new Set(),
			combatantNameById: /* @__PURE__ */ new Map(),
			pendingBytes: h,
			localeConfig: u[t]
		};
	}
	function b(t) {
		return {
			records: t.newRecords,
			players: Array.from(t.players),
			items: Array.from(t.items)
		};
	}
	function B(t, n, e) {
		let s = t;
		n.pendingBytes.length > 0 && (s = new Uint8Array(n.pendingBytes.length + t.length), s.set(n.pendingBytes, 0), s.set(t, n.pendingBytes.length), n.pendingBytes = h);
		let o = 0;
		for (let c = 0; c < s.length; c++) {
			if (10 !== s[c]) continue;
			let t = c;
			if (t > o && 13 === s[t - 1] && t--, t > o) {
				const e = m.decode(s.subarray(o, t));
				e && g(e, n.tempRolls, n.items, n.players, n.partyIds, n.combatantNameById, n.newRecords, n.localeConfig);
			}
			o = c + 1;
		}
		if (!(o >= s.length)) {
			if (e) {
				let t = s.length;
				if (t > o && 13 === s[t - 1] && t--, t > o) {
					const e = m.decode(s.subarray(o, t));
					e && g(e, n.tempRolls, n.items, n.players, n.partyIds, n.combatantNameById, n.newRecords, n.localeConfig);
				}
				n.pendingBytes = h;
				return;
			}
			n.pendingBytes = s.slice(o);
		}
	}
	globalThis.onmessage = (t) => {
		const n = t.data;
		if ("object" == typeof n && n && "type" in n) {
			if ("stream-start" === n.type) {
				const t = n.locale || "zh-CN";
				N.set(n.sessionId, y(t)), globalThis.postMessage({ ok: !0 });
				return;
			}
			if ("stream-chunk" === n.type) {
				const t = N.get(n.sessionId);
				if (!t) throw new Error(`Unknown parser stream session: ${n.sessionId}`);
				B(new Uint8Array(n.buffer), t, !1), globalThis.postMessage({ ok: !0 });
				return;
			}
			if ("stream-end" === n.type) {
				const t = N.get(n.sessionId);
				if (!t) throw new Error(`Unknown parser stream session: ${n.sessionId}`);
				B(h, t, !0), N.delete(n.sessionId), globalThis.postMessage(b(t));
				return;
			}
		}
		const e = y("string" == typeof n ? "zh-CN" : n.locale || "zh-CN");
		"string" == typeof n || n.text ? function(t, n) {
			for (let e = 0; e < t.length;) {
				let s = t.indexOf("\n", e);
				-1 === s && (s = t.length);
				let o = t.slice(e, s);
				o.endsWith("\r") && (o = o.slice(0, -1)), e = s + 1, o && g(o, n.tempRolls, n.items, n.players, n.partyIds, n.combatantNameById, n.newRecords, n.localeConfig);
			}
		}("string" == typeof n ? n : n.text, e) : n.buffer && B(new Uint8Array(n.buffer), e, !0), globalThis.postMessage(b(e));
	};
})();
