<script setup lang="ts">
import type { KeigennSkill, SkillScope } from "@/types/keigennRecord2";
import type { Lang } from "@/types/lang";
import { ElPopconfirm } from "element-plus";
import { computed, nextTick, ref, watch } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import { localeToCactbotLang, useLang } from "@/composables/useLang";
import { GLOBAL_SKILL_MAX_LEVEL } from "@/resources/globalSkills";
import { keigennSkills } from "@/resources/keigennSkillResource";
import { getActionChinese } from "@/resources/logic/actionChinese";
import { resolveBakedActionMeta } from "@/resources/logic/actionMetaResolver";
import { useKeigennRecord2Store } from "@/store/keigennRecord2";
import { idToSrc, parseDynamicValue } from "@/utils/dynamicValue";
import { getCachedJobIconUrl, getEffectiveJobOrder } from "@/utils/keigennRecord2";
import Util from "@/utils/util";
import { EMPTY_IMAGE, handleImgError, rerouteImgSrc } from "@/utils/xivapi";

const emit = defineEmits<{
  back: [];
  close: [];
}>();

type RoleTab = "all" | "tank" | "healer" | "dps";

interface SortSkillItem {
  id: number;
  name: string;
  icon: string;
  recast: number;
  scope: SkillScope;
  scopeBadge: string;
}

interface SortJobEntry {
  jobEnum: number;
  jobName: string;
  jobIconSrc: string;
  role: Exclude<RoleTab, "all">;
}

const ROLE_TABS: { value: RoleTab; labelKey: string }[] = [
  { value: "all", labelKey: "keigennRecord.settings.roleAll" },
  { value: "tank", labelKey: "keigennRecord.settings.roleTank" },
  { value: "healer", labelKey: "keigennRecord.settings.roleHealer" },
  { value: "dps", labelKey: "keigennRecord.settings.roleDps" },
];

const DEFAULT_SCOPE_PRIORITY: Record<SkillScope, number> = {
  party: 0,
  other: 1,
  single: 1,
  self: 2,
};

const { t, locale } = useLang();
const store = useKeigennRecord2Store();
const userOptions = store.userOptions;
const activeRole = ref<RoleTab>("all");
const sortBodyRef = ref<HTMLElement | null>(null);

watch(activeRole, () => {
  nextTick(() => {
    if (sortBodyRef.value) {
      sortBodyRef.value.scrollTop = 0;
    }
  });
});

const TRACKED_BATTLE_JOB_SET = new Set<number>(
  Util.getBattleJobs3()
    .map((job) => Util.jobToJobEnum(job))
    .filter((jobEnum) => keigennSkills.some((s) => s.job.includes(jobEnum))),
);

const JOB_SKILLS_RAW = new Map<number, KeigennSkill[]>();
for (const jobEnum of TRACKED_BATTLE_JOB_SET) {
  const skills = keigennSkills.filter((s) => s.job.includes(jobEnum));
  skills.sort((a, b) => {
    if (a.scope !== b.scope) {
      return DEFAULT_SCOPE_PRIORITY[a.scope] - DEFAULT_SCOPE_PRIORITY[b.scope];
    }
    const recastA = parseDynamicValue(a.recast1000ms, GLOBAL_SKILL_MAX_LEVEL);
    const recastB = parseDynamicValue(b.recast1000ms, GLOBAL_SKILL_MAX_LEVEL);
    if (recastA !== recastB) return recastB - recastA;
    return a.id - b.id;
  });
  JOB_SKILLS_RAW.set(jobEnum, skills);
}

function resolveRole(jobEnum: number): Exclude<RoleTab, "all"> {
  const job = Util.jobEnumToJob(jobEnum);
  if (Util.isTankJob(job)) return "tank";
  if (Util.isHealerJob(job)) return "healer";
  return "dps";
}

function getScopeBadge(scope: SkillScope): string {
  if (scope === "party") return t("keigennRecord.scope.party");
  if (scope === "other") return t("keigennRecord.scope.other");
  if (scope === "self") return t("keigennRecord.scope.self");
  return t("keigennRecord.settings.scopeSingleBoth");
}

function toSkillItem(skill: KeigennSkill): SortSkillItem {
  const name =
    getActionChinese(skill.id) || resolveBakedActionMeta(skill.id)?.name || String(skill.id);
  const recast = parseDynamicValue(skill.recast1000ms, GLOBAL_SKILL_MAX_LEVEL);
  return {
    id: skill.id,
    name,
    icon: rerouteImgSrc(idToSrc(skill.id)),
    recast,
    scope: skill.scope,
    scopeBadge: getScopeBadge(skill.scope),
  };
}

