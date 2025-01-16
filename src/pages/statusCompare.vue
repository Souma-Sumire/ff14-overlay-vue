<script setup lang="ts">
// // import status705 from '@/resources/status-compare-705.json'
// // import status701 from '@/resources/status-compare-701.json'
// // import status700 from '@/resources/status-compare-700.json'
// // import status658hf2 from '@/resources/status-compare-658hf2.json'
import { completeIcon, statusData } from '@/resources/status'
import status710 from '@/resources/status-compare-710.json'
import status711 from '@/resources/status-compare-711.json'

interface Compare { id: string, name: { ja: string, en: string, cn: string }, description: { ja: string, en: string, cn: string }, icon: string, classJobCategory: number }

const typeMap = {
  7.11: compareStatus(status711, status710),
  // 7.10: compareStatus(status710, status705),
  // 7.05: compareStatus(status705, status701),
  // '7.01': compareStatus(status701, status700),
  // '7.00': compareStatus(status700, status658hf2),
}
const type = ref(Object.keys(typeMap)[0] as unknown as keyof typeof typeMap)
const onlyAllClasses = ref(true)
const ALL_CLASSES_JOB_CATEGORY_KEY = 1
useStorage('compareType', type)
useStorage('onlyAllClasses', onlyAllClasses)

function compareStatus(newStatus: any, oldStatus: any) {
  const result: Compare[] = []
  for (const key in newStatus) {
    if (!Object.prototype.hasOwnProperty.call(oldStatus, key)) {
      const { name, description, icon } = newStatus[key as keyof typeof newStatus]
      if (name === '') {
        continue
      }
      result.push({ id: key, name, description, icon: completeIcon(Number(icon)), classJobCategory: statusData[key as unknown as keyof typeof statusData]?.[2] ?? 'unknown' })
    }
  }
  return result
}
</script>

<template>
  <div>
    <el-select v-model="type" placeholder="请选择版本">
      <el-option v-for="item in Object.keys(typeMap)" :key="item" :label="`${item} 新增状态`" :value="item" />
    </el-select>
    <el-checkbox v-model="onlyAllClasses" label="只显示通用状态" />
    <main>
      <el-table :data="typeMap[type].filter(item => !item.name.ja.startsWith('●') && (!onlyAllClasses || item.classJobCategory === ALL_CLASSES_JOB_CATEGORY_KEY))" style="width: 100%">
        <el-table-column prop="id" label="ID(Dec)" width="80" />
        <el-table-column prop="id" label="ID(Hex)" width="80">
          <template #default="scope">
            {{ parseInt(scope.row.id).toString(16).toUpperCase() }}
          </template>
        </el-table-column>
        <el-table-column label="图标" width="60">
          <template #default="scope">
            <img :src="`//xivapi.com/i/${scope.row.icon}.png`" alt="">
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" width="250">
          <template #default="scope">
            <ul class="name-list">
              <li>日：{{ scope.row.name.ja }}</li>
              <li>英：{{ scope.row.name.en }}</li>
              <li>汉：{{ scope.row.name.souma }}</li>
            </ul>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述">
          <template #default="scope">
            <ul class="name-list">
              <li>日：{{ scope.row.description.ja.replaceAll(/<hex:[^>]+?>/g, '') }}</li>
              <li>英：{{ scope.row.description.en.replaceAll(/<hex:[^>]+?>/g, '') }}</li>
              <li>汉：{{ scope.row.description.souma.replaceAll(/<hex:[^>]+?>/g, '') || '-' }}</li>
            </ul>
          </template>
        </el-table-column>
      </el-table>
    </main>
  </div>
</template>

<style scoped lang='scss'>
.name-list {
  overflow: hidden;
  text-wrap:nowrap;
  text-overflow: ellipsis;
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
