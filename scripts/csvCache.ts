import csv from 'csv-parser'
import fs from 'fs-extra'
import iconv from 'iconv-lite'

type CsvRow = string[]

const csvRowsCache = new Map<string, CsvRow[]>()

async function readCsvRows(filePath: string): Promise<CsvRow[]> {
  const rows: CsvRow[] = []
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(iconv.decodeStream('utf8'))
      .pipe(csv({ headers: false }))
      .on('data', (row: Record<string, string>) => {
        rows.push(Object.values(row))
      })
      .on('end', resolve)
      .on('error', reject)
  })
  return rows
}

export async function readCsvRowsCached(filePath: string): Promise<CsvRow[]> {
  const key = filePath
  const cached = csvRowsCache.get(key)
  if (cached)
    return cached
  const rows = await readCsvRows(filePath)
  csvRowsCache.set(key, rows)
  return rows
}
