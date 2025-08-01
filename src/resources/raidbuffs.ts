import type { KeySkill } from '@/types/keySkill'

const skillChinese: KeySkill[] = [
  { key: crypto.randomUUID(), id: 30, tts: '', duration: 10, recast1000ms: 420, job: [19], line: 1, minLevel: 50 }, // 神圣领域 因为跟cactbot的重复报了所以关了
  { key: crypto.randomUUID(), id: 43, tts: '', duration: 10, recast1000ms: 240, job: [3, 21], line: 1, minLevel: 42 }, // 死斗 因为跟cactbot的重复报了所以关了
  { key: crypto.randomUUID(), id: 3638, tts: '', duration: 10, recast1000ms: 300, job: [32], line: 1, minLevel: 50 }, // 行尸走肉 因为跟cactbot的重复报了所以关了
  { key: crypto.randomUUID(), id: 16152, tts: '', duration: 10, recast1000ms: 360, job: [37], line: 1, minLevel: 50 }, // 超火流星 因为跟cactbot的重复报了所以关了
  { key: crypto.randomUUID(), id: 140, tts: '天赐', duration: 0, recast1000ms: 180, job: [24], line: 1, minLevel: 50 },
  { key: crypto.randomUUID(), id: 25862, tts: '礼仪之铃', duration: 15, recast1000ms: 180, job: [24], line: 1, minLevel: 90 },
  { key: crypto.randomUUID(), id: 25868, tts: '跑快快', duration: 20, recast1000ms: 120, job: [28], line: 1, minLevel: 90 },
  { key: crypto.randomUUID(), id: 25874, tts: '大宇宙', duration: 15, recast1000ms: 180, job: [33], line: 1, minLevel: 90 },
  { key: crypto.randomUUID(), id: 7549, tts: '牵制', duration: `(lv) => lv>=98 ? 15 : 10`, recast1000ms: 90, job: [2, 4, 20, 22, 30, 34, 39, 41], line: 2, minLevel: 22 },
  { key: crypto.randomUUID(), id: 7560, tts: '昏乱', duration: `(lv) => lv>=98 ? 15 : 10`, recast1000ms: 90, job: [7, 25, 26, 27, 35, 36, 42], line: 2, minLevel: 8 },
  { key: crypto.randomUUID(), id: 7535, tts: '雪愁', duration: `(lv) => lv>=98 ? 15 : 10`, recast1000ms: 60, job: [1, 3, 19, 21, 32, 37], line: 2, minLevel: 22 },
  { key: crypto.randomUUID(), id: 3540, tts: '幕帘', duration: 30, recast1000ms: 90, job: [19], line: 2, minLevel: 56 },
  { key: crypto.randomUUID(), id: 7385, tts: '大翅膀', duration: 5, recast1000ms: 120, job: [19], line: 2, minLevel: 70 },
  { key: crypto.randomUUID(), id: 7388, tts: '摆脱', duration: 15, recast1000ms: 90, job: [21], line: 2, minLevel: 68 },
  { key: crypto.randomUUID(), id: 16471, tts: '布道', duration: 15, recast1000ms: 90, job: [32], line: 2, minLevel: 66 },
  { key: crypto.randomUUID(), id: 16160, tts: '光心', duration: 15, recast1000ms: 90, job: [37], line: 2, minLevel: 64 },
  { key: crypto.randomUUID(), id: 16536, tts: '节制', duration: 20, recast1000ms: 120, job: [24], line: 2, minLevel: 80 },
  { key: crypto.randomUUID(), id: 7405, tts: '行吟', duration: 15, recast1000ms: `(lv) => lv>=88 ? 90 : 120`, job: [23], line: 2, minLevel: 62 },
  { key: crypto.randomUUID(), id: 16889, tts: '策动', duration: 15, recast1000ms: `(lv) => lv>=88 ? 90 : 120`, job: [31], line: 2, minLevel: 56 },
  { key: crypto.randomUUID(), id: 2887, tts: '武解', duration: 10, recast1000ms: 120, job: [31], line: 2, minLevel: 62 },
  { key: crypto.randomUUID(), id: 16012, tts: '桑巴', duration: 15, recast1000ms: `(lv) => lv>=88 ? 90 : 120`, job: [38], line: 2, minLevel: 56 },
  { key: crypto.randomUUID(), id: 25857, tts: '抗死', duration: 10, recast1000ms: 120, job: [35], line: 2, minLevel: 86 },
  { key: crypto.randomUUID(), id: 118, tts: '战歌', duration: 20, recast1000ms: 120, job: [5, 23], line: 3, minLevel: 50 },
  { key: crypto.randomUUID(), id: 25785, tts: '光神曲', duration: 20, recast1000ms: 110, job: [5, 23], line: 3, minLevel: 90 },
  { key: crypto.randomUUID(), id: `(lv) => lv>=66 ? 36957 : 2248`, tts: '背刺', duration: 20, recast1000ms: 120, job: [29, 30], line: 3, minLevel: 15 },
  { key: crypto.randomUUID(), id: 24405, tts: '神秘环', duration: 20, recast1000ms: 120, job: [39], line: 3, minLevel: 72 },
  { key: crypto.randomUUID(), id: 3557, tts: '连祷', duration: 20, recast1000ms: 120, job: [4, 22], line: 3, minLevel: 52 },
  { key: crypto.randomUUID(), id: 7396, tts: '义结金兰', duration: 20, recast1000ms: 120, job: [2, 20], line: 3, minLevel: 70 },
  { key: crypto.randomUUID(), id: 25801, tts: '灼热之光', duration: 20, recast1000ms: 120, job: [27], line: 3, minLevel: 66 },
  { key: crypto.randomUUID(), id: 34675, tts: '星空构想', duration: 20, recast1000ms: 120, job: [42], line: 3, minLevel: 70 },
  { key: crypto.randomUUID(), id: 7436, tts: '连环计', duration: 20, recast1000ms: 120, job: [28], line: 3, minLevel: 66 },
  { key: crypto.randomUUID(), id: 7520, tts: '鼓励', duration: 20, recast1000ms: 120, job: [35], line: 3, minLevel: 58 },
  { key: crypto.randomUUID(), id: 16196, tts: '技巧舞', duration: 20, recast1000ms: 120, job: [38], line: 3, minLevel: 70 },
  { key: crypto.randomUUID(), id: 16011, tts: '探戈', duration: 20, recast1000ms: 120, job: [38], line: 3, minLevel: 62 },
  { key: crypto.randomUUID(), id: 16552, tts: '占卜', duration: 20, recast1000ms: 120, job: [33], line: 3, minLevel: 50 },
] as const

