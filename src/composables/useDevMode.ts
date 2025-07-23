import { useUrlSearchParams } from '@vueuse/core'
import { computed } from 'vue'

export function useDevMode() {
  const params = useUrlSearchParams('hash')
  const dev = computed(() => params.dev === '1')

  return dev
}
