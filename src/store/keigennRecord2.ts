import { useUrlSearchParams } from '@vueuse/core'
import { defineStore } from 'pinia'

const params = useUrlSearchParams('hash')

const DEBUG_SHOW_HEALS = false // 调试用：主表显示治疗记录

export const useKeigennRecord2Store = defineStore('keigennRecord2', {
  state: () => {
    return {
      userOptions: {
        scale: parseParams(params.scale as string, 1), // 缩放倍率
        opacity: parseParams(params.opacity as string, 0.9), // 透明度
        targetType: parseParams(params.targetType as 'icon' | 'job', 'icon'), // 显示目标图标
        iconType: parseParams(params.iconType as string, 2), // 目标图标类型
        parseAA: parseParams(params.parseAA as string, true), // 解析自动攻击（旧结果不会跟随改变）
        parseDoT: parseParams(params.parseDoT as string, false), // 解析DoT（旧结果不会跟随改变）
        minimize: parseParams(params.minimize as string, false), // 启动时迷你化
        actionCN: parseParams(params.actionCN as string, true), // action显示中文化
        statusCN: parseParams(params.statusCN as string, true), // status显示中文化
        order: parseParams(params.order as 'unshift' | 'push', 'unshift'), // 数据排列顺序
      },
      debugShowHeals: DEBUG_SHOW_HEALS,
      isBrowser: false,
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
    checkIsBrowser() {
      this.isBrowser
        = !window.OverlayPluginApi && !params.OVERLAY_WS && !params.HOST_PORT
      if (this.isBrowser)
        setTimeout(() => this.checkIsBrowser(), 1000)
    },
    formatterName(v: string) {
      const global = /^([A-Z])\S+ ([A-Z])\S+/
      if (global.test(v)) {
        return v.replace(global, '$1.$2')
      }
      return `${v.at(0)}.${v.at(-1)}`
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

  if (typeof def === 'string') {
    return v as T
  }

  return def
}
