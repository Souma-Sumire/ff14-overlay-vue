import fs from 'fs-extra'
import csv from 'csv-parser'
import iconv from 'iconv-lite'
import { csvPaths } from './paths.js'

const worlds: Set<string> = new Set()
let index = 0

await new Promise<void>((resolve, reject) => {
  fs.createReadStream(`${csvPaths.cn}World.csv`)
    .pipe(iconv.decodeStream('utf8'))
    .pipe(csv({ headers: false }))
    .on('data', (row: string[]) => {
      index++
      if (index <= 5) {
        return
      }
      if (row[2]) {
        worlds.add(row[2])
      }
    })
    .on('end', resolve)
    .on('error', reject)
})

const worldsArray = Array.from(worlds)
const worldsString = `export const worlds = ${JSON.stringify(worldsArray, null, 2)};\n`
const outputPath = 'src/resources/worlds.ts'

fs.outputFileSync(outputPath, worldsString)
