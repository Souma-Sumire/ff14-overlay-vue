const csv = require("csv-parser");
const fs = require("fs-extra");
const iconv = require("iconv-lite");
const { csvPaths } = require("./paths.cjs");

async function processCSVFiles() {
  const item = {};
  const itemAction = {};

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
        if (row[16] === "46") {
          if (!item[row[0]]) item[row[0]] = {};
          item[row[0]].ItemActionData0 = itemAction[row[31]];
        }
      })
      .on("end", resolve)
  );

  const transformed = {};
  for (const [_, { Name, ItemActionData0 }] of Object.entries(item)) {
    if (ItemActionData0 && ItemActionData0 !== "0" && Name) {
      transformed[ItemActionData0] = Name;
    }
  }

  await fs.outputJson("src/resources/mealsItemActionData0.json", transformed, {
    spaces: 2,
  });
}

processCSVFiles()
  .then(() => console.log("CSV processing completed!"))
  .catch(console.error);
