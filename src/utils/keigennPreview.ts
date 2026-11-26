import type { AmountDetailData, KeySkillSnapshot, Scope } from "@/types/keigennRecord2";
import { DEFAULT_JOB_SORT_ORDER } from "@/resources/jobSortOrder";
import { idToSrc } from "@/utils/dynamicValue";
import Util from "@/utils/util";
import { rerouteImgSrc } from "@/utils/xivapi";

interface PreviewSkillSeed {
  id: number;
  ownerId: string;
  ownerJob: number;
  scope: Scope;
  isSingle?: boolean;
  recast1000ms: number;
  recastLeft: number;
  ready: boolean;
  chargesReady?: number;
  maxCharges?: number;
}

const PREVIEW_TARGET_ID = "preview-gnb";

const PREVIEW_SKILL_SEEDS: PreviewSkillSeed[] = [
  // GNB (目标)
  {
    id: 16160,
    ownerId: "preview-gnb",
    ownerJob: 37,
    scope: "party",
    recast1000ms: 90,
    recastLeft: 0,
    ready: true,
  },
  {
    id: 7535,
    ownerId: "preview-gnb",
    ownerJob: 37,
    scope: "party",
    recast1000ms: 60,
    recastLeft: 18,
    ready: false,
  },
  {
    id: 25758,
    ownerId: "preview-gnb",
    ownerJob: 37,
    scope: "self",
    isSingle: true,
    recast1000ms: 25,
    recastLeft: 12,
    ready: false,
  },
  {
    id: 7531,
    ownerId: "preview-gnb",
    ownerJob: 37,
    scope: "self",
    recast1000ms: 90,
    recastLeft: 35,
    ready: false,
  },
  {
    id: 36935,
    ownerId: "preview-gnb",
    ownerJob: 37,
    scope: "self",
    recast1000ms: 120,
    recastLeft: 0,
    ready: true,
  },
  // PLD
  {
    id: 3540,
    ownerId: "preview-pld",
    ownerJob: 19,
    scope: "party",
    recast1000ms: 90,
    recastLeft: 0,
    ready: true,
  },
  {
    id: 7385,
    ownerId: "preview-pld",
    ownerJob: 19,
    scope: "party",
    recast1000ms: 120,
    recastLeft: 42,
    ready: false,
  },
  {
    id: 7535,
    ownerId: "preview-pld",
    ownerJob: 19,
    scope: "party",
    recast1000ms: 60,
    recastLeft: 0,
    ready: true,
  },
  {
    id: 7382,
    ownerId: "preview-pld",
    ownerJob: 19,
    scope: "other",
    recast1000ms: 10,
    recastLeft: 5,
    ready: false,
  },
  // WHM
  {
    id: 16536,
    ownerId: "preview-whm",
    ownerJob: 24,
    scope: "party",
    recast1000ms: 120,
    recastLeft: 64,
    ready: false,
  },
  {
    id: 25862,
    ownerId: "preview-whm",
    ownerJob: 24,
    scope: "party",
    recast1000ms: 180,
    recastLeft: 0,
    ready: true,
  },
  {
    id: 7433,
    ownerId: "preview-whm",
    ownerJob: 24,
    scope: "party",
    recast1000ms: 60,
    recastLeft: 0,
    ready: true,
  },
  {
    id: 3570,
    ownerId: "preview-whm",
    ownerJob: 24,
    scope: "other",
    isSingle: true,
    recast1000ms: 60,
    recastLeft: 28,
    ready: false,
  },
  {
    id: 7432,
    ownerId: "preview-whm",
    ownerJob: 24,
    scope: "other",
    isSingle: true,
    recast1000ms: 30,
    recastLeft: 11,
    ready: true,
    chargesReady: 1,
    maxCharges: 2,
  },
  // SCH
  {
    id: 25868,
    ownerId: "preview-sch",
    ownerJob: 28,
    scope: "party",
    recast1000ms: 120,
    recastLeft: 0,
    ready: true,
  },
  {
    id: 188,
    ownerId: "preview-sch",
    ownerJob: 28,
    scope: "party",
    recast1000ms: 30,
    recastLeft: 14,
    ready: false,
  },
  {
    id: 16538,
    ownerId: "preview-sch",
    ownerJob: 28,
    scope: "party",
    recast1000ms: 120,
    recastLeft: 0,
    ready: true,
  },
  {
    id: 7434,
    ownerId: "preview-sch",
    ownerJob: 28,
    scope: "other",
    isSingle: true,
    recast1000ms: 45,
    recastLeft: 0,
    ready: true,
  },
  // SAM
  {
    id: 7549,
    ownerId: "preview-sam",
    ownerJob: 34,
    scope: "party",
    recast1000ms: 90,
    recastLeft: 0,
    ready: true,
  },
  // BRD
  {
    id: 7405,
    ownerId: "preview-brd",
    ownerJob: 23,
    scope: "party",
    recast1000ms: 90,
    recastLeft: 51,
    ready: false,
  },
  // RDM
  {
    id: 7560,
    ownerId: "preview-rdm",
    ownerJob: 35,
    scope: "party",
    recast1000ms: 90,
    recastLeft: 0,
    ready: true,
  },
  {
    id: 25857,
    ownerId: "preview-rdm",
    ownerJob: 35,
    scope: "party",
    recast1000ms: 120,
    recastLeft: 76,
    ready: false,
  },
  // PCT
  {
    id: 7560,
    ownerId: "preview-pct",
    ownerJob: 42,
    scope: "party",
    recast1000ms: 90,
    recastLeft: 44,
    ready: false,
  },
  {
    id: 34685,
    ownerId: "preview-pct",
    ownerJob: 42,
    scope: "party",
    recast1000ms: 120,
    recastLeft: 0,
    ready: true,
  },
];

