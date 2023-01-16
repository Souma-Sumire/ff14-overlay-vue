<script setup lang="ts">
const roleAssignLocationNames: Record<Role, string[]> = {
  tank: [
    "MT",
    "ST",
    "T3",
    "T4",
    "T5",
    "T6",
    "T7",
    "T8",
    "T9",
    "T10",
    "T11",
    "T12",
    "T13",
    "T14",
    "T15",
    "T16",
    "T17",
    "T18",
    "T19",
    "T20",
    "T21",
    "T22",
    "T23",
    "T24",
  ],
  healer: [
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "H7",
    "H8",
    "H9",
    "H10",
    "H11",
    "H12",
    "H13",
    "H14",
    "H15",
    "H16",
    "H17",
    "H18",
    "H19",
    "H20",
    "H21",
    "H22",
    "H23",
    "H24",
  ],
  dps: [
    "D1",
    "D2",
    "D3",
    "D4",
    "D5",
    "D6",
    "D7",
    "D8",
    "D9",
    "D10",
    "D11",
    "D12",
    "D13",
    "D14",
    "D15",
    "D16",
    "D17",
    "D18",
    "D19",
    "D20",
    "D21",
    "D22",
    "D23",
    "D24",
  ],
  unknown: ["unknown"],
};
const defaultSortArray = [
  "21", //战
  "32", //暗
  "37", //枪
  "19", //骑
  "33", //占
  "24", //白
  "40", //贤
  "28", //学
  "34", //侍
  "30", //忍
  "39", //钐
  "22", //龙
  "20", //僧
  "38", //舞
  "23", //诗
  "31", //机
  "25", //黑
  "27", //召
  "35", //赤
  "36", //青
];
const fakeParty = [
  { id: "10000001", name: "Faker1", job: 21, inParty: true },
  { id: "10000002", name: "Faker2", job: 19, inParty: true },
  { id: "10000003", name: "Faker3", job: 33, inParty: true },
  { id: "10000004", name: "Faker4", job: 28, inParty: true },
  { id: "10000005", name: "Faker5", job: 30, inParty: true },
  { id: "10000006", name: "Faker6", job: 34, inParty: true },
  { id: "10000007", name: "Faker7", job: 25, inParty: true },
  { id: "10000008", name: "Faker8", job: 38, inParty: true },
];
function getJobName(job: number) {
  switch (job.toString()) {
    case "1":
      return "剑术";
    case "2":
      return "格斗";
    case "3":
      return "斧术";
    case "4":
      return "枪术";
    case "5":
      return "弓箭";
    case "6":
      return "幻术";
    case "7":
      return "咒术";
    case "19":
      return "骑士";
    case "20":
      return "武僧";
    case "21":
      return "战士";
    case "22":
      return "龙骑";
    case "23":
      return "诗人";
    case "24":
      return "白魔";
    case "25":
      return "黑魔";
    case "26":
      return "秘术";
    case "27":
      return "召唤";
    case "28":
      return "学者";
    case "29":
      return "双剑";
    case "30":
      return "忍者";
    case "31":
      return "机工";
    case "32":
      return "暗骑";
    case "33":
      return "占星";
    case "34":
      return "武士";
    case "35":
      return "赤魔";
    case "36":
      return "青魔";
    case "37":
      return "绝枪";
    case "38":
      return "舞者";
    case "39":
      return "钐镰";
    case "40":
      return "贤者";
    default: {
      return "unknown";
    }
  }
}
const data: {
  party: {
    id: string;
    name: string;
    rp: string;
    inParty: boolean;
    job: number;
  }[];
} = reactive({ party: [] });
const roleSelectLength = {
  tank: 0,
  healer: 0,
  dps: 0,
  unknown: 1,
};
function updateRoleSelectLength(): void {
  roleSelectLength.tank = data.party.reduce((p, c) => (getJobClassification(c.job) === "tank" ? p + 1 : p), 0);
  roleSelectLength.healer = data.party.reduce((p, c) => (getJobClassification(c.job) === "healer" ? p + 1 : p), 0);
  roleSelectLength.dps = data.party.reduce((p, c) => (getJobClassification(c.job) === "dps" ? p + 1 : p), 0);
}
if (location.href.includes("localhost")) {
  handlePartyChanged({ party: fakeParty });
}
type Role = "tank" | "healer" | "dps" | "unknown";
function getJobClassification(job: number): Role {
  if ([1, 3, 19, 21, 32, 37].includes(job)) return "tank";
  else if ([6, 24, 28, 33, 40].includes(job)) return "healer";
  else if ([2, 4, 5, 7, 20, 22, 23, 25, 26, 27, 29, 30, 31, 34, 35, 36, 38, 39].includes(job)) return "dps";
  return "unknown";
}
function handlePartyChanged(e: { party: { id: string; name: string; inParty: boolean; job: number }[] }): void {
  if (location.href.includes("localhost") && e.party.length === 0) return;
  data.party = e.party
    .map((p) => {
      return { ...p, rp: "" };
    })
    .sort((a, b) => defaultSortArray.indexOf(a.job.toString()) - defaultSortArray.indexOf(b.job.toString()));
  data.party.forEach((v) => (v.rp = getRP(v.job)));
  updateRoleSelectLength();
}
function handleSelectChange(i: number): void {
  const t = data.party.find((v) => v.rp === data.party[i].rp && v.id !== data.party[i].id);
  t && (t.rp = getRP(t.job));
}
function getRP(job: number): string {
  return (
    roleAssignLocationNames[getJobClassification(job)].find((role) => !data.party.find((v) => v.rp === role)) ??
    "unknown"
  );
}
watch(
  data,
  () => {
    callOverlayHandler({
      call: "broadcast",
      source: "soumaRuntimeJS",
      msg: { party: data.party },
    });
  },
  { deep: true, immediate: true },
);
onMounted(() => {
  addOverlayListener("PartyChanged", handlePartyChanged);
  startOverlayEvents();
});
onBeforeUnmount(() => {
  removeOverlayListener("PartyChanged", handlePartyChanged);
});
</script>

<template>
  <el-container>
    <el-main
      style="text-shadow: 1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black; color: white">
      <div v-for="(member, i) in data.party" :key="member.id">
        <el-select v-model="member.rp" size="small" style="width: 3.5em" m-0 p-0 @change="handleSelectChange(i)">
          <el-option
            v-for="(item, index) in roleAssignLocationNames[getJobClassification(member.job)]"
            v-show="index < roleSelectLength[getJobClassification(member.job)]"
            :key="index"
            :value="item"
            :fit-input-width="true" />
        </el-select>
        {{ getJobName(member.job) }} {{ member.name }}
      </div>
    </el-main>
  </el-container>
</template>
