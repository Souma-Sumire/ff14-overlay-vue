const csv = require('csv-parser')
const fs = require('fs-extra')
const iconv = require('iconv-lite')
const { csvPaths } = require('./paths.cjs')

const VERSION = '711'

const fileValues = {}
function readFile(fileName, path) {
  return new Promise((resolve) => {
    fs.createReadStream(path)
      .pipe(iconv.decodeStream('utf8'))
      .pipe(csv({ headers: false }))
      .on('data', (row) => {
        fileValues[fileName] = fileValues[fileName] || []
        fileValues[fileName].push(row)
      }).on('end', () => {
        resolve('end')
      })
  })
}

Promise.all([readFile('status_ja.csv', `${csvPaths.ja}status.csv`), readFile('status_en.csv', `${csvPaths.en}status.csv`)], readFile('status_souma.csv', `${csvPaths.souma}status.csv`)).then(() => {
  const old = {}
  fileValues['status_ja.csv'].forEach((row) => {
    if (['key', '#', 'offset', 'int32', '0'].includes(row[0])) {
      return
    }
    if (row[1] === '') {
      return
    }
    const en = fileValues['status_en.csv'].find((r) => r[0] === row[0])
    const souma = fileValues['status_souma.csv'].find((r) => r[0] === row[0])
    old[row[0]] = { name: { ja: row[1], en: en[1], souma: souma[1] }, description: { ja: row[2], en: en[2], souma: souma[2] }, icon: row[3] }
  })
  fs.outputJsonSync(`src/resources/status-compare-${VERSION}.json`, old, { spaces: 2 })
  // console.log('Data generated successfully.')
})
