<script setup lang="ts">
onMounted(() => {
  import('@/router').then((router) => {
    router.default.push('/startPages')
  },
  )
})
</script>

<template>
  <div />
</template>

<style scoped lang='scss'>

</style>
