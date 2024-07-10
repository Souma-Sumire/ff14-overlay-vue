const csv = require('csv-parser')
const fs = require('fs-extra')
const iconv = require('iconv-lite')
const { csvPaths } = require('./paths.cjs')

const fileNames = ['EObjName.csv', 'Level.csv', 'TerritoryType.csv', 'PlaceName.csv', 'Map.csv', 'EObj.csv']
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
  readFile('PlaceName_CN.csv', `${csvPaths.cn}PlaceName.csv`),
  readFile('PlaceName_EN.csv', `${csvPaths.en}PlaceName.csv`),
],
).then(() => {
  const aethercurrentNames = ['风脉泉', 'aether current', '風脈の泉']
  const ids = fileValues['EObjName.csv'].filter(row => aethercurrentNames.includes(row[1])).map(row => row[0])
  const idsData = Object.fromEntries(fileValues['EObj.csv'].filter(row => ids.includes(row[0])).map(row => [row[0], row[10]]))
  const result = fileValues['Level.csv'].filter(row => ids.includes(row[7])).map((row) => {
    const territory = row[10]
    const territoryType = fileValues['TerritoryType.csv'].find(t => t[0] === territory)
    const placeName = territoryType[6]
    const ja = fileValues['PlaceName.csv'].find(p => p[0] === placeName)[1]
    const cn = fileValues['PlaceName_CN.csv'].find(p => p[0] === placeName)?.[1]
    const en = fileValues['PlaceName_EN.csv'].find(p => p[0] === placeName)?.[1]
    const map = (fileValues['Map.csv'].find(m => m[12] === placeName))
    const mapSizeFactor = Number(map[8])
    const mapOffsetX = Number(map[9])
    const mapOffsetY = Number(map[10])
    const x = Number(row[1])
    const z = Number(row[3])
    const worldXZCoordinates = new Vector2(x, z)
    const mapOffset = new Vector2(mapOffsetX, mapOffsetY)
    const pixelCoordinates = getPixelCoordinates(worldXZCoordinates, mapOffset, mapSizeFactor)
    const id = map[7]
    const exVersion = `${+territoryType[30] + 2}.0`
    const data = Number(idsData[row[7]])
    return { x: row[1], y: row[2], z: row[3], territory, name: { ja, cn, en }, game: { x: pixelCoordinates.x, y: pixelCoordinates.y }, id, exVersion, data }
  },
  )
  fs.outputJsonSync('src/resources/aethercurrent.json', result, { spaces: 2 })
  // console.log('Data generated successfully.')
})

class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }

  add(vector) {
    return new Vector2(this.x + vector.x, this.y + vector.y)
  }

  divide(scalar) {
    return new Vector2(this.x / scalar, this.y / scalar)
  }

  multiply(scalar) {
    return new Vector2(this.x * scalar, this.y * scalar)
  }
}

function getPixelCoordinates(worldXZCoordinates, mapOffset, mapSizeFactor) {
  const offsetVector = worldXZCoordinates.add(mapOffset)
  const scaledVector = offsetVector.divide(100).multiply(mapSizeFactor)
  const finalVector = scaledVector.add(new Vector2(1024, 1024))
  return finalVector
}
