<template>
  <div id="warpper" :style="stageStyle">
    <header>
      <svg xmlns="http://www.w3.org/2000/svg" class="icon clock" width="60" height="70" viewBox="0 0 60 70" fill="none">
        <path
          d="M53.5685 11.7169L58.2818 16.4303L53.4385 21.2738C58.2244 27.2645 60.5349 34.8603 59.8954 42.5013C59.256 50.1423 55.7152 57.2485 50.0001 62.3603C44.2851 67.4722 36.8297 70.2018 29.1652 69.9884C21.5006 69.775 14.2086 66.6349 8.7868 61.213C3.36502 55.7911 0.224998 48.499 0.0116294 40.8342C-0.201739 33.1695 2.52774 25.7139 7.63949 19.9988C12.7512 14.2836 19.8572 10.7427 27.4981 10.1033C35.1389 9.46381 42.7346 11.7743 48.7252 16.5603L53.5685 11.7169ZM38.9319 61.5579C44.2831 59.341 48.6184 55.2129 51.0947 49.9765C53.5711 44.7402 54.0113 38.77 52.3298 33.2271C50.6483 27.6841 46.9654 22.9648 41.9972 19.9868C37.0291 17.0089 31.1309 15.9854 25.4499 17.1152C19.7689 18.2451 14.7113 21.4476 11.2606 26.0999C7.80989 30.7522 6.2129 36.5217 6.7802 42.2862C7.34751 48.0507 10.0386 53.3982 14.33 57.2885C18.6213 61.1788 24.2063 63.3339 29.9985 63.3346C33.063 63.3346 36.0974 62.7308 38.9285 61.5579H38.9319ZM33.3319 23.3338V43.3342H26.6652V23.3338H33.3319ZM43.3318 0V6.6668H16.6652V0H43.3318Z"
          fill="url(#paint0_linear_2392_974)"
        />
        <path
          d="M53.5685 11.7169L58.2818 16.4303L53.4385 21.2738C58.2244 27.2645 60.5349 34.8603 59.8954 42.5013C59.256 50.1423 55.7152 57.2485 50.0001 62.3603C44.2851 67.4722 36.8297 70.2018 29.1652 69.9884C21.5006 69.775 14.2086 66.6349 8.7868 61.213C3.36502 55.7911 0.224998 48.499 0.0116294 40.8342C-0.201739 33.1695 2.52774 25.7139 7.63949 19.9988C12.7512 14.2836 19.8572 10.7427 27.4981 10.1033C35.1389 9.46381 42.7346 11.7743 48.7252 16.5603L53.5685 11.7169ZM38.9319 61.5579C44.2831 59.341 48.6184 55.2129 51.0947 49.9765C53.5711 44.7402 54.0113 38.77 52.3298 33.2271C50.6483 27.6841 46.9654 22.9648 41.9972 19.9868C37.0291 17.0089 31.1309 15.9854 25.4499 17.1152C19.7689 18.2451 14.7113 21.4476 11.2606 26.0999C7.80989 30.7522 6.2129 36.5217 6.7802 42.2862C7.34751 48.0507 10.0386 53.3982 14.33 57.2885C18.6213 61.1788 24.2063 63.3339 29.9985 63.3346C33.063 63.3346 36.0974 62.7308 38.9285 61.5579H38.9319ZM33.3319 23.3338V43.3342H26.6652V23.3338H33.3319ZM43.3318 0V6.6668H16.6652V0H43.3318Z"
          fill="white"
        />
        <defs>
          <linearGradient id="paint0_linear_2392_974" x1="0" y1="0" x2="62.1639" y2="69.6625" gradientUnits="userSpaceOnUse">
            <stop stop-color="white" />
            <stop offset="0.884426" stop-color="white" stop-opacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <aside>
        <span>COMBAT</span>
        <span>TIMELINE</span>
      </aside>
      <article>{{ momentFilter }}</article>
    </header>
    <main id="main" :style="{ overflowY: enablescrollBar ? 'auto' : 'hidden' }">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="35"
        viewBox="0 0 38 22"
        fill="none"
        class="icon position"
        :style="{ top: iconPosTop - mainTranslateY + 'px', opacity: combatDuration }"
      >
        <path
          d="M16.7974 20.3694C15.1176 21.4034 13.1389 22 11.0205 22C4.93406 22 -7.46378e-07 17.0751 -4.80825e-07 11C-2.15273e-07 4.92487 4.93406 -1.44536e-06 11.0205 -1.17931e-06C12.8556 -1.0991e-06 14.586 0.447694 16.1079 1.23963L37.9014 11.0859L37.7156 11.0908L38 11.0872L16.7974 20.3694ZM4.00746 11C4.00746 14.866 7.14732 18 11.0205 18C14.8937 18 18.0336 14.866 18.0336 11C18.0336 7.13401 14.8937 4 11.0205 4C7.14732 4 4.00747 7.13401 4.00746 11Z"
          fill="white"
        />
      </svg>
      <ul :style="{ transform: `translateY(${-mainTranslateY}px)` }">
        <li
          v-for="(item, index) in programme.list"
          :key="index"
          :style="Object.assign(stageSplit(item.text), { height: programme.style.lineHeight + 'px' })"
          :class="[stageRegexp.test(item.text) ? 'stage' : 'normal', item.className]"
        >
          {{ item.text }}
          <span v-show="item.timeSeconds && item.timeSeconds > 0 && item.timeFormat" class="auxiliary">{{ item.timeFormat }}</span>
        </li>
      </ul>
      <span :style="{ width: decorativeLineHeight + 'px', top: `${programme.style.lineHeight + 25 * 1.5 - 5 - mainTranslateY}px` }">
        {{ "-".repeat(299) }}</span
      >
    </main>
  </div>
  <aside id="settings" v-show="showSettings">
    <p><button @click="test()">10倍速测试</button></p>
    <p>
      正文模板
      <button @click="clearData()">恢复默认正文</button>
    </p>
    <textarea cols="80" rows="20" v-model="programme.inputRaw"></textarea>

    <p>总缩放<input type="number" v-model="programme.style.scale" step="0.1" min="0.5" /></p>
    <p>每行高<input type="number" v-model="programme.style.lineHeight" step="1" min="20" /></p>
    <p>允许用户滚动<input type="checkbox" v-model="enablescrollBar" />（该选项不会保存）</p>
    <p>
      自定义CSS
      <button @click="clearStyle()">恢复默认CSS</button>
    </p>
    <textarea cols="80" rows="30" v-model="programme.style.customCSS"></textarea>
  </aside>
