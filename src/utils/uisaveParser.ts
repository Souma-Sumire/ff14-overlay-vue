import type { UISaveData, WayMark } from "@/types/uisave";

export const xorCrypt = (data: Uint8Array, key = 0x31) => data.map((v) => v ^ key);
const FMARKER_INDEX = 17;
const SECTION_HEADER_SIZE = 16;
const SECTION_END_SIZE = 4;

function concatUint8Arrays(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
}

// Mapping for markers
export const MARKER_MAP = [
  { key: "A", label: "A", bit: 0x01, id: 0 },
  { key: "B", label: "B", bit: 0x02, id: 1 },
  { key: "C", label: "C", bit: 0x04, id: 2 },
  { key: "D", label: "D", bit: 0x08, id: 3 },
  { key: "One", label: "1", bit: 0x10, id: 4 },
  { key: "Two", label: "2", bit: 0x20, id: 5 },
  { key: "Three", label: "3", bit: 0x40, id: 6 },
  { key: "Four", label: "4", bit: 0x80, id: 7 },
] as const;

function parseWaymarkEntry(view: DataView, offset: number, buffer: Uint8Array): WayMark {
  const wm: any = {
    enableFlag: buffer[offset + 96] ?? 0,
    unknown: buffer[offset + 97] ?? 0,
    regionID: view.getUint16(offset + 98, true),
    timestamp: view.getInt32(offset + 100, true),
  };
  MARKER_MAP.forEach((m, idx) => {
    wm[m.key] = {
      x: view.getInt32(offset + idx * 12, true),
      y: view.getInt32(offset + idx * 12 + 4, true),
      z: view.getInt32(offset + idx * 12 + 8, true),
    };
  });
  return wm as WayMark;
}

export async function parseUISave(buffer: ArrayBuffer): Promise<UISaveData> {
  const data = new Uint8Array(buffer);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  // Detection for raw WAYMARK.DAT (30 slots * 104 bytes = 3120 bytes)
  if (data.length === 3120) {
    const wayMarks: WayMark[] = [];
    for (let i = 0; i < 30; i++) {
      wayMarks.push(parseWaymarkEntry(view, i * 104, data));
    }
    return {
      fileFormatVersion: new Uint8Array(8),
      fileUnknown: new Uint8Array(4),
      payloadUnknown: new Uint8Array(8),
      userID: 0n,
      wayMarks,
      markerHeader: new Uint8Array(16),
      markerTail: new Uint8Array(0),
      markerSectionPrefix: new Uint8Array(16),
      markerSectionEndFlag: new Uint8Array(4),
      otherSections: new Uint8Array(0),
      otherSectionsBeforeMarker: new Uint8Array(0),
      otherSectionsAfterMarker: new Uint8Array(0),
      payloadTail: new Uint8Array(0),
      belongsToWaymarkDat: true,
    };
  }

  // Basic validation (length check?)
  if (data.length < 16) throw new Error("File too small");

  const encryptLength = view.getInt32(8, true);
  if (encryptLength <= 0 || 16 + encryptLength > data.length) {
    throw new Error("Invalid encrypted payload length");
  }

  const decrypted = xorCrypt(data.slice(16, 16 + encryptLength));
  const dView = new DataView(decrypted.buffer, decrypted.byteOffset, decrypted.byteLength);

  let decOffset = 16; // Skip payloadUnknown(8) and userID(8)
  const wayMarks: WayMark[] = [];
  let markerHeader = new Uint8Array(16);
  let markerTail = new Uint8Array(0);
  let markerSectionPrefix = new Uint8Array(16);
  let markerSectionEndFlag = new Uint8Array(4);
  const markerPrefixView = new DataView(markerSectionPrefix.buffer);
  markerPrefixView.setInt16(0, FMARKER_INDEX, true);
  const sectionsBeforeMarker: Uint8Array[] = [];
  const sectionsAfterMarker: Uint8Array[] = [];
  let hasMarkerSection = false;

  while (decOffset + SECTION_HEADER_SIZE + SECTION_END_SIZE <= decrypted.length) {
    const index = dView.getInt16(decOffset, true);
    const length = dView.getInt32(decOffset + 8, true);
    if (length < 0) break;

    const sectionTotalLength = SECTION_HEADER_SIZE + length + SECTION_END_SIZE;
    if (decOffset + sectionTotalLength > decrypted.length) break;

    const sectionHeader = decrypted.slice(decOffset, decOffset + SECTION_HEADER_SIZE);
    const sectionData = decrypted.slice(
      decOffset + SECTION_HEADER_SIZE,
      decOffset + SECTION_HEADER_SIZE + length,
    );
    const sectionEndFlag = decrypted.slice(
      decOffset + SECTION_HEADER_SIZE + length,
      decOffset + sectionTotalLength,
    );
    const sectionFull = decrypted.slice(decOffset, decOffset + sectionTotalLength);

    if (index === FMARKER_INDEX && !hasMarkerSection) {
      hasMarkerSection = true;
      markerSectionPrefix = sectionHeader;
      markerSectionEndFlag = sectionEndFlag;
      markerHeader = sectionData.slice(0, 16);
      const sView = new DataView(sectionData.buffer, sectionData.byteOffset);
      let markerCount = 0;
      for (let i = 16; i + 104 <= sectionData.length; i += 104) {
        wayMarks.push(parseWaymarkEntry(sView, i, sectionData));
        markerCount++;
      }
      markerTail = sectionData.slice(markerCount * 104 + 16);
    } else {
      if (hasMarkerSection) sectionsAfterMarker.push(sectionFull);
      else sectionsBeforeMarker.push(sectionFull);
    }
    decOffset += sectionTotalLength;
  }

  if (!hasMarkerSection || wayMarks.length === 0) {
    throw new Error("No waymark data found in UISAVE.DAT");
  }

  const otherSectionsBeforeMarker = concatUint8Arrays(sectionsBeforeMarker);
  const otherSectionsAfterMarker = concatUint8Arrays(sectionsAfterMarker);
  const otherSections = concatUint8Arrays([otherSectionsBeforeMarker, otherSectionsAfterMarker]);
  const payloadTail = decOffset < decrypted.length ? decrypted.slice(decOffset) : new Uint8Array(0);

  return {
    fileFormatVersion: data.slice(0, 8),
    fileUnknown: data.slice(12, 16),
    payloadUnknown: decrypted.slice(0, 8),
    userID: dView.getBigInt64(8, true),
    wayMarks,
    markerHeader,
    markerTail,
    markerSectionPrefix,
    markerSectionEndFlag,
    otherSections,
    otherSectionsBeforeMarker,
    otherSectionsAfterMarker,
    payloadTail,
  };
}
