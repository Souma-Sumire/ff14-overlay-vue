<script setup lang="ts">
import type { KeySkillSnapshot, Scope } from "@/types/keigennRecord2";
import { computed } from "vue";
import { useLang } from "@/composables/useLang";
import { keigennSkills } from "@/resources/keigennSkillResource";
import { useKeigennRecord2Store } from "@/store/keigennRecord2";
import { getCachedJobIconUrl, getEffectiveJobOrder, sortKeySkills } from "@/utils/keigennRecord2";
import Util from "@/utils/util";
import { EMPTY_IMAGE } from "@/utils/xivapi";
import SkillCooldownIcon from "./SkillCooldownIcon.vue";

const props = withDefaults(
  defineProps<{
    skills: KeySkillSnapshot[];
    targetId: string;
    layout: "matrix" | "group" | "flat";
    anonymous?: boolean;
    singleInBoth?: boolean;
  }>(),
  {
    anonymous: false,
    singleInBoth: false,
  },
);

const SINGLE_SKILL_IDS = new Set(
  keigennSkills.filter((s) => s.scope === "single").map((s) => s.id),
);

interface SkillPlayerRow {
  ownerId: string;
  ownerName: string;
  shortName: string;
  ownerJob: number;
  jobIconSrc: string;
  isTarget: boolean;
  hasDuplicateJob: boolean;
  skillsByScope: Record<Scope, KeySkillSnapshot[]>;
}

const SKILL_SCOPE_META: { scope: Scope; labelKey: string }[] = [
  { scope: "party", labelKey: "keigennRecord.scope.party" },
  { scope: "other", labelKey: "keigennRecord.scope.other" },
  { scope: "self", labelKey: "keigennRecord.scope.self" },
];

const { t } = useLang();
const store = useKeigennRecord2Store();

function clampColCount(val: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(val) || val <= 0) return fallback;
  return Math.min(max, Math.max(min, Math.round(val)));
}

const layoutLimitVars = computed(() => {
  const partyCols = clampColCount(store.userOptions.skillColsMatrixParty, 4, 1, 10);
  const otherCols = clampColCount(store.userOptions.skillColsMatrixOther, 3, 1, 8);
  const selfCols = clampColCount(store.userOptions.skillColsMatrixSelf, 3, 1, 8);
  const groupCols = clampColCount(store.userOptions.skillColsGroup, 6, 2, 12);
  const flatCols = clampColCount(store.userOptions.skillColsFlat, 7, 3, 14);
  return {
    "--skill-cols-party": String(partyCols),
    "--skill-cols-other": String(otherCols),
    "--skill-cols-self": String(selfCols),
    "--skill-cols-group": String(groupCols),
    "--skill-cols-flat": String(flatCols),
  };
});

function getJobSortIndex(jobEnum: number): number {
  const order = getEffectiveJobOrder(store.userOptions.jobOrder);
  const normalized = Util.baseJobEnumConverted(jobEnum);
  const index = order.indexOf(normalized);
  if (index !== -1) return index;
  const rawIndex = order.indexOf(jobEnum);
  return rawIndex === -1 ? Number.MAX_SAFE_INTEGER : rawIndex;
}

function getSimpleJobName(jobEnum: number): string {
  return Util.jobToFullName(Util.jobEnumToJob(jobEnum))?.simple1 ?? "";
}

function handleJobImgError(e: Event) {
  const img = e.target as HTMLImageElement;
  if (img.src !== EMPTY_IMAGE) {
    img.src = EMPTY_IMAGE;
  }
}

const effectiveSkills = computed<KeySkillSnapshot[]>(() => {
  const baseSkills =
    props.layout === "matrix" && props.singleInBoth
      ? props.skills.flatMap((s) =>
          s.scope === "self" && (s.isSingle || SINGLE_SKILL_IDS.has(s.id))
            ? [s, { ...s, scope: "other" as const }]
            : [s],
        )
      : props.skills;
  return sortKeySkills(baseSkills, store.userOptions.jobOrder, store.userOptions.jobSkillOrder);
});

