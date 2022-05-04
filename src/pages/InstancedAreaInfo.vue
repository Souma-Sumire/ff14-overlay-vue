<template>
  <h5>{{ simpleMode ? "" : zoneName }}{{ zoneInstanced }}</h5>
</template>

<script lang="ts" setup>
import { ref } from "vue";

enum InstancedEnum {
  "" = "①",
  "" = "②",
  "" = "③",
  "" = "④",
  "" = "⑤",
  "" = "⑥",
  "" = "⑦",
  "" = "⑧",
  "" = "⑨",
}

addOverlayListener("LogLine", handleLogLine);
startOverlayEvents();

let zoneName = ref("");
let zoneInstanced = ref("");
const simpleMode = urlTool(location.href)?.simple === "true";

function urlTool(url: string) {
  const array = url.split("?")!.pop()!.split("&");
  const data: any = {};
  array!.forEach((ele) => {
    let dataArr = ele.split("=");
    data[dataArr[0]] = dataArr[1];
  });
  return data;
}
function handleLogLine(event: any) {
  if (event.line[0] === "00" && event.line[2] === "0039") {
    const match =
      event.line[4].match(/当前所在副本区为“(?<zoneName>[^”]+)(?<zoneInstanced>[])”/) ??
      event.line[4].match(/You are now in the instanced area (?<zoneName>.+?)(?<zoneInstanced>[])”/) ??
      event.line[4].match(/インスタンスエリア「(?<zoneName>.+?)(?<zoneInstanced>[])」/);
    if (match) {
      zoneName.value = match.groups.zoneName;
      zoneInstanced.value = InstancedEnum[match.groups.zoneInstanced as keyof typeof InstancedEnum];
    }
  } else if (event.line[0] === "01") {
    zoneName.value = event.line[3];
    zoneInstanced.value = "";
  }
}
</script>

<style lang="scss" scoped>
h5 {
  font-family: emoji;
  font-size: large;
  color: rgb(254, 254, 253);
  text-shadow: -1px 0 3px rgb(179, 137, 21), 0 1px 3px rgb(179, 137, 21), 1px 0 3px rgb(179, 137, 21), 0 -1px 3px rgb(179, 137, 21);
  text-align: end;
  overflow: hidden;
  padding: 3px;
  margin: 0;
}
</style>
