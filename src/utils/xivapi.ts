import { useIndexedDB } from "@/composables/useIndexedDB";
import { API_CACHE_VERSION } from "@/resources/cacheVersion";
import { ROLE_ACTION_CATEGORY_BY_JOB } from "@/resources/generated/roleActionCategoryByJob";
import { markRoleActionId, resolveActionMinLevel } from "@/resources/logic/actionMetaResolver";
import { completeIcon } from "@/resources/logic/status";
import Util from "@/utils/util";

const SITE_HOST = {
  cafe: { host: "xivapi-v2.xivcdn.com", imgHost: "cafemaker.wakingsands.com" },
  xivapi: { host: "v2.xivapi.com", imgHost: "xivapi.com" },
} as const;

type SiteName = keyof typeof SITE_HOST;

interface IndexedDbCacheItem {
  key: string;
  value: any;
}

const CACHE_VERSION_STORAGE_KEY = "xivapi-cache-version";
const PRIMARY_SITE_STORAGE_KEY = "xivapi-primary-site";
const ACTION_META_CACHE_STORE = "xivapi-action-meta-cache";
const ACTION_SEARCH_CACHE_STORE = "xivapi-action-search-cache";
const HIGH_RES_SCALE_THRESHOLD = 2;
const HIGH_RES_SUFFIX = "_hr1";
const HTTPS_PROTOCOL = "https:";

function buildHttpsOrigin(host: string): string {
  return `${HTTPS_PROTOCOL}//${host}`;
}

function getScaleFromUrl(): number {
  if (typeof window === "undefined") return 1;
  const queries: string[] = [];
  const hash = window.location.hash || "";
  const hashQueryIndex = hash.indexOf("?");
  if (hashQueryIndex >= 0 && hashQueryIndex < hash.length - 1) {
    queries.push(hash.slice(hashQueryIndex + 1));
  }
  const search = window.location.search?.replace(/^\?/, "");
  if (search) queries.push(search);
  for (const query of queries) {
    const params = new URLSearchParams(query);
    const scaleRaw = params.get("scale");
    if (scaleRaw === null) continue;
    const scaleValue = Number(scaleRaw);
    if (Number.isFinite(scaleValue)) return scaleValue;
  }
  return 1;
}

function isHighResEnabled(): boolean {
  return getScaleFromUrl() >= HIGH_RES_SCALE_THRESHOLD;
}

function appendHighResSuffix(path: string): string {
  if (!isHighResEnabled()) return path;
  if (path.endsWith(`${HIGH_RES_SUFFIX}.png`)) return path;
  return path.replace(/\.png$/, `${HIGH_RES_SUFFIX}.png`);
}

function stripHighResSuffix(path: string): string {
  return path.replace(new RegExp(`${HIGH_RES_SUFFIX}\\.png$`), ".png");
}

function isSiteName(value: unknown): value is SiteName {
  return typeof value === "string" && value in SITE_HOST;
}

function getOtherSite(site: SiteName): SiteName {
  return site === "cafe" ? "xivapi" : "cafe";
}

function resolveSiteByHost(host: string): SiteName | null {
  const normalized = host.toLowerCase();
  for (const [siteName, cfg] of Object.entries(SITE_HOST) as [
    SiteName,
    (typeof SITE_HOST)[SiteName],
  ][]) {
    if (cfg.host === normalized || cfg.imgHost === normalized) return siteName;
  }
  return null;
}

function readStoredSite(): SiteName {
  const raw = localStorage
    .getItem(PRIMARY_SITE_STORAGE_KEY)
    ?.trim()
    .replace(/^"(.*)"$/, "$1");
  return isSiteName(raw) ? raw : "cafe";
}

let primarySite: SiteName = readStoredSite();

function setPrimarySite(site: SiteName): void {
  if (primarySite === site) return;
  primarySite = site;
  localStorage.setItem(PRIMARY_SITE_STORAGE_KEY, site);
}

