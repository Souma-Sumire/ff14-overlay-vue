<script setup lang="ts">
import type { EventMap } from 'cactbot/types/event'
import { ElMessageBox } from 'element-plus'
import { addOverlayListener, callOverlayHandler } from '../../cactbot/resources/overlay_plugin_api'
import HuntData, { type HuntEntry } from '../../cactbot/resources/hunt'
import ZoneId from '../../cactbot/resources/zone_id'
import ActWS from '@/assets/actWS.webp'
import Map from '@/resources/map.json'
import { Vector2, getGameMapCoordinates, getPixelCoordinates } from '@/utils/mapCoordinates'
import zoneInfo from '@/resources/zoneInfo'

type DiscoveredMonsters = Array<{
  timestamp: number
  id: string
  name: string
  rank: string
  zoneId: number
  instance: number
  number: number
  text: string
  worldX: number
  worldY: number
  worldZ: number
  offsetX: number
  offsetY: number
  pixelX: number
  pixelY: number
  gameMapX: number
  gameMapY: number
}>
type FilterType = '1-3' | '4-6' | '1' | '2' | '3' | '4' | '5' | '6'

const inLocalHost = window.location.hostname === 'localhost'

const ZONE_LIST = [
  ZoneId.Urqopacha,
  ZoneId.Kozamauka,
  ZoneId.YakTel,
  ZoneId.Shaaloani,
  ZoneId.HeritageFound,
  ZoneId.LivingMemory,
]
localStorage.removeItem('souma-hunt-monsters')
localStorage.removeItem('souma-hunt-filter')
const Monsters = useStorage('souma-hunt-monsters-2', [] as DiscoveredMonsters)
const showNumber = useStorage('souma-hunt-show-number', true)

const FilterConfig = useStorage('souma-hunt-filter-2', {
  [ZoneId.Urqopacha]: '1-3',
  [ZoneId.Kozamauka]: '1-3',
  [ZoneId.YakTel]: '1-3',
  [ZoneId.Shaaloani]: '1-3',
  [ZoneId.HeritageFound]: '1-3',
  [ZoneId.LivingMemory]: '1-3',
} as Record<typeof ZONE_LIST[number], FilterType>)

const ZONE_FILTER = {
  [ZoneId.Urqopacha]: ['1-3', '4-6', '1', '2', '3', '4', '5', '6'],
  [ZoneId.Kozamauka]: ['1-3', '4-6', '1', '2', '3', '4', '5', '6'],
  [ZoneId.YakTel]: ['1-3', '1', '2', '3'],
  [ZoneId.Shaaloani]: ['1-3', '1', '2', '3'],
  [ZoneId.HeritageFound]: ['1-3', '1', '2', '3'],
  [ZoneId.LivingMemory]: ['1-3', '1', '2', '3'],
} as Record<typeof ZONE_LIST[number], FilterType[]>
const NameToHuntEntry: Record<string, HuntEntry> = {}

for (const hunt of Object.values(HuntData)) {
  const { id, rank } = hunt
  Object.entries(hunt.name).forEach(([_lang, name]) => {
    if (!name) {
      return
    }
    if (Array.isArray(name)) {
      name.forEach((n) => {
        NameToHuntEntry[n.toLowerCase()] = { id, rank, name: n }
      })
    }
    else {
      NameToHuntEntry[name.toLowerCase()] = { id, rank, name }
    }
  })
}

