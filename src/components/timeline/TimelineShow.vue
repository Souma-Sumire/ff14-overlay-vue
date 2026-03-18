<script lang="ts" setup>
import type { ITimelineLine, ShowStyle, TimelineConfigValues } from "@/types/timeline";
import { completeIcon } from "@/resources/logic/status";
import { parseAction } from "@/store/timeline";
import { chineseToIcon } from "@/utils/chineseToIcon";
import { getIconSrcByPath, handleImgError } from "@/utils/xivapi";

const props = defineProps<{
  config: TimelineConfigValues;
  lines: ITimelineLine[];
  runtime: number;
  showStyle: ShowStyle;
}>();

interface ActionFragment {
  type: "text" | "action";
  content: string;
  repeat?: boolean;
}

// 将 Timeline 文本解析为片段，避免使用 v-html
function parseToFragments(text: string): ActionFragment[] {
  const res = text.replaceAll(/^["'“”]|["'“”]$/g, "");
  const matches = [...parseAction(res)];
  const fragments: ActionFragment[] = [];

  let lastIndex = 0;
  for (const match of matches) {
    if (match.index! > lastIndex) {
      fragments.push({
        type: "text",
        content: res.slice(lastIndex, match.index!),
      });
    }
    fragments.push({
      type: "action",
      content: match.groups?.name || "",
      repeat: !!match.groups?.repeat,
    });
    lastIndex = match.index! + match[0].length;
  }

  if (lastIndex < res.length) {
    fragments.push({ type: "text", content: res.slice(lastIndex) });
  }

  return fragments;
}

function getSkillImage(name: string): string {
  const icon = `/i/${completeIcon(chineseToIcon(name) ?? 405)}.png`;
  return getIconSrcByPath(icon);
}
</script>

<template>
  <ul v-if="lines.length" class="loadedTimelines" :style="showStyle">
    <li
      v-for="(item, index) in props.lines"
      v-show="
        item.show &&
        item.time - runtime > 0 - config.hold - showStyle['--tras-duration'] &&
        item.time - runtime <= config.displayDuration
      "
      :key="index"
      :class="{
        upcoming: item.time - runtime <= config.discoloration,
        fade: item.time - runtime <= 0 - config.hold,
        passed: item.time - runtime <= 0,
      }"
    >
      <aside
        :style="{
          right: `${Math.max((item.time - runtime) / config.displayDuration, 0) * 100}%`,
        }"
      />
      <section>
        <span class="action-container">
          <template v-for="(fragment, fIdx) in parseToFragments(item.action ?? '')" :key="fIdx">
            <template v-if="fragment.type === 'action'">
              <div class="skill_icon">
                <img
                  :src="getSkillImage(fragment.content)"
                  loading="lazy"
                  @error="handleImgError"
                />
              </div>
              <span v-if="fragment.repeat">{{ fragment.content }}</span>
            </template>
            <span v-else>{{ fragment.content }}</span>
          </template>
        </span>
        <span class="countdown">{{ (item.time - runtime).toFixed(1) }} </span>
      </section>
    </li>
  </ul>
</template>

<style lang="scss">
::-webkit-scrollbar {
  display: none !important;
}
</style>

