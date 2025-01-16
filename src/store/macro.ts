/* eslint-disable regexp/no-super-linear-backtracking */
import type { MacroInfoMacro, MacroInfoPlace } from '@/types/macro'
import type { PPJSON, QueueArr, Slot, WayMarkKeys } from '@/types/PostNamazu'
import { copyToClipboard } from '@/utils/clipboard'
import { ElInputNumber, ElMessage, ElMessageBox } from 'element-plus'
import { defineStore } from 'pinia'
import { addOverlayListener } from '../../cactbot/resources/overlay_plugin_api'
import {
  getMapIDByTerritoryType,
  getTerritoryTypeByMapID,
} from '../resources/contentFinderCondition'
import zoneInfo from '../resources/zoneInfo'
import {
  doInsertPreset,
  doQueueActions,
  doTextCommand,
  doWayMarks,
} from '../utils/postNamazu'
import { defaultMacro } from './../resources/macro'

let partyLen = 0
const slotIndex = useStorage('macro-slot-index', 5)

addOverlayListener('PartyChanged', (e) => {
  partyLen = e.party.length
})

const [show, toggleShow] = useToggle(true)

export const useMacroStore = defineStore('macro', {
  state: () => {
    return {
      data: useStorage('my-macros', reactive(defaultMacro)),
      selectZone: useStorage('my-zone', ref('1226')),
      zoneNow: useStorage('my-zone-now', ref('1226')),
      fastEntrance: [
        { text: '佐拉加', value: '1201' },
        { text: '艳翼蛇鸟', value: '1196' },
        { text: 'M1S', value: '1226' },
        { text: 'M2S', value: '1228' },
        { text: 'M3S', value: '1230' },
        { text: 'M4S', value: '1232' },
      ],
      show,
      toggleShow,
    }
  },
  getters: {
    defaultX: state => zoneInfo[Number(state.selectZone)]?.offsetX ?? 0,
    defaultY: state => zoneInfo[Number(state.selectZone)]?.offsetY ?? 0,
  },
  actions: {
    editMacroMacro(macro: MacroInfoMacro): void {
      this.data.zoneId[this.selectZone].map(v =>
        Reflect.deleteProperty(v, 'Editable'),
      )
      macro.Editable = true
      macro.Text = cleanMacro(macro.Text)
    },
    submitMacroMacro(macro: MacroInfoMacro): void {
      Reflect.deleteProperty(macro, 'Editable')
      macro.Text = cleanMacro(macro.Text)
    },
    editMacroPlace(macro: MacroInfoPlace): void {
      this.data.zoneId[this.selectZone].map(v =>
        Reflect.deleteProperty(v, 'Editable'),
      )
      macro.Editable = true
    },
    submitMacroPlace(macro: MacroInfoPlace): void {
      Reflect.deleteProperty(macro, 'Editable')
    },
    formatAllWaymarkPlaceData() {
      for (const x in this.data.zoneId)
        this.formatSelectZoneWaymarkPlaceData(x)
    },
    formatSelectZoneWaymarkPlaceData(zone: string) {
      for (const y in this.data.zoneId[zone]) {
        Reflect.deleteProperty(this.data.zoneId[zone][y], 'Editable')
        if ('Place' in this.data.zoneId[zone][y]) {
          const d = this.data.zoneId[zone][y] as MacroInfoPlace;
          (this.data.zoneId[zone][y] as MacroInfoPlace).Place = {
            A: d?.Place?.A ?? {
              X: -this.defaultX,
              Y: 0,
              Z: -this.defaultY,
              Active: false,
            },
            B: d?.Place?.B ?? {
              X: -this.defaultX,
              Y: 0,
              Z: -this.defaultY,
              Active: false,
            },
            C: d?.Place?.C ?? {
              X: -this.defaultX,
              Y: 0,
              Z: -this.defaultY,
              Active: false,
            },
            D: d?.Place?.D ?? {
              X: -this.defaultX,
              Y: 0,
              Z: -this.defaultY,
              Active: false,
            },
            One: d?.Place?.One ?? {
              X: -this.defaultX,
              Y: 0,
              Z: -this.defaultY,
              Active: false,
            },
            Two: d?.Place?.Two ?? {
              X: -this.defaultX,
              Y: 0,
              Z: -this.defaultY,
              Active: false,
            },
            Three: d?.Place?.Three ?? {
              X: -this.defaultX,
              Y: 0,
              Z: -this.defaultY,
              Active: false,
            },
            Four: d?.Place?.Four ?? {
              X: -this.defaultX,
              Y: 0,
              Z: -this.defaultY,
              Active: false,
            },
          }
        }
      }
    },
    newOne(type: 'macro' | 'place' = 'macro') {
      for (const x in this.data.zoneId) {
        for (const y in this.data.zoneId[x])
          Reflect.deleteProperty(this.data.zoneId[x][y], 'Editable')
      }
      const selectZoneId = Number(this.selectZone)
      if (this.data.zoneId[selectZoneId] === undefined)
        this.data.zoneId[selectZoneId] = []
      if (this.data.zoneId[selectZoneId]) {
        if (type === 'macro') {
          this.data.zoneId[selectZoneId].push({
            Name: 'New Macro',
            Text: '',
            Editable: true,
            Deletability: true,
          })
        }
        else if (type === 'place') {
          const i = this.data.zoneId[selectZoneId].push({
            Name: 'New WayMark',
            Editable: true,
            Deletability: true,
            Place: {
              A: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
              B: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
              C: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
              D: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
              One: {
                X: -this.defaultX,
                Y: 0,
                Z: -this.defaultY,
                Active: false,
              },
              Two: {
                X: -this.defaultX,
                Y: 0,
                Z: -this.defaultY,
                Active: false,
              },
              Three: {
                X: -this.defaultX,
                Y: 0,
                Z: -this.defaultY,
                Active: false,
              },
              Four: {
                X: -this.defaultX,
                Y: 0,
                Z: -this.defaultY,
                Active: false,
              },
            },
          })
          return this.data.zoneId[selectZoneId][i - 1]
        }
      }
    },
    async importPPJSON(): Promise<void> {
      const selectZoneId = Number(this.selectZone)
      const blank: PPJSON = {
        A: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
        B: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
        C: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
        D: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
        One: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
        Two: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
        Three: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
        Four: { X: -this.defaultX, Y: 0, Z: -this.defaultY, Active: false },
      }
      ElMessageBox.prompt('输入PPJSON', 'Import PPJSON', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^(\{.*\})$/,
        inputErrorMessage: '无效的格式',
      })
        .then(async ({ value }) => {
          const json = Object.assign(
            { MapID: -1, Name: 'json' },
            Object.assign(blank, JSON.parse(value)),
          )
          const selectMapID = getMapIDByTerritoryType(selectZoneId)
          const selectZone = zoneInfo[selectZoneId]
          const JSONZone = zoneInfo[getTerritoryTypeByMapID(json.MapID)]
          let flag = true
          if (json.MapID !== selectMapID) {
            const confirm = await ElMessageBox.confirm(
              `PPJSON中的地图${JSONZone.name.cn ?? JSONZone.name.ja ?? `${JSONZone.name.en}`
              }(${json.MapID})), 与当前选择的地图${selectZone.name.cn
              ?? selectZone.name.ja
              ?? `${selectZone.name.en}`
              }(${selectMapID})不一致, 是否继续?`,
              '警告',
              {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
              },
            )
            if (confirm !== 'confirm')
              flag = false
          }
          if (!flag)
            return
          const targetMacro = this.newOne('place') as MacroInfoPlace
          targetMacro.Name = json.Name
          targetMacro.Place = json
          Reflect.deleteProperty(targetMacro, 'Editable')
          const oX = selectZone.offsetX - JSONZone.offsetX
          const oY = selectZone.offsetY - JSONZone.offsetY
          try {
            (
              [
                'A',
                'B',
                'C',
                'D',
                'One',
                'Two',
                'Three',
                'Four',
              ] as WayMarkKeys[]
            ).forEach((key) => {
              // biome-ignore lint/style/noNonNullAssertion: <explanation>
              targetMacro.Place[key]!.X -= oX
              // biome-ignore lint/style/noNonNullAssertion: <explanation>
              targetMacro.Place[key]!.Z -= oY
            })
          }
          catch (e) {
            // 为什么catch里不传参还会报错啊？？？
            void e
            ElMessage.error('解析失败')
            return
          }
          Reflect.deleteProperty(targetMacro.Place, 'MapID')
          Reflect.deleteProperty(targetMacro.Place, 'Name')
          ElMessage.success('导入成功')
        })
        .catch(() => ElMessage.error('解析失败'))
    },
    deleteMacro(macro: MacroInfoMacro | MacroInfoPlace): void {
      if (
        ('Text' in macro && (macro?.Text ?? '').length <= 5)
        || ('Place' in macro
          && macro.Place.A?.Active === false
          && macro.Place.B?.Active === false
          && macro.Place.C?.Active === false
          && macro.Place.D?.Active === false
          && macro.Place.One?.Active === false
          && macro.Place.Two?.Active === false
          && macro.Place.Three?.Active === false
          && macro.Place.Four?.Active === false
        )
      ) {
        const index = this.data.zoneId[this.selectZone].indexOf(macro)
        if (index > -1)
          this.data.zoneId[this.selectZone].splice(index, 1)
      }
      else {
        ElMessageBox.confirm('确定要删除吗?', '警告', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        })
          .then(() => {
            const index = this.data.zoneId[this.selectZone].indexOf(macro)
            if (index > -1)
              this.data.zoneId[this.selectZone].splice(index, 1)
          })
          .catch(() => { })
      }
    },
    exportWaymarksJson(macro: MacroInfoPlace): void {
      const json = JSON.parse(JSON.stringify(macro.Place))
      json.MapID = getMapIDByTerritoryType(Number(this.selectZone))
      json.Name = macro.Name
      copyToClipboard(JSON.stringify({
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
      }))
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
        .catch(() => { })
    },
    sendMacroEcho(text: string): void {
      macroCommand(text, 'e')
    },
    doLocalWayMark(place: PPJSON): void {
      doWayMarks(place, true)
      ElMessage.success('已本地标点')
    },
    doPartyWayMark(place: PPJSON): void {
      doWayMarks(place, false)
      ElMessage.success('已公开标点')
    },
    doSlotWayMark(place: PPJSON): void {
      ElMessageBox({
        title: '选择插槽',
        message: () =>
          h(ElInputNumber, {
            'modelValue': slotIndex.value,
            'min': 1,
            'max': 30,
            'size': 'large',
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
            slotIndex.value as Slot,
          )
          ElMessage.success(`已尝试写入至插槽${slotIndex.value}`)
        })
        .catch(() => { })
    },
    positioning(): void {
      this.selectZone = this.zoneNow
    },
    handleChangeZone(e: {
      zoneID: { toString: () => string }
      zoneName: string
    }): void {
      this.selectZone = e.zoneID.toString()
      this.zoneNow = e.zoneID.toString()
      getZoneIDByZoneName(e.zoneName)
      // || ElMessage(`未知区域 ${e.zoneName} ${e.zoneID}`)
    },
    // handleGameExists(e: any): void {
    //   this.gameExists = !!e?.detail?.exists;
    // },
    handleLogLine(e: { line: string[] }) {
      if (e.line[2] === '0038') {
        if (/^duty$/i.test(e.line[4])) {
          toggleShow()
          return
        }
        const echoSwitch = e.line[4].match(
          /^(?:发宏|宏|macro|hong|fahong)\s*(?<channel>e|p)?(?<party>[!！])?\s*$/i,
        )
        if (echoSwitch) {
          const channel = (
            echoSwitch?.groups?.party ? 'p' : echoSwitch?.groups?.channel ?? 'e'
          ) as 'e' | 'p'
          const macro = this.data.zoneId[this.zoneNow]?.filter(
            v => 'Text' in v && v.Text.length > 0,
          )
          if (macro?.length === 0 || !macro) {
            doTextCommand('/e 当前地图没有宏<se.3>')
          }
          else if (macro.length === 1 && 'Text' in macro[0]) {
            macroCommand(macro[0].Text, channel)
          }
          else if (macro.length > 1) {
            doTextCommand(
              '/e 本地图存在多个宏，无法使用快捷发宏，请手动在网页中指定。',
            )
            show.value = true
          }
          else {
            console.error(macro)
          }
          return
        }
        const echoSlot = (e.line[4]).match(
          /^(?:标点|标记|场景标记|place|biaodian)(?:插槽|预设)?\s*(?<slot>[1-5])?.*?(?<mark>[!！])?\s*$/i,
        )
        if (echoSlot) {
          const slotIndex: Slot = Number(echoSlot?.groups?.slot ?? 5) as Slot
          const place = this.data.zoneId[this.zoneNow]?.filter(
            v => 'Place' in v,
          )
          if (place?.length === 0 || !place) {
            doTextCommand('/e 当前地图没有标点<se.3>')
          }
          else if (place.length === 1) {
            doInsertPreset(
              Number(this.zoneNow),
              (place[0] as MacroInfoPlace).Place,
              slotIndex,
            )
            doTextCommand(`/e 已写入第${slotIndex}格<se.9>`)
            if (echoSlot?.groups?.mark) {
              doQueueActions([
                {
                  c: 'DoTextCommand',
                  p: `/waymark preset ${slotIndex}`,
                  d: 500,
                },
              ])
            }
          }
          else if (place.length > 1) {
            show.value = true
            doTextCommand(
              '/e 本地图存在多个场景标记预设，无法使用快捷插槽，请手动在网页中指定。',
            )
          }
          else {
            console.error(place)
          }
        }
      }
    },
    resetZone(): void {
      ElMessageBox.confirm('确定要重置当前地图的所有标点吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
        .then(() => {
          this.data.zoneId[this.selectZone].length = 0
          this.data.zoneId[this.selectZone].push(
            ...JSON.parse(JSON.stringify(defaultMacro.zoneId[this.selectZone])),
          )
          this.formatSelectZoneWaymarkPlaceData(this.selectZone)
          ElMessage.success('重置成功')
        })
        .catch(() => { })
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
            this.formatSelectZoneWaymarkPlaceData(this.selectZone)
            ElMessage.success('重置成功')
          })
        })
        .catch(() => { })
    },
    updateZone(): void {
      for (const key in this.data.zoneId) {
        const userData = this.data.zoneId[key].filter(v => v.Deletability)
        const nativeData = defaultMacro.zoneId[key] ?? []
        try {
          this.data.zoneId[key] = [...userData, ...nativeData]
        }
        catch (e) {
          console.error(e)
          this.data.zoneId[key] = [...userData]
        }
      }
    },
  },
})
export function cleanMacro(text: string): string {
  let res = text
  res = res.replaceAll(/\n{2,}/g, '\n')
  res = res.replaceAll(/^\s+/gm, '')
  res = res.replaceAll(/ /g, '\xA0')
  return res
}
export function getZoneIDByZoneName(ZoneName: string) {
  for (const zoneId in zoneInfo) {
    const zone = zoneInfo[zoneId]
    for (const lang in zone.name) {
      const zoneName = zone.name[lang as keyof typeof zone.name]
      if (
        zoneName?.toUpperCase() === ZoneName.toUpperCase()
        || zoneName === ZoneName.replaceAll(/[()]/g, '')
      ) {
        return zoneId
      }
    }
  }
}

async function macroCommand(text: string, channel: 'e' | 'p') {
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
