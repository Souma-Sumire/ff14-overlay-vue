import fs from 'fs-extra'
import csv from 'csv-parser'
import iconv from 'iconv-lite'
import { csvPaths } from './paths'

type IdToMap<T> = Record<string, T>
type IdToName = IdToMap<string>
type IdToClassJobLevel = IdToMap<string>
type IdToIcon = IdToMap<string>

function readCsv(
  filePath: string,
  handler: (row: string[]) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(iconv.decodeStream('utf8'))
      .pipe(csv({ headers: false }))
      .on('data', (row: string[]) => {
        if (!['key', '#', 'offset', 'int32', '0'].includes(row[0]!)) {
          handler(row)
        }
      })
      .on('end', () => resolve())
      .on('error', (error) => reject(error))
  })
}

const id2Name: IdToName = {}
const id2ClassJobLevel: IdToClassJobLevel = {}
const id2Icon: IdToIcon = {}

await Promise.all([
  readCsv(`${csvPaths.souma}Action.csv`, (row) => {
    if (row[1] !== '') {
      id2Name[row[0]!] = row[1]!
    }
  }),
  readCsv(`${csvPaths.ja}Action.csv`, (row) => {
    const level = Number(row[13])
    if (level > 0 && row[3] !== '405') {
      id2ClassJobLevel[row[0]!] = row[13]!
      id2Icon[row[0]!] = row[3]!
    }
  }),
])
const chineseToIcon = Object.fromEntries(
  Object.entries(id2Name)
    .filter(([id]) => id2ClassJobLevel[id])
    .map(([id, name]) => [name, id2Icon[id]]),
)

fs.outputJsonSync('src/resources/chinese2Icon.json', chineseToIcon, {
  spaces: 2,
})
fs.outputJsonSync('src/resources/action2ClassJobLevel.json', id2ClassJobLevel, {
  spaces: 2,
})