<style lang="scss" scoped>
* {
  overflow: hidden;
  box-sizing: border-box;
}
$timelineWitdh: 180;
$fontSize: 18;
$opacity: 0.33;
$normalScale: 0.5;
$upComingScale: 1;
$trasDuration: 1;
.countdown {
  text-align: right;
}
.loadedTimelines {
  zoom: var(--timeline-zoom, 1);
  width: calc(1px * var(--timeline-width, $timelineWitdh));
  list-style-type: none;
  color: white;
  text-shadow:
    -1px 0 1px #000,
    0 1px 1px #000,
    1px 0 1px #000,
    0 -1px 1px #000;
  font-family: "Microsoft Yahei UI";
  margin: 0em;
  padding: 0em 0.5em;
  li {
    overflow: hidden;
    background-color: rgb(20, 22, 25);
    margin-bottom: 1px;
    border: 1px solid #000;
    box-sizing: border-box;
    position: relative;
    opacity: var(--opacity, $opacity);
    transition-duration: calc(var(--tras-duration, $trasDuration) * 1s);
    height: calc(48px * var(--normal-scale, $normalScale));
    &.fade {
      animation: myfade calc(var(--tras-duration, $trasDuration) * 1s) 1 forwards !important;
      height: calc(48px * var(--up-coming-scale, $upComingScale));
    }
    @keyframes myfade {
      0% {
        opacity: 1;
        height: calc(48px * var(--up-coming-scale, $upComingScale));
      }
      50% {
        opacity: 0;
        height: calc(48px * var(--up-coming-scale, $upComingScale));
      }
      100% {
        height: 0px;
        opacity: 0;
      }
    }
    &.passed {
      // > aside {
      > * {
        animation: passed 0.34s 2 alternate;
      }
      // }
      @keyframes passed {
        0% {
          filter: drop-shadow(0px 0px 0px black);
        }
        100% {
          filter: drop-shadow(1px 2px 3px black);
        }
      }
    }
    &.upcoming {
      font-family: "SmartisanHei", "微软雅黑";
      opacity: 1;
      font-weight: bold;
      transition-property: all;
      transition-duration: calc(var(--tras-duration, $trasDuration) * 1s);
      transition-timing-function: ease;
      height: calc(48px * var(--up-coming-scale, $upComingScale));
      aside {
        background-color: rgb(255, 136, 136);
      }
      :deep(span) {
        font-size: calc(
          var(--font-size, $fontSize) * var(--up-coming-scale, $upComingScale) * 1px
        ) !important;
        &.countdown {
          padding-right: 0.2em;
        }
      }
      span :deep(.skill_icon) {
        transition-property: all;
        transition-duration: calc(var(--tras-duration, $trasDuration) * 1s);
        transition-timing-function: ease;
        width: calc(48px * var(--up-coming-scale, $upComingScale));
        height: calc(48px * var(--up-coming-scale, $upComingScale));
        img {
          transition-property: all;
          transition-duration: calc(var(--tras-duration, $trasDuration) * 1s);
          transition-timing-function: ease;
          width: calc(40px * var(--up-coming-scale, $upComingScale));
          height: calc(40px * var(--up-coming-scale, $upComingScale));
          top: calc(4px * var(--up-coming-scale, $upComingScale));
          left: calc(4px * var(--up-coming-scale, $upComingScale));
        }
        &::after {
          transition-property: all;
          transition-duration: calc(var(--tras-duration, $trasDuration) * 1s);
          transition-timing-function: ease;
          width: calc(48px * var(--up-coming-scale, $upComingScale));
          height: calc(48px * var(--up-coming-scale, $upComingScale));
        }
      }
    }
    > aside {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #88f;
    }
    section {
      height: 100%;
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: calc(calc(var(--font-size, $fontSize) * 1px) * var(--normal-scale, $normalScale));
      // font-size: calc(calc(var(--font-size, $fontSize) * 1px));
      > span {
        display: flex;
        align-items: center;
        overflow: auto;
        padding: 0 1px;
        // &:first-of-type {
        //   flex: 1;
        // }
        > :deep(span) {
          // white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          flex: 1;
        }
      }
      > :deep(div) {
        width: calc(40px * var(--up-coming-scale, 1));
        height: calc(40px * var(--up-coming-scale, 1));
        top: calc(4px * var(--up-coming-scale, 1));
      }
      span :deep(.skill_icon) {
        position: relative;
        top: 0px;
        left: calc(-4px * var(--normal-scale, $normalScale));
        width: calc(48px * var(--normal-scale, $normalScale));
        height: calc(48px * var(--normal-scale, $normalScale));
        img {
          display: inline-block;
          position: absolute;
          width: calc(40px * var(--normal-scale, $normalScale));
          height: calc(40px * var(--normal-scale, $normalScale));
          top: calc(4px * var(--normal-scale, $normalScale));
          left: calc(4px * var(--normal-scale, $normalScale));
          z-index: 1;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: 0 0;
        }
        &::after {
          content: "";
          background: url(@/assets/frame.png) no-repeat;
          background-size: cover;
          width: calc(48px * var(--normal-scale, $normalScale));
          height: calc(48px * var(--normal-scale, $normalScale));
          display: inline-block;
          position: absolute;
          z-index: 2;
        }
      }
    }
  }
}
</style>
