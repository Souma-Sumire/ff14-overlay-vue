const csv = require('csv-parser')
const fs = require('fs-extra')
const iconv = require('iconv-lite')
const { csvPaths } = require('./paths.cjs')

const fileNames = ['action.csv']
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
  ...fileNames.map(fileName => readFile(fileName, csvPaths.souma + fileName)),
],
).then(() => {
  const result = {}
  fileValues['action.csv'].forEach((row) => {
    if (['key', '#', 'offset', 'int32', '0'].includes(row[0])) {
      return
    }
    if (row[1] === '') {
      return
    }
    result[row[0]] = row[1]
  })
  fs.outputJsonSync('src/resources/actionChinese.json', result, { spaces: 2 })
  // console.log('Data generated successfully.')
})
