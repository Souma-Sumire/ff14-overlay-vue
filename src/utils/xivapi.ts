import { getParams } from "@/utils/queryParams";
import Util from "./util";

type Site = { site: string; mode: RequestMode };
const siteList = {
  cafe: "https://cafemaker.wakingsands.com",
  xivapi: "https://xivapi.com",
};
const site: { first: Site; second: Site } = {
  first:
    getParams()?.api?.toLowerCase() === "xivapi"
      ? { site: siteList.xivapi, mode: "cors" }
      : { site: siteList.cafe, mode: "no-cors" },
  second:
    getParams()?.api?.toLowerCase() === "xivapi"
      ? { site: siteList.cafe, mode: "no-cors" }
      : { site: siteList.xivapi, mode: "cors" },
};
export async function parseAction(
  type: "item" | "action",
  actionId: number,
  columns: (keyof XivApiJson)[] = ["ID", "Icon", "ActionCategory"],
): Promise<XivApiJson> {
  return fetch(`${site.first.site}/${type}/${actionId}?columns=${columns.join(",")}`, {
    mode: site.first.mode,
  })
    .then((res): Promise<XivApiJson> => res.json())
    .catch(
      (): Promise<XivApiJson> =>
        fetch(`${site.second.site}/${type}/${actionId}?columns=${columns.join(",")}`, { mode: site.second.mode })
          .then((res) => res.json())
          .then((res) => {
            if (res.ID === 2 && res.Icon) res.Icon = "000000/000123"; //任务指令
            else if (res.ID === 3 && res.Icon) res.Icon = "000000/000104"; //冲刺
            else if (res.ID === 4 && res.Icon) res.Icon = "000000/000118"; //坐骑
            else if (res.ID === 7 && res.Icon) res.Icon = "000000/000101"; //攻击
            else if (res.ID === 8 && res.Icon) res.Icon = "000000/000101"; //攻击
            return res;
          })
          .catch(() => {
            return { ActionCategory: { ID: 0 }, ID: actionId, Icon: "/i/000000/000405.png" };
          }),
    );
}

export async function getImgSrc(imgSrc: string): Promise<string> {
  return checkImgExists(`${site.first.site}${imgSrc}`)
    .then((res: any) => res)
    .catch(() => {
      checkImgExists(`${site.second.site}${imgSrc}`).then((res: any) => res);
    });
}
export function getClassjobIconSrc(jobNumber: number) {
  return checkImgExists(
    `${site.first.site}/cj/companion/${Util.nameToFullName(Util.jobEnumToJob(jobNumber) ?? "NONE").toLowerCase()}.png`,
  )
    .then((res: any) => res)
    .catch(() => {
      checkImgExists(
        `${site.second.site}/cj/companion/${Util.nameToFullName(
          Util.jobEnumToJob(jobNumber) ?? "NONE",
        ).toLowerCase()}.png`,
      ).then((res: any) => res);
    });
}

function checkImgExists(imgurl: string) {
  return new Promise(function (resolve, reject) {
    let img = new Image();
    img.src = imgurl;
    img.onload = () => resolve(imgurl);
    img.onerror = (err) => reject(err);
  });
}
