const csv = require('csv-parser')
const fs = require('fs-extra')
const iconv = require('iconv-lite')
const { csvPaths } = require('./paths.cjs')

function readCSV(path, onRow) {
  return new Promise((resolve) => {
    fs.createReadStream(path)
      .pipe(iconv.decodeStream('utf8'))
      .pipe(csv({ headers: false }))
      .on('data', onRow)
      .on('end', resolve)
  })
}

async function processCSVFiles() {
  const item = {}
  const itemAction = {}
  const itemFood = {}
  const baseParam = {}

  // BaseParam
  await readCSV(`${csvPaths.souma}BaseParam.csv`, (row) => {
    baseParam[row[0]] = row[1]
  })

  // ItemFood
  await readCSV(`${csvPaths.ja}ItemFood.csv`, (row) => {
    itemFood[row[0]] = row
  })

  // ItemAction
  await readCSV(`${csvPaths.ja}ItemAction.csv`, (row) => {
    itemAction[row[0]] = row[7]
  })

  // Item souma
  await readCSV(`${csvPaths.souma}Item.csv`, (row) => {
    if (!['key', 'offset', '#', 'int32'].includes(row[0])) {
      item[row[0]] = { ...(item[row[0]] || {}), Name: row[1] }
    }
  })

  // Item ja
  await readCSV(`${csvPaths.ja}Item.csv`, (row) => {
    if (['46', '44'].includes(row[16]) && itemAction[row[31]] !== '0') {
      item[row[0]] = {
        ...(item[row[0]] || {}),
        ItemAction: itemAction[row[31]],
        Level: row[12],
        ItemUICategory: row[16] === '46' ? 'Meal' : 'Medicine',
      }
    }
  })

  const meals = {}
  const medicine = {}

  for (const { Name, ItemAction, Level, ItemUICategory } of Object.values(item)) {
    const food = itemFood[ItemAction]
    if (!food)
      continue

    const ParamsValues = [0, 1, 2]
      .map((i) => {
        const offset = i * 6
        return {
          'Params': baseParam[food[2 + offset]],
          'Value': food[4 + offset],
          'Max': food[5 + offset],
          'Value{HQ}': food[6 + offset],
          'Max{HQ}': food[7 + offset],
        }
      })
      .filter(p => p.Params)

    const target = ItemUICategory === 'Meal' ? meals : medicine
    target[ItemAction] = { Name, ParamsValues, Level }
  }

  await fs.outputJson('src/resources/meals.json', meals, { spaces: 2 })
  await fs.outputJson('src/resources/medicine.json', medicine, { spaces: 2 })
}

processCSVFiles()

/*
  在1A(NetworkBuff) 拿到count 转十进制  其中0x10000是HQ位
  以酸柠檬腌鱼HQ举例，他的count是10671，真实ID是67。
  获取属性：去ItemFood作为Key找到其三组BaseParam、Value、Max、Value{HQ}、Max{HQ}，其中BaseParam的数值通过查表BaseParam.csv获取中文属性字符串。
  获取名字：用671去ItemAction.csv的Data[1]得到他的key2617，再用key去Item.csv作为ItemAction得到ID44842的酸柠檬腌鱼。
*/
