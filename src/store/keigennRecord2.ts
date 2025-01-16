import { loadKeigenn } from '@/utils/keigenn'
import { defineStore } from 'pinia'

const params = useUrlSearchParams('hash')

export const useKeigennRecord2Store = defineStore('keigennRecord2', {
  state: () => {
    return {
      userOptions: {
        scale: parseParams(params.scale as string, 1), // 缩放倍率
        opacity: parseParams(params.opacity as string, 0.8), // 透明度
        showHeader: parseParams(params.showHeader as string, true), // 显示表头
        showIcon: parseParams(params.showIcon as string, true), // 显示目标图标
        showName: parseParams(params.showName as string, false), // 显示目标ID
        abbrId: parseParams(params.abbrId as string, true), // 目标ID缩写
        anonymous: parseParams(params.anonymous as string, true), // 目标ID改为职业名
        replaceWithYou: parseParams(params.replaceWithYou as string, false), // 目标是玩家本人替换为YOU
        parseAA: parseParams(params.parseAA as string, true), // 解析自动攻击（旧结果不会跟随改变）
        parseDoT: parseParams(params.parseDoT as string, false), // 解析DoT（旧结果不会跟随改变）
        minimize: parseParams(params.minimize as string, false), // 启动时迷你化
        actionCN: parseParams(params.actionCN as string, true), // action显示中文化
        statusCN: parseParams(params.statusCN as string, true), // status显示中文化
      },
      isBrowser: false,
      isLocalhost: false,
    }
  },
  getters: {
    icon4k(state) {
      return state.userOptions.scale >= 2 || window.devicePixelRatio >= 2
        ? '_hr1'
        : ''
    },
  },
  actions: {
    recheckIsDev() {
      this.isBrowser = !window.OverlayPluginApi && !params.OVERLAY_WS && !params.HOST_PORT
      this.isLocalhost = location.hostname === 'localhost'
      if (this.isBrowser)
        setTimeout(() => this.recheckIsDev(), 1000)
    },
    formatterName(v: string) {
      return v
    },
    initEnvironment(name: string) {
      if (/^[A-Z]\S+ [A-Z]\S+$/.test(name)) {
        // 国际服
        if (this.userOptions.abbrId) {
          this.formatterName = (v: string) =>
            v.replace(/^([A-Z])\S+ ([A-Z])\S+$/, '$1.$2.')
        }
        loadKeigenn('Global')
      }
      else {
        // 国服
        if (this.userOptions.abbrId)
          this.formatterName = (v: string) => v.substring(0, 2)
        loadKeigenn('Chinese')
      }
    },
  },
})

function parseParams<T>(v: string, def: T): T {
  if (typeof def === 'boolean') {
    if (v === '0' || v?.toLocaleLowerCase() === 'false')
      return false as T
    if (v === '1' || v?.toLocaleLowerCase() === 'true')
      return true as T
    return def
  }
  if (typeof def === 'number')
    return Number.isNaN(+v) ? def : (+v as T)

  return def
}
