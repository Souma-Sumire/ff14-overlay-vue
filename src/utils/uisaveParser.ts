import type { WayMark, UISaveData } from '@/types/uisave'

export const xorCrypt = (data: Uint8Array, key = 0x31) => data.map((v) => v ^ key)

// Mapping for markers
export const MARKER_MAP = [
  { key: 'A', label: 'A', bit: 0x01, id: 0 },
  { key: 'B', label: 'B', bit: 0x02, id: 1 },
  { key: 'C', label: 'C', bit: 0x04, id: 2 },
  { key: 'D', label: 'D', bit: 0x08, id: 3 },
  { key: 'One', label: '1', bit: 0x10, id: 4 },
  { key: 'Two', label: '2', bit: 0x20, id: 5 },
  { key: 'Three', label: '3', bit: 0x40, id: 6 },
  { key: 'Four', label: '4', bit: 0x80, id: 7 },
] as const

export async function parseUISave(buffer: ArrayBuffer): Promise<UISaveData> {
  const data = new Uint8Array(buffer)
  const view = new DataView(data.buffer)
  
  // Basic validation (length check?)
  if (data.length < 16) throw new Error('File too small')

  const encryptLength = view.getInt32(8, true)
  const decrypted = xorCrypt(data.slice(16, 16 + encryptLength))
  const dView = new DataView(decrypted.buffer)

  let decOffset = 16 // Skip payloadUnknown(8) and userID(8)
  const wayMarks: WayMark[] = []
  let markerHeader = new Uint8Array(0)
  let markerTail = new Uint8Array(0)
  const otherSectionsParts: Uint8Array[] = []

  while (decOffset < decrypted.length - 2) {
    const index = dView.getInt16(decOffset, true)
    const length = dView.getInt32(decOffset + 8, true)
    const sectionData = decrypted.slice(
      decOffset + 16,
      decOffset + 16 + length,
    )
    const sectionFull = decrypted.slice(
      decOffset,
      decOffset + 16 + length + 4,
    )

    if (index === 17) {
      markerHeader = sectionData.slice(0, 16)
      for (let i = 16; i + 104 <= sectionData.length; i += 104) {
        const sView = new DataView(
          sectionData.buffer,
          sectionData.byteOffset + i,
          104,
        )
        const wm: any = {
          enableFlag: sectionData[i + 96] ?? 0,
          unknown: sectionData[i + 97] ?? 0,
          regionID: sView.getUint16(98, true),
          timestamp: sView.getInt32(100, true),
        }
        MARKER_MAP.forEach((m, idx) => {
          wm[m.key] = {
            x: sView.getInt32(idx * 12, true),
            y: sView.getInt32(idx * 12 + 4, true),
            z: sView.getInt32(idx * 12 + 8, true),
          }
        })
        wayMarks.push(wm as WayMark)
      }
      markerTail = sectionData.slice(wayMarks.length * 104 + 16)
    } else {
      otherSectionsParts.push(sectionFull)
    }
    decOffset += 16 + length + 4
  }

  if (wayMarks.length === 0) {
    throw new Error('No waymark data found in UISAVE.DAT')
  }

  const otherSections = new Uint8Array(
    otherSectionsParts.reduce((a, b) => a + b.length, 0),
  )
  let offset = 0
  otherSectionsParts.forEach((p) => {
    otherSections.set(p, offset)
    offset += p.length
  })

  return {
    fileFormatVersion: data.slice(0, 8),
    fileUnknown: data.slice(12, 16),
    payloadUnknown: decrypted.slice(0, 8),
    userID: dView.getBigInt64(8, true),
    wayMarks,
    markerHeader,
    markerTail,
    otherSections,
  }
}
