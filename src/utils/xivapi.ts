import { params } from "@/utils/queryParams";
import Util from "./util";

const { api } = params;

const siteList = {
  cafe: "https://cafemaker.wakingsands.com",
  xivapi: "https://xivapi.com",
};

const site: { first: string; second: string } = {
  first: api?.toLowerCase() === "xivapi" ? siteList.xivapi : siteList.cafe,
  second: api?.toLowerCase() === "xivapi" ? siteList.cafe : siteList.xivapi,
};

interface CachedImage {
  url: string;
  expirationTime: number;
}

interface CachedAction {
  name: string;
  action: any;
  expirationTime: number;
}

const cacheExpirationTime = {
  get random() {
    return Math.floor(Math.random() * 86400000 * 11) + 86400000 * 25;
  },
};

const userAction = new Map(
  Object.entries({
    任务指令: "/i/000000/000123.png",
    冲刺: "/i/000000/000104.png",
    坐骑: "/i/000000/000118.png",
    攻击: "/i/000000/000101.png",
    腐秽大地: "/i/003000/003090.png",
  }),
);

const IMG_CACHE_KEY = "souma-img-cache";
const ACTION_CACHE_KEY = "souma-action-cache";

const rejectImageData: CachedImage[] = JSON.parse(localStorage.getItem(IMG_CACHE_KEY) || "[]");
const cachedActionData: CachedAction[] = JSON.parse(localStorage.getItem(ACTION_CACHE_KEY) || "[]");
const currentTime = Date.now();
const MAX_CACHE_LENGTH = 1000;
const updatedImageData = rejectImageData.filter((v, index) => v.expirationTime >= currentTime && index < MAX_CACHE_LENGTH);
const updatedActionData = cachedActionData.filter((v, index) => v.expirationTime >= currentTime && index < MAX_CACHE_LENGTH);
localStorage.setItem(IMG_CACHE_KEY, JSON.stringify(updatedImageData));
localStorage.setItem(ACTION_CACHE_KEY, JSON.stringify(updatedActionData));

const ICON_REGEX = /(\d{6})\/(\d{6})\.png$/;

export async function parseAction(
  type: "item" | "action" | "mount" | string,
  actionId: number,
  columns: (keyof XivApiJson)[] = ["ID", "Icon", "ActionCategoryTargetID"],
) {
  const urls = generateActionUrls(type, actionId, columns);
  try {
    const response = await requestPromise(urls, { mode: "cors" });
    return await response.json();
  } catch (error) {
    console.error(`Failed to parse action: ${error}`);
    return { ActionCategoryTargetID: 0, ID: actionId, Icon: "/i/000000/000405.png" };
  }
}

function generateActionUrls(type: string, actionId: number, columns: (keyof XivApiJson)[]) {
  const urlTemplate = `${site.first}/${type}/${actionId}?columns=${columns.join(",")}`;
  return [urlTemplate, urlTemplate.replace(site.first, site.second)];
}

export async function getFullImgSrc(icon: string, itemIsHQ = false) {
  const url = `${site.first}${icon}`;
  return url.replace(ICON_REGEX, (_match, p1, p2) => `${p1}/${itemIsHQ ? "hq/" : ""}${p2}.png`);
}

export function getClassjobIconSrc(jobEnum: number): string {
  const job = Util.jobEnumToJob(jobEnum);
  const fullName = Util.nameToFullName(job);
  return `${site.first}/cj/companion/${fullName.en.toLowerCase().replaceAll(/\s/g, "")}.png`;
}

export async function getImgSrcByActionId(id: number): Promise<string> {
  const res = await parseAction("action", id, ["Icon"]);
  return getFullImgSrc(res.Icon);
}

export async function getActionByChineseName(name: string) {
  const customAction = userAction.get(name);
  if (customAction) {
    return { ActionCategoryTargetID: 0, ID: 0, Icon: customAction };
  }

  const cachedAction = cachedActionData.find((v) => v.name === name);
  if (cachedAction?.action) {
    return cachedAction.action;
  }

  try {
    const response = await requestPromise([`${siteList.cafe}/search?filters=ClassJobLevel>0&indexes=action&string=${encodeURIComponent(name)}`]);
    const searchData = await response.json();
    const result = searchData.Results?.[0];

    if (result) {
      const expirationTime = Date.now() + cacheExpirationTime.random;
      const newCachedAction: CachedAction = {
        name: name,
        action: result,
        expirationTime,
      };
      cachedActionData.push(newCachedAction);
      localStorage.setItem("souma-action-cache", JSON.stringify(cachedActionData));
      return result;
    } else {
      return { ActionCategoryTargetID: 0, ID: 0, Icon: "/i/000000/000405.png" };
    }
  } catch (error) {
    console.error(`Failed to get action by name: ${error}`);
    throw new Error("Failed to retrieve action data");
  }
}

async function timeoutPromise<T>(promise: Promise<T>, timeout: number): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Promise timed out"));
    }, timeout);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

async function requestPromise(urls: string[], options?: RequestInit): Promise<Response> {
  const _options = Object.assign({ cache: "force-cache" }, options);
  for (const url of urls) {
    try {
      const response = await timeoutPromise(fetch(url, _options), 3000);
      if (response.ok) {
        return response;
      }
    } catch (err) {
      console.error(`Failed to fetch ${url}: ${err}`);
    }
  }
  throw new Error("All fetch attempts failed.");
}