const orderedJobs = computed<SortJobEntry[]>(() => {
  const fullOrder = getEffectiveJobOrder(userOptions.jobOrder).filter((jobEnum) =>
    TRACKED_BATTLE_JOB_SET.has(jobEnum),
  );
  const cLang = localeToCactbotLang(locale.value as Lang);
  return fullOrder
    .map((jobEnum) => {
      const job = Util.jobEnumToJob(jobEnum);
      const fullName = Util.jobToFullName(job);
      return {
        jobEnum,
        jobName: fullName?.[cLang] || fullName?.cn || fullName?.en || job,
        jobIconSrc: getCachedJobIconUrl(Util.jobEnumToIcon(jobEnum), userOptions.iconType),
        role: resolveRole(jobEnum),
      };
    })
    .filter((entry) => activeRole.value === "all" || entry.role === activeRole.value);
});

function getOrderedSkillsForJob(jobEnum: number): SortSkillItem[] {
  const base = JOB_SKILLS_RAW.get(jobEnum) ?? [];
  const custom = userOptions.jobSkillOrder[jobEnum];
  if (!custom || custom.length === 0) {
    return base.map(toSkillItem);
  }
  const rankMap = new Map<number, number>();
  custom.forEach((id, idx) => rankMap.set(id, idx));
  const sorted = [...base].sort((a, b) => {
    const rankA = rankMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const rankB = rankMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    return 0;
  });
  return sorted.map(toSkillItem);
}

const orderedSkillsByJob = computed<Record<number, SortSkillItem[]>>(() => {
  const result: Record<number, SortSkillItem[]> = {};
  for (const job of orderedJobs.value) {
    result[job.jobEnum] = getOrderedSkillsForJob(job.jobEnum);
  }
  return result;
});

function handleJobOrderUpdate(nextList: SortJobEntry[]) {
  const nextIds = nextList.map((item) => item.jobEnum);
  if (activeRole.value === "all") {
    userOptions.jobOrder = nextIds;
    return;
  }
  const fullOrder = getEffectiveJobOrder(userOptions.jobOrder).filter((jobEnum) =>
    TRACKED_BATTLE_JOB_SET.has(jobEnum),
  );
  let cursor = 0;
  userOptions.jobOrder = fullOrder.map((jobEnum) =>
    resolveRole(jobEnum) === activeRole.value ? nextIds[cursor++]! : jobEnum,
  );
}

function handleSkillOrderUpdate(jobEnum: number, nextSkills: SortSkillItem[]) {
  userOptions.jobSkillOrder = {
    ...userOptions.jobSkillOrder,
    [jobEnum]: nextSkills.map((s) => s.id),
  };
}

function resetSort() {
  userOptions.jobOrder = [];
  userOptions.jobSkillOrder = {};
}

function handleJobImgError(e: Event) {
  const img = e.target as HTMLImageElement;
  if (img.src !== EMPTY_IMAGE) {
    img.src = EMPTY_IMAGE;
  }
}
</script>

<template>
  <div class="skill-sort-panel">
    <div class="sort-header">
      <button type="button" class="toolbar-btn sort-back-btn" @click="emit('back')">
        ← {{ t("keigennRecord.settings.back") }}
      </button>
      <span class="sort-title">{{ t("keigennRecord.settings.skillSortTitle") }}</span>
    </div>

    <div class="sort-role-tabs">
      <button
        v-for="tab in ROLE_TABS"
        :key="tab.value"
        type="button"
        class="sort-role-tab"
        :class="{ 'is-active': activeRole === tab.value }"
        @click="activeRole = tab.value"
      >
        {{ t(tab.labelKey) }}
      </button>
    </div>

    <div ref="sortBodyRef" class="sort-body">
      <VueDraggable
        :model-value="orderedJobs"
        handle=".sort-job-head"
        :animation="150"
        :force-fallback="true"
        :fallback-on-body="true"
        :fallback-tolerance="2"
        fallback-class="sort-drag-fallback"
        chosen-class="sort-drag-chosen"
        ghost-class="sort-drag-ghost"
        class="sort-job-list"
        @update:model-value="handleJobOrderUpdate"
      >
        <div v-for="job in orderedJobs" :key="job.jobEnum" class="sort-job-row">
          <div class="sort-job-head">
            <span class="job-drag-handle" title="⋮⋮">⋮⋮</span>
            <img
              v-if="job.jobIconSrc"
              :src="job.jobIconSrc"
              class="sort-job-icon"
              draggable="false"
              @error="handleJobImgError"
            />
            <span class="sort-job-name">{{ job.jobName }}</span>
          </div>
          <VueDraggable
            :model-value="orderedSkillsByJob[job.jobEnum]"
            :animation="150"
            :force-fallback="true"
            :fallback-on-body="true"
            :fallback-tolerance="2"
            fallback-class="sort-drag-fallback"
            chosen-class="sort-drag-chosen"
            ghost-class="sort-drag-ghost"
            class="sort-skill-list"
            @update:model-value="handleSkillOrderUpdate(job.jobEnum, $event)"
          >
            <div
              v-for="skill in orderedSkillsByJob[job.jobEnum]"
              :key="skill.id"
              class="sort-skill-item"
              :title="`${skill.name} (${skill.recast}s · ${skill.scopeBadge})`"
            >
              <img
                :src="skill.icon"
                class="sort-skill-img"
                draggable="false"
                @error="handleImgError"
              />
              <span class="sort-skill-scope" :class="`is-${skill.scope}`">
                {{ skill.scopeBadge }}
              </span>
            </div>
          </VueDraggable>
        </div>
      </VueDraggable>
    </div>

    <div class="sort-footer">
      <ElPopconfirm
        :title="t('keigennRecord.settings.resetSortConfirm')"
        :confirm-button-text="t('keigennRecord.settings.confirm')"
        :cancel-button-text="t('keigennRecord.settings.cancel')"
        :width="184"
        placement="top-start"
        popper-class="keigenn-settings-popconfirm"
        @confirm="resetSort"
      >
        <template #reference>
          <button type="button" class="toolbar-btn">
            {{ t("keigennRecord.settings.resetDefaults") }}
          </button>
        </template>
      </ElPopconfirm>
      <button v-if="!store.isBrowser" type="button" class="toolbar-btn" @click="emit('close')">
        {{ t("keigennRecord.settings.close") }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.skill-sort-panel {
  display: flex;
  flex-direction: column;
  height: min(460px, calc(100vh - 16px));
  min-height: 0;
}

.sort-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;

  .sort-back-btn {
    flex-shrink: 0;
  }

  .sort-title {
    font-size: 13px;
    font-weight: 600;
    color: #eef2f7;
  }
}

