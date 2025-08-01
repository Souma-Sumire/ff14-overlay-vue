const csv = require('csv-parser')
const fs = require('fs-extra')
const iconv = require('iconv-lite')
const { csvPaths } = require('./paths.cjs')

async function readCsv(filePath, handler) {
  return new Promise((resolve) => {
    fs.createReadStream(filePath)
      .pipe(iconv.decodeStream('utf8'))
      .pipe(csv({ headers: false }))
      .on('data', (row) => {
        if (!['key', '#', 'offset', 'int32', '0'].includes(row[0])) {
          handler(row)
        }
      })
      .on('end', resolve)
  })
}

(async () => {
  const id2Name = {}
  const id2ClassJobLevel = {}
  const id2Icon = {}

  await Promise.all([
    readCsv(`${csvPaths.souma}Action.csv`, (row) => {
      if (row[1] !== '')
        id2Name[row[0]] = row[1]
    }),
    readCsv(`${csvPaths.ja}Action.csv`, (row) => {
      if (Number(row[13]) > 0 && row[3] !== '405') {
        // row[3] = icon
        // row[13] = class job level
        id2ClassJobLevel[row[0]] = row[13]
        id2Icon[row[0]] = row[3]
      }
    }),
  ])

  const result = Object.fromEntries(
    Object.entries(id2Name)
      .filter(([id]) => id2ClassJobLevel[id])
      .map(([id, name]) => [name, id2Icon[id]]),
  )

  fs.outputJsonSync('src/resources/chinese2Icon.json', result)
  fs.outputJsonSync('src/resources/action2ClassJobLevel.json', id2ClassJobLevel)
})()
