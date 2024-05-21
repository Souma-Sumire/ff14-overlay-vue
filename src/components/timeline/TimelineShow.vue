<script lang="ts" setup>
import type {
  ITimelineLine,
  ShowStyle,
  TimelineConfigValues,
} from '@/types/timeline'
import { parseAction } from '@/store/timeline'
import { getActionByChineseName, getFullImgSrc } from '@/utils/xivapi'

const props = defineProps<{
  config: TimelineConfigValues
  lines: ITimelineLine[]
  runtime: number
  showStyle: ShowStyle
}>()

const PLACEHOLDER
  = 'data:image/png;base64,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'
const imageMap: Record<string, unknown> = reactive({})

// 在Vue组件内生成HTML是可以响应数据变化更新视图的
function renderHTML(text: string): string {
  let res = text.replaceAll(/^["'“”]|["'“”]$/g, '')
  const items = parseAction(res)
  if (!items)
    return res

  for (const item of items) {
    if (item.groups?.name) {
      const src = getSkillImage(item.groups?.name)
      res = res.replace(
        item[0],
        `${
          src
            ? `<div class="skill_icon"><img src="${src}" style="background-image: url('${PLACEHOLDER}')" loading="auto"/></div>`
            : ''
        }<span>${item.groups?.repeat ? item.groups?.name : ''}</span>`,
      )
    }
  }

  return res
}

/**
 * 图片展示顺序说明：
 * 1、初次展示兜底图
 * 2、下载图片期间展示背景图
 * 3、下载图片完成展示图片
 * 4、下载图片出错展示兜底图
 */
function getSkillImage(name: string): string {
  if (typeof imageMap[name] === 'string')
    return imageMap[name] as string

  if (typeof imageMap[name] === 'undefined') {
    // 仅请求一次，无论成功失败都不会再调用
    imageMap[name] = getActionByChineseName(name).then((res) => {
      if (res?.Icon) {
        getFullImgSrc(res.Icon).then((url) => {
          preloadImage(url)
            .then(() => {
              imageMap[name] = url
            })
            .catch(() => {
              imageMap[name] = PLACEHOLDER
            })
        })
      }
    })
  }

  return PLACEHOLDER
}

// 一种在JS里判断图片下载成功或失败的方法
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}
</script>

<template>
  <ul v-if="lines.length" class="loadedTimelines" :style="showStyle">
    <li
      v-for="(item, index) in props.lines"
      v-show="
        item.show
          && item.time - runtime > 0 - config.hold - showStyle['--tras-duration']
          && item.time - runtime <= config.displayDuration
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
          right:
            `${Math.max((item.time - runtime) / config.displayDuration, 0) * 100
            }%`,
        }"
      />
      <section>
        <span v-html="renderHTML(item.action)" /><span class="countdown">{{ (item.time - runtime).toFixed(1) }} </span>
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
  width: calc(1px * var(--timeline-width, $timelineWitdh));
  list-style-type: none;
  color: white;
  text-shadow: -1px 0 1px #000, 0 1px 1px #000, 1px 0 1px #000, 0 -1px 1px #000;
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
      animation: myfade calc(var(--tras-duration, $trasDuration) * 1s) 1
        forwards !important;
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
          var(--font-size, $fontSize) * var(--up-coming-scale, $upComingScale) *
            1px
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
      font-size: calc(
        calc(var(--font-size, $fontSize) * 1px) *
          var(--normal-scale, $normalScale)
      );
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
