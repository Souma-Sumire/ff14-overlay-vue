// 量谱计算封装，暂时没有用到的地方。
function parseLine(line: string) {
  let pos = -1
  for (let i = 0; i < 4; i++) {
    pos = line.indexOf(':', pos + 1)
    if (pos === -1)
      throw new Error('Invalid line format')
  }
  let end = line.indexOf(':', pos + 1)
  if (end === -1)
    end = line.length

  const hexStr = line.substring(pos + 1, end)
  const val = Number.parseInt(hexStr, 16)

  return {
    b1: (val >>> 24) & 0xFF,
    b2: (val >>> 16) & 0xFF,
    b3: (val >>> 8) & 0xFF,
    b4: val & 0xFF,
  }
}

const log1 = '[15:49:01.691] Gauge 1F:10000000:1000020:00:00:00'
const log2 = '[15:49:04.725] Gauge 1F:10000000:20:00:00:00'

const res1 = parseLine(log1)
console.log('第一行字节:', res1.b1, res1.b2, res1.b3, res1.b4)
const res2 = parseLine(log2)
console.log('第二行字节:', res2.b2, res2.b2, res2.b3, res2.b4)
