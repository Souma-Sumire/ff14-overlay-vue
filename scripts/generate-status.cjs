const csv = require('csv-parser')
const fs = require('fs-extra')
const iconv = require('iconv-lite')
const { csvPaths } = require('./paths.cjs')

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
  readFile('status.csv', `${csvPaths.souma}status.csv`),
  readFile('status_ja.csv', `${csvPaths.ja}status.csv`),
],
).then(() => {
  const result = {}
  fileValues['status.csv'].forEach((row) => {
    if (['key', '#', 'offset', 'int32', '0'].includes(row[0])) {
      return
    }
    // if (row[1] === '') {
    //   return
    // }
    const ja = fileValues['status_ja.csv'].find(r => r[0] === row[0])
    result[row[0]] = [row[1], ja[3], ja[6]]
  })
  fs.outputJsonSync('src/resources/status.json', result, { spaces: 2 })
  // console.log('Data generated successfully.')
})
