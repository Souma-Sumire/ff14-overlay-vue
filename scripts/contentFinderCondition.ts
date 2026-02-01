import csv from 'csv-parser'
import fs from 'fs-extra'
import iconv from 'iconv-lite'
import { csvPaths } from './paths'

interface FileValues {
  [fileName: string]: string[][]
}

interface ContentFinderConditionResult {
  [id: string]: string
}

const fileValues: FileValues = {}

function readFile(fileName: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(iconv.decodeStream('utf8'))
      .pipe(csv({ headers: false }))
      .on('data', (row: string[]) => {
        fileValues[fileName] = fileValues[fileName] || []
        fileValues[fileName].push(row)
      })
      .on('end', () => {
        resolve()
      })
      .on('error', (error) => {
        reject(error)
      })
  })
}

await Promise.all([
  readFile(
    'contentFinderCondition.csv',
    `${csvPaths.ja}contentFinderCondition.csv`,
  ),
  readFile(
    'contentFinderCondition_cn.csv',
    `${csvPaths.cn}contentFinderCondition.csv`,
  ),
])

const result: ContentFinderConditionResult = {}
const jaData = fileValues['contentFinderCondition.csv']!
const cnData = fileValues['contentFinderCondition_cn.csv']!

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

const outputPath = 'src/resources/contentFinderCondition.json'
fs.outputJsonSync(outputPath, result, { spaces: 2 })
