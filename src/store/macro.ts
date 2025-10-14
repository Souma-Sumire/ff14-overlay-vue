import type { MacroInfoMacro, MacroInfoPlace } from '@/types/macro'
import type { QueueArr, Slot, WayMarkObj } from '@/types/PostNamazu'
import { ElInputNumber, ElMessage, ElMessageBox } from 'element-plus'
import ContentType from '../../cactbot/resources/content_type'
import { defineStore } from 'pinia'
import { copyToClipboard } from '@/utils/clipboard'
import { addOverlayListener } from '../../cactbot/resources/overlay_plugin_api'
import { getMapIDByTerritoryType } from '../resources/contentFinderCondition'
import { ZoneInfo } from '../resources/zoneInfo'
import {
  doInsertPreset,
  doQueueActions,
  doTextCommand,
  doWayMarks,
} from '../utils/postNamazu'
import { defaultMacro } from './../resources/macro'

let partyLen = 0
const slotIndex = useStorage('macro-slot-index', 5)

const contentTypeLabel: { type: number; label: string }[] = [
  { type: ContentType.Dungeons, label: '四人迷宫' },
  { type: ContentType.Trials, label: '讨伐歼灭战' },
  { type: ContentType.Raids, label: '大型任务' },
  { type: ContentType.ChaoticAllianceRaid, label: '诛灭战' },
  { type: ContentType.UltimateRaids, label: '绝境战' },
  { type: ContentType.VCDungeonFinder, label: '多变迷宫' },
  { type: ContentType.DeepDungeonExtras, label: '深宫诗想' },
  { type: ContentType.DeepDungeons, label: '深层迷宫' },
  { type: ContentType.DisciplesOfTheLand, label: '采集/垂钓' },
  { type: ContentType.Eureka, label: '尤雷卡' },
  { type: ContentType.SaveTheQueen, label: '博兹雅' },
  { type: ContentType.OccultCrescent, label: '新月岛' },
]

const showContentTypes = contentTypeLabel.map((v) => v.type)

addOverlayListener('PartyChanged', (e) => {
  partyLen = e.party.length
})

const [show, toggleShow] = useToggle(true)

function safeParseJson(input: string) {
  try {
    // 尝试直接解析
    return JSON.parse(input)
  } catch (e) {
    // 解析失败，再尝试移除尾逗号后重新解析
    try {
      void e
      const cleaned = input.replace(/,(\s*[}\]])/g, '$1')
      return JSON.parse(cleaned)
    } catch (e) {
      void e
      // 两次都失败就说明真的是非法 JSON
      throw new Error(`无法解析 JSON 数据`)
    }
  }
}

function cleanMacro(text: string): string {
  let res = text
  res = res.replaceAll(/\n{2,}/g, '\n')
  res = res.replaceAll(/^\s+/gm, '')
  res = res.replaceAll(/ /g, '\xA0')
  return res
}

// function getZoneIDByZoneName(ZoneName: string) {
//   for (const zoneId in ZoneInfo) {
//     const zone = ZoneInfo[zoneId]!
//     for (const lang in zone.name) {
//       const zoneName = zone.name[lang as keyof typeof zone.name]
//       if (
//         zoneName?.toUpperCase() === ZoneName.toUpperCase() ||
//         zoneName === ZoneName.replaceAll(/[()]/g, '')
//       ) {
//         return zoneId
//       }
//     }
//   }
// }

function macroCommand(text: string, channel: 'e' | 'p') {
  if (channel === 'p' && partyLen === 0)
    doTextCommand('/e 单人时无法发送小队宏<se.3>')
  const macros = text.replaceAll(/^\s*\/[pe]\s/gm, '').split('\n')
  const queue: QueueArr = macros.map((m) => {
    return {
      c: 'DoTextCommand',
      p: `/${channel} ${m}`,
      d: 125,
    }
  })
  doQueueActions(queue)
  ElMessage.success('已发送')
}

