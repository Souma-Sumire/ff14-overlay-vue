<script setup lang="ts">
import type { PPJSON, WayMarkKeys } from '@/types/PostNamazu'
import type { EventMap } from 'cactbot/types/event'
import ActWS from '@/assets/actWS.webp'
import Aetherytes from '@/resources/aetherytes.json'
import Map from '@/resources/map.json'
import zoneInfo from '@/resources/zoneInfo'
import { getPixelCoordinates, Vector2 } from '@/utils/mapCoordinates'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import LZString from 'lz-string'
import HuntData, { type HuntEntry } from '../../cactbot/resources/hunt'
import { addOverlayListener, callOverlayHandler } from '../../cactbot/resources/overlay_plugin_api'
import sonar from '../../cactbot/resources/sounds/freesound/sonar.webm'
import ZoneId from '../../cactbot/resources/zone_id'

type DiscoveredMonsters = Array<{
  timestamp: number
  id: string
  // name: string
  // rank: string
  zoneId: number
  instance: number
  number: number
  text: string
  worldX: number
  worldY: number
  worldZ: number
  // offsetX: number
  // offsetY: number
  pixelX?: number
  pixelY?: number
  // gameMapX: number
  // gameMapY: number
}>

const GMAE_VERSION = {
  '7.0': '7.0 金曦之遗辉',
  '6.0': '6.0 晓月之终途',
  '5.0': '5.0 暗影之逆焰',
  '4.0': '4.0 红莲之狂潮',
  // '3.0': '3.0 苍穹之禁城',
  // '2.0': '2.0 重生之境',
}

type GameVersion = keyof typeof GMAE_VERSION
type FilterType = '1-3' | '4-6' | '1' | '2' | '3' | '4' | '5' | '6' | '1-2'
type ZoneIdType = typeof zoneList[number]
type LegalInstance = 1 | 2 | 3 | 4 | 5 | 6
type Server = 'Global' | 'CN'

// 将来追加地图时，在zoneList添加新的zoneId，在zoneInstanceLength中添加对应的分线数量，在getZoneGameVersion中添加对应的游戏版本

// 全部地图ID
const zoneList = [
  // 7.0
  ZoneId.Urqopacha,
  ZoneId.Kozamauka,
  ZoneId.YakTel,
  ZoneId.Shaaloani,
  ZoneId.HeritageFound,
  ZoneId.LivingMemory,

  // 6.0
  ZoneId.Labyrinthos,
  ZoneId.Thavnair,
  ZoneId.Garlemald,
  ZoneId.MareLamentorum,
  ZoneId.Elpis,
  ZoneId.UltimaThule,

  // 5.0
  ZoneId.Lakeland,
  ZoneId.AmhAraeng,
  ZoneId.IlMheg,
  ZoneId.Kholusia,
  ZoneId.TheRaktikaGreatwood,
  ZoneId.TheTempest,

  // 4.0
  ZoneId.TheFringes,
  ZoneId.TheRubySea,
  ZoneId.ThePeaks,
  ZoneId.Yanxia,
  ZoneId.TheLochs,
  ZoneId.TheAzimSteppe,
]

const zoneListUsed = ref([] as typeof zoneList)

function getZoneGameVersion(zoneId: ZoneIdType): GameVersion {
  switch (zoneId) {
    case ZoneId.Urqopacha:
    case ZoneId.Kozamauka:
    case ZoneId.YakTel:
    case ZoneId.Shaaloani:
    case ZoneId.HeritageFound:
    case ZoneId.LivingMemory:
      return '7.0'

    case ZoneId.Labyrinthos:
    case ZoneId.Thavnair:
    case ZoneId.Garlemald:
    case ZoneId.MareLamentorum:
    case ZoneId.Elpis:
    case ZoneId.UltimaThule:
      return '6.0'

    case ZoneId.AmhAraeng:
    case ZoneId.IlMheg:
    case ZoneId.Kholusia:
    case ZoneId.Lakeland:
    case ZoneId.TheRaktikaGreatwood:
    case ZoneId.TheTempest:
      return '5.0'

    case ZoneId.TheFringes:
    case ZoneId.TheRubySea:
    case ZoneId.ThePeaks:
    case ZoneId.Yanxia:
    case ZoneId.TheLochs:
    case ZoneId.TheAzimSteppe:
      return '4.0'

    default:
      console.error(`unknown zoneId: ${zoneId}`)
      return '4.0'
  }
}

function getSrc(_gameVersion: GameVersion, id: string): string {
  const result = `//souma.diemoe.net/m/${id.split('/')[0]}/${id.replace('/', '.')}.jpg`
  // const result = `//xivapi.com/m/${id.split('/')[0]}/${id.replace('/', '.')}.jpg`
  return result
}

// agree first is default
const filterValue: Record<LegalInstance, FilterType[]> = {
  1: ['1'],
  2: ['1-2', '1', '2'],
  3: ['1-3', '1', '2', '3'],
  4: ['1-3', '4-6', '1', '2', '3', '4', '5', '6'],
  5: ['1-3', '4-6', '1', '2', '3', '4', '5', '6'],
  6: ['1-3', '4-6', '1', '2', '3', '4', '5', '6'],
}

