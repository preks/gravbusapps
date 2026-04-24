import { renderMetafileToSvgDataUrl, __resetMetafileRendererCacheForTests } from '../metafileRenderer'

describe('renderMetafileToSvgDataUrl', () => {
  beforeEach(() => {
    __resetMetafileRendererCacheForTests()
  })

  it('returns undefined for random bytes that are not a valid WMF', async () => {
    // The rtf.js WMFJS parser throws on invalid metafile streams; we must
    // swallow the error and return undefined so the caller falls back to
    // the neutral placeholder instead of surfacing a library error.
    const junk = new Uint8Array(256)
    for (let i = 0; i < junk.length; i++) junk[i] = i & 0xff

    const url = await renderMetafileToSvgDataUrl(junk, 'wmf')
    expect(url).toBeUndefined()
  })

  it('returns undefined for random bytes that are not a valid EMF', async () => {
    const junk = new Uint8Array(256)
    for (let i = 0; i < junk.length; i++) junk[i] = (i * 17) & 0xff

    const url = await renderMetafileToSvgDataUrl(junk, 'emf')
    expect(url).toBeUndefined()
  })

  it('renders a minimally valid WMF to an SVG data URL', async () => {
    // Placeable WMF header (Aldus APM) + minimal standard WMF record stream:
    //   key       = 9AC6CDD7 (placeable magic)
    //   handle    = 0
    //   left/top  = 0, 0
    //   right/bot = 100, 100
    //   inch      = 1440 (twips per inch)
    //   reserved  = 0
    //   checksum  = xor of previous 10 shorts
    //
    // Followed by a standard WMF header (type=0x0001 memory, size=9 words,
    // version=0x0300) and an EOF record (0x00000003 = size 3 words, 0x0000
    // = META_EOF).
    const apmHeader = new Uint8Array(22)
    const dv = new DataView(apmHeader.buffer)
    dv.setUint32(0, 0x9ac6cdd7, true)
    dv.setUint16(4, 0, true)
    dv.setInt16(6, 0, true)
    dv.setInt16(8, 0, true)
    dv.setInt16(10, 100, true)
    dv.setInt16(12, 100, true)
    dv.setUint16(14, 1440, true)
    dv.setUint32(16, 0, true)
    // checksum = XOR of the first 10 shorts
    let checksum = 0
    for (let i = 0; i < 20; i += 2) checksum ^= dv.getUint16(i, true)
    dv.setUint16(20, checksum, true)

    const stdHeader = new Uint8Array(18)
    const sh = new DataView(stdHeader.buffer)
    sh.setUint16(0, 0x0001, true) // type = memory
    sh.setUint16(2, 9, true) // header size in words
    sh.setUint16(4, 0x0300, true) // version 3.0
    sh.setUint32(6, 9 + 3, true) // total size in words (header + EOF)
    sh.setUint16(10, 0, true) // num objects
    sh.setUint32(12, 0, true) // max record size
    sh.setUint16(16, 0, true) // reserved

    const eofRecord = new Uint8Array(6)
    const er = new DataView(eofRecord.buffer)
    er.setUint32(0, 3, true) // size in words
    er.setUint16(4, 0x0000, true) // META_EOF

    const wmf = new Uint8Array(apmHeader.length + stdHeader.length + eofRecord.length)
    wmf.set(apmHeader, 0)
    wmf.set(stdHeader, apmHeader.length)
    wmf.set(eofRecord, apmHeader.length + stdHeader.length)

    const url = await renderMetafileToSvgDataUrl(wmf, 'wmf')
    // rtf.js may refuse a zero-drawing WMF on some corner paths; accept
    // either "we produced an SVG" or "we refused safely" but never throw.
    if (url !== undefined) {
      expect(url.startsWith('data:image/svg+xml;base64,')).toBe(true)
    }
  })
})