// 如果url标签里没有OVERLAY_WS，则自动为用户添加
if (!window.location.href.includes('OVERLAY_WS')) {
  window.location.href += `?OVERLAY_WS=ws://127.0.0.1:10501/ws`
}
async function checkWebSocket(): Promise<any> {
  const { promise, resolve } = Promise.withResolvers()
  const websocketConnected = await Promise.race<Promise<boolean>>([
    new Promise<boolean>((res) => {
      void callOverlayHandler({ call: 'cactbotRequestState' }).then(() => {
        ElMessageBox.close()
        res(true)
        resolve(true)
      })
    }),
    new Promise<boolean>((res) => {
      window.setTimeout(() => {
        res(false)
      }, 250)
    }),
  ])
  if (!websocketConnected) {
    ElMessageBox.alert(
        `请先启动ACT WS，再打开此页面<img src='${ActWS}' style='width:100%'>`,
        '未检测到ACT连接',
        {
          dangerouslyUseHTMLString: true,
          closeOnClickModal: false,
          showClose: false,
          closeOnPressEscape: false,
          closeOnHashChange: false,
          showCancelButton: false,
          showConfirmButton: false,
        },
    )
    const loop = setInterval(() => {
      void callOverlayHandler({ call: 'cactbotRequestState' }).then(() => {
        clearInterval(loop)
        ElMessageBox.close()
        resolve(true)
      })
    }, 1000)
  }
  return promise
}

const IMG_RAW_SIZE = 2048
const IMG_SHOW_SIZE = 596
const IMG_SCALE = IMG_SHOW_SIZE / IMG_RAW_SIZE
const PlayerZoneId = useStorage('souma-hunt-zone-id', ref(-1))
const PlayerInstance = ref(-1)
const SavedInstance = useStorage('souma-hunt-save-instance', PlayerInstance.value)

function calcDistance(x: number, y: number, x2: number, y2: number) {
  return Math.sqrt((x - x2) ** 2 + (y - y2) ** 2)
}

function getSoloText(monster: DiscoveredMonsters[number]): string {
  return `${monster.number}`
}

function getMultipleText(monsters: DiscoveredMonsters[number][]): string {
  return monsters.map(item => getSoloText(item)).join('/')
}

function mergeOverlapMonsters() {
  // 将Monters中同一张地图内坐标过近的怪物合并为一个
  Monsters.value.forEach(item => item.text = getSoloText(item))
  Monsters.value.forEach((item) => {
    const tooClose = Monsters.value.filter(item2 => item2.zoneId === item.zoneId && calcDistance(item.gameMapX, item.gameMapY, item2.gameMapX, item2.gameMapY) < 1)
    const tooCloseAndInFilter = tooClose.filter(item => isShow(item))
    if (tooCloseAndInFilter.length >= 2) {
      tooCloseAndInFilter[0].text = getMultipleText(tooCloseAndInFilter)
      tooCloseAndInFilter.forEach((item2, index2) => {
        if (index2 === 0) {
          return
        }
        item2.text = ''
      })
    }
    else {
      tooCloseAndInFilter.forEach((item2) => {
        item2.text = getSoloText(item2)
      })
    }
  })
}

function checkImmediatelyMonster() {
  const timestamp = new Date().getTime()
  const monsters = Monsters.value.filter(item => item.zoneId === PlayerZoneId.value && timestamp - item.timestamp < 5000)
  monsters.forEach((item) => {
    // eslint-disable-next-line no-console
    console.log(`触发了5秒规则`)
    item.instance = PlayerInstance.value
    // number等于 从1、2、3、4、5、6中寻找第一个不在 monsters 中存在的number
    let number = -1
    for (let i = 1; i <= 6; i++) {
      if (!monsters.some(item => item.number === i)) {
        number = i
        break
      }
    }
    if (number === -1) {
      console.error('找不到空闲的number')
      number = 0
      item.text = ''
      return
    }
    item.number = number
    item.text = number.toString()
  })
}

