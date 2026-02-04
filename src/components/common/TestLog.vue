<script setup lang="ts">
import { UploadFilled } from '@element-plus/icons-vue'
import { ElIcon, ElLoading } from 'element-plus'
import { useLang } from '@/composables/useLang'

const emits = defineEmits<{
  (e: 'handleLine', line: string): unknown
  (e: 'beforeHandle'): void
  (e: 'afterHandle'): void
}>()

const { t } = useLang()

const input = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

async function processFiles(files: FileList | null) {
  if (!files || files.length === 0)
    return

  emits('beforeHandle')

  const instance = ElLoading.service({
    fullscreen: true,
    text: t('testLog.loading'),
    lock: true,
    background: 'rgba(0, 0, 0, 0.7)',
  })

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!
      const text = await file.text()
      const lines = text.split('\n')
      for (const line of lines) {
        emits('handleLine', line)
      }
    }
  }
  finally {
    instance.close()
    emits('afterHandle')
    if (input.value)
      input.value.value = ''
  }
}

function onChange(e: Event) {
  isDragOver.value = false
  const files = (e.target as HTMLInputElement).files
  processFiles(files)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}
function onDragLeave(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const files = e.dataTransfer?.files || null
  processFiles(files)
}
</script>

<template>
  <div
    class="upload-container"
    :class="{ 'is-dragover': isDragOver }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div class="content">
      <ElIcon class="icon" :size="32">
        <UploadFilled />
      </ElIcon>
      <div class="text-group">
        <p class="title">
          {{ $t('testLog.upload') }}
        </p>
      </div>
    </div>

    <!-- Input 覆盖层 -->
    <input
      ref="input"
      type="file"
      multiple
      accept=".log,.txt"
      class="file-input"
      @change="onChange"
    >
  </div>
</template>

<style lang="scss" scoped>
.upload-container {
  position: relative;
  width: 100%;
  max-width: 400px;
  height: 100px;
  border-radius: 12px;
  border: 2px dashed var(--el-border-color);
  background: var(--el-bg-color-overlay); // 使用 Element Plus 变量适配深色模式
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  cursor: pointer;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-primary);

  &:hover,
  &.is-dragover {
    border-color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);

    .icon {
      color: var(--el-color-primary);
      transform: translateY(-2px);
    }
  }

  &.is-dragover {
    background-color: var(--el-color-primary-light-8);
    transform: scale(1.01);
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    pointer-events: none; // 确保不遮挡 input 的点击
    transition: transform 0.3s;
  }

  .icon {
    color: var(--el-text-color-secondary);
    transition: all 0.3s;
  }

  .text-group {
    text-align: center;

    .title {
      font-size: 14px;
      font-weight: 500;
      margin: 0;
      line-height: 1.4;
    }
  }

  .file-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    z-index: 10;
  }
}
</style>
