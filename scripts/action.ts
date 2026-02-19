import fs from 'fs-extra'
import { readCsvRowsCached } from './csvCache'
import { csvPaths } from './paths'

interface IdToNameMap {
  [key: string]: string
}

const id2Name: IdToNameMap = {}
const rows = await readCsvRowsCached(`${csvPaths.souma}Action.csv`)
rows.forEach((row) => {
  if (
    ['key', '#', 'offset', 'int32', '0'].includes((row[0] ?? '').toLocaleLowerCase())
    || row[1] === ''
  ) {
    return
  }
  id2Name[row[0]!] = row[1]!
})

fs.outputJsonSync('src/resources/actionChinese.json', id2Name, { spaces: 2 })
