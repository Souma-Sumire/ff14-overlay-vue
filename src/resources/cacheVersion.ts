// 统一缓存纪元：日常只需维护这个值即可全量失效缓存。
export const CACHE_EPOCH = '20260224'

// 各模块独立版本后缀：仅当单模块缓存结构变更时再调整后缀。
export const XIVAPI_CACHE_VERSION = `${CACHE_EPOCH}:xivapi:2`
export const ACTION_SEARCH_CACHE_VERSION = `${CACHE_EPOCH}:action-search:2`
export const ROLE_ACTION_CACHE_VERSION = `${CACHE_EPOCH}:role-action:1`