const INS_BG_COLOR = [
  '255, 0, 0',
  '255, 255, 0',
  '0, 128, 255',
]

const INS_TEXT_COLOR = [
  '255, 0, 0',
  '240, 255, 0',
  '0, 222, 255',
]

const COLOR_STYLE = {
  '--ins1-color': `rgba(${INS_BG_COLOR[0]},0.4)`,
  '--ins2-color': `rgba(${INS_BG_COLOR[1]},0.4)`,
  '--ins3-color': `rgba(${INS_BG_COLOR[2]},0.4)`,
  '--ins4-color': `rgba(${INS_BG_COLOR[0]},0.4)`,
  '--ins5-color': `rgba(${INS_BG_COLOR[1]},0.4)`,
  '--ins6-color': `rgba(${INS_BG_COLOR[2]},0.4)`,
}

const server = useStorage('souma-hunt-server', 'Global' as Server)
const IMG_RAW_SIZE = 2048
const IMG_SHOW_SIZE = 596
const INSTANCE_STRING = ''
const waymarkKeys: WayMarkKeys[] = ['One', 'Two', 'Three', 'Four', 'A', 'B', 'C', 'D'] as const
const IMG_SCALE = IMG_SHOW_SIZE / IMG_RAW_SIZE
const playerInstance = ref(-1)
const DEV_MODE = window.location.hostname === 'localhost' as const
const nameToHuntEntry: Record<string, HuntEntry> = {}
const mergedByOtherNodes = new Set<string>()
const websocketConnected = ref(false)
const gameVersion = useStorage('souma-hunt-game-version', '7.0' as GameVersion)
const allMonstersData = useStorage('souma-hunt-monsters-2', [] as DiscoveredMonsters)
const monstersData = computed(() => allMonstersData.value.filter(v => (zoneListUsed.value.filter(z => getZoneGameVersion(z) === gameVersion.value)).includes(v.zoneId as ZoneIdType)))
const zoneFilter = computed(() => Object.fromEntries(zoneList.map(zoneId => [zoneId, filterValue[getInstanceLengthByZoneId(zoneId)]])) as Record<ZoneIdType, FilterType[]>)
const showNumber = useStorage('souma-hunt-show-number', true)
const playSound = useStorage('souma-hunt-play-sound', false)
const soundVolume = useStorage('souma-hunt-sound-volume', 0.2)
const filterConfig = ref({} as Record<ZoneIdType, FilterType>)
const playerZoneId = useStorage('souma-hunt-zone-id', ref(-1))
const savedInstance = useStorage('souma-hunt-save-instance', playerInstance.value)
const usePostNamazu = useStorage('souma-hunt-use-post-namazu', false)

watchEffect(() => {
  filterConfig.value = Object.fromEntries(zoneList.map(zoneId => [zoneId, filterValue[getInstanceLengthByZoneId(zoneId)][0]])) as Record<ZoneIdType, FilterType>
})

function zoneInstanceMax(zoneId: ZoneIdType): number {
  return Math.max(...(zoneFilter.value[zoneId].filter(item => /^[1-6]$/.test(item)).map(item => Number(item)))) * 2
}

for (const hunt of Object.values(HuntData)) {
  const { id, rank } = hunt
  Object.entries(hunt.name).forEach(([_lang, name]) => {
    if (!name) {
      return
    }
    if (Array.isArray(name)) {
      name.forEach((n) => {
        nameToHuntEntry[n.toLowerCase()] = { id, rank, name: n }
      })
    }
    else {
      nameToHuntEntry[name.toLowerCase()] = { id, rank, name }
    }
  })
}

// 如果url标签里没有OVERLAY_WS，则自动为用户添加
if (!window.location.href.includes('OVERLAY_WS')) {
  window.location.href += `?OVERLAY_WS=ws://127.0.0.1:10501/ws`
}
async function checkWebSocket(): Promise<any> {
  let resolvePromise: (value: boolean | PromiseLike<boolean>) => void
  const promise = new Promise<boolean>((resolve) => {
    resolvePromise = resolve
  })

  const websocket = await Promise.race<Promise<boolean>>([
    new Promise<boolean>((res) => {
      void callOverlayHandler({ call: 'cactbotRequestState' }).then(() => {
        ElMessageBox.close()
        res(true)
        resolvePromise(true)
        websocketConnected.value = true
      })
    }),
    new Promise<boolean>((res) => {
      window.setTimeout(() => {
        res(false)
      }, 250)
    }),
  ])
  if (!websocket) {
    ElMessageBox.alert(
      `请先启动ACT WS，再打开此页面<img src='${ActWS}' style='width:100%'>`,
      '未检测到ACT连接',
      {
        dangerouslyUseHTMLString: true,
        closeOnClickModal: false,
        showClose: false,
        closeOnPressEscape: false,
        closeOnHashChange: false,
        showCancelButton: true,
        showConfirmButton: false,
        cancelButtonText: '我偏要看看',
        buttonSize: 'small',
      },
    ).catch(() => { })
    const loop = setInterval(() => {
      void callOverlayHandler({ call: 'cactbotRequestState' }).then(() => {
        clearInterval(loop)
        ElMessageBox.close()
        resolvePromise(true)
        websocketConnected.value = true
      })
    }, 1000)
  }
  return promise
}

