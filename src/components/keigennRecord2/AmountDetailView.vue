<script setup lang="ts">
import type { AmountDetailData } from "@/types/keigennRecord2";
import { computed } from "vue";
import { useLang } from "@/composables/useLang";

const props = defineProps<{
  detail: AmountDetailData;
}>();

const { t } = useLang();

const hpMetrics = computed(() => {
  const hp = Math.max(0, Math.min(100, props.detail.hpPercent || 0));
  const shield = Math.max(0, Math.min(100, Number(props.detail.shield) || 0));
  const shieldBar = Math.min(100 - hp, shield);
  return { hp, shieldBar, lowHp: hp <= 25 };
});
</script>

<template>
  <div class="row-info">
    <div class="info-grid">
      <span class="info-label">{{ t("keigennRecord.source") }}</span>
      <span class="info-value">{{ detail.source }}</span>

      <span class="info-label">{{ t("keigennRecord.targetName") }}</span>
      <span class="info-value">{{ detail.targetName }}</span>

      <span class="info-label">{{ t("keigennRecord.targetIndex") }}</span>
      <span class="info-value num">{{ detail.targetIndex }}/{{ detail.targetCount }}</span>

      <span class="info-label">{{ t("keigennRecord.playerHp") }}</span>
      <span class="info-value num">
        {{ detail.currentHp.toLocaleString() }} ({{ detail.hpPercent }}%)
      </span>

      <span class="info-label">{{ t("keigennRecord.playerShield") }}</span>
      <span class="info-value num">{{ detail.shield }}%</span>
    </div>

    <div class="hp-shield-bar">
      <div
        class="hp-segment"
        :class="{ 'is-low': hpMetrics.lowHp }"
        :style="{ width: `${hpMetrics.hp}%` }"
      />
      <div
        v-if="hpMetrics.shieldBar > 0"
        class="shield-segment"
        :style="{ width: `${hpMetrics.shieldBar}%` }"
      />
    </div>

    <template v-if="detail.reduction < 1 && detail.type !== 'dot'">
      <div class="info-divider" />
      <div class="info-grid">
        <span class="info-label">{{ t("keigennRecord.reductionRate") }}</span>
        <span class="info-value num">{{ (detail.reduction * 100).toFixed(2) }}%</span>

        <span class="info-label">{{ t("keigennRecord.originalDamage") }}</span>
        <span class="info-value num" :class="detail.damageTypeClass">
          {{ detail.originalDamageDisplay }}
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.row-info {
  padding: 0;
  margin: 0;
  min-width: 156px;

  .info-grid {
    display: grid;
    grid-template-columns: auto minmax(64px, 1fr);
    gap: 3px 12px;
    align-items: center;
  }

  .info-label {
    color: #939ba8;
    font-size: 11px;
    white-space: nowrap;
    text-align: left;
  }

  .info-value {
    color: #e6ebf2;
    font-size: 12px;
    font-weight: 500;
    text-align: right;
    white-space: nowrap;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;

    &.num {
      font-variant-numeric: tabular-nums;
    }

    &.physics {
      color: rgb(255, 100, 100);
    }

    &.magic {
      color: rgb(100, 200, 255);
    }

    &.darkness {
      color: rgb(255, 100, 255);
    }

    &.is-heal {
      color: #4caf50;
    }
  }

  .hp-shield-bar {
    margin-top: 6px;
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.1);
    overflow: hidden;
    display: flex;

    .hp-segment {
      height: 100%;
      background: #4caf50;

      &.is-low {
        background: #ff5252;
      }
    }

    .shield-segment {
      height: 100%;
      background: #f5b731;
    }
  }

  .info-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.12);
    margin: 6px 0;
    width: 100%;
  }
}
</style>
