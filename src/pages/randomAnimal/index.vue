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
const fact = ref("");
async function getAnimal(animal: Animals) {
  const res = await fetch(`https://some-random-api.ml/animal/${animal}`);
  const json = await res.json();
  img.value = json.image;
  fact.value = json.fact;
}
getAnimal("cat");
</script>

<template>
  <div>
    <el-button v-for="animal in Object.keys(animals)" :key="animal" @click="getAnimal(animal as Animals)">
      {{ animals[animal as Animals] }}
    </el-button>
    <img :src="img" max-w-sm />
    <p>{{ fact }}</p>
  </div>
</template>
