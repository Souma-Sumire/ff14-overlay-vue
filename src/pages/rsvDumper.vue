<script lang="ts" setup>
import type { UploadProps } from 'element-plus'
import { useDark } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import { ref } from 'vue'

interface Result {
  type: string
  id: number
  str1: string
  str2: string
  hexDump: string
}

useDark()

const typeKeyMap = {
  SE2DC5B04_EE2DC5B04: 'Action',
  S64755250_E64755250: 'BNpcName',
  S74CFC3B0_E74CFC3B0: 'Status',
  S13095D61_E13095D61: 'InstanceContentTextData',
  SF15185AF_EF15185AF: 'LogMessage',
  SCFE39641_ECFE39641: 'NpcYell',
} as const

const results = ref<Result[]>([])
const hexDialogVisible = ref(false)
const currentHexDump = ref('')

// 打开HexDump对话框
function showHex(row: Result) {
  currentHexDump.value = row.hexDump
  hexDialogVisible.value = true
}

// 处理文件上传
const handleChange: UploadProps['onChange'] = async (uploadFile) => {
  const rawFile = uploadFile.raw as File
  const text = await rawFile.text()
  const lines = text.split(/\r?\n/)

  const unique = new Set<string>()
  results.value = []

  for (const line of lines) {
    const parts = line.split('|')
    if (parts[0] !== '252')
      continue

    const bytes = convertLogLineToBytes(parts.slice(3, -2))
    if (!includesBytes(bytes, new TextEncoder().encode('_rsv_')))
      continue

    const parsed = parseRsvBytes(bytes.slice(30))
    const key = parsed.str1.replace(
      /^(rsv_\d+)_[^_]+_[^_]+_[^_]+_[^_]+_([^_]{9}_[^_]+)$/,
      '$1_$2',
    )

    if (unique.has(key))
      continue

    unique.add(key)

    const type
      = typeKeyMap[key.slice(-19) as keyof typeof typeKeyMap] || 'Unknown'
    const id = Number(key.match(/_rsv_(\d+)_/)?.[1])

    results.value.push({
      type,
      id,
      ...parsed,
    })
  }
}

// 将日志行的十六进制字符串转换为字节数组
function convertLogLineToBytes(hexStrings: string[]): Uint8Array {
  const bytes: number[] = []
  for (const hex of hexStrings) {
    const value = Number.parseInt(hex, 16) >>> 0
    bytes.push(
      value & 0xFF,
      (value >> 8) & 0xFF,
      (value >> 16) & 0xFF,
      (value >> 24) & 0xFF,
    )
  }
  return new Uint8Array(bytes)
}

// 判断 source 中是否包含 search 字节序列
function includesBytes(source: Uint8Array, search: Uint8Array): boolean {
  const limit = source.length - search.length
  for (let i = 0; i <= limit; i++) {
    let match = true
    for (let j = 0; j < search.length; j++) {
      if (source[i + j] !== search[j]) {
        match = false
        break
      }
    }
    if (match)
      return true
  }
  return false
}

// 解析 RSV 字节数据，解码字符串和生成 HexDump
function parseRsvBytes(bytes: Uint8Array) {
  return {
    str1: decodeBytesSmart(bytes.slice(2)),
    str2: decodeBytesSmart(bytes.slice(50)),
    hexDump: byteArrayToHex(bytes),
  }
}

// function decodeCString(bytes: Uint8Array): string {
//   const zeroIndex = bytes.indexOf(0)
//   const realBytes = zeroIndex !== -1 ? bytes.slice(0, zeroIndex) : bytes
//   return new TextDecoder('utf-8').decode(realBytes)
// }