const skillGlobal: KeySkill[] = [
  { key: crypto.randomUUID(), id: 30, tts: '', duration: 10, recast1000ms: 420, job: [19], line: 1, minLevel: 50 }, // 神圣领域 因为跟cactbot的重复报了所以关了
  { key: crypto.randomUUID(), id: 43, tts: '', duration: 10, recast1000ms: 240, job: [3, 21], line: 1, minLevel: 42 }, // 死斗 因为跟cactbot的重复报了所以关了
  { key: crypto.randomUUID(), id: 3638, tts: '', duration: 10, recast1000ms: 300, job: [32], line: 1, minLevel: 50 }, // 行尸走肉 因为跟cactbot的重复报了所以关了
  { key: crypto.randomUUID(), id: 16152, tts: '', duration: 10, recast1000ms: 360, job: [37], line: 1, minLevel: 50 }, // 超火流星 因为跟cactbot的重复报了所以关了
  { key: crypto.randomUUID(), id: 140, tts: '天赐', duration: 0, recast1000ms: 180, job: [24], line: 1, minLevel: 50 },
  { key: crypto.randomUUID(), id: 25862, tts: '礼仪之铃', duration: 15, recast1000ms: 180, job: [24], line: 1, minLevel: 90 },
  { key: crypto.randomUUID(), id: 25868, tts: '跑快快', duration: 20, recast1000ms: 120, job: [28], line: 1, minLevel: 90 },
  { key: crypto.randomUUID(), id: 25874, tts: '大宇宙', duration: 15, recast1000ms: 180, job: [33], line: 1, minLevel: 90 },
  { key: crypto.randomUUID(), id: 7549, tts: '牵制', duration: `(lv) => lv>=98 ? 15 : 10`, recast1000ms: 90, job: [2, 4, 20, 22, 30, 34, 39, 41], line: 2, minLevel: 22 },
  { key: crypto.randomUUID(), id: 7560, tts: '昏乱', duration: `(lv) => lv>=98 ? 15 : 10`, recast1000ms: 90, job: [7, 25, 26, 27, 35, 36, 42], line: 2, minLevel: 8 },
  { key: crypto.randomUUID(), id: 7535, tts: '雪愁', duration: `(lv) => lv>=98 ? 15 : 10`, recast1000ms: 60, job: [1, 3, 19, 21, 32, 37], line: 2, minLevel: 22 },
  { key: crypto.randomUUID(), id: 3540, tts: '幕帘', duration: 30, recast1000ms: 90, job: [19], line: 2, minLevel: 56 },
  { key: crypto.randomUUID(), id: 7385, tts: '大翅膀', duration: 5, recast1000ms: 120, job: [19], line: 2, minLevel: 70 },
  { key: crypto.randomUUID(), id: 7388, tts: '摆脱', duration: 15, recast1000ms: 90, job: [21], line: 2, minLevel: 68 },
  { key: crypto.randomUUID(), id: 16471, tts: '布道', duration: 15, recast1000ms: 90, job: [32], line: 2, minLevel: 66 },
  { key: crypto.randomUUID(), id: 16160, tts: '光心', duration: 15, recast1000ms: 90, job: [37], line: 2, minLevel: 64 },
  { key: crypto.randomUUID(), id: 16536, tts: '节制', duration: 20, recast1000ms: 120, job: [24], line: 2, minLevel: 80 },
  { key: crypto.randomUUID(), id: 7405, tts: '行吟', duration: 15, recast1000ms: `(lv) => lv>=88 ? 90 : 120`, job: [23], line: 2, minLevel: 62 },
  { key: crypto.randomUUID(), id: 16889, tts: '策动', duration: 15, recast1000ms: `(lv) => lv>=88 ? 90 : 120`, job: [31], line: 2, minLevel: 56 },
  { key: crypto.randomUUID(), id: 2887, tts: '武解', duration: 10, recast1000ms: 120, job: [31], line: 2, minLevel: 62 },
  { key: crypto.randomUUID(), id: 16012, tts: '桑巴', duration: 15, recast1000ms: `(lv) => lv>=88 ? 90 : 120`, job: [38], line: 2, minLevel: 56 },
  { key: crypto.randomUUID(), id: 25857, tts: '抗死', duration: 10, recast1000ms: 120, job: [35], line: 2, minLevel: 86 },
  { key: crypto.randomUUID(), id: 118, tts: '战歌', duration: 20, recast1000ms: 120, job: [5, 23], line: 3, minLevel: 50 },
  { key: crypto.randomUUID(), id: 25785, tts: '光神曲', duration: 20, recast1000ms: 110, job: [5, 23], line: 3, minLevel: 90 },
  { key: crypto.randomUUID(), id: `(lv) => lv>=66 ? 36957 : 2248`, tts: '背刺', duration: 20, recast1000ms: 120, job: [29, 30], line: 3, minLevel: 66 },
  { key: crypto.randomUUID(), id: 24405, tts: '神秘环', duration: 20, recast1000ms: 120, job: [39], line: 3, minLevel: 72 },
  { key: crypto.randomUUID(), id: 3557, tts: '连祷', duration: 20, recast1000ms: 120, job: [4, 22], line: 3, minLevel: 52 },
  { key: crypto.randomUUID(), id: 7396, tts: '义结金兰', duration: 20, recast1000ms: 120, job: [2, 20], line: 3, minLevel: 70 },
  { key: crypto.randomUUID(), id: 25801, tts: '灼热之光', duration: 20, recast1000ms: 120, job: [27], line: 3, minLevel: 66 },
  { key: crypto.randomUUID(), id: 34675, tts: '星空构想', duration: 20, recast1000ms: 120, job: [42], line: 3, minLevel: 70 },
  { key: crypto.randomUUID(), id: 7436, tts: '连环计', duration: 20, recast1000ms: 120, job: [28], line: 3, minLevel: 66 },
  { key: crypto.randomUUID(), id: 7520, tts: '鼓励', duration: 20, recast1000ms: 120, job: [35], line: 3, minLevel: 58 },
  { key: crypto.randomUUID(), id: 16196, tts: '技巧舞', duration: 20, recast1000ms: 120, job: [38], line: 3, minLevel: 70 },
  { key: crypto.randomUUID(), id: 16011, tts: '探戈', duration: 20, recast1000ms: 120, job: [38], line: 3, minLevel: 62 },
  { key: crypto.randomUUID(), id: 16552, tts: '占卜', duration: 20, recast1000ms: 120, job: [33], line: 3, minLevel: 50 },
] as const

export { skillChinese, skillGlobal }
