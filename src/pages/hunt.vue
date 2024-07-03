<script setup lang="ts">
import type { EventMap } from 'cactbot/types/event'
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
  infos: Array<{ instance: number, number: number, id: string }>
  worldX: number
  worldY: number
  worldZ: number
  offsetX: number
  offsetY: number
  pixelX: number
  pixelY: number
  gameMapX: number
  gameMapY: number
  show: boolean
}>
type FilterType = 'all' | '1-3' | '4-6' | '1' | '2' | '3' | '4' | '5' | '6'

const ZONE_LIST = [
  ZoneId.Urqopacha,
  ZoneId.Kozamauka,
  ZoneId.YakTel,
  ZoneId.Shaaloani,
  ZoneId.HeritageFound,
  ZoneId.LivingMemory,
]

const Monsters = useStorage('souma-hunt-monsters', [] as DiscoveredMonsters)

const FilterConfig = useStorage('souma-hunt-filter', {
  [ZoneId.Urqopacha]: 'all',
  [ZoneId.Kozamauka]: 'all',
  [ZoneId.YakTel]: 'all',
  [ZoneId.Shaaloani]: 'all',
  [ZoneId.HeritageFound]: 'all',
  [ZoneId.LivingMemory]: 'all',
} as Record<typeof ZONE_LIST[number], FilterType>)

const ZONE_FILTER = {
  [ZoneId.Urqopacha]: ['all', '1-3', '4-6', '1', '2', '3', '4', '5', '6'],
  [ZoneId.Kozamauka]: ['all', '1-3', '4-6', '1', '2', '3', '4', '5', '6'],
  [ZoneId.YakTel]: ['all', '1', '2', '3'],
  [ZoneId.Shaaloani]: ['all', '1', '2', '3'],
  [ZoneId.HeritageFound]: ['all', '1', '2', '3'],
  [ZoneId.LivingMemory]: ['all', '1', '2', '3'],
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
const IMG_SHOW_SIZE = 512
const IMG_SCALE = IMG_SHOW_SIZE / IMG_RAW_SIZE
const PlayerZoneId = useStorage('souma-hunt-zone-id', ref(-1))
const PlayerInstance = ref(-1)
const SavedInstance = useStorage('souma-hunt-save-instance', PlayerInstance.value)

const handleChangeZone: EventMap['ChangeZone'] = (event) => {
  const timestamp = new Date().getTime()
  const instance = PlayerInstance.value
  PlayerZoneId.value = event.zoneID
  const monsters = Monsters.value.filter(item => item.zoneId === event.zoneID && item.instance === instance && timestamp - item.timestamp < 3000)
  monsters.forEach((item) => {
    // eslint-disable-next-line no-console
    console.log(`触发了3秒规则`)
    item.infos.forEach((i) => {
      i.instance += 1
    })
    // number等于 从1、2、3、4、5、6中寻找第一个不在 monsters 中存在的number
    let number = -1
    for (let i = 1; i <= 6; i++) {
      if (!monsters.some(item => item.infos.find(ii => ii.number === i))) {
        number = i
        break
      }
    }
    if (number === -1) {
      console.error('找不到空闲的number')
      number = 0
    }
  })
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
      if (exist && exist.infos.length === 1) {
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
          if (!monsters.some(item => item.infos.find(ii => ii.number === i))) {
            number = i
            break
          }
        }
        if (number === -1) {
          console.error('找不到空闲的number')
          number = 0
        }
        const veryClose = Monsters.value.filter(item => item.zoneId === PlayerZoneId.value).find((item) => {
          const distance = Math.sqrt((item.pixelX - pixelCoordinates.x) ** 2 + (item.pixelY - pixelCoordinates.y) ** 2)
          return distance < 30
        })
        if (veryClose) {
        // 距离太近，在之前的monster的info后追加
          const index = Monsters.value.indexOf(veryClose)
          Monsters.value[index].infos.push({ instance, number, id })
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
          infos: [{ instance, number, id }],
          offsetX,
          offsetY,
          pixelX: pixelCoordinates.x,
          pixelY: pixelCoordinates.y,
          gameMapX: gameMapCoordinates.x,
          gameMapY: gameMapCoordinates.y,
          show: !veryClose,
        })
        // say('已发现')
      }
      // console.log(`find: ${name} in ${zoneId.value} ins${instance.value},(${worldX}, ${worldY}, ${worldZ}) (${pixelCoordinates.x}, ${pixelCoordinates.y}) (${gameMapCoordinates.x}, ${gameMapCoordinates.y})`)
    }
  }
  else if (event.line[0] === '25') {
    const id = event.line[2]
    const exist = Monsters.value.find(item => item.id === id)
    if (!exist) {
      return
    }
    // 清理掉已经消失的怪物
    exist.infos = exist.infos.filter(i => i.id !== id)
    const existShow = exist.show
    const count = exist.infos.length
    if (count === 0) {
      // exist是普通1个点的情况，正常删除
      Monsters.value = Monsters.value.filter(item => item.id !== id)
      if (existShow === false) {
        // 这是一个被隐藏的点，所以需要将其他的合并monster中的他删掉
        const mergedPoint = Monsters.value.find(item => item.infos.some(ii => ii.id === id))
        if (mergedPoint) {
          mergedPoint.infos = mergedPoint.infos.filter(ii => ii.id !== id)
        }
      }
    }
    else if (count >= 1) {
      // 这是一个2个或3个点的合并坐标，并且自己是主monster
      const otherIds = exist.infos.map(v => v.id)
      const others = Monsters.value.filter(item => otherIds.includes(item.id))
      others[0].show = true
      if (others.length >= 2) {
        // 这是一个由N>2拆N-1的情况，将其合并到一起
        others[0].infos.push(...(others.filter((_v, i) => i !== 0).map(item => item.infos[0])))
      }
      // 更新数据
      Monsters.value = Monsters.value.filter(item => item.id !== id)
    }
    else {
      throw new Error(`未知的情况`)
    }
  }
}

