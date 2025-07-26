const csv = require('csv-parser')
const fs = require('fs-extra')
const iconv = require('iconv-lite')
const { csvPaths } = require('./paths.cjs')

const id2Name = {}

Promise.all([
  new Promise((resolve) => {
    fs.createReadStream(`${csvPaths.souma}Action.csv`)
      .pipe(iconv.decodeStream('utf8'))
      .pipe(csv({ headers: false }))
      .on('data', (row) => {
        if (['key', '#', 'offset', 'int32', '0'].includes(row[0]) || row[1] === '') {
          return
        }
        id2Name[row[0]] = row[1]
      })
      .on('end', () => {
        resolve('end')
      })
  }),
]).then(() => {
  fs.outputJsonSync('src/resources/actionChinese.json', id2Name, { spaces: 2 })
})