function calcDistance(x: number, y: number, x2: number, y2: number) {
  return {
    both: Math.sqrt((x - x2) ** 2 + (y - y2) ** 2),
    x: Math.abs(x - x2),
    y: Math.abs(y - y2),
  }
}

function getColorDom(monster: DiscoveredMonsters[number]): string {
  const n = (monster.instance - 1) % 3
  return `<span style='color:rgb(${INS_TEXT_COLOR[n]})'>${monster.number}</span>`
}

function getMultipleText(monsters: DiscoveredMonsters[number][]): string {
  return monsters.toSorted((a, b) => a.instance - b.instance).map((item) => {
    return getColorDom(item)
  }).join(' ')
}

function mergeOverlapMonsters() {
  // 将Monters中同一张地图内坐标过近的怪物合并为一个
  mergedByOtherNodes.clear()
  monstersData.value.forEach(item => item.text = getColorDom(item))
  monstersData.value.forEach((item) => {
    if (!isShow(item) || mergedByOtherNodes.has(item.id)) {
      return
    }
    const tooClose = monstersData.value.filter((item2) => {
      const distance = calcDistance(item.worldX, item.worldY, item2.worldX, item2.worldY)
      return isShow(item2) && !mergedByOtherNodes.has(item2.id) && item2.zoneId === item.zoneId && (distance.both < 35)
    })
    if (tooClose.length >= 2) {
      tooClose.forEach((item2, index2) => {
        if (index2 > 0)
          mergedByOtherNodes.add(item2.id)
      })
      tooClose[0].text = getMultipleText(tooClose)
    }
    else {
      tooClose.forEach((item2) => {
        item2.text = getColorDom(item2)
      })
    }
  })
  monstersData.value.forEach((item) => {
    if (mergedByOtherNodes.has(item.id)) {
      item.text = ''
    }
  })
}

