import { params } from "@/utils/queryParams";
import Util from "./util";

type Site = { site: string };
const siteList = {
  cafe: "https://cafemaker.wakingsands.com",
  xivapi: "https://xivapi.com",
};
const site: { first: Site; second: Site } = {
  first: params?.api?.toLowerCase() === "xivapi" ? { site: siteList.xivapi } : { site: siteList.cafe },
  second: params?.api?.toLowerCase() === "xivapi" ? { site: siteList.cafe } : { site: siteList.xivapi },
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
  return (
    (await fetch(`${site.first.site}/${type}/${actionId}?columns=${columns.join(",")}`, {
      mode: "cors",
    })
      .then((res) => res.json())
      .catch(() => {})) ||
    (await fetch(`${site.second.site}/${type}/${actionId}?columns=${columns.join(",")}`, { mode: "cors" })
      .then((res) => res.json())
      .catch(() => {})) ||
    Promise.resolve({ ActionCategoryTargetID: 0, ID: actionId, Icon: "/i/000000/000405.png" })
  );
}

export async function getImgSrc(imgSrc: string, itemIsHQ = false): Promise<string> {
  if (imgSrc.length === 0) return Promise.resolve("");
  return checkImgExists(`${site.first.site}${imgSrc}`)
    .catch(() =>
      checkImgExists(`${site.second.site}${imgSrc}`).catch(() =>
        Promise.resolve("https://cafemaker.wakingsands.com/i/000000/000405.png"),
      ),
    )
    .then((src) =>
      src.replace(/(\d{6})\/(\d{6})\.png$/, (_match, p1, p2) => `${p1}/${itemIsHQ ? "hq/" : ""}${p2}.png`),
    );
}
export async function getClassjobIconSrc(jobNumber: number): Promise<string> {
  return checkImgExists(
    `${site.first.site}/cj/companion/${Util.nameToFullName(Util.jobEnumToJob(jobNumber)).en}.png`,
  ).catch(() =>
    checkImgExists(
      `${site.second.site}/cj/companion/${Util.nameToFullName(Util.jobEnumToJob(jobNumber)).en}.png`,
    ).catch(() => Promise.resolve("https://cafemaker.wakingsands.com/cj/companion/none.png")),
  );
}

function checkImgExists(imgurl: string): Promise<string> {
  return new Promise(function (resolve, reject) {
    let img = new Image();
    img.src = imgurl;
    img.onload = () => resolve(imgurl);
    img.onerror = () => reject();
  });
}

export async function getImgSrcByActionId(id: number): Promise<string> {
  return parseAction("action", id, ["Icon"]).then((res) => {
    return getImgSrc(res?.Icon ?? "");
  });
}

export async function getActionByChineseName(name: string): Promise<Partial<XivApiJson> | undefined> {
  const isCN = /^[\u4e00-\u9fa5]+$/.test(name);
  return fetch(
    `https://${
      isCN ? "cafemaker.wakingsands.com" : "xivapi.com"
    }/search?filters=IsPlayerAction=1,ClassJobLevel>0&indexes=action&string=${encodeURIComponent(name)}`,
  )
    .then((res) => res.json())
    .then((res) => res["Results"]?.[0]);
}
