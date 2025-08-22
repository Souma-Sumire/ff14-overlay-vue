import { customRef } from 'vue'

export function debounceRef<T>(value: T, duration = 1000) {
  let timer: number | null = null

  return customRef((track, trigger) => {
    return {
      get() {
        track()
        return value
      },
      set(val) {
        if (timer) clearTimeout(timer)

        // biome-ignore lint/style/noParameterAssign:
        value = val
        timer = window.setTimeout(() => {
          trigger()
          timer = null // 清除定时器引用
        }, duration)
      },
    }
  })
}
