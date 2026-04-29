<script setup lang="ts">
import { useRouter } from "vue-router";
import { onMounted } from "vue";

const router = useRouter();

onMounted(() => {
  router.push("/startPages");
});
</script>

<template>
  <div />
</template>

<style scoped lang="scss"></style>
