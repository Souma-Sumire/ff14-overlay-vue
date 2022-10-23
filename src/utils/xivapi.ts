import { getParams } from "@/utils/queryParams";
import Util from "./util";

type Site = { site: string };
const siteList = {
  cafe: "https://cafemaker.wakingsands.com",
  xivapi: "https://xivapi.com",
};
const site: { first: Site; second: Site } = {
  first: getParams()?.api?.toLowerCase() === "xivapi" ? { site: siteList.xivapi } : { site: siteList.cafe },
  second: getParams()?.api?.toLowerCase() === "xivapi" ? { site: siteList.cafe } : { site: siteList.xivapi },
};
const userAction = {
  2: { Icon: "/i/000000/000123.png" }, //任务指令
  3: { Icon: "/i/000000/000104.png" }, //冲刺
  4: { Icon: "/i/000000/000118.png" }, //坐骑
  7: { Icon: "/i/000000/000101.png" }, //攻击
  8: { Icon: "/i/000000/000101.png" }, //攻击
};
export async function parseAction(
  type: "item" | "action" | "mount" | string,
  actionId: number,
  columns: (keyof XivApiJson)[] = ["ID", "Icon", "ActionCategory"],
): Promise<Partial<XivApiJson>> {
  if (Object.hasOwn(userAction, actionId)) {
    return Promise.resolve(
      Object.assign(
        { ActionCategory: { ID: 0 }, ID: actionId, Icon: "/i/000000/000405.png" },
        userAction[actionId as keyof typeof userAction],
      ) as Partial<XivApiJson>,
    );
  }
  return fetch(`${site.first.site}/${type}/${actionId}?columns=${columns.join(",")}`, {
    mode: "cors",
  })
    .then((res) => res.json())
    .catch(() =>
      fetch(`${site.second.site}/${type}/${actionId}?columns=${columns.join(",")}`, { mode: "cors" })
        .then((res) => res.json())
        .catch(() => {
          return Promise.resolve(
            Object.assign(
              { ActionCategory: { ID: 0 }, ID: actionId, Icon: "/i/000000/000405.png" },
              { ID: actionId, Icon: "/i/000000/000405.png" },
            ),
          );
        }),
    );
}

export async function getImgSrc(imgSrc: string): Promise<string> {
  return checkImgExists(`${site.first.site}${imgSrc}`)
    .then(() => `${site.first.site}${imgSrc}`)
    .catch(() => `${site.second.site}${imgSrc}`);
}
export async function getClassjobIconSrc(jobNumber: number) {
  return checkImgExists(
    `${site.first.site}/cj/companion/${Util.nameToFullName(Util.jobEnumToJob(jobNumber) ?? "NONE").toLowerCase()}.png`,
  )
    .then((res: any) => res)
    .catch(() => {
      checkImgExists(
        `${site.second.site}/cj/companion/${Util.nameToFullName(
          Util.jobEnumToJob(jobNumber) ?? "NONE",
        ).toLowerCase()}.png`,
      )
        .then((res: any) => res)
        .catch(() => {
          return "/i/000000/000405.png";
        });
    });
}

function checkImgExists(imgurl: string): Promise<string> {
  return new Promise(function (resolve, reject) {
    let img = new Image();
    img.src = imgurl;
    img.onload = () => resolve(imgurl);
    img.onerror = () => reject;
  });
}
