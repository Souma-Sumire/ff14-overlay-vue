import fs from 'fs-extra'
import { readCsvRowsCached } from './csvCache'
import { csvPaths } from './paths'

type IdToMap<T> = Record<string, T>
type IdToClassJobLevel = IdToMap<string>

const id2ClassJobLevel: IdToClassJobLevel = {}
const cnRows = await readCsvRowsCached(`${csvPaths.cn}Action.csv`)

cnRows.forEach((row) => {
  if (['key', '#', 'offset', 'int32', '0'].includes((row[0] ?? '').toLocaleLowerCase()))
    return
  const level = Number(row[13])
  const id = row[0]!
  const icon = row[3]!
  if (level > 0 && (icon !== '405' || id === '120')) {
    id2ClassJobLevel[id] = row[13]!
  }
})

fs.outputJsonSync('src/resources/generated/action2ClassJobLevel.json', id2ClassJobLevel, {
  spaces: 2,
})
