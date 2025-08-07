const csv = require('csv-parser')
const fs = require('fs-extra')
const iconv = require('iconv-lite')
const { csvPaths } = require('./paths.cjs')

const cn = {}
const ja = {}

Promise.all([
  new Promise((resolve) => {
    fs.createReadStream(`${csvPaths.souma}Action.csv`)
      .pipe(iconv.decodeStream('utf8'))
      .pipe(csv({ headers: false }))
      .on('data', (row) => {
        if (
          ['key', '#', 'offset', 'int32', '0'].includes(row[0])
          || row[1] === ''
        ) {
          return
        }
        cn[row[0]] = row[1]
      })
      .on('end', () => {
        resolve('end')
      })
  }),
  new Promise((resolve) => {
    fs.createReadStream(`${csvPaths.ja}Action.csv`)
      .pipe(iconv.decodeStream('utf8'))
      .pipe(csv({ headers: false }))
      .on('data', (row) => {
        if (
          ['key', '#', 'offset', 'int32', '0'].includes(row[0])
          || row[1] === ''
        ) {
          return
        }
        ja[row[0]] = row[1]
      })
      .on('end', () => {
        resolve('end')
      })
  }),
]).then(() => {
  const ja2cn = {}
  Object.keys(ja).forEach((key) => {
    if (cn[key]) {
      ja2cn[ja[key]] = cn[key]
    }
  })
  fs.outputJsonSync('src/resources/ja2cn.json', ja2cn)
})
