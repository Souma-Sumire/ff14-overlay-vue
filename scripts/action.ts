import fs from 'fs-extra'
import csv from 'csv-parser'
import iconv from 'iconv-lite'
import { csvPaths } from './paths'

type IdToNameMap = {
  [key: string]: string
}

const id2Name: IdToNameMap = {}
const filePath = `${csvPaths.souma}Action.csv`

await new Promise<void>((resolve, reject) => {
  fs.createReadStream(filePath)
    .pipe(iconv.decodeStream('utf8'))
    .pipe(csv({ headers: false }))
    .on('data', (row: string[]) => {
      if (
        ['key', '#', 'offset', 'int32', '0'].includes(row[0]!.toLocaleLowerCase()) ||
        row[1] === ''
      ) {
        return
      }
      id2Name[row[0]!] = row[1]!
    })
    .on('end', () => {
      resolve()
    })
    .on('error', (error) => {
      reject(error)
    })
})

fs.outputJsonSync('src/resources/actionChinese.json', id2Name, { spaces: 2 })
