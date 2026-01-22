// UISAVE.DAT 文件结构类型定义

export interface WayMarkPoint {
  x: number // 原始整数值
  y: number
  z: number
}

export interface WayMark {
  A: WayMarkPoint
  B: WayMarkPoint
  C: WayMarkPoint
  D: WayMarkPoint
  One: WayMarkPoint
  Two: WayMarkPoint
  Three: WayMarkPoint
  Four: WayMarkPoint
  enableFlag: number // 8位标志
  unknown: number
  regionID: number
  timestamp: number
}

export interface UISaveData {
  fileFormatVersion: Uint8Array
  fileUnknown: Uint8Array
  payloadUnknown: Uint8Array
  userID: bigint
  wayMarks: WayMark[]
  markerHeader: Uint8Array
  markerTail: Uint8Array
  otherSections: Uint8Array // 其他section的原始数据
  belongsToWaymarkDat?: boolean // 是否属于 WAYMARK.DAT 格式
}
