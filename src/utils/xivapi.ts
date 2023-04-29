import { params } from "@/utils/queryParams";
import Util from "./util";

const siteList = {
  cafe: "https://cafemaker.wakingsands.com",
  xivapi: "https://xivapi.com",
};
const site: { first: string; second: string } = {
  first: params?.api?.toLowerCase() === "xivapi" ? siteList.xivapi : siteList.cafe,
  second: params?.api?.toLowerCase() === "xivapi" ? siteList.cafe : siteList.xivapi,
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
export async function parseAction(
  type: "item" | "action" | "mount" | string,
  actionId: number,
  columns: (keyof XivApiJson)[] = ["ID", "Icon", "ActionCategoryTargetID"],
) {
  return requestPromise([`${site.first}/${type}/${actionId}?columns=${columns.join(",")}`, `${site.second}/${type}/${actionId}?columns=${columns.join(",")}`], {
    mode: "cors",
  })
    .then((v) => v.json())
    .catch(() => ({ ActionCategoryTargetID: 0, ID: actionId, Icon: "/i/000000/000405.png" }));
}

export async function getImgSrc(imgSrc: string | undefined, itemIsHQ = false) {
  if (!imgSrc) return "";
  let url = `${site.first}${imgSrc}`;
  await checkImgExists(url).catch(() => (url = url.replace(site.first, site.second)));
  return url.replace(/(\d{6})\/(\d{6})\.png$/, (_match, p1, p2) => `${p1}/${itemIsHQ ? "hq/" : ""}${p2}.png`);
}
export function getClassjobIconSrc(jobNumber: number): string {
  let url = `${site.first}/cj/companion/${Util.nameToFullName(Util.jobEnumToJob(jobNumber)).en}.png`;
  checkImgExists(url).catch(() => (url = url.replace(site.first, site.second)));
  return url;
}

interface CachedImage {
  url: string;
  expirationTime: number; // Unix 时间戳，毫秒
}
interface CachedAction {
  name: string;
  action: any;
  expirationTime: number; // Unix 时间戳，毫秒
}
const cacheExpirationTime = {
  get random() {
    return Math.floor(Math.random() * 86400000 * 11) + 86400000 * 25;
  },
};

function checkImgExists(imgurl: string): Promise<string> {
  const cachedImageData = localStorage.getItem("souma-img-cache");
  const cachedImages: CachedImage[] = cachedImageData ? JSON.parse(cachedImageData) : [];
  const cachedImage = cachedImages.find((img) => img.url === imgurl);
  if (cachedImage && cachedImage.expirationTime > Date.now()) {
    console.log("已缓存img", imgurl);
    return Promise.resolve(imgurl);
  }
  return timeoutPromise(
    new Promise<string>((resolve, reject) => {
      let img = new Image();
      img.src = imgurl;
      img.onload = () => {
        const expirationTime = Date.now() + cacheExpirationTime.random;
        const newCachedImage: CachedImage = {
          url: imgurl,
          expirationTime,
        };
        cachedImages.push(newCachedImage);
        localStorage.setItem("souma-img-cache", JSON.stringify(cachedImages));
        resolve(imgurl);
      };
      img.onerror = () => reject();
    }),
    3000,
  );
}

export async function getImgSrcByActionId(id: number): Promise<string> {
  return parseAction("action", id, ["Icon"]).then((res) => {
    return getImgSrc(res?.Icon ?? "");
  });
}

export async function getActionByChineseName(name: string) {
  // const isCN = /[\u4e00-\u9fa5]/.test(name);
  const customAction = userAction.get(name);
  if (customAction) return Object.assign({ ActionCategoryTargetID: 0, ID: 0, Icon: customAction });
  const cachedActionData = localStorage.getItem("souma-action-cache");
  const cachedActions: CachedAction[] = cachedActionData ? JSON.parse(cachedActionData) : [];
  const cachedAction = cachedActions.find((v) => v.name === name);
  if (cachedAction && cachedAction.action && cachedAction.expirationTime > Date.now()) {
    console.log("已缓存action", name);
    return Promise.resolve(cachedAction.action);
  }
  return await requestPromise([`${siteList.cafe}/search?filters=ClassJobLevel>0&indexes=action&string=${encodeURIComponent(name)}`])
    .then((v) => v.json())
    .then((v) => {
      const result = v.Results?.[0];
      if (result) {
        const expirationTime = Date.now() + cacheExpirationTime.random;
        const newCachedAction: CachedAction = {
          name: name,
          action: result,
          expirationTime,
        };
        cachedActions.push(newCachedAction);
        localStorage.setItem("souma-action-cache", JSON.stringify(cachedActions));
        return result;
      } else return { ActionCategoryTargetID: 0, ID: 0, Icon: "/i/000000/000405.png" };
    })
    .catch(() => ({ ActionCategoryTargetID: 0, ID: 0, Icon: "/i/000000/000405.png" }));
}
async function timeoutPromise<T>(promise: Promise<T>, timeout: number): Promise<T> {
  let timeoutId: NodeJS.Timer;
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