function checkImmediatelyMonster() {
  const timestamp = new Date().getTime()
  const monsters = monstersData.value.filter(item => item.zoneId === playerZoneId.value && timestamp - item.timestamp < 5000)
  monsters.forEach((item) => {
    // eslint-disable-next-line no-console
    console.log(`触发了5秒规则`)
    item.instance = playerInstance.value
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
  playerZoneId.value = event.zoneID
  checkImmediatelyMonster()
  playerInstance.value = 1
}

const handleChangePrimaryPlayer: EventMap['ChangePrimaryPlayer'] = (event) => {
  server.value = /^[A-Z]\S+ [A-Z]\S+$/.test(event.charName) ? 'Global' : 'CN'
  // eslint-disable-next-line no-console
  console.log(`当前模式: ${server.value}`)
}

const handleLogLine: EventMap['LogLine'] = (event) => {
  // 如果当前zoneId不在ZONE_LIST中，则不处理
  if (!zoneList.includes(playerZoneId.value as ZoneIdType)) {
    return
  }
  if (event.line[0] === '00' && event.line[2] === '0039') {
    const match = event.line[4].match(new RegExp(`(?:当前所在副本区为“|You are now in the instanced area |インスタンスエリア「)(?<zoneName>.+?)(?<zoneInstanced>[${INSTANCE_STRING}]).*`))
    if (match && match.groups && match.groups.zoneInstanced) {
      playerInstance.value = INSTANCE_STRING.indexOf(match.groups.zoneInstanced) + 1
      savedInstance.value = playerInstance.value
      ElMessageBox.close()
      checkImmediatelyMonster()
      updateWaymarks()
    }
  }
  else if (event.line[0] === '03') {
    const name = event.line[3]
    const hunt = nameToHuntEntry[name.toLowerCase()]
    const rank = hunt?.rank
    if (hunt && rank === 'A') {
      gameVersion.value = getZoneGameVersion(playerZoneId.value as ZoneIdType)
      const instance = playerInstance.value
      const timestamp = new Date().getTime()
      const id = event.line[2]
      const worldX = Number(event.line[17])
      const worldY = Number(event.line[18])
      const worldZ = Number(event.line[19])
      const exist = allMonstersData.value.find(item => item.id === event.line[2] && item.zoneId === playerZoneId.value && item.instance === instance)
      if (exist) {
        // 已经添加过了，更新坐标，且不是合并的情况
        exist.timestamp = timestamp
        exist.worldX = worldX
        exist.worldY = worldY
        exist.worldZ = worldZ
      }
      else {
        // 新添加
        const monsters = allMonstersData.value.filter(item => item.zoneId === playerZoneId.value && item.instance === instance)
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
        allMonstersData.value.push({
          timestamp,
          id,
          worldX,
          worldY,
          worldZ,
          zoneId: playerZoneId.value,
          instance,
          number,
          text: number.toString(),
        })
        if (playSound.value) {
          doSound()
        }
      }
      mergeOverlapMonsters()
      updateWaymarks()
      // console.debug(`find: ${name} in ${Map[playerZoneId.value as ZoneIdType].name.souma} ins${playerInstance.value},(${worldX}, ${worldY}, ${worldZ})`)
    }
  }
  else if (event.line[0] === '25') {
    const id = event.line[2]
    allMonstersData.value = allMonstersData.value.filter(item => item.id !== id)
    mergeOverlapMonsters()
    updateWaymarks()
  }
}

function random(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function randomString() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let str = ''
  for (let i = 0; i < 10; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return str
}

async function addTestMonster(zoneId: number, instance: number, randomRange: number) {
  playerInstance.value = instance
  playerZoneId.value = zoneId
  handleLogLine({
    type: 'LogLine',
    line: [
      '03',
      new Date().toISOString(),
      randomString(),
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
  await sleep(0.2)
}

async function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, time * 1000)
  })
}

function clearMonsterCurrentGameVerion() {
  allMonstersData.value = allMonstersData.value.filter((v) => {
    return getZoneGameVersion(v.zoneId as ZoneIdType) !== gameVersion.value
  })
}

function testMonster() {
  const scale = 2;
  (async () => {
    clearMonsterCurrentGameVerion()
    await addTestMonster(zoneListUsed.value[0], 1, 30 * scale)
    await addTestMonster(zoneListUsed.value[0], 1, 30 * scale)
    await addTestMonster(zoneListUsed.value[0], 2, 30 * scale)
    await addTestMonster(zoneListUsed.value[0], 2, 30 * scale)
    await addTestMonster(zoneListUsed.value[0], 3, 90 * scale)
    await addTestMonster(zoneListUsed.value[0], 3, 90 * scale)
    await addTestMonster(zoneListUsed.value[0], 4, 120 * scale)
    await addTestMonster(zoneListUsed.value[0], 4, 120 * scale)
    await addTestMonster(zoneListUsed.value[0], 5, 150 * scale)
    await addTestMonster(zoneListUsed.value[0], 5, 150 * scale)
    await addTestMonster(zoneListUsed.value[0], 6, 180 * scale)
    await addTestMonster(zoneListUsed.value[0], 6, 180 * scale)
    await addTestMonster(zoneListUsed.value[1], 1, 60 * scale)
    await addTestMonster(zoneListUsed.value[1], 1, 60 * scale)
  })()
  // setTimeout(() => {
  //   handleLogLine({ type: 'LogLine', rawLine: '', line: ['25', '', monsterIds[2]] })
  // }, 500)
}

function testPostnamazu() {
  updateWaymarks()
}

function updateWaymarks() {
  if (!usePostNamazu.value) {
    return
  }
  const monsters = monstersData.value.filter(item => item.zoneId === playerZoneId.value && item.instance === playerInstance.value).sort((a, b) => a.number - b.number)
  const waymarks: PPJSON = {}
  waymarkKeys.forEach((key, index) => {
    const item = monsters[index]
    if (item) {
      waymarks[key] = {
        X: item.worldX,
        Y: item.worldZ, // 是故意调换的
        Z: item.worldY, // 是故意调换的
        Active: true,
      }
    }
    else { waymarks[key] = { X: 0, Y: 0, Z: 0, Active: false } }
  })
  callOverlayHandler({ call: 'PostNamazu', c: 'DoWaymarks', p: JSON.stringify(waymarks) })
}

function clearMonster() {
  // 二次确认
  ElMessageBox.confirm(
    `确定要清空「${GMAE_VERSION[gameVersion.value as GameVersion]}」全部已发现的怪物吗？`,
    '全部清空',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
  ).then(() => {
    clearMonsterCurrentGameVerion()
    clearFilter()
  })
}

function oneMapInstanceClear(zoneId: number) {
  const instance = filterConfig.value[zoneId as keyof typeof filterConfig.value]
  ElMessageBox.confirm(
    `确定要清空「${Map[zoneId as ZoneIdType].name.souma}」的${instance}线的怪物吗？`,
    `${instance}线清空`,
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
  ).then(() => {
    allMonstersData.value = allMonstersData.value.filter(item => !(item.zoneId === zoneId && item.instance === Number(instance)))
    mergeOverlapMonsters()
  })
}

function oneMapClear(zoneId: ZoneIdType) {
  ElMessageBox.confirm(
    `要清空「${Map[zoneId as ZoneIdType].name.souma}」的怪物吗？`,
    '本图清空',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
  ).then(() => {
    allMonstersData.value = allMonstersData.value.filter(item => item.zoneId !== zoneId)
    filterConfig.value[zoneId] = zoneFilter.value[zoneId as ZoneIdType][0]
    mergeOverlapMonsters()
  })
}

function clearFilter() {
  for (const zoneId in filterConfig.value) {
    const z = Number(zoneId)
    filterConfig.value[z as ZoneIdType] = zoneFilter.value[z as ZoneIdType][0]
  }
}

function getBackgroundColor(item: DiscoveredMonsters[number]): string {
  return `ins${item.instance}`
}

function getText(item: DiscoveredMonsters[number]): string {
  return showNumber.value ? item.text : ''
}

function getShowType(item: DiscoveredMonsters[number]): FilterType {
  return filterConfig.value[item.zoneId as keyof typeof filterConfig.value]
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
  const sameInstance = monstersData.value.filter(item2 => item2.zoneId === item.zoneId && item2.instance === item.instance)
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
  if (item.instance === playerInstance.value && item.zoneId === playerZoneId.value) {
    // 更新标点
    updateWaymarks()
  }
}

function exportSth(sth: DiscoveredMonsters) {
  // 删除text属性，为了减少导出的字符串长度，但没关系因为导入之后会重新计算
  const data = sth.map((item) => {
    const { text, ...rest } = item
    return rest
  })
  const str = JSON.stringify(data)
  const compressedText = LZString.compressToEncodedURIComponent(str)
  const el = document.createElement('textarea')
  el.value = compressedText
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
  ElNotification({
    title: '已复制到剪贴板',
    message: '请粘贴到记事本或其他地方',
    type: 'success',
  })
}

function exportStr() {
  exportSth(monstersData.value)
}

function oneMapExport(zoneId: number) {
  const data = monstersData.value.filter(item => item.zoneId === zoneId)
  if (!data) {
    throw new Error('找不到该地图')
  }
  exportSth(data)
}

function oneMapInstanceExport(zoneId: number) {
  const instance = filterConfig.value[zoneId as keyof typeof filterConfig.value]
  if (instance.includes('-')) {
    const filterInstance = instance.split('-').map(v => Number(v))
    const max = filterInstance[filterInstance.length - 1]
    const min = filterInstance[0]
    const data = monstersData.value.filter(item => item.zoneId === zoneId && item.instance >= min && item.instance <= max)
    if (!data) {
      throw new Error('找不到该地图')
    }
    exportSth(data)
  }
  else {
    const data = monstersData.value.filter(item => item.zoneId === zoneId && item.instance === Number(instance))
    if (!data) {
      throw new Error('找不到该地图')
    }
    exportSth(data)
  }
}

function importStr() {
  ElMessageBox.prompt('请输入要导入的字符串', '导入', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputValue: '',
    inputValidator: (value) => {
      try {
        const decompressedText = LZString.decompressFromEncodedURIComponent(value)
        const data = JSON.parse(decompressedText)
        if (!Array.isArray(data)) {
          return '数据格式错误'
        }
        if (data.every(v => getZoneGameVersion(v.zoneId) !== gameVersion.value)) {
          return `该字符串不属于「${GMAE_VERSION[gameVersion.value as GameVersion]}」，请检查`
        }
        return true
      }
      catch (error) {
        void error
        return '数据格式错误'
      }
    },
  }).then(({ value }) => {
    Promise.race(
      [
        ElMessageBox.confirm('要舍弃当前的数据，并全部替换为导入的数据吗？', '你的地图上还有怪物！', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }),
        monstersData.value.length === 0 ? Promise.resolve() : new Promise(() => {}),
      ],
    ).then(() => {
      const decompressedText = LZString.decompressFromEncodedURIComponent(value)
      const data = JSON.parse(decompressedText) as DiscoveredMonsters
      const otherGameVersion = allMonstersData.value.filter(v => getZoneGameVersion(v.zoneId as ZoneIdType) !== gameVersion.value)
      allMonstersData.value = [...otherGameVersion, ...data]
      mergeOverlapMonsters()
      ElMessageBox.close()
      ElNotification({
        title: '导入成功',
        message: `已导入${data.length}条数据`,
        type: 'success',
      })
    }).catch(() => { })
  })
}

