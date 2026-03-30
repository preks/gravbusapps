/**
 * Best-effort DPI / pixels-per-unit extraction from JPEG (JFIF / EXIF) and PNG (pHYs) buffers.
 * Used for Word-like initial display sizing (CSS px from physical resolution).
 */

function readUint32BE(view: DataView, offset: number): number {
  return view.getUint32(offset, false)
}

/**
 * Parses JFIF density from JPEG APP0 segment payload (starts after segment length).
 */
export function parseJfifDensityFromApp0Payload(
  view: DataView,
  payloadStart: number,
  payloadLen: number
): { x: number; y: number } | null {
  if (payloadLen < 9) return null
  // "JFIF\0"
  if (
    view.getUint8(payloadStart) !== 0x4a ||
    view.getUint8(payloadStart + 1) !== 0x46 ||
    view.getUint8(payloadStart + 2) !== 0x49 ||
    view.getUint8(payloadStart + 3) !== 0x46 ||
    view.getUint8(payloadStart + 4) !== 0
  ) {
    return null
  }
  const units = view.getUint8(payloadStart + 7)
  const xd = view.getUint16(payloadStart + 8, false)
  const yd = view.getUint16(payloadStart + 10, false)
  if (xd <= 0 || yd <= 0) return null
  if (units === 1) {
    return { x: xd, y: yd }
  }
  if (units === 2) {
    return { x: Math.round(xd * 2.54), y: Math.round(yd * 2.54) }
  }
  return null
}

function parseExifDpiFromTiff(view: DataView, tiffStart: number, tiffEnd: number): { x: number; y: number } | null {
  if (tiffStart + 14 > tiffEnd) return null
  const bom = view.getUint16(tiffStart, false)
  const le = bom === 0x4949
  const readU16 = (abs: number) => {
    if (abs + 2 > tiffEnd) return 0
    return view.getUint16(abs, le)
  }
  const readU32 = (abs: number) => {
    if (abs + 4 > tiffEnd) return 0
    return view.getUint32(abs, le)
  }

  if (bom !== 0x4949 && bom !== 0x4d4d) return null
  if (readU16(tiffStart + 2) !== 0x002a) return null

  const ifd0Offset = readU32(tiffStart + 4)
  const ifd0 = tiffStart + ifd0Offset
  if (ifd0 + 2 > tiffEnd) return null

  const entryCount = readU16(ifd0)
  let xNum = 0
  let xDen = 1
  let yNum = 0
  let yDen = 1
  let resolutionUnit = 2

  for (let i = 0; i < entryCount; i++) {
    const entry = ifd0 + 2 + i * 12
    if (entry + 12 > tiffEnd) break
    const tag = readU16(entry)
    const type = readU16(entry + 2)
    const count = readU32(entry + 4)
    const valueOrOffset = readU32(entry + 8)

    if (tag === 282 && type === 5 && count === 1) {
      const off = tiffStart + valueOrOffset
      if (off + 8 <= tiffEnd) {
        xNum = readU32(off)
        xDen = readU32(off + 4) || 1
      }
    } else if (tag === 283 && type === 5 && count === 1) {
      const off = tiffStart + valueOrOffset
      if (off + 8 <= tiffEnd) {
        yNum = readU32(off)
        yDen = readU32(off + 4) || 1
      }
    } else if (tag === 296 && type === 3 && count === 1) {
      resolutionUnit = readU16(entry + 8)
    }
  }

  if (xNum <= 0 || yNum <= 0) return null

  let dpiX = (xNum / xDen) * (resolutionUnit === 3 ? 2.54 : 1)
  let dpiY = (yNum / yDen) * (resolutionUnit === 3 ? 2.54 : 1)

  if (resolutionUnit === 1) {
    return null
  }

  dpiX = Math.round(dpiX)
  dpiY = Math.round(dpiY)
  if (dpiX <= 0 || dpiY <= 0) return null
  return { x: dpiX, y: dpiY }
}