const handleChangeZone: EventMap['ChangeZone'] = (event) => {
  PlayerZoneId.value = event.zoneID
  checkImmediatelyMonster()
  PlayerInstance.value = 0
}
const INSTANCE_STRING = ''
const handleLogLine: EventMap['LogLine'] = (event) => {
  // 如果当前zoneId不在ZONE_LIST中，则不处理
  if (!ZONE_LIST.includes(PlayerZoneId.value as typeof ZONE_LIST[number])) {
    return
  }
  if (event.line[0] === '00' && event.line[2] === '0039') {
    const match = event.line[4].match(new RegExp(`(?:当前所在副本区为“|You are now in the instanced area |インスタンスエリア「)(?<zoneName>.+?)(?<zoneInstanced>[${INSTANCE_STRING}]).*`))
    if (match && match.groups && match.groups.zoneInstanced) {
      PlayerInstance.value = INSTANCE_STRING.indexOf(match.groups.zoneInstanced) + 1
      SavedInstance.value = PlayerInstance.value
      ElMessageBox.close()
      checkImmediatelyMonster()
    }
  }
  else if (event.line[0] === '03') {
    const name = event.line[3]
    const hunt = NameToHuntEntry[name]
    const rank = hunt?.rank
    if (hunt && rank === 'A') {
      const instance = PlayerInstance.value
      const timestamp = new Date().getTime()
      const id = event.line[2]
      const name = event.line[3]
      const worldX = Number(event.line[17])
      const worldY = Number(event.line[18])
      const worldZ = Number(event.line[19])
      const zone = zoneInfo[PlayerZoneId.value]
      const sizeFactor = zone.sizeFactor
      const offsetX = zone.offsetX
      const offsetY = zone.offsetY
      const worldXZCoordinates = new Vector2(Number(worldX), Number(worldY))
      const mapOffset = new Vector2(offsetX, offsetY)
      const pixelCoordinates = getPixelCoordinates(worldXZCoordinates, mapOffset, sizeFactor)
      const gameMapCoordinates = getGameMapCoordinates(pixelCoordinates, sizeFactor)
      const exist = Monsters.value.find(item => item.id === event.line[2] && item.zoneId === PlayerZoneId.value && item.instance === instance)
      if (exist) {
        // 已经添加过了，更新坐标，且不是合并的情况
        exist.timestamp = timestamp
        exist.worldX = worldX
        exist.worldY = worldY
        exist.worldZ = worldZ
        exist.pixelX = pixelCoordinates.x
        exist.pixelY = pixelCoordinates.y
        exist.gameMapX = gameMapCoordinates.x
        exist.gameMapY = gameMapCoordinates.y
      }
      else {
        // 新添加
        const monsters = Monsters.value.filter(item => item.zoneId === PlayerZoneId.value && item.instance === instance)
        // number等于 从1、2、3、4、5、6中寻找第一个不在 monsters 中存在的number
        let number = -1
        for (let i = 1; i <= 6; i++) {
          if (!monsters.some(item => item.number === i)) {
            number = i
            break
          }
        }
        if (number === -1) {
          console.error('找不到空闲的number')
          number = 0
        }
        Monsters.value.push({
          timestamp,
          id,
          name,
          rank,
          worldX,
          worldY,
          worldZ,
          zoneId: PlayerZoneId.value,
          instance,
          number,
          text: number.toString(),
          offsetX,
          offsetY,
          pixelX: pixelCoordinates.x,
          pixelY: pixelCoordinates.y,
          gameMapX: gameMapCoordinates.x,
          gameMapY: gameMapCoordinates.y,
        })
        mergeOverlapMonsters()
        // say('已发现')
      }
      // console.log(`find: ${name} in ${zoneId.value} ins${instance.value},(${worldX}, ${worldY}, ${worldZ}) (${pixelCoordinates.x}, ${pixelCoordinates.y}) (${gameMapCoordinates.x}, ${gameMapCoordinates.y})`)
    }
  }
  else if (event.line[0] === '25') {
    const id = event.line[2]
    Monsters.value = Monsters.value.filter(item => item.id !== id)
    mergeOverlapMonsters()
  }
}

function random(min: number, max: number) {
  return Math.random() * (max - min) + min
}

