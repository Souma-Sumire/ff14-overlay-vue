<script setup lang="ts">
import TestTsx from "@/components/TestTsx";
function clickHandler() {
  console.log("click!");
}

//获取当前时间

function test() {
  console.log("test");
  localStorage.setItem("test", Date.now().toString());
}

window.addEventListener("storage", (event) => {
  console.log("storage", event);
});

</script>

<template>
  <div>
    <TestTsx @testEmit="clickHandler"> </TestTsx>
    <div>
      <button @click="test">测试</button>
    </div>
  </div>
</template>