const useMacroStore = defineStore('macro', {
  state: () => {
    return {
      data: useStorage('my-macros', defaultMacro),
      selectZone: useStorage('my-zone', '1226'),
      zoneNow: useStorage('my-zone-now', '1226'),
      zoneNowName: useStorage('my-zone-now-name', ''),
      fastEntrance: [
        { text: '极永暗', value: '1296' },
        { text: '力之塔', value: '1252' },
        { text: 'M5S', value: '1257' },
        { text: 'M6S', value: '1259' },
        { text: 'M7S', value: '1261' },
        { text: 'M8S', value: '1263' },
        { text: '绝伊甸', value: '1238' },
      ],
      show,
      toggleShow,
    }
  },
  getters: {
    defaultX: (state) => {
      return ZoneInfo[Number(state.selectZone)]?.offsetX ?? 0
    },
    defaultY: (state) => {
      return ZoneInfo[Number(state.selectZone)]?.offsetY ?? 0
    },
    blankWaymark: (state) => {
      const defaultX = ZoneInfo[Number(state.selectZone)]?.offsetX ?? 0
      const defaultY = ZoneInfo[Number(state.selectZone)]?.offsetY ?? 0
      return {
        A: { X: -defaultX, Y: 0, Z: -defaultY, Active: false },
        B: { X: -defaultX, Y: 0, Z: -defaultY, Active: false },
        C: { X: -defaultX, Y: 0, Z: -defaultY, Active: false },
        D: { X: -defaultX, Y: 0, Z: -defaultY, Active: false },
        One: { X: -defaultX, Y: 0, Z: -defaultY, Active: false },
        Two: { X: -defaultX, Y: 0, Z: -defaultY, Active: false },
        Three: { X: -defaultX, Y: 0, Z: -defaultY, Active: false },
        Four: { X: -defaultX, Y: 0, Z: -defaultY, Active: false },
      }
    },
  },
  actions: {
    editMacroMacro(macro: MacroInfoMacro): void {
      macro.Editable = true
      macro.Text = cleanMacro(macro.Text)
    },
    submitMacroMacro(macro: MacroInfoMacro): void {
      Reflect.deleteProperty(macro, 'Editable')
      macro.Text = cleanMacro(macro.Text)
    },
    editMacroPlace(macro: MacroInfoPlace): void {
      macro.Editable = true
    },
    submitMacroPlace(macro: MacroInfoPlace): void {
      Reflect.deleteProperty(macro, 'Editable')
    },
    newMacro(text?: string) {
      const selectZoneId = Number(this.selectZone)
      if (this.data.zoneId[selectZoneId] === undefined)
        this.data.zoneId[selectZoneId] = []
      if (this.data.zoneId[selectZoneId]) {
        this.data.zoneId[selectZoneId].push({
          Name: 'New Macro',
          Text: text ?? '',
          Editable: true,
          Deletability: true,
        })
      }
    },
    newPlace(place?: WayMarkObj & { Name?: string; MapID?: number }) {
      const selectZoneId = Number(this.selectZone)
      if (this.data.zoneId[selectZoneId] === undefined)
        this.data.zoneId[selectZoneId] = []
      if (this.data.zoneId[selectZoneId]) {
        this.data.zoneId[selectZoneId].push({
          Name: place?.Name ?? 'New WayMark',
          Editable: true,
          Deletability: true,
          Place: structuredClone(Object.assign(this.blankWaymark, place)),
        })
      }
    },
    async importPPJSON(): Promise<void> {
      ElMessageBox.prompt('输入PPJSON', 'Import PPJSON', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^(\{.*\})$/,
        inputErrorMessage: '无效的格式',
      }).then(
        async ({ value }) => {
          const json = Object.assign(this.blankWaymark, safeParseJson(value))
          this.newPlace(json)
          ElMessage.success('导入成功')
        },
        () => {}
      )
    },
    deleteMacro(macro: MacroInfoMacro | MacroInfoPlace): void {
      if (
        ('Text' in macro && (macro?.Text ?? '').length <= 5) ||
        ('Place' in macro &&
          macro.Place.A.Active === false &&
          macro.Place.B.Active === false &&
          macro.Place.C.Active === false &&
          macro.Place.D.Active === false &&
          macro.Place.One.Active === false &&
          macro.Place.Two.Active === false &&
          macro.Place.Three.Active === false &&
          macro.Place.Four.Active === false)
      ) {
        const index = this.data.zoneId[this.selectZone]!.indexOf(macro)
        if (index > -1) this.data.zoneId[this.selectZone]!.splice(index, 1)
      } else {
        ElMessageBox.confirm('确定要删除吗?', '警告', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        })
          .then(() => {
            const index = this.data.zoneId[this.selectZone]!.indexOf(macro)
            if (index > -1) this.data.zoneId[this.selectZone]!.splice(index, 1)
          })
          .catch(() => {})
      }
    },
    exportWaymarksJson(macro: MacroInfoPlace): void {
      const json = JSON.parse(JSON.stringify(macro.Place))
      json.MapID = getMapIDByTerritoryType(Number(this.selectZone))
      json.Name = macro.Name
      copyToClipboard(
        JSON.stringify({
          Name: json.Name,
          MapID: json.MapID,
          A: json.A,
          B: json.B,
          C: json.C,
          D: json.D,
          One: json.One,
          Two: json.Two,
          Three: json.Three,
          Four: json.Four,
        })
      )
      ElMessage.success('已复制到剪贴板')
    },
    sendMacroParty(text: string): void {
      ElMessageBox.confirm('确定要发送到队伍频道吗?', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
        .then(() => {
          macroCommand(text, 'p')
        })
        .catch(() => {})
    },
    sendMacroEcho(text: string): void {
      macroCommand(text, 'e')
    },
    doLocalWayMark(place: WayMarkObj): void {
      doWayMarks(place, true)
      ElMessage.success('已尝试本地标点')
    },
    doPartyWayMark(place: WayMarkObj): void {
      doWayMarks(place, false)
      ElMessage.success('已尝试公开标点')
    },
    doSlotWayMark(place: WayMarkObj): void {
      ElMessageBox({
        title: '选择插槽',
        message: () =>
          h(ElInputNumber, {
            modelValue: slotIndex.value,
            min: 1,
            max: 30,
            size: 'large',
            'onUpdate:modelValue': (val) => {
              slotIndex.value = val
            },
          }),
        showCancelButton: true,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      })
        .then(() => {
          doInsertPreset(
            Number(this.selectZone),
            place,
            slotIndex.value as Slot
          )
          ElMessage.success(`已尝试写入至插槽${slotIndex.value}`)
        })
        .catch(() => {})
    },
    positioning(): void {
      this.selectZone = this.data.zoneId[Number(this.zoneNow)]
        ? this.zoneNow
        : '-1'
    },
    handleChangeZone(e: {
      zoneID: { toString: () => string }
      zoneName: string
    }): void {
      this.zoneNow = e.zoneID.toString()
      this.zoneNowName = e.zoneName
      this.positioning()
    },
    resetZone(): void {
      ElMessageBox.confirm('确定要重置当前地图的所有标点吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
        .then(() => {
          this.data.zoneId[this.selectZone]!.length = 0
          this.data.zoneId[this.selectZone]!.push(
            ...JSON.parse(JSON.stringify(defaultMacro.zoneId[this.selectZone]))
          )
          ElMessage.success('重置成功')
        })
        .catch(() => {})
    },
    resetAllData(): void {
      ElMessageBox.confirm('要重置所有数据吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
        .then(() => {
          ElMessageBox.confirm('你确定吗？', '警告', {
            confirmButtonText: '确定！',
            cancelButtonText: '取消',
            type: 'warning',
          }).then(() => {
            // localStorage.removeItem("my-macros");
            this.data = JSON.parse(JSON.stringify(defaultMacro))
            ElMessage.success('重置成功')
          })
        })
        .catch(() => {})
    },
  },
})

export { useMacroStore, contentTypeLabel, showContentTypes }