const actionMetaCacheDb = useIndexedDB<IndexedDbCacheItem>(ACTION_META_CACHE_STORE);
const actionSearchCacheDb = useIndexedDB<IndexedDbCacheItem>(ACTION_SEARCH_CACHE_STORE);
const pendingNetworkRequests = new Map<string, Promise<any>>();

(function ensureCacheVersion() {
  const stored = localStorage
    .getItem(CACHE_VERSION_STORAGE_KEY)
    ?.trim()
    .replace(/^"(.*)"$/, "$1");
  if (stored === API_CACHE_VERSION) return;
  localStorage.setItem(CACHE_VERSION_STORAGE_KEY, API_CACHE_VERSION);
  primarySite = "cafe";
  localStorage.setItem(PRIMARY_SITE_STORAGE_KEY, "cafe");
  void actionMetaCacheDb.clear();
  void actionSearchCacheDb.clear();
})();

export const EMPTY_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

function rerouteFailedImage(img: HTMLImageElement, failedUrl: URL): void {
  const failedSite = resolveSiteByHost(failedUrl.hostname);
  if (!failedSite) {
    img.src = EMPTY_IMAGE;
    return;
  }

  const nextSite = getOtherSite(failedSite);
  img.dataset.tried = "1";
  img.src = `${buildHttpsOrigin(SITE_HOST[nextSite].imgHost)}${failedUrl.pathname}`;
  img.addEventListener("load", () => setPrimarySite(nextSite), { once: true });
}

export function getIconSrcById(iconId: number): string {
  if (!Number.isFinite(iconId) || iconId <= 0) return EMPTY_IMAGE;
  const full = completeIcon(Math.trunc(iconId));
  const basePath = `${buildHttpsOrigin(SITE_HOST[primarySite].imgHost)}/i/${full}.png`;
  return appendHighResSuffix(basePath);
}

export function getIconSrcByFullIcon(fullIcon: string): string {
  if (!fullIcon) return EMPTY_IMAGE;
  const basePath = `${buildHttpsOrigin(SITE_HOST[primarySite].imgHost)}/i/${fullIcon}.png`;
  return appendHighResSuffix(basePath);
}

