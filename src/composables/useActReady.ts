import { onMounted, ref } from 'vue'
import { callOverlayHandler } from '../../cactbot/resources/overlay_plugin_api'
import { useDevMode } from './useDevMode'

const dev = useDevMode()

export function useActReady() {
  const actReady = ref(false)

  async function checkAct(): Promise<void> {
    if (dev.value) {
      actReady.value = true
      return
    }
    await new Promise<void>((resolve) => {
      callOverlayHandler({ call: 'cactbotRequestState' }).then(() => {
        actReady.value = true
        resolve()
      })
      setTimeout(() => {
        if (!actReady.value)
          checkAct()
      }, 3000)
    })
  }

  onMounted(checkAct)

  return actReady
}
