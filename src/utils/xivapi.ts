export async function parseAction(
  type: "item" | "action",
  actionId: number,
  columns: (keyof XivApiJson)[] = ["ID", "Icon", "ActionCategory"],
): Promise<XivApiJson> {
  return fetch(`https://cafemaker.wakingsands.com/${type}/${actionId}?columns=${columns.join(",")}`, { mode: "cors" })
    .then((res): Promise<XivApiJson> => res.json())
    .catch(
      (): Promise<XivApiJson> =>
        fetch(`https:/xivapi.com/${type}/${actionId}?columns=${columns.join(",")}`, { mode: "cors" })
          .then((res) => res.json())
          .then((res) => res)
          .catch(() => {
            return { "ActionCategory": { "ID": 0 }, "ID": actionId, "Icon": "/i/000000/000405.png" };
          }),
    );
}

export async function getImgSrc(icon: string): Promise<string> {
  return checkImgExists(`https://cafemaker.wakingsands.com${icon}`)
    .then((res: any) => res)
    .catch(() => {
      checkImgExists(`https:/xivapi.com${icon}`)
        .then((res: any) => res)
        .catch(() => {
          return `/i/000000/000405.png`;
        });
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
