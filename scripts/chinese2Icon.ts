import csv from 'csv-parser'
import fs from 'fs-extra'
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
        if (!['key', '#', 'offset', 'int32', '0'].includes(row[0]!.toLocaleLowerCase())) {
          handler(row)
        }
      })
      .on('end', () => resolve())
      .on('error', error => reject(error))
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
    const id = row[0]!
    const icon = row[3]!
    if (level > 0 && (icon !== '405' || id === '120')) {
      id2ClassJobLevel[id] = row[13]!
      id2Icon[id] = icon
    }
  }),
])

const chineseToIcon: Record<string, string> = {}
for (const [id, name] of Object.entries(id2Name)) {
  if (id2ClassJobLevel[id]) {
    const icon = id2Icon[id]!
    if (!chineseToIcon[name] || (chineseToIcon[name] === '405' && icon !== '405')) {
      chineseToIcon[name] = icon
    }
  }
}

fs.outputJsonSync('src/resources/chinese2Icon.json', chineseToIcon, {
  spaces: 2,
})
fs.outputJsonSync('src/resources/action2ClassJobLevel.json', id2ClassJobLevel, {
  spaces: 2,
})