function test() {
  const monsterIds = ['1', '2', '3']
  Monsters.value = []
  PlayerInstance.value = 1
  handleLogLine({
    type: 'LogLine',
    line: [
      '03',
      '2024-07-03T05:08:46.5450000+08:00',
      monsterIds[0],
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
      '323.26',
      '56.25',
      '58.79',
      '-3.03',
      '9b64e809cf609144',
    ],
    rawLine: '',
  })
  setTimeout(() => {
    // PlayerInstance.value = 2
    handleLogLine({
      type: 'LogLine',
      line: [
        '03',
        '2024-07-03T05:11:34.7710000+08:00',
        monsterIds[1],
        'ネチュキホ',
        '00',
        '64',
        '0000',
        '00',
        '',
        '13362',
        '17708',
        '32956266',
        '32956266',
        '10000',
        '10000',
        '',
        '',
        '332.72',
        '51.56',
        '59.99',
        '-2.65',
        '4b029d1d6eee9ae9',
      ],
      rawLine: '',
    })
    setTimeout(() => {
      // PlayerInstance.value = 3
      handleLogLine({
        type: 'LogLine',
        line: [
          '03',
          '2024-07-03T05:08:46.5450000+08:00',
          monsterIds[2],
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
          '323.26',
          '57.25',
          '57.79',
          '-3.03',
          '9b64e809cf609144',
        ],
        rawLine: '',
      })
      setTimeout(() => {
        handleLogLine({ type: 'LogLine', rawLine: '', line: ['25', '', monsterIds[2]] })
      }, 500)
    }, 500)
  }, 500)
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
  if (item.infos.length > 1 && getShowType(item) === 'all') {
    return `ins_merged_${item.infos.map(i => i.instance).join('_')}`
  }
  else {
    switch (item.infos[0].instance) {
      case 1:
        return 'ins1'
      case 2:
        return 'ins2'
      case 3:
        return 'ins3'
      case 4:
        return 'ins4'
      case 5:
        return 'ins5'
      case 6:
        return 'ins6'
      default:
        return 'inst'
    }
  }
}

function getNumberText(item: DiscoveredMonsters[number]): string {
  const showType = getShowType(item)
  if (showType === 'all') {
    return item.infos.map(i => (`${i.instance}-${i.number}`)).join('/')
  }
  else if (showType.includes('-')) {
    const filterInstance = showType.split('-').map(v => Number(v)).sort((a, b) => a - b)
    const max = filterInstance[filterInstance.length - 1]
    const min = filterInstance[0]

    // 如果这是一个普通节点
    if (item.infos.length === 1) {
      if (item.instance >= min && item.instance <= max) {
        return `${item.infos[0].instance}-${item.infos[0].number}`
      }
      return ''
    }

    // 如果这是一个合并节点
    if (item.infos.length > 1) {
      if (item.infos[0].instance >= min && item.infos[0].instance <= max) {
        return item.infos.filter(i => i.instance >= min && i.instance <= max).map(i => `${i.instance}-${i.number}`).join('/')
      }
      return ''
    }
    throw new Error('未知的情况')

    // const dataInstance = item.infos.map(i => i.instance).filter(v => v >= min && v <= max)
    // if (dataInstance.length === 0) {
    //   return ''
    // }
    // const filterData = item.infos.filter(i => dataInstance.includes(i.instance))
    // if (filterData.length === item.infos.length && item.infos[0].id === item.id) {
    //   return filterData.map(i => `${i.instance}-${i.number}`).join('/')
    // }
    // else {
    //   return ''
    // }
  }
  return `${item.infos[0].instance}-${item.infos[0].number}`
}

