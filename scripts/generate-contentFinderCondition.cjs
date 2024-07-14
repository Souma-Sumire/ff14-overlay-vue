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
  readFile('contentFinderCondition.csv', `${csvPaths.ja}contentFinderCondition.csv`),
  readFile('contentFinderCondition_cn.csv', `${csvPaths.cn}contentFinderCondition.csv`),
],
).then(() => {
  const result = {}
  fileValues['contentFinderCondition.csv'].forEach((row) => {
    if (['key', '#', 'offset', 'int32'].includes(row[0])) {
      return
    }
    const cn = fileValues['contentFinderCondition_cn.csv'].find(r => r[0] === row[0])?.[2]
    const ja = row[2]
    const key = ((ja && ja !== '0') ? ja : cn) ?? ja
    result[row[0]] = key
  })
  fs.outputJsonSync('src/resources/contentFinderCondition.json', result, { spaces: 2 })
  // console.log('Data generated successfully.')
})
