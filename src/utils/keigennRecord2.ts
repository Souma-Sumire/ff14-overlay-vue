import type { KeySkillSnapshot, RowVO, Scope } from "@/types/keigennRecord2";
import { DEFAULT_JOB_SORT_ORDER } from "@/resources/jobSortOrder";
import Util from "@/utils/util";
import { rerouteImgSrc } from "@/utils/xivapi";

export const invincibleEffect = [
  Number(409).toString(16).toUpperCase(), // 死斗
  Number(810).toString(16).toUpperCase(), // 行尸走肉
  Number(811).toString(16).toUpperCase(), // 死而不僵
  Number(1836).toString(16).toUpperCase(), // 超火流星
];

export function isLethal(row: RowVO): boolean {
  // 2%血量以下才算，因为有时候伤害判定的瞬间如果有奶（自动回血？）导致没死，会误报为致死攻击。
  return (
    row.currentHp - row.amount < -row.maxHp * 0.02 &&
    !row.keigenns.some((k) => invincibleEffect.includes(k.effectId))
  );
}

export function getJobIconUrl(jobIcon: string, type: number): string {
  if (!jobIcon) return "";
  const jobName = jobIcon.replaceAll(/([A-Z])/g, " $1").trim();
  return `https://souma.diemoe.net/resources/img/cj${type}/${jobName}.png`;
}

const cachedJobIconMap = new Map<string, string>();

export function getCachedJobIconUrl(jobIcon: string, iconType: number): string {
  if (!jobIcon) return "";
  const cacheKey = `${jobIcon}|${iconType}`;
  const cached = cachedJobIconMap.get(cacheKey);
  if (cached !== undefined) return cached;
  const resolved = rerouteImgSrc(getJobIconUrl(jobIcon, iconType));
  cachedJobIconMap.set(cacheKey, resolved);
  return resolved;
}

const SCOPE_ORDER: Record<Scope, number> = { party: 0, other: 1, self: 2 };

export function getEffectiveJobOrder(customJobOrder?: number[]): number[] {
  if (!customJobOrder || customJobOrder.length === 0) return DEFAULT_JOB_SORT_ORDER;
  const seen = new Set<number>();
  const result: number[] = [];
  for (const job of customJobOrder) {
    if (!seen.has(job)) {
      seen.add(job);
      result.push(job);
    }
  }
  for (const job of DEFAULT_JOB_SORT_ORDER) {
    if (!seen.has(job)) {
      seen.add(job);
      result.push(job);
    }
  }
  return result;
}

export function sortKeySkills(
  skills: KeySkillSnapshot[],
  customJobOrder?: number[],
  customJobSkillOrder?: Record<number, number[]>,
): KeySkillSnapshot[] {
  const effectiveJobOrder = getEffectiveJobOrder(customJobOrder);
  const jobIndexMap = new Map<number, number>();
  effectiveJobOrder.forEach((job, idx) => jobIndexMap.set(job, idx));

  const skillRankCache = new Map<number, Map<number, number>>();
  const getSkillRank = (jobEnum: number, skillId: number): number => {
    const normalizedJob = Util.baseJobEnumConverted(jobEnum);
    let rankMap = skillRankCache.get(normalizedJob);
    if (!rankMap) {
      rankMap = new Map<number, number>();
      const list = customJobSkillOrder?.[normalizedJob] ?? customJobSkillOrder?.[jobEnum];
      if (list) {
        list.forEach((id, idx) => rankMap!.set(id, idx));
      }
      skillRankCache.set(normalizedJob, rankMap);
    }
    return rankMap.get(skillId) ?? Number.MAX_SAFE_INTEGER;
  };

  return [...skills].sort((a, b) => {
    if (a.scope !== b.scope) return SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope];
    if (a.ownerJob !== b.ownerJob) {
      const idxA =
        jobIndexMap.get(Util.baseJobEnumConverted(a.ownerJob)) ??
        jobIndexMap.get(a.ownerJob) ??
        Number.MAX_SAFE_INTEGER;
      const idxB =
        jobIndexMap.get(Util.baseJobEnumConverted(b.ownerJob)) ??
        jobIndexMap.get(b.ownerJob) ??
        Number.MAX_SAFE_INTEGER;
      if (idxA !== idxB) return idxA - idxB;
    }
    const rankA = getSkillRank(a.ownerJob, a.id);
    const rankB = getSkillRank(b.ownerJob, b.id);
    if (rankA !== rankB) return rankA - rankB;
    if (a.recast1000ms !== b.recast1000ms) return b.recast1000ms - a.recast1000ms;
    return a.id - b.id;
  });
}
