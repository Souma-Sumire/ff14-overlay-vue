import { customRef } from 'vue'

export function debounceRef<T>(value: T, duration = 1000) {
  let timer: NodeJS.Timeout | null = null

  return customRef((track, trigger) => {
    return {
      get() {
        track()
        return value
      },
      set(val) {
        if (timer)
          clearTimeout(timer)

        // biome-ignore lint/style/noParameterAssign:
        value = val
        timer = setTimeout(() => {
          trigger()
          timer = null // 清除定时器引用
        }, duration)
      },
    }
  })
}
