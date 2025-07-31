import { useUrlSearchParams } from '@vueuse/core'
import { computed } from 'vue'

const params = useUrlSearchParams('hash')
const dev = computed(() => params.dev === '1')

function useDev() {
  return dev
}

export { useDev }