.sort-role-tabs {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.sort-role-tab {
  position: relative;
  height: 28px;
  padding: 0 2px;
  background: transparent;
  border: none;
  font-size: 12px;
  color: #8f98a8;
  cursor: pointer;
  transition: color 0.12s ease;

  &:hover {
    color: #e6ebf2;
  }

  &.is-active {
    color: #eef2f7;
    font-weight: 600;

    &::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 2px;
      background: #4c8df6;
    }
  }
}

.sort-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 8px 10px 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.22) transparent;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
    margin: 4px 0;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 999px;

    &:hover {
      background: rgba(255, 255, 255, 0.36);
    }
  }
}

.sort-job-list {
  display: flex;
  flex-direction: column;
}

.sort-job-row {
  padding: 6px 0 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  user-select: none;

  &:last-child {
    border-bottom: none;
  }
}

.sort-job-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  margin-bottom: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.04);
  cursor: grab;
  user-select: none;
  transition: background-color 0.12s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.085);
  }

  &:active {
    cursor: grabbing;
    background: rgba(76, 141, 246, 0.14);
  }

  .job-drag-handle {
    color: #747d8c;
    font-size: 11px;
    line-height: 1;
    user-select: none;
    transition: color 0.12s ease;
  }

  &:hover .job-drag-handle {
    color: #c5ccd6;
  }

  .sort-job-icon {
    width: 16px;
    height: 16px;
    object-fit: contain;
    display: block;
    pointer-events: none;
  }

  .sort-job-name {
    font-size: 12px;
    font-weight: 600;
    color: #dbe2ec;
  }
}

.sort-skill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding-left: 2px;
}

.sort-skill-item {
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 3px;
  overflow: hidden;
  background: #222;
  cursor: grab;
  flex-shrink: 0;
  user-select: none;

  &:active {
    cursor: grabbing;
  }

  .sort-skill-img {
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
  }

  .sort-skill-scope {
    position: absolute;
    right: 0;
    bottom: 0;
    padding: 0 3px;
    font-size: 12px;
    line-height: 14px;
    font-weight: 500;
    white-space: nowrap;
    color: #f1f5f9;
    background: rgba(14, 16, 20, 0.86);
    border-top-left-radius: 3px;
    transform: scale(0.75);
    transform-origin: right bottom;
    pointer-events: none;

    &.is-party {
      color: #93c5fd;
    }

    &.is-other,
    &.is-single {
      color: #fcd34d;
    }

    &.is-self {
      color: #86efac;
    }
  }
}

@media (max-width: 400px) {
  .sort-skill-list {
    gap: 2px;
  }

  .sort-skill-item {
    width: 24px;
    height: 24px;

    .sort-skill-scope {
      transform: scale(0.7);
    }
  }
}

.sort-drag-ghost {
  opacity: 0.28 !important;
}

.sort-drag-chosen {
  opacity: 0.95;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 9px;
  font-size: 12px;
  line-height: 1;
  color: #c5ccd6;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 2px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background-color 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease;

  &:hover {
    color: #ffffff;
    background-color: rgba(255, 255, 255, 0.11);
    border-color: rgba(255, 255, 255, 0.3);
  }
}

.sort-footer {
  padding: 9px 14px;
  background: rgba(0, 0, 0, 0.18);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}
</style>

<style lang="scss">
.sort-drag-fallback {
  z-index: 5000 !important;
  opacity: 0.96 !important;
  pointer-events: none !important;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.72) !important;
  outline: 1.5px solid #4c8df6;
  border-radius: 3px;

  &.sort-job-row {
    background: #20232a;
    padding: 7px 8px;
    border-bottom: none;
  }
}
</style>
