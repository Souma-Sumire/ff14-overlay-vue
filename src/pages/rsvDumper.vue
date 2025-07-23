<script lang="ts" setup>
import { useDark } from '@vueuse/core'
import { ref } from 'vue'

interface Result {
  str1: string
  str2: string
  hexDump: string
}

useDark()

const results = ref<Result[]>([])
const hexDialogVisible = ref(false)
const currentHexDump = ref('')

// 打开HexDump对话框
function showHex(row: Result) {
  currentHexDump.value = row.hexDump
  hexDialogVisible.value = true
}

async function onFileChange(file: any) {
  const rawFile = file.raw as File
  const text = await rawFile.text()
  const lines = text.split(/\r?\n/)
  results.value = []

  for (const line of lines) {
    const parts = line.split('|')
    if (parts[0] === '252') {
      const bytes = convertLogLineToBytes(parts.slice(3, -2))
      if (includesBytes(bytes, new TextEncoder().encode('_rsv_'))) {
        results.value.push(parseRsvBytes(bytes.slice(30)))
      }
    }
  }
}

// ===== 工具函数 =====

function convertLogLineToBytes(hexStrings: string[]): Uint8Array {
  const bytes: number[] = []
  for (const hex of hexStrings) {
    const value = Number.parseInt(hex, 16) >>> 0
    bytes.push(value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF, (value >> 24) & 0xFF)
  }
  return new Uint8Array(bytes)
}

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

function parseRsvBytes(bytes: Uint8Array): Result {
  return {
    str1: decodeCString(bytes.slice(2)),
    str2: decodeCString(bytes.slice(50)),
    hexDump: byteArrayToHex(bytes),
  }
}

function decodeCString(bytes: Uint8Array): string {
  const zeroIndex = bytes.indexOf(0)
  const realBytes = zeroIndex !== -1 ? bytes.slice(0, zeroIndex) : bytes
  return new TextDecoder('utf-8').decode(realBytes)
}

function byteArrayToHex(bytes: Uint8Array, bytesPerLine = 16): string {
  const hexChars = '0123456789ABCDEF'
  const lines: string[] = []
  for (let i = 0; i < bytes.length; i += bytesPerLine) {
    let hexPart = ''
    let asciiPart = ''
    for (let j = 0; j < bytesPerLine; j++) {
      if (i + j < bytes.length) {
        const b = bytes[i + j]
        hexPart += `${hexChars[b >> 4] + hexChars[b & 15]} `
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
</script>

<template>
  <div class="p-6 bg-gray-900 min-h-screen text-gray-200">
    <h1 class="text-2xl font-bold mb-4 text-white">
      FFXIV RSV Dumper
    </h1>

    <el-upload
      drag
      action=""
      :auto-upload="false"
      :show-file-list="false"
      accept=".log,.txt"
      class="upload-box"
      @change="onFileChange"
    >
      <i class="el-icon-upload" />
      <div class="el-upload__text">
        拖拽日志文件到此处或 <em>点击上传</em>
      </div>
    </el-upload>

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
      <el-table-column prop="str1" label="RSV Data 1" width="400" />
      <el-table-column prop="str2" label="RSV Data 2" />
      <el-table-column label="操作" width="150">
        <template #default="scope">
          <el-button
            size="small"
            type="primary"
            @click="showHex(scope.row)"
          >
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
      <pre class="bg-black text-green-400 p-3 rounded text-xs overflow-auto">
{{ currentHexDump }}
      </pre>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
:global(body) {
  padding: 0;
  margin: 0;
  background: #111827;
  color: white;
}

:global(.el-table) {
  background: #1e293b;
  color: #e2e8f0;
}

:global(.el-table th) {
  background: #334155;
  color: #f1f5f9;
}

:global(.el-dialog) {
  background: #1e293b;
  color: #e2e8f0;
}

:global(.el-button--primary) {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

:global(.el-upload) {
  background: #1e293b;
  border: 2px dashed #475569;
  color: #cbd5e1;
}

.upload-box {
  background: #1f2937;
  border: 2px dashed #4b5563;
  padding: 20px;
  border-radius: 8px;
  color: #9ca3af;
  text-align: center;
}

.el-table {
  background: #111827;
  color: #e5e7eb;
}

.el-table th {
  background: #1f2937;
  color: #f3f4f6;
}

.el-dialog {
  background: #1f2937;
  color: #e5e7eb;
}
</style>
