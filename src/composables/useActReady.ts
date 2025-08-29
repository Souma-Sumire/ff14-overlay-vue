import { onMounted, ref } from 'vue'
import { callOverlayHandler } from '../../cactbot/resources/overlay_plugin_api'
import { useDev } from './useDev'

const params = useUrlSearchParams('hash')
const dev = useDev()

export function useActReady() {
  const actReady = ref(false)

  async function checkAct(): Promise<void> {
    if (dev.value) {
      actReady.value = true
      return
    }
    if (params.OVERLAY_WS !== undefined) {
      // 使用WS参数时，不检测。使用场景：OBS添加需要ACT的悬浮窗，且此时未启动ACT时。
      actReady.value = true
      return
    }
    await new Promise<void>((resolve) => {
      callOverlayHandler({ call: 'getLanguage' }).then(() => {
        actReady.value = true
        resolve()
      })
      setTimeout(() => {
        if (!actReady.value) checkAct()
      }, 3000)
    })
  }

  onMounted(checkAct)

  return actReady
}
