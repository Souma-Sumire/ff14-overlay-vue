<template>
  <div>
    单行测试
    <input type="text" v-model="testInput" />
    <button @click="test">test</button>
  </div>
  <div class="upload select">
    <div class="upload-select" ref="select">
      <div class="upload text">
        <span>+</span>
        <p>上传或拖入ACT日志</p>
      </div>
      <input type="file" ref="input" />
    </div>
  </div>
</template>

<script setup lang="ts">
const emits = defineEmits<{
  (e: "handleLine", line: string): unknown;
  (e: "beforeHandle"): void;
  (e: "afterHandle"): void;
}>();

const testInput = ref("");
const test = () => {
  emits("beforeHandle");
  emits("handleLine", testInput.value);
  emits("afterHandle");
};

const input = ref<HTMLInputElement | null>(null);
const select = ref<HTMLInputElement | null>(null);

const onChange = async (e: Event) => {
  select.value?.classList.remove("drag");
  const files = (e.target as HTMLInputElement).files;
  if (!files || files.length == 0) {
    return;
  }

  emits("beforeHandle");

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const text = await file.text();
    text.split("\n").forEach((line) => {
      emits("handleLine", line);
    });
  }

  emits("afterHandle");
  select.value?.classList.remove("drag");
};

const onDragOver = (e: DragEvent) => {
  e.preventDefault();
  select.value?.classList.add("drag");
};
const onDragEnd = (e: DragEvent) => {
  e.preventDefault();
  select.value?.classList.remove("drag");
};

onMounted(() => {
  input.value?.addEventListener("change", onChange);
  select.value?.addEventListener("dragover", onDragOver);
  select.value?.addEventListener("dragleave", onDragEnd);
});
onUnmounted(() => {
  input.value?.removeEventListener("change", onChange);
  select.value?.removeEventListener("dragover", onDragOver);
  select.value?.removeEventListener("dragleave", onDragEnd);
});
</script>

<style lang="scss" scoped>
.upload {
  margin: 10px;
  .upload-select {
    min-width: 400px;
    height: 100px;
    border: 1px solid #ccc;
    border-radius: 10px;
    position: relative;
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
