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

function checkImgExists(imgurl: string): Promise<string> {
  return timeoutPromise(
    new Promise<string>(function (resolve, reject) {
      let img = new Image();
      img.src = imgurl;
      img.onload = () => resolve(imgurl);
      img.onerror = () => reject();
    }),
<<<<<<< HEAD
    3000,
=======
    3000,
>>>>>>> da96dd020b6f51797245e576a0fe21181920c21a
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
  return await requestPromise([
    `${siteList.cafe}/search?filters=ClassJobLevel>0&indexes=action&string=${encodeURIComponent(name)}`,
    `${siteList.xivapi}/search?filters=ClassJobLevel>0&indexes=action&string=${encodeURIComponent(name)}`,
  ])
    .then((v) => v.json())
    .then((v) => v.Results[0] ?? { ActionCategoryTargetID: 0, ID: 0, Icon: "/i/000000/000405.png" });
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
  for (const url of urls) {
    try {
      const response = await timeoutPromise(fetch(url, options), 3000);
      if (response.ok) {
        return response;
      }
    } catch (err) {
      console.error(`Failed to fetch ${url}: ${err}`);
    }
  }
  throw new Error("All fetch attempts failed.");
}