</template>

<script lang="ts" setup>
import moment from "moment";

type Programme = {
  text: string;
  timeSeconds?: number;
  timeFormat?: string;
  className?: string;
};

const programme = reactive({
  list: [] as Programme[],
  inputRaw: "",
  style: {} as { scale: number; lineHeight: number; customCSS: string },
});

const iconPosTop = ref(0);
const inACTCombat = ref(false);
const combatDuration = ref(0);
let showSettings = ref(true);
const mainTranslateY = ref(0);
let combatDurationTimer: NodeJS.Timer;
let testTimer: NodeJS.Timer;
const stageStyle = computed(() => {
  return {
    transform: `scale(${programme.style.scale})`,
    "--stage-programme-height": programme.style.lineHeight,
  };
});
const enablescrollBar = ref(false);
const stageRegexp = /^(P\d|阶段)/;
const decorativeLineHeight = computed(() => {
  return programme.list.length * (programme.style.lineHeight - 1.5) - 5;
});
const momentFilter = computed(() => {
  const time = moment.duration(combatDuration.value, "seconds");
  return moment({ h: time.hours(), m: time.minutes(), s: time.seconds() }).format("mm:ss");
});

function init() {
  initValue();
  addOverlayListener("onInCombatChangedEvent", handleInCombatChanged);
  document.addEventListener("onOverlayStateUpdate", (e: any) => (showSettings.value = !e.detail.isLocked));
  startOverlayEvents();
}
function loadData() {
  const _ = localStorage.getItem("programmeData");
  const _2 = localStorage.getItem("programmeStyle");
  if (_) {
    programme.inputRaw = JSON.parse(_);
  } else {
    programme.inputRaw = `0 阶段 - 1
00:11.4 "深度污浊" class="AoE"
00:21.6 "双重冲击" class="TankBurster"
00:34.4 "污水泛滥" class="AoE"
阶段 - 2
00:54.4 "吐息飞瀑"
01:10.4 "连贯攻击" class="Shared"
01:33.8 "深度污浊" class="AoE"
01:42.5 "灵水弹" class="Shared"
01:48.3 "震荡波"
02:10.9 "多重刻印" class="Shared"
02:24.3 "展翅飞瀑"
02:47.0 "沟流充溢" class="AoE"
阶段 - 3
03:17.1 "双重冲击" class="TankBurster"
03:27.3 "深度污浊" class="AoE"
03:44.1 "污水泛滥" class="AoE"
03:58.7 "震荡波"
阶段 - 4
04:11.1 "海怪战车" class="AoE"
04:37.0 "双重冲击" class="TankBurster"
04:46.3 "深度污浊" class="AoE"
04:59.9 "沟流溢出" class="AoE"
05:09.1 "污染洪水" class="AoE"
05:24.5 "污染洪水" class="AoE"
05:37.4 "吐息飞瀑"
阶段 - 5
06:00.7 "多重刻印" class="Shared"
06:07.0 "分离"
06:20.9 "展翅飞瀑"
06:38.6 "分离"
06:50.8 "污水喷发"
06:58.2 "污染洪水" class="AoE"
07:05.8 "连贯攻击" class="Shared"
07:28.3 "双重冲击" class="TankBurster"
07:36.5 "深度污浊" class="AoE"
07:54.1 "污水泛滥" class="AoE"
阶段 - 6
08:10.7 "沟流溢出" class="AoE"
08:21.2 "连贯攻击" class="Shared"
08:54.6 "分离"
09:06.9 "污水喷发（狂暴）" class="Enrage"
`;
  }
  if (_2) {
    const _2JSON = JSON.parse(_2);
    if (_2JSON.scale < 0.5) _2JSON.scale = 1;
    programme.style = Object.assign(programme.style, _2JSON);
  } else {
    programme.style = {
      scale: 1,
      lineHeight: 40,
      customCSS: `/* 如果设置未生效就加上!important强制最高优先级 */
header {
  width: 360px !important; /* 宽 */
  height: 100px !important; /* 高 */
  border-radius: 8px !important; /* 圆角 */
 } /* 头部 */
header > .clock {  margin-left: 9px !important; } /* 头部左侧时钟svg图标 */
header > aside { /* 两行字 */
    font-size: 36px !important; /* 字体尺寸 */
    margin-left: 7px !important; /* 左基准偏移 */
    span{ /* 每行字 */
      height: 32px !important; /* 高度 */
    }
}
header > article {
  right: 7px !important; /* 右基准偏移 */
  bottom: 0px !important; /* 下基准偏移 */
  font-size: 64px !important; /* 字体尺寸 */
  height: 74px !important; /* 高度 */
  width: 111px !important; /* 宽度 */
  text-align: left !important; /* 文字左对齐 */
} /* 头部右侧计时文字 */
#main { /* 主体 */
  width: 360px !important;  /* 宽度 */
}
#main > ul { /* 整个无序列表 */
  li{ } /* 内部list */
 }
#main > ul .stage { /* 主体的阶段行正文 */
  font-size:18px !important; 
  background-color: rgba(0,0,0,0) !important;
  } 
#main > ul .normal { /* 主体的非阶段行左侧正文 */
  font-size:22px  !important;
  } 
#main > ul .auxiliary { /* 主体的非阶段行右侧时间 */
  font-size:18px  !important; 
  text-shadow:none !important; /* 不应用class的颜色 */
  color:white !important; /* 不应用class的颜色 */
  } 
#main .position{ } /* 主体的左侧箭头svg图标 */
#main > span { /* 主体的左侧装饰线段 */
  left:40px !important; /* 左基准偏移 */
  font-size: 20px !important; /* 字体大小/*
  letter-spacing: 12.625px !important; /* 字符间距 */
  }
:root{
  --color-aoe:rgb(112,48,159); /* 声明aoe颜色变量 */
  --color-tank-burster:rgb(255,75,75); /* 声明死刑颜色变量 */
  --color-shared:rgb(0,112,192); /* 声明分摊颜色变量 */
  --color-enrage:crimson; /* 声明狂暴颜色变量 */
}
.AoE{ /* 对应正文模板字符串内的class AoE */
  /* text-shadow: -1px 0 2px var(--color-aoe), 0 1px 2px var(--color-aoe), 1px 0 2px var(--color-aoe), 0 -1px 2px var(--color-aoe); */
}
.TankBurster{ /* 死刑 */
  /* text-shadow: -1px 0 2px var(--color-tank-burster), 0 1px 2px var(--color-tank-burster), 1px 0 2px var(--color-tank-burster), 0 -1px 2px var(--color-tank-burster); */
}
.Shared{ /* 分摊 */
   /* text-shadow: -1px 0 2px var(--color-shared), 0 1px 2px var(--color-shared), 1px 0 2px var(--color-shared), 0 -1px 2px var(--color-shared); */
}
.Enrage{ /* 狂暴 */
  /* color: var(--color-enrage); */
}
`,
    };
  }
}
init();
loadData();