async function addTestMonster(zoneId: number, instance: number, randomRange: number) {
  PlayerInstance.value = instance
  PlayerZoneId.value = zoneId
  handleLogLine({
    type: 'LogLine',
    line: [
      '03',
      '2024-07-03T05:08:46.5450000+08:00',
      new Date().toISOString(),
      'クイーンホーク',
      '00',
      '64',
      '0000',
      '00',
      '',
      '13361',
      '17707',
      '32956266',
      '32956266',
      '10000',
      '10000',
      '',
      '',
      (323.26 + random(-randomRange, randomRange)).toFixed(2),
      (56.25 + random(-randomRange, randomRange)).toFixed(2),
      (58.79 + random(-randomRange, randomRange)).toFixed(2),
      '-3.03',
      '9b64e809cf609144',
    ],
    rawLine: '',
  })
  await sleep(0.5)
}

async function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, time * 1000)
  })
}

function test() {
  (async () => {
    Monsters.value = []
    await addTestMonster(ZoneId.Urqopacha, 1, 30)
    await addTestMonster(ZoneId.Urqopacha, 1, 30)
    await addTestMonster(ZoneId.Urqopacha, 2, 60)
    await addTestMonster(ZoneId.Urqopacha, 2, 60)
    await addTestMonster(ZoneId.Urqopacha, 3, 90)
    await addTestMonster(ZoneId.Urqopacha, 3, 90)
    await addTestMonster(ZoneId.Urqopacha, 4, 120)
    await addTestMonster(ZoneId.Urqopacha, 4, 120)
    await addTestMonster(ZoneId.Urqopacha, 5, 150)
    await addTestMonster(ZoneId.Urqopacha, 5, 150)
    await addTestMonster(ZoneId.Urqopacha, 6, 180)
    await addTestMonster(ZoneId.Urqopacha, 6, 180)
  })()
  // setTimeout(() => {
  //   handleLogLine({ type: 'LogLine', rawLine: '', line: ['25', '', monsterIds[2]] })
  // }, 500)
}

function clear() {
  // 二次确认
  ElMessageBox.confirm(
    '确定要清空已发现的怪物吗？',
    '确认清空',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
  ).then(() => {
    Monsters.value = []
  })
}

function getBackgroundColor(item: DiscoveredMonsters[number]): string {
  return `ins${item.instance}`
}

function getText(item: DiscoveredMonsters[number]): string {
  return showNumber.value ? item.text : ''
}

function getShowType(item: DiscoveredMonsters[number]): FilterType {
  return FilterConfig.value[item.zoneId as keyof typeof FilterConfig.value]
}

function isShow(item: DiscoveredMonsters[number]): boolean {
  const showType = getShowType(item)
  if (showType.includes('-')) {
    const filterInstance = showType.split('-').map(v => Number(v))
    const max = filterInstance[filterInstance.length - 1]
    const min = filterInstance[0]
    return item.instance >= min && item.instance <= max
  }
  return item.instance.toString() === showType
}

function handlePointClick(item: DiscoveredMonsters[number]): void {
  const sameInstance = Monsters.value.filter(item2 => item2.zoneId === item.zoneId && item2.instance === item.instance)
  const sameInstanceMaxNumber = Math.max(...sameInstance.map(item2 => item2.number))
  sameInstance.forEach((item2) => {
    if (item2.number === sameInstanceMaxNumber) {
      item2.number = 1
    }
    else {
      item2.number += 1
    }
  })
  // 更新文本
  mergeOverlapMonsters()
}

onMounted(async () => {
  await checkWebSocket()
  addOverlayListener('LogLine', handleLogLine)
  addOverlayListener('ChangeZone', handleChangeZone)
  ElMessageBox.close()
  ElMessageBox.prompt('请切一次线，或者手动指定当前分线', 'Tip', {
    confirmButtonText: '确认',
    inputPattern: /[1-6]/,
    inputErrorMessage: '只能输入1-6',
    showCancelButton: false,
    showClose: false,
    closeOnClickModal: false,
    closeOnPressEscape: false,
    closeOnHashChange: false,
    inputValue: (SavedInstance.value > 0 ? SavedInstance.value : 1).toString(),
  })
    .then(({ value }) => {
      PlayerInstance.value = Number(value)
      SavedInstance.value = PlayerInstance.value
    })
})
</script>