export function getIconSrcByPath(iconPath: string, itemIsHQ = false): string {
  if (!iconPath) return EMPTY_IMAGE;
  if (/^https?:\/\//.test(iconPath)) return iconPath;
  const suffix = isHighResEnabled() ? HIGH_RES_SUFFIX : "";
  const baseUrl = buildHttpsOrigin(SITE_HOST[primarySite].imgHost);
  return `${baseUrl}${iconPath}`.replace(
    /(\d{6})\.png$/,
    (_m, p1) => `${itemIsHQ ? "hq/" : ""}${p1}${suffix}.png`,
  );
}

export function rerouteImgSrc(src: string): string {
  if (!src || src === EMPTY_IMAGE) return src;
  try {
    const url = new URL(src, window.location.href);
    const site = resolveSiteByHost(url.hostname);
    let nextPath = url.pathname;
    if (isHighResEnabled() && nextPath.endsWith(".png")) {
      nextPath = appendHighResSuffix(nextPath);
    }
    if (site && site !== primarySite)
      return `${buildHttpsOrigin(SITE_HOST[primarySite].imgHost)}${nextPath}`;
    if (nextPath !== url.pathname) {
      url.pathname = nextPath;
      return url.toString();
    }
  } catch {}
  return src;
}

export async function getActionIconSrc(id: number): Promise<string> {
  const res = await parseAction("action", id, ["Icon"]);
  return getIconSrcByPath(res.Icon);
}

export interface XivApiActionSearchItem {
  ID: number;
  Name: string;
  Icon: string;
  ClassJobLevel: number;
  IsRoleAction?: number;
  IsPvP?: number;
  Recast100ms?: number;
  Recast1000ms?: number;
}

async function requestWithFallback(path: string): Promise<any> {
  const dedupKey = `req:${path}`;
  if (pendingNetworkRequests.has(dedupKey)) return pendingNetworkRequests.get(dedupKey);

  const task = (async () => {
    const sites: SiteName[] = [primarySite, getOtherSite(primarySite)];
    for (const siteName of sites) {
      // 构建完整 URL
      const baseUrl = `${buildHttpsOrigin(SITE_HOST[siteName].host)}/api`;
      const urlObj = new URL(
        `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`,
        window.location.href,
      );

      // V2 参数翻译
      const urlParams = urlObj.searchParams;

      if (urlParams.has("columns")) {
        // 仅保留 ID -> row_id 映射
        let fields = urlParams.get("columns")!;
        fields = fields.replace(/\bID\b/g, "row_id");
        urlParams.set("fields", fields);
        urlParams.delete("columns");
      }

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const fetchUrl = urlObj.toString();
        const resp = await fetch(fetchUrl, { signal: controller.signal, cache: "force-cache" });
        clearTimeout(timer);
        if (!resp.ok) {
          console.error(`[xivapi] Request failed: ${fetchUrl} (${resp.status} ${resp.statusText})`);
          continue;
        }

        let json = await resp.json();

        const norm = (i: any) => {
          if (!i) return i;
          const f = i.fields || i || {};
          const res: any = { ...f, ID: i.row_id || i.ID };
          // 递归拆包 V2 的对象结构 (Boilmaster 专有)
          for (const key in res) {
            const val = res[key];
            if (val && typeof val === "object" && !Array.isArray(val)) {
              if (key === "ClassJobCategory" && val.fields) {
                res._ClassJobCategoryJobs = Object.entries(val.fields)
                  .filter(([_, value]) => value === true)
                  .map(([k]) => Util.jobToJobEnum(k as any))
                  .filter((v) => typeof v === "number" && v > 0);
              }

              if (val.path !== undefined)
                res[key] = `/${val.path.replace(/^ui\/icon\//, "i/").replace(/\.tex$/, ".png")}`;
              else if (val.row_id !== undefined) res[key] = val.row_id;
              else if (val.value !== undefined) res[key] = val.value;
            }
          }
          // 保持调用方需要的字段稳定
          return {
            ...res,
            IsPvP: res.IsPvP ? 1 : 0,
            IsRoleAction: res.IsRoleAction ? 1 : 0,
            Recast100ms: Number(res.Recast100ms) || 0,
            ClassJobLevel: Number(res.ClassJobLevel) || 0,
            _ClassJobCategoryJobs: res._ClassJobCategoryJobs,
          };
        };
        if (json.results) {
          json = {
            Pagination: { PageTotal: json.total_pages },
            Results: json.results.map(norm),
          };
        } else if (json.row_id !== undefined || json.ID !== undefined) {
          json = norm(json);
        }
        // 备用站点请求成功 → 切换默认站点
        setPrimarySite(siteName);
        return json;
      } catch (e) {
        console.warn(`[xivapi] ${siteName} failed:`, e);
      }
    }
    throw new Error(`All sites failed: ${path}`);
  })();

  pendingNetworkRequests.set(dedupKey, task);
  return task.finally(() => pendingNetworkRequests.delete(dedupKey));
}

export async function parseAction(
  type: string,
  id: number,
  columns: string[] = ["ID", "Icon"],
): Promise<any> {
  const key = `${type}:${id}`;
  const reqCols = [...new Set([...columns, "ID", "Icon", "ClassJobLevel", "IsRoleAction"])];
  const sheetName = type.charAt(0).toUpperCase() + type.slice(1);

  const cache = await actionMetaCacheDb.get(key);
  if (cache?.value && reqCols.every((c) => Object.hasOwn(cache.value, c))) {
    return cache.value;
  }

  const res = await requestWithFallback(`/sheet/${sheetName}/${id}?columns=${reqCols.join(",")}`);
  const final = { id, ...res };
  if (type === "action") {
    markRoleActionId(id, !!final.IsRoleAction);
    final.ClassJobLevel = resolveActionMinLevel(final.ClassJobLevel, {
      actionId: id,
      isRoleAction: !!final.IsRoleAction,
    });
  }
  void actionMetaCacheDb.set({ key, value: final });
  return final;
}

