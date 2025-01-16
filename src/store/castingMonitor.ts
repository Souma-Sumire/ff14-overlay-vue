import type { Party } from 'cactbot/types/event'
import Util from '@/utils/util'
import { getFullImgSrc, hostCache, parseAction, site } from '@/utils/xivapi'
import { defineStore } from 'pinia'
import { callOverlayHandler } from '../../cactbot/resources/overlay_plugin_api'

const params = new URLSearchParams(window.location.href.split('?')[1])

const THNSort = ['tank', 'healer', 'dps', 'crafter', 'gatherer', 'none']
// const testActions = [
//   24283, 24284, 24285, 24286, 24287, 24288, 24289, 24290, 24294, 24295, 24296,
//   24297, 24298, 24299, 24300, 24301, 24302, 24303, 24304, 24305, 24306, 24307,
//   24309, 24310, 24311, 24312, 24313, 24315, 24316, 24317, 24318,
// ];

const testActions = [
  34563,
  34564,
  34565,
  34566,
  34567,
  34568,
  34569,
  34570,
  34571,
  34572,
  34573,
  34574,
  34575,
  34576,
  34577,
  34578,
  34579,
  34580,
  34581,
  34582,
]
export const useCastingMonitorStore = defineStore('castingMonitor', {
  state: () => {
    return {
      castData: [] as {
        casterId: string
        src: string
        time: number
        expirationTime: number
        class: string
        key: string
        logLine: number
      }[],
      playerId: '',
      focusTargetId: '',
      partyData: [] as {
        id: string
        name: string
        job: number
        inParty: boolean
        src: string
      }[],
      config: {
        duration: Number(params.get('duration') || 15),
      },
      // lastPush: Date.now(),
    }
  },
  getters: {
    partyDataFormatted(state) {
      return state.partyData.sort((a, b) => {
        return (
          THNSort.indexOf(Util.jobToRole(Util.jobEnumToJob(a.job)))
          - THNSort.indexOf(Util.jobToRole(Util.jobEnumToJob(b.job)))
        )
      })
    },
    focusTargetCastArr(state) {
      return state.castData.filter(v => v.casterId === state.focusTargetId)
    },
  },
  actions: {
    testAction(): void {
      const actionId
        = testActions[Math.floor(Math.random() * testActions.length)]
      void this.pushAction(Date.now(), 15, '青魔技能随机', this.focusTargetId, actionId)
      // this.pushAction(
      //   Date.now(),
      //   14,
      //   "贤者技能随机",
      //   this.focusTargetId,
      //   actionId,
      //   1,
      // );
      // setTimeout(() => {
      //   this.pushAction(
      //     Date.now(),
      //     15,
      //     "贤者技能随机",
      //     this.focusTargetId,
      //     actionId,
      //   );
      // }, 1000);
    },
    // testItem(): void {
    //   void this.pushAction(
    //     Date.now(),
    //     15,
    //     'item_11c7',
    //     this.focusTargetId,
    //     0x20011C7,
    //   )
    // },
    // testItemHQ(): void {
    //   void this.pushAction(
    //     Date.now(),
    //     15,
    //     'item_f5407',
    //     this.focusTargetId,
    //     0x20F5407,
    //   )
    // },
    testParty(fakeParty: boolean): void {
      this.handlePartyChanged({
        party: fakeParty
          ? [
              {
                id: '10000001',
                name: '测试张三',
                job: 24,
                inParty: true,
                worldId: 0,
              },
              {
                id: '10000002',
                name: '测试李四',
                job: 25,
                inParty: true,
                worldId: 0,
              },
              {
                id: '10000004',
                name: '测试王五',
                job: 19,
                inParty: true,
                worldId: 0,
              },
              {
                id: '10000005',
                name: '测试赵六',
                job: 23,
                inParty: true,
                worldId: 0,
              },
              {
                id: '10000006',
                name: '测试孙七',
                job: 39,
                inParty: true,
                worldId: 0,
              },
              {
                id: '10000007',
                name: '测试周八',
                job: 40,
                inParty: true,
                worldId: 0,
              },
              {
                id: '10000008',
                name: '测试吴九',
                job: 37,
                inParty: true,
                worldId: 0,
              },
              {
                id: '10000009',
                name: '测试郑十',
                job: 38,
                inParty: true,
                worldId: 0,
              },
            ]
          : [],
      })
    },
    async pushAction(
      time: number,
      logLine: number,
      abilityName: string,
      casterId: string,
      abilityId: number,
      cast1000Ms?: number,
    ): Promise<void> {
      if (
        (this.partyData.length === 0 && casterId === this.playerId) || (this.partyData.length > 0 && casterId === this.focusTargetId)) {
        let abiId = abilityId
        let queryType: string = 'action'
        let itemIsHQ = false
        // if (/^(?:item|mount)_/.test(abilityName)) {
        if (abilityName.startsWith('item_')) {
          return
        }
        if (abilityName.startsWith('mount_')) {
          abiId = Number.parseInt(abilityName.replace(/^.+_/, ''), 16)
          // HQ道具 item_fXXXX （转十进制则为10XXXXXX）
          if (abiId > 983040) {
            abiId = Number.parseInt(abiId.toString().slice(-5), 10)
            itemIsHQ = true
          }
          // queryType = abilityName.replace(/_.+$/, '') as 'item' | 'mount'
          queryType = abilityName.replace(/_.+$/, '') as 'mount'
        }
        const key = `${time}-${logLine}-${casterId}-${abilityId}`
        const cast = {
          casterId,
          time,
          expirationTime: Date.now() + this.config.duration * 1000,
          logLine,
          src: '',
          class: '',
          key,
        }
        const cache = hostCache.get(abiId)
        if (cache) {
          cast.src = `//${cache.Host}${cache.Icon}`
        }
        this.castData.push(cast)
        if (logLine === 14 && cast1000Ms) {
          setTimeout(
            () => {
              this.castData = this.castData.filter(v => v?.key !== key)
            },
            cast1000Ms * 1000 - 500,
          )
        }
        if (abilityName.startsWith('unknown_')) {
          cast.src = `${site.first}/i/000000/000405.png`
          cast.class = 'action action-category-0'
        }
        else if (abiId < 100000) {
          const action = cache || await parseAction(queryType, abiId, [
            'ID',
            'Icon',
            'ActionCategoryTargetID',
          ])
          if (action.ID === 3) {
            // 疾跑(冲刺)
            action.Icon = '/i/000000/000104.png'
          }
          if (!cache)
            cast.src = await getFullImgSrc(action?.Icon ?? '', itemIsHQ)
          if (queryType === 'action')
            cast.class = `action action-category-${action?.ActionCategoryTargetID}`
          else if (queryType === 'mount')
            cast.class = 'mount'
        }
      }
    },
    handleChangePrimaryPlayer(e: {
      charID: { toString: (arg0: number) => string }
    }): void {
      this.playerId = e.charID.toString(16).toUpperCase()
      this.focusTargetId = this.playerId
    },
    handleLogLine(e: { line: string[] }): void {
      if (e.line[0] === '20') {
        void this.pushAction(
          Date.now(),
          14,
          e.line[5],
          e.line[2],
          Number.parseInt(e.line[4], 16),
          Number(e.line[8]),
        )
      }
      else if (e.line[0] === '21' || (e.line[0] === '22' && e.line[45] === '0')) {
        void this.pushAction(
          Date.now(),
          15,
          e.line[5],
          e.line[2],
          Number.parseInt(e.line[4], 16),
        )
      }
    },
    handlePartyChanged(e: { party: Party[] }): void {
      if (e.party.length > 0) {
        this.partyData = e.party
          .filter(v => v.inParty)
          .map(v => ({ ...v, src: '' }))
        for (const key in this.castData) {
          if (Object.prototype.hasOwnProperty.call(this.castData, key)) {
            if (!this.partyData.find(v => v.id === key))
              Reflect.deleteProperty(this.castData, key)
          }
        }
        if (!Object.keys(this.partyData).includes(this.focusTargetId)) {
          // 没有之前监控的目标，重置为玩家本人。
          this.focusTargetId = this.playerId
        }
      }
      else {
        // 没有队伍，重置为玩家本人。
        this.focusTargetId = this.playerId
        // 清空队伍数据
        this.partyData.length = 0
      }
    },
    handleClickChangeTarget(targetId: string): void {
      if (targetId === this.focusTargetId) {
        // 重复点击，重置为玩家本人。
        this.focusTargetId = this.playerId
      }
      else {
        this.focusTargetId = targetId
      }
      if (
        /^(?:1|true|yes|on|open|enabled|undefined)$/i.test(params.get('syncFocusWS') || '')
      ) {
        void callOverlayHandler({
          call: 'broadcast',
          source: 'castMonitorOverlay',
          msg: {
            targetId: this.focusTargetId,
          },
        })
      }
    },
    cleanUpExpired(): void {
      this.castData = this.castData.filter(v => v.expirationTime > Date.now())
    },
  },
})
