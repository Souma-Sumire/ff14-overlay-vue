import { useUrlSearchParams } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { loadKeigenn } from '@/utils/keigenn'

const params = useUrlSearchParams('hash')

export const useKeigennRecord2Store = defineStore('keigennRecord2.1', {
  state: () => {
    return {
      userOptions: {
        scale: computed(() => parseParams(params.scale as string, 1)), // 缩放倍率
        opacity: computed(() => parseParams(params.opacity as string, 0.9)), // 透明度
        targetType: computed(() => parseParams(params.targetType as 'icon' | 'job', 'icon')), // 显示目标图标
        iconType: computed(() => parseParams(params.iconType as string, 3)), // 目标图标类型
        parseAA: computed(() => parseParams(params.parseAA as string, true)), // 解析自动攻击（旧结果不会跟随改变）
        parseDoT: computed(() => parseParams(params.parseDoT as string, false)), // 解析DoT（旧结果不会跟随改变）
        minimize: computed(() => parseParams(params.minimize as string, false)), // 启动时迷你化
        actionCN: computed(() => parseParams(params.actionCN as string, true)), // action显示中文化
        statusCN: computed(() => parseParams(params.statusCN as string, true)), // status显示中文化
      },
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
      this.isBrowser = !window.OverlayPluginApi && !params.OVERLAY_WS && !params.HOST_PORT
      if (this.isBrowser)
        setTimeout(() => this.checkIsBrowser(), 1000)
    },
    formatterName(v: string) {
      return v
    },
    initEnvironment(name: string) {
      if (/^[A-Z]\S+ [A-Z]\S+$/.test(name)) {
        // 国际服
        loadKeigenn('Global')
      }
      else {
        // 国服
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

  if (typeof def === 'string') {
    return v as T
  }

  return def
}
