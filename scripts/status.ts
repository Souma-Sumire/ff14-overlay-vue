import fs from "fs-extra";
import { readCsvRowsCached } from "./csvCache";
import { csvPaths } from "./paths";

type FileValues = Record<string, string[][]>;
type StatusResult = Record<string, string[]>;

const fileValues: FileValues = {};

await Promise.all([
  (async () => {
    const rows = await readCsvRowsCached(`${csvPaths.souma}status.csv`);
    fileValues["status.csv"] = rows.filter(
      (row) => !(row[0] === "" && row[1] === "0" && row[2] === "0"),
    );
  })(),
  (async () => {
    const rows = await readCsvRowsCached(`${csvPaths.ja}status.csv`);
    fileValues["status_ja.csv"] = rows.filter(
      (row) => !(row[0] === "" && row[1] === "0" && row[2] === "0"),
    );
  })(),
]);

const result: StatusResult = {};
const soumaData = fileValues["status.csv"]!;
const jaData = fileValues["status_ja.csv"]!;

soumaData.forEach((row) => {
  if (["key", "#", "offset", "int32", "0"].includes(row[0]!.toLocaleLowerCase())) {
    return;
  }

  const jaRow = jaData.find((r) => r[0] === row[0]);
  if (jaRow && row[1]) {
    result[row[0]!] = [row[1]!, jaRow[3]!, jaRow[6]!];
  }
});

const outputPath = "src/resources/generated/status.json";
fs.outputJsonSync(outputPath, result, { spaces: 2 });
