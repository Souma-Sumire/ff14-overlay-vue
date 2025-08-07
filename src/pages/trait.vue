<script setup lang="ts">
import { computed, ref } from 'vue'
import ja2cn from '@/resources/ja2cn.json'

const inputValue = ref('')

const outputValue = computed(() => {
  let result = inputValue.value.replace(
    '特定のアクションの威力を上昇させる。',
    '部分技能的威力提高',
  )

  const regex = />([^<]+?)の威力：/g
  result = result.replace(regex, (_, actionName) => {
    const translated = ja2cn[actionName]
    return translated ? `>${translated}的威力：` : `>${actionName}的威力：`
  })

  return result.replace(/^"|"$/g, '')
})
</script>

<template>
  <el-row :gutter="20" p-2>
    <el-col :span="12">
      <el-form-item label="原文">
        <el-input
          v-model="inputValue"
          type="textarea"
          :rows="20"
          placeholder="请输入内容"
        />
      </el-form-item>
    </el-col>

    <el-col :span="12">
      <el-form-item label="翻译后">
        <el-input
          v-model="outputValue"
          type="textarea"
          :rows="20"
          :disabled="true"
          placeholder="转换后的内容"
        />
      </el-form-item>
    </el-col>
  </el-row>
</template>

<style scoped lang="scss">
.el-form-item {
  margin-bottom: 20px;
}
</style>
