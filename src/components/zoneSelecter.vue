<script setup lang="ts">
import { useLang } from '@/composables/useLang'
import { useZoneOptions } from '@/resources/contents'
import type { PropType } from 'vue'

const { t } = useLang()

const { groupedZoneOptions } = useZoneOptions(t)

const props = defineProps({
  selectZone: {
    type: String,
    default: '',
    required: true,
  },
  width: {
    type: String,
    default: '30em',
  },
  size: {
    type: String as PropType<'small' | 'default' | 'large'>,
    default: 'small',
  },
  clearable: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: '选择区域',
  },
})

const emit = defineEmits(['update:selectZone'])

const localSelectZone = ref(props.selectZone)

watch(localSelectZone, (val) => emit('update:selectZone', val))
watch(
  () => props.selectZone,
  (val) => (localSelectZone.value = val)
)
</script>

<template>
  <el-cascader
    :placeholder="props.placeholder"
    v-model="localSelectZone"
    :options="groupedZoneOptions"
    :show-all-levels="true"
    :props="{ emitPath: false }"
    :style="{ width: props.width }"
    :size="props.size"
    filterable
    :clearable="props.clearable"
  />
</template>