function importOneZoneStr() {
  ElMessageBox.prompt('请输入要导入的字符串', '单独导入某个图', {
    confirmButtonText: '单独导入',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputValue: '',
    inputValidator: (value) => {
      try {
        const decompressedText = LZString.decompressFromEncodedURIComponent(value)
        const data = JSON.parse(decompressedText) as DiscoveredMonsters
        const zoneIds = new Set(data.map(item => item.zoneId))
        if (zoneIds.size !== 1) {
          return '导入的字符串不止一个地图，你是不是选错了？'
        }
        if (!Array.isArray(data)) {
          return '数据格式错误'
        }
        return true
      }
      catch (error) {
        // 为什么catch里不传参还会报错啊？？？
        void error
        return '数据格式错误'
      }
    },
  }).then(({ value }) => {
    const decompressedText = LZString.decompressFromEncodedURIComponent(value)
    const data = JSON.parse(decompressedText) as DiscoveredMonsters
    const mapName = Map[data[0].zoneId as unknown as keyof typeof Map].name.souma
    const targetMonsters = monstersData.value.filter(item => item.zoneId === data[0].zoneId)
    Promise.race(
      [
        ElMessageBox.confirm(`要舍弃当前的数据，并替换为导入的数据吗？`, `你的「${mapName}」上还有怪物！`, {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }),
        targetMonsters.length === 0 ? Promise.resolve() : new Promise(() => {}),
      ],
    ).then(() => {
      allMonstersData.value = [...allMonstersData.value.filter(item => item.zoneId !== data[0].zoneId), ...data]
      mergeOverlapMonsters()
      ElMessageBox.close()
      ElNotification({
        title: '导入成功',
        message: `已导入${data.length}条数据`,
        type: 'success',
      })
    }).catch(() => { })
  })
}