const SCOPE_ORDER: Record<Scope, number> = { party: 0, other: 1, self: 2 };

let cachedPreviewSkills: KeySkillSnapshot[] | null = null;

export function getSkillLayoutPreviewTargetId(): string {
  return PREVIEW_TARGET_ID;
}

export function getSkillLayoutPreviewSkills(): KeySkillSnapshot[] {
  if (cachedPreviewSkills) return cachedPreviewSkills;

  const built = PREVIEW_SKILL_SEEDS.map((seed) => {
    const jobName = Util.jobToFullName(Util.jobEnumToJob(seed.ownerJob))?.simple2 ?? "";
    return {
      id: seed.id,
      name: "",
      icon: rerouteImgSrc(idToSrc(seed.id)),
      recast1000ms: seed.recast1000ms,
      recastLeft: seed.recastLeft,
      ready: seed.ready,
      ownerId: seed.ownerId,
      ownerName: jobName,
      ownerJob: seed.ownerJob,
      ownerJobName: jobName,
      chargesReady: seed.chargesReady,
      maxCharges: seed.maxCharges,
      scope: seed.scope,
      isSingle: seed.isSingle,
    };
  });

  built.sort((a, b) => {
    if (a.scope !== b.scope) return SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope];
    if (a.ownerJob !== b.ownerJob) {
      return (
        DEFAULT_JOB_SORT_ORDER.indexOf(a.ownerJob) - DEFAULT_JOB_SORT_ORDER.indexOf(b.ownerJob)
      );
    }
    if (a.recast1000ms !== b.recast1000ms) return b.recast1000ms - a.recast1000ms;
    return a.id - b.id;
  });

  cachedPreviewSkills = built;
  return built;
}

export function getAmountDetailPreview(anonymous: boolean): AmountDetailData {
  const jobName = Util.jobToFullName(Util.jobEnumToJob(37))?.simple2 ?? "绝枪";
  return {
    source: "暗黑冲击",
    targetName: anonymous ? jobName : "光之战士",
    targetIndex: 1,
    targetCount: 2,
    currentHp: 84250,
    hpPercent: 62,
    shield: "18",
    reduction: 0.42,
    type: "magic",
    damageTypeClass: "magic",
    originalDamageDisplay: "145,200",
  };
}