export async function searchActionsByClassJobs(
  jobIds: number[],
  limit = 500,
): Promise<XivApiActionSearchItem[]> {
  const normalized = jobIds
    .map(Number)
    .filter((id) => id > 0 && Util.isCombatJob(Util.jobEnumToJob(id)));
  const cacheKey = `search:${normalized.join(",")}:${limit}`;
  const cached = await actionSearchCacheDb.get(cacheKey);
  if (cached?.value) return cached.value;

  const merged = new Map<number, any>();

  const fetchPage = async (id: number) => {
    // V2 搜索逻辑增强：同时匹配 (职业专属技能) OR (职能技能)
    const jobCats = ROLE_ACTION_CATEGORY_BY_JOB[id] || [];
    const catQuery =
      jobCats.length > 0 ? ` +(${jobCats.map((cat) => `ClassJobCategory=${cat}`).join(" ")})` : "";
    // 逻辑：IsPvP=false AND (ClassJob=id OR (IsRoleAction=true AND catQuery))
    // 注意：V2 (Boilmaster) 对 URL 编码极其敏感，必须将 '+' 编码为 '%2B'，否则会被解析为空格导致 400。
    const qRaw = `+IsPvP=false +(ClassJob=${id} (+IsRoleAction=true${catQuery}))`;
    const q = `query=${qRaw.replace(/\+/g, "%2B").replace(/ /g, "%20")}`;

    // V2 实测：可以直接获取点路径对象 Icon.path 和布尔值 IsRoleAction
    const v2Cols = "row_id,Name,Icon.path,ClassJobLevel,Recast100ms,IsRoleAction";
    const res = await requestWithFallback(`/search?sheets=Action&${q}&limit=100&fields=${v2Cols}`);
    const rows = res.Results || [];
    rows.forEach((r: any) => {
      const rid = Number(r.ID) || 0;
      if (rid > 0 && !merged.has(rid)) {
        const row = {
          ...r,
          ID: rid,
          IsRoleAction: r.IsRoleAction ? 1 : 0,
          ClassJobLevel: resolveActionMinLevel(r.ClassJobLevel, {
            actionId: rid,
            isRoleAction: !!r.IsRoleAction,
          }),
        };
        merged.set(rid, row);
      }
    });
  };

  const tasks = normalized.map((id) => fetchPage(id));
  await Promise.all(tasks);

  const list = Array.from(merged.values())
    .sort((a, b) => a.ClassJobLevel - b.ClassJobLevel || a.ID - b.ID)
    .slice(0, limit);
  void actionSearchCacheDb.set({ key: cacheKey, value: list });
  return list;
}

export function handleImgError(event: Event): void {
  const target = event.target as HTMLImageElement;
  let isLocalFallback = false;
  try {
    const errorUrl = new URL(target.src, window.location.href);
    isLocalFallback = errorUrl.origin === window.location.origin;
    if (errorUrl.pathname.endsWith(`${HIGH_RES_SUFFIX}.png`) && !target.dataset.hrFallback) {
      target.dataset.hrFallback = "1";
      const normalUrl = new URL(errorUrl.toString());
      normalUrl.pathname = stripHighResSuffix(errorUrl.pathname);
      target.src = normalUrl.toString();
      return;
    }
  } catch {
    //
  }

  if (!target.src || target.dataset.tried || isLocalFallback || target.src.startsWith("data:")) {
    target.src = EMPTY_IMAGE;
    return;
  }

  if (target.src.includes("pictomancer.png")) {
    target.src = "https://souma.diemoe.net/resources/img/pictomancer.png";
    return;
  }
  if (target.src.includes("viper.png")) {
    target.src = "https://souma.diemoe.net/resources/img/viper.png";
    return;
  }

  const url = new URL(target.src, window.location.href);
  rerouteFailedImage(target, url);
}
