import type { KeySkill } from '@/types/keySkill'

const skillChinese: KeySkill[] = [
  { id: 30, tts: '', duration: 10, recast1000ms: 15, job: [19], line: 0, level: 50, icon: 2502 }, // 神圣领域 因为跟cactbot的重复报了所以关了
  { id: 43, tts: '', duration: 10, recast1000ms: 240, job: [3, 21], line: 0, level: 42, icon: 266 }, // 死斗 因为跟cactbot的重复报了所以关了
  { id: 3638, tts: '', duration: 10, recast1000ms: 300, job: [32], line: 0, level: 50, icon: 3077 }, // 行尸走肉 因为跟cactbot的重复报了所以关了
  { id: 16152, tts: '', duration: 10, recast1000ms: 360, job: [37], line: 0, level: 50, icon: 3416 }, // 超火流星 因为跟cactbot的重复报了所以关了
  { id: 140, tts: '天赐', duration: 0, recast1000ms: 180, job: [24], line: 0, level: 50, icon: 2627 },
  { id: 25862, tts: '礼仪之铃', duration: 15, recast1000ms: 180, job: [24], line: 0, level: 90, icon: 2649 },
  { id: 25868, tts: '跑快快', duration: 20, recast1000ms: 120, job: [28], line: 0, level: 90, icon: 2878 },
  { id: 25874, tts: '大宇宙', duration: 15, recast1000ms: 180, job: [33], line: 0, level: 90, icon: 3562 },
  { id: 7549, tts: '牵制', duration: (level: number) => level >= 98 ? 15 : 10, recast1000ms: 90, job: [2, 4, 20, 22, 30, 34, 39, 41], line: 1, level: 22, icon: 828 },
  { id: 7560, tts: '昏乱', duration: (level: number) => level >= 98 ? 15 : 10, recast1000ms: 90, job: [7, 25, 26, 27, 35, 36, 42], line: 1, level: 8, icon: 861 },
  { id: 7535, tts: '雪愁', duration: (level: number) => level >= 98 ? 15 : 10, recast1000ms: 60, job: [1, 3, 19, 21, 32, 37], line: 1, level: 22, icon: 806 },
  { id: 3540, tts: '幕帘', duration: 30, recast1000ms: 90, job: [19], line: 1, level: 56, icon: 2508 },
  { id: 7385, tts: '大翅膀', duration: 5, recast1000ms: 120, job: [19], line: 1, level: 70, icon: 2515 },
  { id: 7388, tts: '摆脱', duration: 15, recast1000ms: 90, job: [21], line: 1, level: 68, icon: 2563 },
  { id: 16471, tts: '布道', duration: 15, recast1000ms: 90, job: [32], line: 1, level: 66, icon: 3087 },
  { id: 16160, tts: '光心', duration: 15, recast1000ms: 90, job: [37], line: 1, level: 64, icon: 3424 },
  { id: 16536, tts: '节制', duration: 20, recast1000ms: 120, job: [24], line: 1, level: 80, icon: 2645 },
  { id: 7405, tts: '行吟', duration: 15, recast1000ms: 90, job: [23], line: 1, level: 62, icon: 2612 },
  { id: 16889, tts: '策动', duration: 15, recast1000ms: 90, job: [31], line: 1, level: 56, icon: 3040 },
  { id: 2887, tts: '武解', duration: 10, recast1000ms: 120, job: [31], line: 1, level: 62, icon: 3011 },
  { id: 16012, tts: '桑巴', duration: 15, recast1000ms: 90, job: [38], line: 1, level: 56, icon: 3469 },
  { id: 25857, tts: '抗死', duration: 10, recast1000ms: 120, job: [35], line: 1, level: 86, icon: 3237 },
  { id: 118, tts: '战歌', duration: 20, recast1000ms: 120, job: [5, 23], line: 2, level: 50, icon: 2601 },
  { id: 25785, tts: '光神曲', duration: 20, recast1000ms: 110, job: [5, 23], line: 2, level: 90, icon: 2622 },
  { id: (level: number) => level >= 66 ? 36957 : 2248, tts: '背刺', duration: 20, recast1000ms: 120, job: [29, 30], line: 2, level: 66, icon: 619 },
  { id: 24405, tts: '神秘环', duration: 20, recast1000ms: 120, job: [39], line: 2, level: 72, icon: 3633 },
  { id: 3557, tts: '连祷', duration: 20, recast1000ms: 120, job: [4, 22], line: 2, level: 52, icon: 2585 },
  { id: 7396, tts: '义结金兰', duration: 20, recast1000ms: 120, job: [2, 20], line: 2, level: 70, icon: 2542 },
  { id: 25801, tts: '灼热之光', duration: 20, recast1000ms: 120, job: [27], line: 2, level: 66, icon: 2780 },
  { id: 34675, tts: '星空构想', duration: 20, recast1000ms: 120, job: [42], line: 2, level: 70, icon: 3826 },
  { id: 7436, tts: '连环计', duration: 20, recast1000ms: 120, job: [28], line: 2, level: 66, icon: 2815 },
  { id: 7520, tts: '鼓励', duration: 20, recast1000ms: 120, job: [35], line: 2, level: 58, icon: 3218 },
  { id: 16196, tts: '技巧舞', duration: 20, recast1000ms: 120, job: [38], line: 2, level: 70, icon: 3474 },
  { id: 16011, tts: '探戈', duration: 20, recast1000ms: 120, job: [38], line: 2, level: 62, icon: 3471 },
  { id: 16552, tts: '占卜', duration: 20, recast1000ms: 120, job: [33], line: 2, level: 50, icon: 3553 },
] as const