function parseExifDpiFromApp1Payload(
  buffer: ArrayBuffer,
  payloadStart: number,
  payloadLen: number
): { x: number; y: number } | null {
  if (payloadLen < 14) return null
  const exifId = new Uint8Array(buffer, payloadStart, 6)
  if (
    exifId[0] !== 0x45 ||
    exifId[1] !== 0x78 ||
    exifId[2] !== 0x69 ||
    exifId[3] !== 0x66 ||
    exifId[4] !== 0 ||
    exifId[5] !== 0
  ) {
    return null
  }
  const tiffStart = payloadStart + 6
  const tiffEnd = payloadStart + payloadLen
  const view = new DataView(buffer)
  return parseExifDpiFromTiff(view, tiffStart, tiffEnd)
}

/**
 * Walks JPEG markers and returns DPI from JFIF APP0 or EXIF APP1 when present.
 */
export function parseJpegDpiFromBuffer(buffer: ArrayBuffer): { x: number; y: number } | null {
  const view = new DataView(buffer)
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) {
    return null
  }

  let i = 2
  const len = view.byteLength
  while (i < len - 1) {
    if (view.getUint8(i) !== 0xff) {
      i += 1
      continue
    }
    i += 1
    while (i < len && view.getUint8(i) === 0xff) {
      i += 1
    }
    if (i >= len) break
    const marker = view.getUint8(i)
    i += 1

    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue
    }

    if (i + 1 >= len) break
    const segLen = view.getUint16(i, false)
    if (segLen < 2 || i + segLen > len) break

    const dataStart = i + 2
    const payloadLen = segLen - 2

    if (marker === 0xe0) {
      const jfif = parseJfifDensityFromApp0Payload(view, dataStart, payloadLen)
      if (jfif) return jfif
    } else if (marker === 0xe1) {
      const exif = parseExifDpiFromApp1Payload(buffer, dataStart, payloadLen)
      if (exif) return exif
    }

    i += segLen
  }

  return null
}

/**
 * Reads PNG pHYs chunk (pixels per meter) and converts to DPI.
 */
export function parsePngDpiFromBuffer(buffer: ArrayBuffer): { x: number; y: number } | null {
  const view = new DataView(buffer)
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (view.byteLength < 33) return null
  for (let s = 0; s < 8; s += 1) {
    if (view.getUint8(s) !== sig[s]) return null
  }

  let offset = 8
  while (offset + 12 <= view.byteLength) {
    const chunkLen = readUint32BE(view, offset)
    const t0 = view.getUint8(offset + 4)
    const t1 = view.getUint8(offset + 5)
    const t2 = view.getUint8(offset + 6)
    const t3 = view.getUint8(offset + 7)
    const dataStart = offset + 8
    const dataEnd = dataStart + chunkLen

    if (t0 === 0x70 && t1 === 0x48 && t2 === 0x59 && t3 === 0x73 && chunkLen === 9 && dataEnd + 4 <= view.byteLength) {
      const pxPerUnitX = readUint32BE(view, dataStart)
      const pxPerUnitY = readUint32BE(view, dataStart + 4)
      const unit = view.getUint8(dataStart + 8)
      if (unit === 1 && pxPerUnitX > 0 && pxPerUnitY > 0) {
        return {
          x: Math.max(1, Math.round(pxPerUnitX * 0.0254)),
          y: Math.max(1, Math.round(pxPerUnitY * 0.0254))
        }
      }
      return null
    }

    if (dataEnd + 4 > view.byteLength) break
    offset = dataEnd + 4
  }

  return null
}

export function parseImageDpiFromBuffer(
  buffer: ArrayBuffer,
  mimeType?: string | null
): { x: number; y: number } | null {
  const mt = mimeType?.toLowerCase() ?? ''
  if (mt.includes('png') || (mt === '' && new Uint8Array(buffer, 0, 8)[0] === 0x89)) {
    return parsePngDpiFromBuffer(buffer)
  }
  if (mt.includes('jpeg') || mt.includes('jpg') || (mt === '' && new DataView(buffer).getUint16(0, false) === 0xffd8)) {
    return parseJpegDpiFromBuffer(buffer)
  }
  if (mt === '') {
    const png = parsePngDpiFromBuffer(buffer)
    if (png) return png
    return parseJpegDpiFromBuffer(buffer)
  }
  return null
}