watchEffect(() => {
  let result: Programme[] = [];
  [...programme.inputRaw.matchAll(/^([ \t　]*(?<time>[:：\d.]+) +)?"?(?<action>.+?)"?(?: *class="(?<className>[^"]+)")?$/gm)].forEach(
    (v) => {
      let t: any = v.groups?.time;
      if (t?.includes(":")) {
        let decimal = 0;
        if (t?.includes(".")) {
          decimal = Number(t.substr(t.lastIndexOf(".") + 1) / 10);
          t = t.substring(0, t.lastIndexOf("."));
        }
        t = moment.duration(t).as("seconds") / 60 + decimal;
      } else {
        t = t ? Number(t) : null;
      }
      const time = moment.duration(t, "seconds");
      const timeFormat = moment({ h: time.hours(), m: time.minutes(), s: time.seconds() }).format("mm:ss");
      result.push({
        text: v.groups!.action,
        timeSeconds: t?.toFixed(1) ?? null,
        timeFormat: timeFormat,
        className: v?.groups?.className ?? "",
      });
    }
  );
  programme.list = result;
  localStorage.setItem("programmeData", JSON.stringify(programme.inputRaw));
  localStorage.setItem("programmeStyle", JSON.stringify(programme.style));
  {
    document.querySelector("#styleHTML")?.remove();
    const styleHTML = document.createElement("style");
    styleHTML.setAttribute("type", `text/css`);
    styleHTML.id = "styleHTML";
    styleHTML.innerHTML = programme.style.customCSS;
    document.body.append(styleHTML);
  }
});
function stageSplit(str: string) {
  if (stageRegexp.test(str)) return { fontSize: "18px", justifyContent: "center" };
  return {};
}

