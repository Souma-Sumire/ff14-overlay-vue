const csv = require('csv-parser')
const fs = require('fs-extra')
const iconv = require('iconv-lite')
const { csvPaths } = require('./paths.cjs')

const fileNames = ['MapMarker.csv', 'Aetheryte.csv']
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

Promise.all(fileNames.map(fileName => readFile(fileName, csvPaths.ja + fileName))).then(() => {
  const DATA_TYPE = '3'
  const aetherytes = fileValues['MapMarker.csv'].filter(row => row[8] === DATA_TYPE && row[4] !== '0').map((row) => {
    const dataKey = row[9]
    const territory = fileValues['Aetheryte.csv'].find(aetheryte => aetheryte[0] === dataKey)[11]
    const x = Number(row[1])
    const y = Number(row[2])
    return {
      x,
      y,
      territory,
    }
  })
  fs.outputJsonSync('src/resources/aetherytes.json', aetherytes, { spaces: 2 })
  console.log('Data generated successfully.')
})
