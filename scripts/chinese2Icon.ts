import fs from 'fs-extra'
import { readCsvRowsCached } from './csvCache'
import { csvPaths } from './paths'

type IdToMap<T> = Record<string, T>
type IdToName = IdToMap<string>
type IdToClassJobLevel = IdToMap<string>
type IdToIcon = IdToMap<string>

const id2Name: IdToName = {}
const id2ClassJobLevel: IdToClassJobLevel = {}
const id2Icon: IdToIcon = {}

const [soumaRows, jaRows] = await Promise.all([
  readCsvRowsCached(`${csvPaths.souma}Action.csv`),
  readCsvRowsCached(`${csvPaths.ja}Action.csv`),
])

soumaRows.forEach((row) => {
  if (['key', '#', 'offset', 'int32', '0'].includes((row[0] ?? '').toLocaleLowerCase()))
    return
  if (row[1] !== '')
    id2Name[row[0]!] = row[1]!
})

jaRows.forEach((row) => {
  if (['key', '#', 'offset', 'int32', '0'].includes((row[0] ?? '').toLocaleLowerCase()))
    return
  const level = Number(row[13])
  const id = row[0]!
  const icon = row[3]!
  if (level > 0 && (icon !== '405' || id === '120')) {
    id2ClassJobLevel[id] = row[13]!
    id2Icon[id] = icon
  }
})

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