function importOneInstanceStr() {
  ElMessageBox.prompt('请输入要导入的字符串', '单独导入某条线', {
    confirmButtonText: '单独导入',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputValue: '',
    inputValidator: (value) => {
      try {
        const decompressedText = LZString.decompressFromEncodedURIComponent(value)
        const data = JSON.parse(decompressedText) as DiscoveredMonsters
        const zoneIds = new Set(data.map(item => item.zoneId))
        const instanceIds = new Set(data.map(item => item.instance))
        if (zoneIds.size !== 1 || instanceIds.size !== 1) {
          return '导入的字符串不止一个地图或线，你是不是选错了？'
        }
        if (!Array.isArray(data)) {
          return '数据格式错误'
        }
        return true
      }
      catch (error) {
        // 为什么catch里不传参还会报错啊？？？
        void error
        return '数据格式错误'
      }
    },
  }).then(({ value }) => {
    const decompressedText = LZString.decompressFromEncodedURIComponent(value)
    const data = JSON.parse(decompressedText) as DiscoveredMonsters
    const mapName = Map[data[0].zoneId as unknown as keyof typeof Map].name.souma
    const instanceName = data[0].instance.toString()
    const targetMonsters = monstersData.value.filter(item => item.zoneId === data[0].zoneId && item.instance === data[0].instance)
    Promise.race(
      [
        ElMessageBox.confirm(`要舍弃当前的数据，并替换为导入的数据吗？`, `你的「${mapName}」的${instanceName}线上还有怪物！`, {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }),
        targetMonsters.length === 0 ? Promise.resolve() : new Promise(() => {}),
      ],
    ).then(() => {
      allMonstersData.value = [...allMonstersData.value.filter(item => item.zoneId !== data[0].zoneId || item.instance !== data[0].instance), ...data]
      mergeOverlapMonsters()
      ElMessageBox.close()
      ElNotification({
        title: '导入成功',
        message: `已导入${data.length}条数据`,
        type: 'success',
      })
    }).catch(() => { })
  })
}

function doSound() {
  const audio = new Audio(sonar)
  audio.volume = soundVolume.value
  audio.play()
}

function getMapName(zoneId: ZoneIdType, i: number): string {
  const instanceMax = zoneInstanceMax(zoneId)
  const instanceNow = monstersData.value.filter(item => item.zoneId === zoneId).length
  return `${i + 1}图 ${Map[zoneId].name.souma} / ${Map[zoneId].name.ja} / ${Map[zoneId].name.en} （${instanceNow}/${instanceMax}）${instanceNow === instanceMax ? '✅' : ''}`
}

function getStyle(item: DiscoveredMonsters[number]): { [key: string]: string } {
  const zone = zoneInfo[item.zoneId]
  const sizeFactor = zone.sizeFactor
  const offsetX = zone.offsetX
  const offsetY = zone.offsetY
  const worldXZCoordinates = new Vector2(Number(item.worldX), Number(item.worldY))
  const mapOffset = new Vector2(offsetX, offsetY)
  const pixelCoordinates = getPixelCoordinates(worldXZCoordinates, mapOffset, sizeFactor)
  return {
    position: 'absolute',
    left: `${pixelCoordinates.x * IMG_SCALE}px`,
    top: `${pixelCoordinates.y * IMG_SCALE}px`,
  }
}

function cleanUpExpiredData(): Promise<void> {
  const before = allMonstersData.value.length
  // 无提醒的清理超过24小时的怪物数据
  allMonstersData.value = allMonstersData.value.filter(item => item.timestamp > 0 && item.timestamp > Date.now() - 1000 * 60 * 60 * 24)
  if (before !== allMonstersData.value.length) {
    ElMessage.info(`已清理${allMonstersData.value.length}条过期数据`)
  }
  const monstersSorted = monstersData.value.toSorted((a, b) => b.timestamp - a.timestamp)
  const lastUpadateTime = monstersSorted.length > 0 ? monstersSorted[0].timestamp : 0
  return new Promise((resolve) => {
    if (lastUpadateTime > 0) {
      if (Date.now() - lastUpadateTime > 1000 * 60 * 60 * 4) {
        // 上次更新时间距离现在超过4小时，提醒用户数据可能已经过期
        ElMessageBox.confirm('尚存有4小时前的怪物数据，可能已经过期，是否清空？', '数据过期', {
          confirmButtonText: '全部清空',
          cancelButtonText: '取消',
          type: '',
        }).then(() => {
          clearMonsterCurrentGameVerion()
        }).catch(() => { }).finally(() => {
          resolve(undefined)
        })
      }
      resolve(undefined)
    }
  })
}

