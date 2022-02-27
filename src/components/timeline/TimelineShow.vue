<template>
  <ul v-if="lines.length" class="loadedTimelines" :style="(showStyle as any)">
    <li
      v-for="(item, index) in lines"
      :key="index"
      v-show="item.show && item.time - runtime > 0 - config.hold && item.time - runtime <= config.displayDuration"
      :class="item.time - runtime <= config.discoloration ? 'upcoming' : ''"
    >
      <!-- 底部的进度条 -->
      <aside :style="{ right: Math.max((item.time - runtime) / config.displayDuration, 0) * 100 + '%' }"></aside>
      <!-- 时间轴模板解析后的内容 -->
      <section>
        <span v-html="item.action"></span><span>{{ (item.time - runtime).toFixed(1) }} </span>
      </section>
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { ITimelineLine, TimelineConfigValues, ShowStyle } from "../../types/Timeline";
defineProps<{ config: TimelineConfigValues; lines: ITimelineLine[]; runtime: number; showStyle: ShowStyle }>();
</script>

<style lang="scss" scoped>
$normalScale: 0.5;
$upComingScale: 0.75;
$fontSize: 16;
$trasDuration: 1;
$opacity: 0.5;
$timelineWitdh: 250;
.loadedTimelines {
  width: calc(1px * var(--timeline-width, $timelineWitdh));
  list-style-type: none;
  color: white;
  text-shadow: -1px 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, 0 -1px 2px #000;
  font-family: "Microsoft Yahei UI";
  margin: 0em;
  padding: 0em 0.5em;
  li {
    overflow: hidden;
    background-color: rgb(20, 22, 25);
    margin-bottom: 1px;
    border: 1px solid #000;
    position: relative;
    opacity: var(--opacity, $opacity);
    transition-duration: 1s;
    height: calc(48px * var(--normal-scale, $normalScale));
    .fade {
      animation: myfade 1s 1 forwards;
    }
    @keyframes myfade {
      0% {
        opacity: 1;
        height: 100%;
      }
      50% {
        opacity: 0;
        height: 48px;
      }
      100% {
        opacity: 0;
        height: 0px;
      }
    }
    &.upcoming {
      opacity: 1;
      font-size: calc(var(--font-size, $fontSize) * var(--up-coming-scale, $upComingScale) * 1px);
      font-weight: bold;
      transition-property: all;
      transition-duration: calc(var(--trs-duration, $trasDuration) * 1s);
      transition-timing-function: ease;
      height: calc(48px * var(--up-coming-scale, $upComingScale)) !important;
      aside {
        background-color: rgb(255, 136, 136);
      }
      span :deep(.skill_icon) {
        transition-property: all;
        transition-duration: calc(var(--trs-duration, $trasDuration) * 1s);
        transition-timing-function: ease;
        width: calc(46px * var(--up-coming-scale, $upComingScale)) !important;
        height: calc(48px * var(--up-coming-scale, $upComingScale)) !important;
        img {
          transition-property: all;
          transition-duration: calc(var(--trs-duration, $trasDuration) * 1s);
          transition-timing-function: ease;
          width: calc(40px * var(--up-coming-scale, $upComingScale)) !important;
          height: calc(40px * var(--up-coming-scale, $upComingScale)) !important;
          top: calc(4px * var(--up-coming-scale, $upComingScale)) !important;
          left: calc(4px * var(--up-coming-scale, $upComingScale)) !important;
        }
        &::after {
          transition-property: all;
          transition-duration: calc(var(--trs-duration, $trasDuration) * 1s);
          transition-timing-function: ease;
          width: calc(48px * var(--up-coming-scale, $upComingScale)) !important;
          height: calc(48px * var(--up-coming-scale, $upComingScale)) !important;
        }
      }
    }
    aside {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #88f;
    }
    section {
      position: relative;
      padding: 0 0.25em;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: calc(var(--font-size, $fontSize) * 1px);
      height: 100%;
      span {
        display: flex;
        align-items: center;
      }
      span :deep(.skill_icon) {
        position: relative;
        top: 0px;
        left: calc(-4px * var(--normal-scale, $normalScale));
        width: calc(46px * var(--normal-scale, $normalScale));
        height: calc(48px * var(--normal-scale, $normalScale));
        img {
          display: inline-block;
          position: absolute;
          width: calc(40px * var(--normal-scale, $normalScale));
          height: calc(40px * var(--normal-scale, $normalScale));
          top: calc(4px * var(--normal-scale, $normalScale));
          left: calc(4px * var(--normal-scale, $normalScale));
          z-index: 1;
        }
        &::after {
          content: "";
          background: url(../../assets/frame.png) no-repeat;
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
