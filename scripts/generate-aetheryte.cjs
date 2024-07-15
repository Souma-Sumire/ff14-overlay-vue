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

Promise.all([
  ...fileNames.map(fileName => readFile(fileName, csvPaths.ja + fileName)),
  readFile('PlaceName_EN.csv', `${csvPaths.en}PlaceName.csv`),
  readFile('PlaceName_JA.csv', `${csvPaths.ja}PlaceName.csv`),
  readFile('PlaceName_Souma.csv', `${csvPaths.souma}PlaceName.csv`),
],
).then(() => {
  const DATA_TYPE = '3'
  const aetherytes = fileValues['MapMarker.csv'].filter(row => row[8] === DATA_TYPE && row[4] !== '0').map((row) => {
    const dataKey = row[9]
    const territory = fileValues['Aetheryte.csv'].find(aetheryte => aetheryte[0] === dataKey)[11]
    const x = Number(row[1])
    const y = Number(row[2])
    const placeName = row[4]
    const placeNameEN = fileValues['PlaceName_EN.csv'].find(place => place[0] === placeName)[1]
    const placeNameJA = fileValues['PlaceName_JA.csv'].find(place => place[0] === placeName)[1]
    const placeNameSouma = fileValues['PlaceName_Souma.csv'].find(place => place[0] === placeName)[1]
    return {
      x,
      y,
      territory,
      placeName: {
        en: placeNameEN,
        ja: placeNameJA,
        souma: placeNameSouma,
      },
    }
  })
  fs.outputJsonSync('src/resources/aetherytes.json', aetherytes, { spaces: 2 })
  // console.log('Data generated successfully.')
})