function decodeBytesSmart(bytes: Uint8Array): string {
  const zeroIndex = bytes.indexOf(0)
  const buffer = zeroIndex !== -1 ? bytes.slice(0, zeroIndex) : bytes

  let out = ''
  const decoder = new TextDecoder()
  let normalRun: number[] = []
  let hexRun: number[] = []

  const flushNormalRun = () => {
    if (normalRun.length) {
      out += decoder.decode(Uint8Array.from(normalRun))
      normalRun = []
    }
  }
  const flushHexRun = () => {
    if (hexRun.length) {
      out += `<hex:${hexRun
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()}>`
      hexRun = []
    }
  }

  // 找正文起始（跳过0和不可打印）
  let start = 0
  for (; start < buffer.length; start++) {
    const b = buffer[start]!
    if (b !== 0 && b >= 0x20)
      break
  }
  const trimmed = buffer.slice(start)

  for (const b of trimmed) {
    if (b === 0 || b <= 0x1F || b === 0x7F) {
      flushNormalRun()
      hexRun.push(b)
    }
    else {
      flushHexRun()
      normalRun.push(b)
    }
  }

  flushNormalRun()
  flushHexRun()

  // 去除末尾纯00的hex标记
  return out.replace(/(<hex:(00)+>)$/, '')
}

// 生成格式化的 HexDump 字符串
function byteArrayToHex(bytes: Uint8Array, bytesPerLine = 16): string {
  // 去除尾部连续的0
  let end = bytes.length
  while (end > 0 && bytes[end - 1] === 0) {
    end--
  }
  const trimmed = bytes.slice(0, end)

  const hexChars = '0123456789ABCDEF'
  const lines: string[] = []

  for (let i = 0; i < trimmed.length; i += bytesPerLine) {
    let hexPart = ''
    let asciiPart = ''
    for (let j = 0; j < bytesPerLine; j++) {
      if (i + j < trimmed.length) {
        const b = trimmed[i + j]!
        hexPart += `${hexChars[b >> 4]}${hexChars[b & 15]} `
        asciiPart += b >= 32 && b < 127 ? String.fromCharCode(b) : '.'
      }
      else {
        hexPart += '   '
        asciiPart += ' '
      }
    }
    lines.push(`${hexPart} ${asciiPart}`)
  }
  return lines.join('\n')
}

// 保存结果到文本文件
function saveResultsToFile() {
  if (results.value.length === 0) {
    ElMessage.error('请先上传日志文件')
    return
  }

  // 按 type 分类
  const grouped: Record<string, string[]> = {}

  results.value.forEach(({ type, id, str2 }) => {
    if (!grouped[type])
      grouped[type] = []
    grouped[type].push(`${id} ${str2}`)
  })

  // 拼接文本内容，type分块
  let content = ''
  for (const [type, lines] of Object.entries(grouped)) {
    content += `=== ${type} ===\n${lines.join('\n')}\n\n`
  }

  // 创建Blob并下载
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'rsv_results.txt'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="min-h-screen p-6">
    <h1 class="mb-4 text-2xl font-bold">
      FFXIV RSV Dumper
    </h1>

    <span style="position: absolute; top: 2em; right: 2em">
      <CommonThemeToggle storage-key="rsv-dumper-theme" />
    </span>

    <el-upload
      drag
      action=""
      :auto-upload="false"
      :show-file-list="false"
      accept=".log,.txt"
      class="upload-box"
      @change="handleChange"
    >
      <i class="el-icon-upload" />
      <div class="el-upload__text">
        拖拽日志文件到此处或 <em>点击上传</em>
      </div>
    </el-upload>

    <el-button
      v-if="results.length"
      type="success"
      class="mb-4"
      :disabled="results.length === 0"
      @click="saveResultsToFile"
    >
      保存结果到文件
    </el-button>

    <el-empty
      v-if="!results.length"
      description="请上传 act.log 文件"
      class="mt-6"
    />

    <el-table
      v-else
      :data="results"
      stripe
      style="width: 100%; margin-top: 20px"
      border
    >
      <el-table-column prop="type" label="Type" />
      <el-table-column prop="id" label="ID" />
      <el-table-column prop="str1" label="RSV Data 1" width="400" />
      <el-table-column prop="str2" label="RSV Data 2" />
      <el-table-column label="操作" width="150">
        <template #default="scope">
          <el-button size="small" type="primary" @click="showHex(scope.row)">
            查看 HexDump
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="hexDialogVisible"
      title="HexDump 原始数据"
      width="50%"
      :append-to-body="true"
    >
      <pre class="overflow-auto rounded bg-black p-3 text-xs text-green-400">{{
        currentHexDump
      }}</pre>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
:global(body) {
  padding: 0;
  margin: 0;
}

.upload-box {
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}
</style>
