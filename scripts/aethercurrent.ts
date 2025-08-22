import fs from 'fs-extra'
import csv from 'csv-parser'
import iconv from 'iconv-lite'
import { csvPaths } from './paths'

interface FileValues {
  [fileName: string]: string[][]
}

interface AetherCurrentResult {
  x: string
  y: string
  z: string
  territory: string
  name: { ja?: string; cn?: string; en?: string }
  game: { x: number; y: number }
  id: string
  exVersion: string
  data: number
}

class Vector2 {
  x: number
  y: number

  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }

  add(vector: Vector2): Vector2 {
    return new Vector2(this.x + vector.x, this.y + vector.y)
  }

  divide(scalar: number): Vector2 {
    if (scalar === 0) throw new Error('Cannot divide by zero')
    return new Vector2(this.x / scalar, this.y / scalar)
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar)
  }
}

function getPixelCoordinates(
  worldXZCoordinates: Vector2,
  mapOffset: Vector2,
  mapSizeFactor: number,
): Vector2 {
  const offsetVector = worldXZCoordinates.add(mapOffset)
  const scaledVector = offsetVector.divide(100).multiply(mapSizeFactor)
  const finalVector = scaledVector.add(new Vector2(1024, 1024))
  return finalVector
}

function readFile(
  fileName: string,
  filePath: string,
  fileValues: FileValues,
): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(iconv.decodeStream('utf8'))
      .pipe(csv({ headers: false }))
      .on('data', (row: string[]) => {
        fileValues[fileName] = fileValues[fileName] || []
        fileValues[fileName].push(row)
      })
      .on('end', () => {
        resolve()
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

const fileNames = [
  'EObjName.csv',
  'Level.csv',
  'TerritoryType.csv',
  'PlaceName.csv',
  'Map.csv',
  'EObj.csv',
]
const fileValues: FileValues = {}

const allFiles = [
  ...fileNames.map((fileName) => ({
    name: fileName,
    path: csvPaths.ja + fileName,
  })),
  { name: 'PlaceName_CN.csv', path: `${csvPaths.cn}PlaceName.csv` },
  { name: 'PlaceName_EN.csv', path: `${csvPaths.en}PlaceName.csv` },
]

await Promise.all(
  allFiles.map((file) => readFile(file.name, file.path, fileValues)),
)

const aethercurrentNames = ['风脉泉', 'aether current', '風脈の泉']
const ids: string[] = fileValues['EObjName.csv']!.filter((row) =>
  aethercurrentNames.includes(row[1]!),
).map((row) => row[0]!)

const idsData: Record<string, string> = Object.fromEntries(
  fileValues['EObj.csv']!.filter((row) => ids.includes(row[0]!)).map((row) => [
    row[0],
    row[10],
  ]),
)

const result = fileValues['Level.csv']!.filter((row) => ids.includes(row[7]!))
  .map((row) => {
    const territory = row[10]
    const territoryType = fileValues['TerritoryType.csv']!.find(
      (t) => t[0] === territory,
    )
    if (!territoryType) return null

    const placeNameId = territoryType[6]

    const findPlaceName = (file: string) => {
      const placeNameRow = fileValues[file]?.find((p) => p[0] === placeNameId)
      return placeNameRow?.[1]
    }

    const ja = findPlaceName('PlaceName.csv')
    const cn = findPlaceName('PlaceName_CN.csv')
    const en = findPlaceName('PlaceName_EN.csv')

    const map = fileValues['Map.csv']!.find((m) => m[12] === placeNameId)
    if (!map) return null

    const mapSizeFactor = Number(map[8])
    const mapOffsetX = Number(map[9])
    const mapOffsetY = Number(map[10])

    const x = Number(row[1])
    const z = Number(row[3])

    const worldXZCoordinates = new Vector2(x, z)
    const mapOffset = new Vector2(mapOffsetX, mapOffsetY)
    const pixelCoordinates = getPixelCoordinates(
      worldXZCoordinates,
      mapOffset,
      mapSizeFactor,
    )

    const id = map[7]
    const exVersion = `${+territoryType[30]! + 2}.0`
    const data = Number(idsData[row[7]!])

    return {
      x: row[1],
      y: row[2],
      z: row[3],
      territory,
      name: { ja, cn, en },
      game: { x: pixelCoordinates.x, y: pixelCoordinates.y },
      id,
      exVersion,
      data,
    } as AetherCurrentResult
  })
  .filter((row): row is AetherCurrentResult => row !== null)

fs.outputJsonSync('src/resources/aethercurrent.json', result, { spaces: 2 })
