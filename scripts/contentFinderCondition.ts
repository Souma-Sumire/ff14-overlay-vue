import fs from 'fs-extra'
import { readCsvRowsCached } from './csvCache'
import { csvPaths } from './paths'

interface FileValues {
  [fileName: string]: string[][]
}

interface ContentFinderConditionResult {
  [id: string]: string
}

const fileValues: FileValues = {}

await Promise.all([
  (async () => {
    fileValues.contentFinderCondition = await readCsvRowsCached(
      `${csvPaths.ja}contentFinderCondition.csv`,
    )
  })(),
  (async () => {
    fileValues.contentFinderCondition_cn = await readCsvRowsCached(
      `${csvPaths.cn}contentFinderCondition.csv`,
    )
  })(),
])

const result: ContentFinderConditionResult = {}
const jaData = fileValues.contentFinderCondition!
const cnData = fileValues.contentFinderCondition_cn!

jaData.forEach((row) => {
  // 跳过不必要的行
  if (['key', '#', 'offset', 'int32'].includes(row[0]!.toLocaleLowerCase())) {
    return
  }

  const cnRow = cnData!.find(r => r[0] === row[0])!
  const cn = cnRow?.[2]
  const ja = row[2]

  // 使用空值合并运算符（??）来简化逻辑
  const key = (ja && ja !== '0' ? ja : cn) ?? ja

  if (key) {
    result[row[0]!] = key
  }
})

const outputPath = 'src/resources/generated/contentFinderCondition.json'
fs.outputJsonSync(outputPath, result, { spaces: 2 })
