import { completeIcon } from '@/resources/status'

function iconToSrc(icon: number) {
  return `//cafemaker.wakingsands.com/i/${completeIcon(icon)}_hr1.png`
}
export { iconToSrc }