const duplicateSkillIds = computed<Set<number>>(() => {
  if (props.layout === "matrix") return new Set();
  const seen = new Set<number>();
  const duplicates = new Set<number>();
  for (const s of effectiveSkills.value) {
    if (seen.has(s.id)) duplicates.add(s.id);
    else seen.add(s.id);
  }
  return duplicates;
});

const skillGroups = computed<{ scope: Scope; label: string; skills: KeySkillSnapshot[] }[]>(() => {
  if (props.layout !== "group") return [];
  return SKILL_SCOPE_META.map(({ scope, labelKey }) => ({
    scope,
    label: t(labelKey),
    skills: effectiveSkills.value.filter((s) => s.scope === scope),
  })).filter((g) => g.skills.length > 0);
});

const skillPlayerRows = computed<SkillPlayerRow[]>(() => {
  if (props.layout !== "matrix") return [];
  const byOwner = new Map<string, SkillPlayerRow>();

  for (const skill of effectiveSkills.value) {
    let entry = byOwner.get(skill.ownerId);
    if (!entry) {
      entry = {
        ownerId: skill.ownerId,
        ownerName: skill.ownerName,
        shortName: skill.ownerName.slice(0, 2),
        ownerJob: skill.ownerJob,
        jobIconSrc: getCachedJobIconUrl(
          Util.jobEnumToIcon(skill.ownerJob),
          store.userOptions.iconType,
        ),
        isTarget: skill.ownerId === props.targetId,
        hasDuplicateJob: false,
        skillsByScope: { party: [], other: [], self: [] },
      };
      byOwner.set(skill.ownerId, entry);
    }
    entry.skillsByScope[skill.scope].push(skill);
  }

  const jobCounts = new Map<number, number>();
  for (const entry of byOwner.values()) {
    jobCounts.set(entry.ownerJob, (jobCounts.get(entry.ownerJob) ?? 0) + 1);
  }

  const rows = Array.from(byOwner.values());
  for (const entry of rows) {
    entry.hasDuplicateJob = (jobCounts.get(entry.ownerJob) ?? 0) > 1;
  }

  rows.sort((a, b) => {
    const jobDiff = getJobSortIndex(a.ownerJob) - getJobSortIndex(b.ownerJob);
    if (jobDiff !== 0) return jobDiff;
    if (a.isTarget !== b.isTarget) return a.isTarget ? -1 : 1;
    return a.ownerId.localeCompare(b.ownerId);
  });

  return rows;
});
</script>

