import fs from 'fs-extra'
import csv from 'csv-parser'
import iconv from 'iconv-lite'
import { csvPaths } from './paths.js'

type FileValues = {
  [fileName: string]: string[][]
}

interface MapName {
  id?: string
  name: {
    cn?: string
    en?: string
    ja?: string
    souma?: string
  }
}

interface MapResult {
  [territoryTypeId: string]: MapName
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
      .on('error', (error) => {
        reject(error)
      })
  })
}

const fileValues: FileValues = {}
const fileNames = ['TerritoryType.csv', 'Map.csv']

const allFiles = [
  ...fileNames.map((fileName) => ({
    name: fileName,
    path: `${csvPaths.ja}${fileName}`,
  })),
  { name: 'PlaceName.csv', path: `${csvPaths.ja}PlaceName.csv` },
  { name: 'PlaceName_en.csv', path: `${csvPaths.en}PlaceName.csv` },
  { name: 'PlaceName_cn.csv', path: `${csvPaths.cn}PlaceName.csv` },
  { name: 'PlaceName_souma.csv', path: `${csvPaths.souma}PlaceName.csv` },
]

await Promise.all(
  allFiles.map((file) => readFile(file.name, file.path, fileValues)),
)

const res: MapResult = {}
const territoryTypes = fileValues['TerritoryType.csv']!
const maps = fileValues['Map.csv']!

territoryTypes.forEach((row) => {
  if (['offset', 'key'].includes(row[0]!)) {
    return
  }

  const mapId = row[7]
  const mapData = maps.find((v) => v[0] === mapId)!
  const id = mapData?.[7]

  if (!id) {
    return
  }

  const placeNameId = row[6]

  const getPlaceName = (fileName: string) => {
    const file = fileValues[fileName]
    const placeNameRow = file?.find((v) => v[0] === placeNameId)
    return placeNameRow?.[1]
  }

  const ja = getPlaceName('PlaceName.csv')
  const en = getPlaceName('PlaceName_en.csv')
  const cn = getPlaceName('PlaceName_cn.csv')
  const souma = getPlaceName('PlaceName_souma.csv')

  res[row[0]!] = { id, name: { cn, en, ja, souma } }
})

const outputPath = 'src/resources/map.json'
fs.outputJsonSync(outputPath, res, { spaces: 2 })