// 手动维护分线数
function getInstanceLengthByZoneId(zoneId: ZoneIdType): LegalInstance {
  if (server.value === 'Global') {
    switch (zoneId) {
      // 国际服 7.0
      case ZoneId.Urqopacha:
      case ZoneId.Kozamauka:
      case ZoneId.YakTel:
      case ZoneId.Shaaloani:
      case ZoneId.HeritageFound:
      case ZoneId.LivingMemory:
        return 3
      default:
        return 1
    }
  }

  switch (zoneId) {
    // 国服 7.0
    case ZoneId.Urqopacha:
    case ZoneId.Kozamauka:
      return 6
    case ZoneId.YakTel:
    case ZoneId.Shaaloani:
    case ZoneId.HeritageFound:
    case ZoneId.LivingMemory:
      return 3
    default:
      return 1
  }
}

onMounted(async () => {
  // 预加载音频文件，避免需要时才加载
  watch(playSound, (value) => {
    if (value) {
      const audio = new Audio(sonar)
      audio.volume = 0
      audio.play()
    }
  }, { immediate: true })

  watch(gameVersion, () => {
    zoneListUsed.value = zoneList.filter(zoneId => getZoneGameVersion(zoneId) === gameVersion.value)
  }, { immediate: true })

  if (monstersData.value.length === 0) {
    clearFilter()
  }
  await checkWebSocket()
  addOverlayListener('LogLine', handleLogLine)
  addOverlayListener('ChangeZone', handleChangeZone)
  addOverlayListener('ChangePrimaryPlayer', handleChangePrimaryPlayer)
  ElMessageBox.close()
  await cleanUpExpiredData()
  if (DEV_MODE) {
    ElMessage.success('处于开发模式下，默认选择1线')
    playerInstance.value = 1
    savedInstance.value = 1
  }
  else {
    ElMessageBox.prompt('请切一次线，或者手动指定', '你在几线', {
      confirmButtonText: '确认',
      inputPattern: /^[1-6]$/,
      inputErrorMessage: '只能输入1-6',
      showCancelButton: false,
      showClose: false,
      closeOnClickModal: false,
      closeOnPressEscape: false,
      closeOnHashChange: false,
      inputValue: (savedInstance.value > 0 ? savedInstance.value : 1).toString(),
    })
      .then(({ value }) => {
        playerInstance.value = Number(value)
        savedInstance.value = playerInstance.value
      })
  }

  watch(gameVersion, () => {
    cleanUpExpiredData()
  }, { immediate: false })
})
</script>

