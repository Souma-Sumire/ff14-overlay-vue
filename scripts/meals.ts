import fs from 'fs-extra'
import csv from 'csv-parser'
import iconv from 'iconv-lite'
import { csvPaths } from './paths'

type CsvRow = string[]
type DataMap<T> = Record<string, T>
type Item = DataMap<{
  Name?: string
  ItemAction?: string
  Level?: string
  ItemUICategory?: 'Meal' | 'Medicine'
}>
type ItemFood = CsvRow
type BaseParam = DataMap<string>
type ItemAction = DataMap<string>
type ParamValue = {
  Params: string
  Value: string
  Max: string
  'Value{HQ}': string
  'Max{HQ}': string
}
type Meal = DataMap<{
  Name: string
  ParamsValues: ParamValue[]
  Level: string
}>
type Medicine = Meal

async function readCSV(
  path: string,
  onRow: (row: CsvRow) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.createReadStream(path)
      .pipe(iconv.decodeStream('utf8'))
      .pipe(csv({ headers: false }))
      .on('data', onRow)
      .on('end', resolve)
      .on('error', reject)
  })
}

const item: Item = {}
const itemAction: ItemAction = {}
const itemFood: DataMap<ItemFood> = {}
const baseParam: BaseParam = {}

await readCSV(`${csvPaths.en}BaseParam.csv`, (row) => {
  baseParam[row[0]!] = row[2]!
})

await readCSV(`${csvPaths.ja}ItemFood.csv`, (row) => {
  itemFood[row[0]!] = row
})

await readCSV(`${csvPaths.ja}ItemAction.csv`, (row) => {
  itemAction[row[0]!] = row[7]!
})

await readCSV(`${csvPaths.cn}Item.csv`, (row) => {
  if (!['key', 'offset', '#', 'int32'].includes(row[0]!.toLocaleLowerCase())) {
    item[row[0]!] = { ...(item[row[0]!] || {}), Name: row[1] }
  }
})

await readCSV(`${csvPaths.ja}Item.csv`, (row) => {
  if (['46', '44'].includes(row[16]!) && itemAction[row[31]!] !== '0') {
    item[row[0]!] = {
      ...(item[row[0]!] || {}),
      ItemAction: itemAction[row[31]!],
      Level: row[12],
      ItemUICategory: row[16] === '46' ? 'Meal' : 'Medicine',
    }
  }
})

const meals: Meal = {}
const medicine: Medicine = {}

for (const itemValue of Object.values(item)) {
  if (
    !itemValue.Name ||
    !itemValue.ItemAction ||
    !itemValue.Level ||
    !itemValue.ItemUICategory
  ) {
    continue
  }

  const food = itemFood[itemValue.ItemAction]
  if (!food) {
    continue
  }

  const paramsValues: ParamValue[] = [0, 1, 2]
    .map((i) => {
      const offset = i * 6
      const params = baseParam[food[2 + offset]!]
      if (!params) {
        return null
      }
      return {
        Params: params,
        Value: food[4 + offset],
        Max: food[5 + offset],
        'Value{HQ}': food[6 + offset],
        'Max{HQ}': food[7 + offset],
      }
    })
    .filter((p): p is ParamValue => p !== null)

  const target = itemValue.ItemUICategory === 'Meal' ? meals : medicine
  target[itemValue.ItemAction] = {
    Name: itemValue.Name,
    ParamsValues: paramsValues,
    Level: itemValue.Level,
  }
}

await fs.outputJson('src/resources/meals.json', meals, { spaces: 2 })
await fs.outputJson('src/resources/medicine.json', medicine, { spaces: 2 })

/*
  在1A(NetworkBuff) 拿到count 转十进制  其中0x10000是HQ位
  以酸柠檬腌鱼HQ举例，他的count是10671，真实ID是67。
  获取属性：去ItemFood作为Key找到其三组BaseParam、Value、Max、Value{HQ}、Max{HQ}，其中BaseParam的数值通过查表BaseParam.csv获取中文属性字符串。
  获取名字：用671去ItemAction.csv的Data[1]得到他的key2617，再用key去Item.csv作为ItemAction得到ID44842的酸柠檬腌鱼。
*/