function handleInCombatChanged(ev: {
  type: "onInCombatChangedEvent";
  detail: {
    inGameCombat: boolean;
    inACTCombat: boolean;
  };
}) {
  if (!inACTCombat.value && ev.detail.inACTCombat)
    combatDurationTimer = setInterval(() => {
      oneSecond();
    }, 1000);
  if (inACTCombat.value && !ev.detail.inACTCombat) {
    clearInterval(combatDurationTimer);
    initValue();
  }
  inACTCombat.value = ev.detail.inACTCombat;
}

function test() {
  initValue();
  testTimer = setInterval(() => {
    oneSecond();
  }, 100);
}

function initValue() {
  clearInterval(testTimer);
  inACTCombat.value = false;
  combatDuration.value = 0;
  mainTranslateY.value = 0;
  iconPosTop.value = programme.style.lineHeight;
}

function oneSecond() {
  combatDuration.value++;
  for (let i = 0; i < programme.list.length; i++) {
    if (parseInt(programme.list[i].timeSeconds?.toString() ?? "-1") === combatDuration.value) {
      iconPosTop.value = programme.style.lineHeight * (i + 1);
      if (i > 1 && stageRegexp.test(programme.list[i - 1].text)) {
        mainTranslateY.value = calculateOffset(programme.style.lineHeight * (i - 2.5));
      } else {
        //阶段过长时进行滚动
        if (mainTranslateY.value + 650 - programme.style.lineHeight * 2.5 < programme.style.lineHeight * (i + 1)) {
          mainTranslateY.value = calculateOffset(programme.style.lineHeight * (i - 2.5));
        }
      }
      break;
    }
  }

  function calculateOffset(distance: number) {
    const max = document.querySelector<HTMLUListElement>("#main>ul")!.scrollHeight - 650 + programme.style.lineHeight * 1.5;
    if (distance >= max) distance = max;
    return distance;
  }
}