<template>
  <div :style="COLOR_STYLE">
    <h3 v-if="!websocketConnected">
      无法连接到ACTWebSocket，找怪功能无法工作，但你可以导入导出数据。
    </h3>
    <el-col>
      <el-row>
        <el-form inline>
          <el-form-item label="资料片">
            <div flex w-40>
              <el-select v-model="gameVersion" placeholder="请选择">
                <el-option v-for="[value, label] in Object.entries(GMAE_VERSION)" :key="value" :label="label" :value="value" />
              </el-select>
            </div>
          </el-form-item>
          <el-form-item label="分线方式">
            <div flex w-30>
              <el-select v-model="server" placeholder="请选择">
                <el-option label="国际服" value="Global" />
                <el-option label="中国服" value="CN" />
              </el-select>
            </div>
          </el-form-item>
        </el-form>
      </el-row>
    </el-col>
    <el-col class="menu">
      <el-row>
        <el-button type="primary" @click="clearMonster">
          全部清空
        </el-button>
        <el-button text bg @click="exportStr">
          全部导出
        </el-button>
        <el-button text bg @click="importStr">
          全部导入
        </el-button>
        <el-button text bg @click="importOneZoneStr">
          单独导入某个图
        </el-button>
        <el-button text bg m-r-5 @click="importOneInstanceStr">
          单独导入某条线
        </el-button>
      </el-row>
      <el-row>
        <el-checkbox v-model="showNumber" label="显示数字" w-15 />
        <el-checkbox v-model="playSound" label="启用音效" />
        <div v-show="playSound" class="flex items-center" w-40 p-l-2>
          <el-slider v-model="soundVolume" :min="0" :max="1" :step="0.1" size="small" class="flex-grow" />
          <el-button size="small" m-l-1 @click="doSound">
            试听
          </el-button>
        </div>
      </el-row>
      <el-row p-l-3>
        <el-checkbox v-model="usePostNamazu" label="场地标点(需要邮差)" />
      </el-row>
    </el-col>
    <el-row class="map-container" flex="~ wrap" m-t-1>
      <el-row v-if="DEV_MODE">
        DEV：
        <el-button type="warning" @click="testMonster">
          添加怪物
        </el-button>
        <el-button type="warning" @click="mergeOverlapMonsters">
          合并怪物
        </el-button>
        <el-button type="warning" @click="testPostnamazu">
          邮差标点
        </el-button>
      </el-row>
    </el-row>
    <div class="map-container" flex="~ wrap">
      <div v-for="(m, i) in zoneListUsed" :key="m" class="map-info" flex="~ col" position-relative>
        <h3 class="map-title" :style="{ width: `${IMG_SHOW_SIZE}px` }" position-absolute mb-0 ml-2 mt-1 p0>
          {{ getMapName(m, i) }}
        </h3>
        <ul class="options" position-absolute mt-1 p0 right-0 top-0 mr-2>
          <li class="option">
            <el-button size="small" w-5em @click="oneMapClear(m)">
              本图清空
            </el-button>
          </li>
          <li class="option">
            <el-button size="small" w-5em @click="oneMapExport(m)">
              本图导出
            </el-button>
          </li>
          <li v-show="getInstanceLengthByZoneId(m) !== 1" class="option">
            <el-button v-show="!(getInstanceLengthByZoneId(m) !== 1 && filterConfig[m]?.includes('-'))" size="small" w-5em @click="oneMapInstanceClear(m)">
              {{ filterConfig[m] }}线清空
            </el-button>
          </li>
          <li v-show="getInstanceLengthByZoneId(m) !== 1" class="option">
            <el-button v-show="!(getInstanceLengthByZoneId(m) !== 1 && filterConfig[m]?.includes('-'))" size="small" w-5em @click="oneMapInstanceExport(m)">
              {{ filterConfig[m] }}线导出
            </el-button>
          </li>
        </ul>
        <aside
          v-show="getInstanceLengthByZoneId(m) !== 1"
          class="map-filter" position-absolute style="top:2em;" ml-2
          flex="~ justify-start"
          :style="{ width: `${IMG_SHOW_SIZE}px` }"
        >
          <el-radio-group v-model="filterConfig[m]" size="small" @change="mergeOverlapMonsters">
            <el-radio-button v-for="item in zoneFilter[m]" :key="item" :label="item" :value="item" />
          </el-radio-group>
        </aside>
        <div
          class="map-image"
          :style="{ width: `${IMG_SHOW_SIZE}px`, height: `${IMG_SHOW_SIZE}px` }"
        >
          <img
            alt="map" :src="getSrc(getZoneGameVersion(m), Map[m].id)"
            :style="{ width: `${IMG_SHOW_SIZE}px`, height: `${IMG_SHOW_SIZE}px` }"
          >

          <div
            v-for="(aItem, aIndex) in Aetherytes.filter(a => a.territory === m.toString())"
            :key="`${aItem.territory}-${aIndex}`" :style="{
              position: 'absolute',
              left: `${(aItem.x - 1) * IMG_SCALE}px`,
              top: `${(aItem.y - 1) * IMG_SCALE}px`,
            }"
          >
            <el-tooltip
              class="box-item"
              effect="dark"
              :content="`${aItem.placeName.souma} / ${aItem.placeName.ja} / ${aItem.placeName.en}`"
              placement="top"
            >
              <img
                class="aetherytes" alt="aetheryte" src="//cafemaker.wakingsands.com/img-misc/mappy/aetheryte.png"
                :style="{ height: `${IMG_SHOW_SIZE / 20}px` }"
              >
            </el-tooltip>
          </div>
          <div>
            <article>
              <div
                v-for="(item) in monstersData.filter((item) => item.zoneId === m)" v-show="isShow(item)"
                :key="`${item.zoneId}-${item.id}`" :style="getStyle(item)"
              >
                <div class="point" @click="handlePointClick(item)">
                  <div :class="`point-inner ${getBackgroundColor(item)}`" />
                  <aside class="point-number" v-html="getText(item)" />
                </div>
              </div>
            </article>
          </div>
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
.menu {
  display: flex;
  flex-wrap: nowrap;
}

.map-info {
  .map-image {
    position: relative;

    img {
      object-fit: cover;
      z-index: 1;
    }
  }
}

.point {
  position: relative;

  &:hover {
    filter: brightness(1.1);
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
  font-size: 16px;
  font-weight: bold;
  white-space: nowrap;
  display: flex;
  justify-content: center;
  user-select: none;
  cursor: pointer;

}

.map-title {
  z-index: 2;
  color: white;
  font-size: 16px;
  font-weight: bold;
  text-shadow: 0 0 4px black;
}

.map-filter {
  z-index: 3;

  .el-radio-button {
    opacity: 0.0;
    transition: opacity 0.3s ease-in-out, width 0.6s ease-in-out;

    &.is-active {
      opacity: 1;
    }
  }

  &:hover {
    .el-radio-button {
      opacity: 1;
    }
  }
}

.map-info:hover .options {
  opacity: 1;
}

.options {
  z-index: 4;
  opacity: 0;
  transition: opacity 0.1s ease-in-out;

  .option {
    list-style: none;
  }
}

.aetherytes {
  z-index: 5;
  transform: translate(-50%, -50%);
  user-select: none;
}

.point-inner {
  z-index: 6;
}

.point-number {
  z-index: 7;
  text-shadow: 0 0 2px black;
}

.ins1,
.ins4 {
  background-color: var(--ins1-color);
}

.ins2,
.ins5 {
  background-color: var(--ins2-color);
}

.ins3,
.ins6 {
  background-color: var(--ins3-color);
}
</style>
