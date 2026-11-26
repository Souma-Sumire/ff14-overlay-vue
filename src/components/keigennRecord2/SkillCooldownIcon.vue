<script setup lang="ts">
import type { KeySkillSnapshot } from "@/types/keigennRecord2";
import { handleImgError } from "@/utils/xivapi";

defineProps<{
  skill: KeySkillSnapshot;
  jobLabel?: string;
}>();
</script>

<template>
  <div class="skill-icon-container">
    <img
      :src="skill.icon"
      class="skill-icon"
      :class="{ 'is-cooldown': !skill.ready }"
      :data-tried="undefined"
      :data-hr-fallback="undefined"
      @error="handleImgError"
    />
    <div v-if="!skill.ready" class="skill-overlay" />
    <span v-if="skill.recastLeft > 0" class="skill-text">{{ skill.recastLeft }}</span>
    <span v-if="(skill.maxCharges ?? 0) > 1" class="skill-charges">{{ skill.chargesReady }}</span>
    <span
      v-if="skill.jobResource !== undefined"
      class="skill-resource"
      :class="{ 'is-long': skill.jobResource.toString().length > 2 }"
    >
      {{ skill.jobResource }}
    </span>
    <span v-if="skill.extraText" class="skill-extra-text">{{ skill.extraText }}</span>
    <span v-if="jobLabel" class="skill-job-name">{{ jobLabel }}</span>
  </div>
</template>

<style scoped lang="scss">
.skill-icon-container {
  position: relative;
  width: var(--skill-icon-size, 28px);
  height: var(--skill-icon-size, 28px);
  border-radius: 3px;
  overflow: hidden;
  background: #222;
  flex-shrink: 0;
}

.skill-icon {
  width: 100%;
  height: 100%;

  &.is-cooldown {
    filter: saturate(0.72) brightness(0.66) contrast(1.14);
  }
}

.skill-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.08);
  z-index: 1;
}

.skill-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(calc(0.95 * var(--skill-icon-scale, 1)));
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  z-index: 2;
  text-shadow:
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000,
    0 1px 2px rgba(0, 0, 0, 0.9);
}

.skill-charges,
.skill-job-name,
.skill-resource,
.skill-extra-text {
  position: absolute;
  font-weight: bold;
  font-size: 11px;
  line-height: 1;
  z-index: 3;
  transform: scale(calc(0.7 * var(--skill-icon-scale, 1)));
  text-shadow:
    -1px 0 1.5px #000,
    0 1px 1.5px #000,
    1px 0 1.5px #000,
    0 -1px 1.5px #000;
}

.skill-charges {
  bottom: 0;
  right: 0;
  transform-origin: right bottom;
  color: #fff;
}

.skill-job-name {
  bottom: 0;
  left: 0;
  transform-origin: left bottom;
  color: #fff;
}

.skill-resource {
  top: 0;
  right: 0;
  transform-origin: right top;
  color: #64b5f6;

  &.is-long {
    font-size: 9px;
  }
}

.skill-extra-text {
  top: 0;
  left: 0;
  transform-origin: left top;
  color: #ff9800;
}
</style>