function clearData() {
  const a = confirm("确定恢复模板字符串为默认设置吗？");
  if (a) {
    localStorage.removeItem("programmeData");
    loadData();
  }
}

function clearStyle() {
  const a = confirm("确定恢复自定义CSS为默认设置吗？");
  if (a) {
    localStorage.removeItem("programmeStyle");
    loadData();
  }
}
</script>

<style lang="scss" scoped>
$color: rgba(
  $color: black,
  $alpha: 0.8,
);
@font-face {
  font-family: AccidentalPresidency;
  src: url(@/common/font/AccidentalPresidency.ttf);
}
@font-face {
  font-family: SourceHanSansCN;
  src: url(@/common/font/SourceHanSansCN-Bold.otf);
}
#warpper {
  float: left;
  position: fixed;
  transform-origin: left top;
  width: 360px;
  // font-family: "SmartisanHei";
  color: white;
  > header {
    font-family: "AccidentalPresidency";
    display: flex;
    align-items: center;
    background: $color;
    position: relative;
    width: 360px;
    height: 100px;
    border-radius: 8px;
    svg {
      margin-left: 9px;
    }
    aside {
      font-size: 36px;
      margin-left: 7px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: flex-start;
      span {
        height: 32px;
      }
    }
    article {
      position: absolute;
      right: 7px;
      bottom: 0px;
      font-size: 64px;
      height: 74px;
      width: 111px;
      // text-align: right;
      text-align: left;
    }
  }
  > main {
    width: 360px;
    font-family: SourceHanSansCN;
    font-size: 22px;
    overflow-x: hidden;
    // overflow-y: hidden;
    &::-webkit-scrollbar {
      display: none;
    }
    max-height: 651px;
    background: $color;
    border-radius: 8px;
    margin: 10px 0px;
    user-select: none;
    position: relative;
    // padding: 10px;
    .icon {
      margin-top: -12px;
      margin-left: 3px;
      float: left;
      position: absolute;
      transition-duration: 1s;
    }
    ul {
      margin: 15px 15px;
      padding-top: 0;
      padding-bottom: 0;
      padding-left: 30px;
      padding-right: 5px;
      // list-style: circle inside;
      transition: all 1s;
      li {
        // position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        span {
          // position: absolute;
          font-size: 20px;
          // right: 0px;
          // bottom: 0px;
          // font-family: AccidentalPresidency;
          // font-variant-numeric: tabular-nums lining-nums;
          // font-style: italic;
        }
      }
    }
    > span {
      position: absolute;
      left: 40px;
      // bottom: 10px;
      overflow: hidden;
      white-space: nowrap;
      font-size: 20px;
      letter-spacing: 12.625px;
      transform: rotate(90deg);
      transform-origin: top left;
      transition-duration: 1s;
    }
  }
}
#settings {
  // margin-top: 80px;
  float: right;
  color: black;
}
</style>
