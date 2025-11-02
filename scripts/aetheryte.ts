import fs from 'fs-extra'
import csv from 'csv-parser'
import iconv from 'iconv-lite'
import { csvPaths } from './paths'

interface FileValues {
  [fileName: string]: string[][]
}

interface AetheryteData {
  x: number
  y: number
  territory: string
  placeName: {
    en?: string
    ja?: string
    cn?: string
  }
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

const fileNames = ['MapMarker.csv', 'Aetheryte.csv']
const fileValues: FileValues = {}

const allFiles = [
  ...fileNames.map((fileName) => ({
    name: fileName,
    path: `${csvPaths.ja}${fileName}`,
  })),
  { name: 'PlaceName_EN.csv', path: `${csvPaths.en}PlaceName.csv` },
  { name: 'PlaceName_JA.csv', path: `${csvPaths.ja}PlaceName.csv` },
  { name: 'PlaceName_CN.csv', path: `${csvPaths.cn}PlaceName.csv` },
]

await Promise.all(
  allFiles.map((file) => readFile(file.name, file.path, fileValues)),
)

const DATA_TYPE = '3'

const aetherytes: AetheryteData[] = fileValues['MapMarker.csv']!.filter(
  (row) => row[8] === DATA_TYPE && row[4] !== '0',
)
  .map((row) => {
    const dataKey = row[9]
    const aetheryteRow = fileValues['Aetheryte.csv']?.find(
      (aetheryte) => aetheryte[0] === dataKey,
    )
    if (!aetheryteRow) return null

    const territory = aetheryteRow[11]
    const placeNameId = row[4]

    const findPlaceName = (file: string) => {
      const placeRow = fileValues[file]?.find(
        (place) => place[0] === placeNameId,
      )
      return placeRow ? placeRow[1] : undefined
    }

    const placeNameEN = findPlaceName('PlaceName_EN.csv')
    const placeNameJA = findPlaceName('PlaceName_JA.csv')
    const placeNameCN = findPlaceName('PlaceName_CN.csv')

    return {
      x: Number(row[1]),
      y: Number(row[2]),
      territory,
      placeName: {
        en: placeNameEN,
        ja: placeNameJA,
        cn: placeNameCN,
      },
    } as AetheryteData
  })
  .filter((row): row is AetheryteData => row !== null)

fs.outputJsonSync('src/resources/aetherytes.json', aetherytes, { spaces: 2 })
