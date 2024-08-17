<script setup lang="ts">
const emits = defineEmits<{
  (e: 'handleLine', line: string): unknown
  (e: 'beforeHandle'): void
  (e: 'afterHandle'): void
}>()

const input = ref<HTMLInputElement | null>(null)
const select = ref<HTMLInputElement | null>(null)

async function onChange(e: Event) {
  select.value?.classList.remove('drag')
  const files = (e.target as HTMLInputElement).files
  if (!files || files.length === 0)
    return

  emits('beforeHandle')

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const text = await file.text()
    for (const line of text.split('\n'))
      emits('handleLine', line)
  }

  emits('afterHandle')
  select.value?.classList.remove('drag')
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  select.value?.classList.add('drag')
}
function onDragEnd(e: DragEvent) {
  e.preventDefault()
  select.value?.classList.remove('drag')
}

onMounted(() => {
  input.value?.addEventListener('change', onChange)
  select.value?.addEventListener('dragover', onDragOver)
  select.value?.addEventListener('dragleave', onDragEnd)
})
onUnmounted(() => {
  input.value?.removeEventListener('change', onChange)
  select.value?.removeEventListener('dragover', onDragOver)
  select.value?.removeEventListener('dragleave', onDragEnd)
})
</script>

<template>
  <div class="upload select">
    <div ref="select" class="upload-select">
      <div class="upload text">
        <span>+</span>
        <p>上传或拖入ACT日志</p>
      </div>
      <input ref="input" type="file">
    </div>
  </div>
</template>

<style lang="scss" scoped>
.upload {
  color: black;
  // margin: 10px;
  .upload-select {
    min-width: 300px;
    height: 75px;
    border: 1px solid #ccc;
    border-radius: 10px;
    position: relative;
    background-color: #fff;
    input {
      cursor: pointer;
      opacity: 0;
      height: 100%;
      width: 100%;
    }
    .text {
      span {
        position: absolute;
        top: calc(50% - 0.2em);
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 50px;
      }
      p {
        position: absolute;
        top: calc(50% + 0.2em);
        left: 50%;
        transform: translate(-50%, -50%);
      }
    }
    &:hover,
    &.drag {
      border-color: #000;
      background-color: #eee;
    }
  }
}
</style>
