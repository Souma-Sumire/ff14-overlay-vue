<!-- eslint-disable vue/no-irregular-whitespace -->
<!-- eslint-disable no-irregular-whitespace -->
<script setup lang="ts">
import type { Ref } from 'vue'

interface Action {
  id: number
  job: string
  name: string
  ja: string
  cn: string
}

const actions: Ref<Action[]> = ref([
])

const allJobs = ref(Array.from(new Set(actions.value.map(v => v.job))))

const selectJob = ref(allJobs.value[0])
useStorage('7.0-select-job', selectJob)

function format(str: string) {
  return str
    .replaceAll('<hex:024804F201F803><hex:024904F201F903>', '<span style="color:#00cc22;">')
    .replaceAll('<hex:024804F201FA03><hex:024904F201FB03>', '<span style="color:#ffff66;">')
    .replaceAll('<hex:0249020103><hex:0248020103>', '</span>')
    .replaceAll('<hex:02100103>', '<br>')
    .replaceAll(
      '<hex:024804F201F403><hex:024904F201F503>',
      '<span style="color:#ff7b1a;">',
    ).replaceAll(/(<)(hex:[^>]+)(>)/g, '&lt;$2&gt;')
}

function onChange(_e: Event, action: Action) {
  nextTick(() => {
    action.cn = action.cn.replaceAll(/\n/g, '<hex:02100103>')
  })
}
</script>

<template>
  <div class="app" flex="~ col nowrap">
    <a href="https://github.com/Souma-Sumire/FFXIVChnTextPatch-Souma/issues/34" target="_blank">为防止重复工作，请先到Issues进行预定</a>
    <el-form>
      <el-form-item label="筛选职业">
        <el-select
          v-model="selectJob"
          placeholder="Select"
        >
          <el-option
            v-for="item in allJobs"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <div
      v-for="(action, index) in actions.filter(v => v.job === selectJob)"
      :key="index" flex="~ row" wrap gap-2
      :style="{ border: '2px dashed lightblue' }"
    >
      <div :style="{ width: '12em' }">
        <p>职业：{{ action.job }}</p>
        <p>ID：{{ action.id }}</p>
        <p>技能：{{ action.name }}</p>
      </div>
      <div flex-1 gap-1 class="grid">
        <div class="format" v-html="format(action.ja)" />
        <el-input v-model="action.ja" style="flex:2" type="textarea" autosize disabled />
        <div class="format" v-html="format(action.cn)" />
        <el-input v-model="action.cn" style="flex:2" type="textarea" autosize @keyup="onChange($event, action)" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.format {
  border: 1px solid #ccc;
  padding: 0.5em;
  background-color: #333;
  color: white;
  font-family: '宋体';
}
.grid{
    // 两列两行布局
    display:grid;
    grid-template-columns: 1fr 1fr; /* 创建两列，均等分 */
    grid-template-rows: 1fr 1fr; /* 创建两行，均等分 */

}
</style>