<template>
  <div>
    <el-row class="header">
      <el-col :span="24" class="menu">
        <el-checkbox v-model="showNumber" label="显示数字" />
        <el-button v-if="inLocalHost" type="primary" @click="test">
          测试怪物
        </el-button>
        <el-button v-if="inLocalHost" type="primary" @click="mergeOverlapMonsters">
          测试重叠
        </el-button>
        <el-button type="primary" @click="clear">
          清空
        </el-button>
      </el-col>
    </el-row>
    <div class="map-container" flex="~ wrap">
      <div v-for="(m, i) in ZONE_LIST" :key="m" class="map-info" flex="~ col">
        <h3 mb-0 mt-1 p0>
          {{ i + 1 }}图 {{ Map[m].name.souma }} / {{ Map[m].name.ja }} / {{ Map[m].name.en }}
        </h3>
        <aside>
          <el-radio-group v-model="FilterConfig[m]" size="small" @change="mergeOverlapMonsters">
            <el-radio-button
              v-for="item in ZONE_FILTER[m]"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-radio-group>
        </aside>
        <div class="map-image">
          <img
            alt="map"
            :src="`https://souma.diemoe.net/m/${Map[m].id.split('/')[0]}/${Map[m].id.replace('/', '.')}.jpg`"
            :style="{ width: `${IMG_SHOW_SIZE}px` }"
          >
          <article>
            <div
              v-for="(item) in Monsters.filter((item) => item.zoneId === m)"
              v-show="isShow(item)"
              :key="`${item.zoneId}-${item.id}`"
              :style="{
                position: 'absolute',
                left: `${item.pixelX * IMG_SCALE}px`,
                top: `${item.pixelY * IMG_SCALE}px`,
              }"
            >
              <div class="point" @click="handlePointClick(item)">
                <div
                  :class="`point-inner ${getBackgroundColor(item)}`"
                />
                <aside class="point-number">
                  {{ getText(item) }}
                </aside>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
html {
  overflow: -moz-scrollbars-none;
  -ms-overflow-style: none;
}

html::-webkit-scrollbar {
  display: none;
}
</style>

<style scoped lang='scss'>
.header {
  padding: 5px;
  position: fixed;
  top: 0;
  right: 0;
  width: 100%;
  z-index: 10;

  .menu {
    display: flex;
    justify-content: flex-end;
  }
}

.map-info {
  .map-image {
    position: relative;

    img {
      object-fit: cover;
    }
  }
}

.point {
  position: relative;

  &:hover {
    filter: brightness(1.2);
  }
}

.point-inner,
.point-number {
  position: absolute;
  $size: 24px;
  width: $size;
  height: $size;
  line-height: $size;
  border-radius: 50%;
  border: 1px solid rgba($color: #000000, $alpha: 0.25);
  transform: translate(calc($size / 2) * -1, calc($size / 2) * -1);
  text-align: center;
  font-size: 12px;
  font-weight: bold;
  white-space: nowrap;
  display: flex;
  justify-content: center;
  user-select: none;
  cursor: pointer;

}

.point-inner {
  z-index: 1;
}

.point-number {
  color: black;
  z-index: 2;
  // text-shadow: 0 0 2px white;
}

$ins1_color: rgba(255, 0, 0, .4);
$ins2_color: rgba(255, 255, 0, .4);
$ins3_color: rgba(0, 128, 255, .4);
$ins4_color: $ins1_color;
$ins5_color: $ins2_color;
$ins6_color: $ins3_color;

.ins1,
.ins4 {
  background-color: $ins1_color;
}

.ins2,
.ins5 {
  background-color: $ins2_color;
}

.ins3,
.ins6 {
  background-color: $ins3_color;
}
</style>
