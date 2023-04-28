import { params } from "@/utils/queryParams";
import Util from "./util";

const waitingTimeout = 3000;
const siteList = {
  cafe: "https://cafemaker.wakingsands.com",
  xivapi: "https://xivapi.com",
};
const site: { first: string; second: string } = {
  first: params?.api?.toLowerCase() === "xivapi" ? siteList.xivapi : siteList.cafe,
  second: params?.api?.toLowerCase() === "xivapi" ? siteList.cafe : siteList.xivapi,
};
const userAction = {
  2: { ActionCategoryTargetID: 8, Icon: "/i/000000/000123.png" }, //任务指令
  3: { ActionCategoryTargetID: 10, Icon: "/i/000000/000104.png" }, //冲刺
  4: { ActionCategoryTargetID: 5, Icon: "/i/000000/000118.png" }, //坐骑
  7: { ActionCategoryTargetID: 1, Icon: "/i/000000/000101.png" }, //攻击
  8: { ActionCategoryTargetID: 1, Icon: "/i/000000/000101.png" }, //攻击
  25756: { ActionCategoryTargetID: 4, Icon: "/i/003000/003090.png" }, //腐秽大地(隐藏)
};
export async function parseAction(
  type: "item" | "action" | "mount" | string,
  actionId: number,
  columns: (keyof XivApiJson)[] = ["ID", "Icon", "ActionCategoryTargetID"],
): Promise<Partial<XivApiJson>> {
  if (Object.hasOwn(userAction, actionId)) {
    return Promise.resolve(
      Object.assign(
        { ActionCategoryTargetID: 0, ID: actionId, Icon: "/i/000000/000405.png" },
        userAction[actionId as keyof typeof userAction],
      ) as Partial<XivApiJson>,
    );
  }

  return myRequest(fetch(`${site.first}/${type}/${actionId}?columns=${columns.join(",")}`, { mode: "cors" }).then((v) => v.json())).catch(async () => {
    return myRequest(fetch(`${site.second}/${type}/${actionId}?columns=${columns.join(",")}`, { mode: "cors" }).then((v) => v.json())).catch((_e) => {
      return { ActionCategoryTargetID: 0, ID: actionId, Icon: "/i/000000/000405.png" };
    });
  });
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
  return myRequest(
    new Promise<string>(function (resolve, reject) {
      let img = new Image();
      img.src = imgurl;
      img.onload = () => resolve(imgurl);
      img.onerror = () => reject();
    }),
  );
}

export async function getImgSrcByActionId(id: number): Promise<string> {
  return parseAction("action", id, ["Icon"]).then((res) => {
    return getImgSrc(res?.Icon ?? "");
  });
}

export async function getActionByChineseName(name: string): Promise<Partial<XivApiJson>> {
  // const isCN = /[\u4e00-\u9fa5]/.test(name);
  return queueRequest([
    async () => {
      return fetch(`${siteList.cafe}/search?filters=ClassJobLevel>0&indexes=action&string=${encodeURIComponent(name)}`)
        .then((v) => v.json())
        .then((v) => {
          const result = v.Results[0];
          if (!result) Promise.reject(new Error("No result (cafe) " + name));
          return result;
        });
    },
    async () => {
      return fetch(`${siteList.xivapi}/search?filters=ClassJobLevel>0&indexes=action&string=${encodeURIComponent(name)}`)
        .then((v) => v.json())
        .then((v) => {
          const result = v.Results[0];
          if (!result) Promise.reject(new Error("No result (xivapi) " + name));
          return result;
        });
    },
  ]);
}

function myRequest(p1: Promise<any>) {
  return Promise.race([
    p1,
    new Promise((_, reject) =>
      setTimeout(() => {
        reject(new Error("timed out"));
      }, waitingTimeout),
    ),
  ]);
}

async function queueRequest(p: (() => Promise<string>)[], i = 0): Promise<any> {
  return myRequest(p[i]()).catch(() => myRequest(p[i + 1]()));
}
