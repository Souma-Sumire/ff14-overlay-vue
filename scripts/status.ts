import fs from 'fs-extra'
import csv from 'csv-parser'
import iconv from 'iconv-lite'
import { csvPaths } from './paths'

type FileValues = Record<string, string[][]>
type StatusResult = Record<string, string[]>

const fileValues: FileValues = {}

function readFile(fileName: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(iconv.decodeStream('utf8'))
      .pipe(csv({ headers: false }))
      .on('data', (row: string[]) => {
        if (!fileValues[fileName]) {
          fileValues[fileName] = []
        }
        if (row[0] === '' && row[1] === '0' && row[2] === '0') {
          return
        }
        fileValues[fileName].push(row)
      })
      .on('end', resolve)
      .on('error', reject)
  })
}

await Promise.all([
  readFile('status.csv', `${csvPaths.souma}status.csv`),
  readFile('status_ja.csv', `${csvPaths.ja}status.csv`),
])

const result: StatusResult = {}
const soumaData = fileValues['status.csv']!
const jaData = fileValues['status_ja.csv']!

soumaData.forEach((row) => {
  if (['key', '#', 'offset', 'int32', '0'].includes(row[0]!)) {
    return
  }

  const jaRow = jaData.find((r) => r[0] === row[0])
  if (jaRow && row[1]) {
    result[row[0]!] = [row[1]!, jaRow[3]!, jaRow[6]!]
  }
})

const outputPath = 'src/resources/status.json'
fs.outputJsonSync(outputPath, result, { spaces: 2 })