<template>
  <div class="skill-popover-content" :style="layoutLimitVars">
    <template v-if="effectiveSkills.length === 0">
      <div class="no-data">
        {{ t("keigennRecord.noData") }}
      </div>
    </template>

    <template v-else-if="layout === 'flat'">
      <div class="skill-grid-flat">
        <SkillCooldownIcon
          v-for="skill in effectiveSkills"
          :key="`${skill.id}-${skill.ownerId}-${skill.scope}`"
          :skill="skill"
          :job-label="
            duplicateSkillIds.has(skill.id) ? getSimpleJobName(skill.ownerJob) : undefined
          "
        />
      </div>
    </template>

    <template v-else-if="layout === 'group'">
      <div class="skill-groups">
        <div v-for="group in skillGroups" :key="group.scope" class="skill-group-row">
          <span class="skill-scope-tag">{{ group.label }}</span>
          <div class="skill-grid">
            <SkillCooldownIcon
              v-for="skill in group.skills"
              :key="`${skill.id}-${skill.ownerId}`"
              :skill="skill"
              :job-label="
                duplicateSkillIds.has(skill.id) ? getSimpleJobName(skill.ownerJob) : undefined
              "
            />
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <table class="skill-matrix">
        <thead>
          <tr>
            <th class="skill-col-job" />
            <th
              v-for="meta in SKILL_SCOPE_META"
              :key="meta.scope"
              class="skill-col-scope"
              :class="`is-${meta.scope}`"
            >
              {{ t(meta.labelKey) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="player in skillPlayerRows"
            :key="player.ownerId"
            :class="{ 'is-target': player.isTarget }"
          >
            <td class="skill-job-cell">
              <img
                v-if="player.jobIconSrc"
                :src="player.jobIconSrc"
                class="skill-player-job-icon"
                @error="handleJobImgError"
              />
              <span v-if="player.hasDuplicateJob && !anonymous" class="skill-player-dup-name">
                {{ player.shortName }}
              </span>
            </td>
            <td
              v-for="meta in SKILL_SCOPE_META"
              :key="meta.scope"
              class="skill-scope-cell"
              :class="`is-${meta.scope}`"
            >
              <div
                v-if="player.skillsByScope[meta.scope].length > 0"
                class="skill-cell-list"
                :class="`is-${meta.scope}`"
              >
                <SkillCooldownIcon
                  v-for="skill in player.skillsByScope[meta.scope]"
                  :key="`${skill.id}-${skill.ownerId}`"
                  :skill="skill"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<style scoped lang="scss">
.skill-popover-content {
  max-width: 100%;
  overflow-x: auto;
}

.no-data {
  text-align: center;
  color: #888;
  font-size: 12px;
  padding: 4px 6px;
}

.skill-grid-flat {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  max-width: min(
    calc(
      var(--skill-icon-size, 28px) * var(--skill-cols-flat, 7) + (var(--skill-cols-flat, 7) - 1) *
        2px
    ),
    calc(100vw - 50px)
  );
}

.skill-groups {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skill-group-row {
  display: flex;
  align-items: flex-start;
  gap: 5px;
}

.skill-scope-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: var(--skill-icon-size, 28px);
  padding-right: 5px;
  font-size: 10.5px;
  font-weight: 600;
  color: #a6b0bf;
  border-right: 1px solid rgba(255, 255, 255, 0.16);
  flex-shrink: 0;
}

.skill-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  max-width: min(
    calc(
      var(--skill-icon-size, 28px) * var(--skill-cols-group, 6) + (var(--skill-cols-group, 6) - 1) *
        2px
    ),
    calc(100vw - 50px)
  );
}

.skill-matrix {
  border-collapse: collapse;
  width: max-content;

  th.skill-col-job {
    width: 22px;
    padding: 0 2px 3px 0;
  }

  th.skill-col-scope {
    padding: 0 4px 3px;
    font-size: 10.5px;
    font-weight: 600;
    color: #9ba4b2;
    text-align: center;
    white-space: nowrap;
    border-bottom: 1px solid rgba(255, 255, 255, 0.14);
    border-left: 1px solid rgba(255, 255, 255, 0.08);
  }

  tbody tr {
    & + tr {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    &.is-target {
      background: rgba(96, 165, 250, 0.12);
      box-shadow: inset 2px 0 0 #60a5fa;
    }
  }

  td.skill-job-cell {
    width: 22px;
    padding: calc(2px + max(0px, (var(--skill-icon-size, 24px) - 18px) / 2)) 3px 2px;
    vertical-align: top;
    text-align: center;

    .skill-player-job-icon {
      display: block;
      width: min(18px, var(--skill-icon-size, 24px));
      height: min(18px, var(--skill-icon-size, 24px));
      margin: 0 auto;
      object-fit: contain;
    }

    .skill-player-dup-name {
      display: block;
      margin-top: 1px;
      font-size: 9px;
      line-height: 1;
      color: #dbeafe;
      white-space: nowrap;
    }
  }

  td.skill-scope-cell {
    padding: 2px 3px;
    vertical-align: top;
    text-align: left;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
  }

  .skill-cell-list {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    align-items: flex-start;
    justify-content: flex-start;
    align-content: flex-start;

    &.is-party {
      max-width: calc(
        var(--skill-icon-size, 28px) * var(--skill-cols-party, 4) +
          (var(--skill-cols-party, 4) - 1) * 2px
      );
    }

    &.is-other {
      max-width: calc(
        var(--skill-icon-size, 28px) * var(--skill-cols-other, 3) +
          (var(--skill-cols-other, 3) - 1) * 2px
      );
    }

    &.is-self {
      max-width: calc(
        var(--skill-icon-size, 28px) * var(--skill-cols-self, 3) + (var(--skill-cols-self, 3) - 1) *
          2px
      );
    }
  }
}
</style>