const skillGlobal: KeySkill[] = [
  { id: 30, tts: '', duration: 10, recast1000ms: 420, job: [19], line: 0, level: 50, icon: 2502 }, // 神圣领域 因为跟cactbot的重复报了所以关了
  { id: 43, tts: '', duration: 10, recast1000ms: 240, job: [3, 21], line: 0, level: 42, icon: 266 }, // 死斗 因为跟cactbot的重复报了所以关了
  { id: 3638, tts: '', duration: 10, recast1000ms: 300, job: [32], line: 0, level: 50, icon: 3077 }, // 行尸走肉 因为跟cactbot的重复报了所以关了
  { id: 16152, tts: '', duration: 10, recast1000ms: 360, job: [37], line: 0, level: 50, icon: 3416 }, // 超火流星 因为跟cactbot的重复报了所以关了
  { id: 140, tts: '天赐', duration: 0, recast1000ms: 180, job: [24], line: 0, level: 50, icon: 2627 },
  { id: 25862, tts: '礼仪之铃', duration: 15, recast1000ms: 180, job: [24], line: 0, level: 90, icon: 2649 },
  { id: 25868, tts: '跑快快', duration: 20, recast1000ms: 120, job: [28], line: 0, level: 90, icon: 2878 },
  { id: 25874, tts: '大宇宙', duration: 15, recast1000ms: 180, job: [33], line: 0, level: 90, icon: 3562 },
  { id: 7549, tts: '牵制', duration: (level: number) => level >= 98 ? 15 : 10, recast1000ms: 90, job: [2, 4, 20, 22, 30, 34, 39, 41], line: 1, level: 22, icon: 828 },
  { id: 7560, tts: '昏乱', duration: (level: number) => level >= 98 ? 15 : 10, recast1000ms: 90, job: [7, 25, 26, 27, 35, 36, 42], line: 1, level: 8, icon: 861 },
  { id: 7535, tts: '雪愁', duration: (level: number) => level >= 98 ? 15 : 10, recast1000ms: 60, job: [1, 3, 19, 21, 32, 37], line: 1, level: 22, icon: 806 },
  { id: 3540, tts: '幕帘', duration: 30, recast1000ms: 90, job: [19], line: 1, level: 56, icon: 2508 },
  { id: 7385, tts: '大翅膀', duration: 5, recast1000ms: 120, job: [19], line: 1, level: 70, icon: 2515 },
  { id: 7388, tts: '摆脱', duration: 15, recast1000ms: 90, job: [21], line: 1, level: 68, icon: 2563 },
  { id: 16471, tts: '布道', duration: 15, recast1000ms: 90, job: [32], line: 1, level: 66, icon: 3087 },
  { id: 16160, tts: '光心', duration: 15, recast1000ms: 90, job: [37], line: 1, level: 64, icon: 3424 },
  { id: 16536, tts: '节制', duration: 20, recast1000ms: 120, job: [24], line: 1, level: 80, icon: 2645 },
  { id: 7405, tts: '行吟', duration: 15, recast1000ms: 90, job: [23], line: 1, level: 62, icon: 2612 },
  { id: 16889, tts: '策动', duration: 15, recast1000ms: 90, job: [31], line: 1, level: 56, icon: 3040 },
  { id: 2887, tts: '武解', duration: 10, recast1000ms: 120, job: [31], line: 1, level: 62, icon: 3011 },
  { id: 16012, tts: '桑巴', duration: 15, recast1000ms: 90, job: [38], line: 1, level: 56, icon: 3469 },
  { id: 25857, tts: '抗死', duration: 10, recast1000ms: 120, job: [35], line: 1, level: 86, icon: 3237 },
  { id: 118, tts: '战歌', duration: 20, recast1000ms: 120, job: [5, 23], line: 2, level: 50, icon: 2601 },
  { id: 25785, tts: '光神曲', duration: 20, recast1000ms: 110, job: [5, 23], line: 2, level: 90, icon: 2622 },
  { id: (level: number) => level >= 66 ? 36957 : 2248, tts: '背刺', duration: 20, recast1000ms: 120, job: [29, 30], line: 2, level: 66, icon: 619 },
  { id: 24405, tts: '神秘环', duration: 20, recast1000ms: 120, job: [39], line: 2, level: 72, icon: 3633 },
  { id: 3557, tts: '连祷', duration: 20, recast1000ms: 120, job: [4, 22], line: 2, level: 52, icon: 2585 },
  { id: 7396, tts: '义结金兰', duration: 20, recast1000ms: 120, job: [2, 20], line: 2, level: 70, icon: 2542 },
  { id: 25801, tts: '灼热之光', duration: 20, recast1000ms: 120, job: [27], line: 2, level: 66, icon: 2780 },
  { id: 34675, tts: '星空构想', duration: 20, recast1000ms: 120, job: [42], line: 2, level: 70, icon: 3826 },
  { id: 7436, tts: '连环计', duration: 20, recast1000ms: 120, job: [28], line: 2, level: 66, icon: 2815 },
  { id: 7520, tts: '鼓励', duration: 20, recast1000ms: 120, job: [35], line: 2, level: 58, icon: 3218 },
  { id: 16196, tts: '技巧舞', duration: 20, recast1000ms: 120, job: [38], line: 2, level: 70, icon: 3474 },
  { id: 16011, tts: '探戈', duration: 20, recast1000ms: 120, job: [38], line: 2, level: 62, icon: 3471 },
  { id: 16552, tts: '占卜', duration: 20, recast1000ms: 120, job: [33], line: 2, level: 50, icon: 3553 },
] as const

function useKeySkill(language: 'cn' | 'global' = 'cn') {
  const keySkills = ref<KeySkill[]>(language === 'cn' ? skillChinese : skillGlobal)

  function loadData(lang: 'cn' | 'global') {
    keySkills.value = lang === 'cn' ? skillChinese : skillGlobal
  }

  return { keySkills, loadData }
}

export { useKeySkill }
