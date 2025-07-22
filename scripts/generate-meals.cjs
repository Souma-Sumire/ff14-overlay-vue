const csv = require("csv-parser");
const fs = require("fs-extra");
const iconv = require("iconv-lite");
const { csvPaths } = require("./paths.cjs");

async function processCSVFiles() {
  const item = {};
  const itemAction = {};
  const itemFood = {};
  const baseParam = {};

  await new Promise((resolve) =>
    fs
      .createReadStream(`${csvPaths.souma}BaseParam.csv`)
      .pipe(iconv.decodeStream("utf8"))
      .pipe(csv({ headers: false }))
      .on("data", (row) => (baseParam[row[0]] = row[1]))
      .on("end", resolve)
  );

  await new Promise((resolve) =>
    fs
      .createReadStream(`${csvPaths.ja}ItemFood.csv`)
      .pipe(iconv.decodeStream("utf8"))
      .pipe(csv({ headers: false }))
      .on("data", (row) => (itemFood[row[0]] = row))
      .on("end", resolve)
  );

  await new Promise((resolve) =>
    fs
      .createReadStream(`${csvPaths.ja}ItemAction.csv`)
      .pipe(iconv.decodeStream("utf8"))
      .pipe(csv({ headers: false }))
      .on("data", (row) => (itemAction[row[0]] = row[7]))
      .on("end", resolve)
  );

  await new Promise((resolve) =>
    fs
      .createReadStream(`${csvPaths.souma}Item.csv`)
      .pipe(iconv.decodeStream("utf8"))
      .pipe(csv({ headers: false }))
      .on("data", (row) => {
        if (["key", "offset", "#", "int32"].includes(row[0])) return;
        item[row[0]] = item[row[0]] || {};
        item[row[0]].Name = row[1];
      })
      .on("end", resolve)
  );

  await new Promise((resolve) =>
    fs
      .createReadStream(`${csvPaths.ja}Item.csv`)
      .pipe(iconv.decodeStream("utf8"))
      .pipe(csv({ headers: false }))
      .on("data", (row) => {
        if (row[16] === "46" && itemAction[row[31]] !== "0") {
          if (!item[row[0]]) item[row[0]] = {};
          item[row[0]].ItemActionData0 = itemAction[row[31]];
          item[row[0]].Level = row[12];
        }
      })
      .on("end", resolve)
  );

  const transformed = {};
  for (const [_, { Name, ItemActionData0, Level }] of Object.entries(item)) {
    const food = itemFood[ItemActionData0];
    if (!food) continue;

    const ParamsValues = [
      {
        "Params": baseParam[food[2]],
        "Value": food[4],
        "Max": food[5],
        "Value{HQ}": food[6],
        "Max{HQ}": food[7],
      },
      {
        "Params": baseParam[food[8]],
        "Value": food[10],
        "Max": food[11],
        "Value{HQ}": food[12],
        "Max{HQ}": food[13],
      },
      {
        "Params": baseParam[food[14]],
        "Value": food[16],
        "Max": food[17],
        "Value{HQ}": food[18],
        "Max{HQ}": food[19],
      },
    ].filter((p) => p.Params && p.Params.length > 0);

    transformed[ItemActionData0] = { Name, ParamsValues, Level };
  }

  await fs.outputJson("src/resources/mealsItemActionData0.json", transformed, {
    spaces: 2,
  });
}

processCSVFiles()
