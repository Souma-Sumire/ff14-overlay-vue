const csv = require('csv-parser')
const fs = require('fs-extra')
const iconv = require('iconv-lite')
const { csvPaths } = require('./paths.cjs')

async function processCSVFiles() {
  const worlds = new Set()
  let index = 0

  await new Promise(resolve =>
    fs
      .createReadStream(`${csvPaths.cn}World.csv`)
      .pipe(iconv.decodeStream('utf8'))
      .pipe(csv({ headers: false }))
      .on('data', (row) => {
        index++
        if (index <= 5) {
          return
        }
        if (row[2]) {
          worlds.add(row[2])
        }
      })
      .on('end', resolve),
  )
  const worldsArray = Array.from(worlds)
  const worldsString = `export const worlds = ${JSON.stringify(worldsArray, null, 2)};\n`
  fs.outputFileSync('src/resources/worlds.ts', worldsString)
}

processCSVFiles()
