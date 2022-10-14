<script setup lang="ts">
type Animals = "dog" | "cat" | "panda" | "fox" | "red_panda" | "koala" | "bird" | "raccoon" | "kangaroo";
const animals: Record<Animals, string> = {
  "dog": "狗",
  "cat": "猫",
  "panda": "熊猫",
  "fox": "狐狸",
  "red_panda": "浣熊",
  "koala": "考拉",
  "bird": "鸟",
  "raccoon": "浣熊",
  "kangaroo": "袋鼠",
};
const img = ref("");
const text = ref("");
async function getAnimal(animal: Animals) {
  text.value = "正在加载...";
  img.value = "";
  const res = await fetch(`https://some-random-api.ml/animal/${animal}`);
  const json = await res.json();
  img.value = json.image;
  text.value = json.fact;
}
getAnimal("cat");
</script>

<template>
  <el-header>
    <el-button v-for="animal in Object.keys(animals)" :key="animal" @click="getAnimal(animal as Animals)">
      {{ animals[animal as Animals] }}
    </el-button>
  </el-header>
  <el-main>
    <el-card style="width: 500px">
      <p>{{ text }}</p>
      <img :src="img" style="width: 100%" />
    </el-card>
  </el-main>
</template>
