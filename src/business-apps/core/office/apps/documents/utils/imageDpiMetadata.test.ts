import { parseJpegDpiFromBuffer, parseJfifDensityFromApp0Payload, parsePngDpiFromBuffer } from './imageDpiMetadata'

function hexToBuffer(hex: string): ArrayBuffer {
  const clean = hex.replace(/\s/g, '')
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes.buffer
}

describe('imageDpiMetadata', () => {
  it('parses JFIF APP0 DPI (300 dpi)', () => {
    const view = new DataView(hexToBuffer('4a46494600010101012c012c0000'))
    const dpi = parseJfifDensityFromApp0Payload(view, 0, 14)
    expect(dpi).toEqual({ x: 300, y: 300 })
  })

  it('parses minimal JPEG with JFIF 300 dpi', () => {
    const buf = hexToBuffer('ffd8ffe000104a46494600010101012c012c0000ffd9')
    expect(parseJpegDpiFromBuffer(buf)).toEqual({ x: 300, y: 300 })
  })

  it('parses PNG pHYs pixels-per-meter to DPI', () => {
    const ppm = 11811
    const u8 = new Uint8Array(66)
    u8.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)

    const putU32 = (offset: number, value: number) => {
      u8[offset] = (value >> 24) & 0xff
      u8[offset + 1] = (value >> 16) & 0xff
      u8[offset + 2] = (value >> 8) & 0xff
      u8[offset + 3] = value & 0xff
    }

    putU32(8, 13)
    u8[12] = 0x49
    u8[13] = 0x48
    u8[14] = 0x44
    u8[15] = 0x52
    putU32(16, 1)
    putU32(20, 1)
    u8[24] = 8
    u8[25] = 2
    u8[26] = 0
    u8[27] = 0
    u8[28] = 0

    putU32(33, 9)
    u8[37] = 0x70
    u8[38] = 0x48
    u8[39] = 0x59
    u8[40] = 0x73
    putU32(41, ppm)
    putU32(45, ppm)
    u8[49] = 1

    putU32(54, 0)
    u8[58] = 0x49
    u8[59] = 0x45
    u8[60] = 0x4e
    u8[61] = 0x44

    const dpi = parsePngDpiFromBuffer(u8.buffer)
    expect(dpi).not.toBeNull()
    expect(dpi!.x).toBe(Math.round(ppm * 0.0254))
    expect(dpi!.y).toBe(Math.round(ppm * 0.0254))
  })
})