function getShowType(item: DiscoveredMonsters[number]): FilterType {
  return FilterConfig.value[item.zoneId as keyof typeof FilterConfig.value]
}

function isShow(item: DiscoveredMonsters[number]): boolean {
  const showType = getShowType(item)
  if (showType === 'all') {
    return item.show !== false
  }
  else if (showType.includes('-')) {
    const filterInstance = showType.split('-').map(v => Number(v))
    const max = filterInstance[filterInstance.length - 1]
    const min = filterInstance[0]
    // 如果这是一个普通节点
    if (item.infos.length === 1) {
      return item.instance >= min && item.instance <= max
    }

    // 如果这是一个合并节点
    if (item.infos.length > 1) {
      return item.infos[0].instance >= min && item.infos[0].instance <= max
    }
    throw new Error('未知的情况')
  }
  return item.instance.toString() === showType
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
        <el-button v-if="false" type="primary" @click="test">
          测试
        </el-button>
        <el-button type="primary" @click="clear">
          清空
        </el-button>
      </el-col>
    </el-row>
    <div class="map-container" flex="~ wrap">
      <div v-for="m in ZONE_LIST" :key="m" class="map-info" flex="~ col">
        <h3 mb-0 mt-1 p0>
          {{ Map[m].name.souma }} / {{ Map[m].name.ja }} / {{ Map[m].name.en }}
        </h3>
        <aside>
          <el-radio-group v-model="FilterConfig[m]" size="small">
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
            :src="`https://xivapi.com/m/${Map[m].id.split('/')[0]}/${Map[m].id.replace('/', '.')}.jpg`"
            :style="{ width: `${IMG_SHOW_SIZE}px` }"
          >
          <article>
            <div
              v-for="(item) in Monsters.filter((item) => item.zoneId === m)"
              v-show="isShow(item)"
              :key="`${item.zoneId}-${item.id}`"
              :class="`point ${getBackgroundColor(item)}`"
              :style="{
                color: 'white',
                position: 'absolute',
                left: `${item.pixelX * IMG_SCALE}px`,
                top: `${item.pixelY * IMG_SCALE}px`,
              }"
            >
              {{ getNumberText(item) }}
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
  z-index: 200;

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
  display: block;
  $size: 24px;
  width: $size;
  height: $size;
  line-height: $size;
  border-radius: 50%;
  transform: translate(calc($size / 2) * -1, calc($size / 2) * -1);
  text-align: center;
  font-size: 12px;
  font-weight: bold;
  z-index: 100;
  box-shadow: 0 0 0 2px #000;

  // 溢出不换行
  white-space: nowrap;
  display: flex;
  justify-content: center;

  // 文本阴影
  text-shadow: 0 0 2px #000;
}

$ins1_color: rgba(255, 0, 0, 0.5);
$ins2_color: rgba(255, 255, 0, 0.5);
$ins3_color: rgba(0, 128, 255, 0.5);
$ins4_color: rgba(128, 0, 0, 0.5);
$ins5_color: rgba(0, 255, 0, 0.5);
$ins6_color: rgba(255, 165, 0, 0.5);

.ins1 {
  background-color: $ins1_color;
}

.ins2 {
  background-color: $ins2_color;
}

.ins3 {
  background-color: $ins3_color;
}

.ins4 {
  background-color: $ins4_color;
}

.ins5 {
  background-color: $ins5_color;
}

.ins6 {
  background-color: $ins6_color;
}

$colors: (
  "1": $ins1_color,
  "2": $ins2_color,
  "3": $ins3_color,
  "4": $ins4_color,
  "5": $ins5_color,
  "6": $ins6_color
);

@for $i from 1 through 6 {
  @for $j from 1 through 6 {
    .ins_merged_#{$i}_#{$j} {
      $color1: map-get($colors, "#{$i}");
      $color2: map-get($colors, "#{$j}");
      background-image: linear-gradient(to right, #{$color1} 40%, #{$color1} 45%, #{$color2} 55%, #{$color2} 60%);
    }
  }
}

@for $i from 1 through 6 {
  @for $j from 1 through 6 {
    @for $k from 1 through 6 {
      .ins_merged_#{$i}_#{$j}_#{$k} {
        $color1: map-get($colors, "#{$i}");
        $color2: map-get($colors, "#{$j}");
        $color3: map-get($colors, "#{$k}");
        background-image: linear-gradient(to right, #{$color1} 30%, #{$color2} 35%, #{$color2} 65%, #{$color3} 70%);
      }
    }
  }
}
</style>
