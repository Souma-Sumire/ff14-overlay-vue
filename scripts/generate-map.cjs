const csv = require('csv-parser')
const fs = require('fs-extra')
const iconv = require('iconv-lite')
const { csvPaths } = require('./paths.cjs')

const fileNames = ['TerritoryType.csv', 'Map.csv']
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

Promise.all([
  ...fileNames.map(fileName => readFile(fileName, csvPaths.ja + fileName)),
  readFile('PlaceName.csv', `${csvPaths.ja}PlaceName.csv`),
  readFile('PlaceName_en.csv', `${csvPaths.en}PlaceName.csv`),
  readFile('PlaceName_cn.csv', `${csvPaths.cn}PlaceName.csv`),
  readFile('PlaceName_souma.csv', `${csvPaths.souma}PlaceName.csv`),
]).then(() => {
  const res = {}
  fileValues['TerritoryType.csv'].forEach((row) => {
    const map = row[7]
    const id = fileValues['Map.csv'].find(v => v[0] === map)?.[7]
    if (!id || ['offset', 'key'].includes(row[0])) { return }
    const placeName = row[6]
    const ja = fileValues['PlaceName.csv'].find(v => v[0] === placeName)?.[1]
    const en = fileValues['PlaceName_en.csv'].find(v => v[0] === placeName)?.[1]
    const cn = fileValues['PlaceName_cn.csv'].find(v => v[0] === placeName)?.[1]
    const souma = fileValues['PlaceName_souma.csv'].find(v => v[0] === placeName)?.[1]
    res[row[0]] = { id, name: { cn, en, ja, souma } }
  })
  fs.outputJsonSync('src/resources/map.json', res, { spaces: 2 })
  // console.log('Data generated successfully.')
})
