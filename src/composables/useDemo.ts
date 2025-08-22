import { onMounted, onUnmounted, ref } from 'vue'

const demo = ref(false)
let initialized = false
let listeners = 0

function handleOverlayStateUpdate(e: CustomEvent<{ isLocked: boolean }>) {
  demo.value = e?.detail?.isLocked === false
}

function useDemo() {
  onMounted(() => {
    listeners++
    if (!initialized) {
      demo.value =
        document.getElementById('unlocked')?.style?.display === 'flex'
      document.addEventListener(
        'onOverlayStateUpdate',
        handleOverlayStateUpdate,
      )
      initialized = true
    }
  })

  onUnmounted(() => {
    listeners--
    if (listeners <= 0 && initialized) {
      document.removeEventListener(
        'onOverlayStateUpdate',
        handleOverlayStateUpdate,
      )
      initialized = false
    }
  })

  return demo
}

export { useDemo }
