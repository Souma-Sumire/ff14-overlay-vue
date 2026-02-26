# 需要手动维护的文件

src/utils/compareSaveAction.ts compareSameGroup 共享CD组（大版本更新时）
src/resources/teamWatchResource.ts TEAM_WATCH_WATCH_ACTIONS_DEFAULT 默认监控的技能（大版本更新时）
src/resources/keySkillResource.ts keySkillDefinitions 默认监控的技能（大技能技改时）
src/resources/keigennSkillResource.ts keigennSkillDefinitions 减伤监控追踪冷却技能的作用域状态（有减伤技改更新时）
src/resources/keigenn.ts keigenns 减伤状态表（有减伤技改更新时）
src/resources/globalSkills.ts rawGlobalSkillDefinitions（技改时）、GLOBAL_SKILL_MAX_LEVEL 等级上限（大版本更新时）
src/resources/jobSortOrder.ts DEFAULT_JOB_SORT_ORDER 职业排序（大版本更新时）
src/resources/cacheVersion.ts API_CACHE_VERSION（涉及 API 请求缓存结构/策略变化时，或需要全量失效 API 缓存时）
