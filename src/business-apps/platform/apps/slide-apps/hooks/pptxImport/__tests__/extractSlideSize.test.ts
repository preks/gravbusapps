import { extractSlideSize } from '../extractSlideSize'
import { parseXML } from '../ooxmlUtils'

function presentation(innerXml: string): Document {
  return parseXML(`
    <p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      ${innerXml}
    </p:presentation>
  `)
}

describe('extractSlideSize', () => {
  it('returns undefined when <p:sldSz> is missing', () => {
    expect(extractSlideSize(presentation(''))).toBeUndefined()
  })

  it('returns undefined when cx/cy attributes are missing or non-positive', () => {
    expect(extractSlideSize(presentation(`<p:sldSz/>`))).toBeUndefined()
    expect(extractSlideSize(presentation(`<p:sldSz cx="0" cy="0"/>`))).toBeUndefined()
    expect(extractSlideSize(presentation(`<p:sldSz cx="-12" cy="100"/>`))).toBeUndefined()
    expect(extractSlideSize(presentation(`<p:sldSz cx="abc" cy="100"/>`))).toBeUndefined()
  })

  it('converts the widescreen 16:9 preset to 1280x720 pixels', () => {
    // PowerPoint widescreen preset in EMU.
    const xml = presentation(`<p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>`)
    const size = extractSlideSize(xml)
    expect(size).toEqual({
      width: 1280,
      height: 720,
      preset: 'screen16x9',
      aspectRatio: expect.any(Number)
    })
    expect(size?.aspectRatio).toBeCloseTo(16 / 9, 2)
  })

  it('converts the 4:3 preset to 960x720 pixels', () => {
    const xml = presentation(`<p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>`)
    expect(extractSlideSize(xml)).toEqual({
      width: 960,
      height: 720,
      preset: 'screen4x3',
      aspectRatio: expect.any(Number)
    })
  })

  it('honors the 16:10 preset explicitly', () => {
    const xml = presentation(`<p:sldSz cx="9144000" cy="5715000" type="screen16x10"/>`)
    const size = extractSlideSize(xml)
    expect(size?.width).toBe(960)
    expect(size?.height).toBe(600)
    expect(size?.preset).toBe('screen16x10')
  })

  it('falls back to aspect-ratio classification when type is custom', () => {
    // 16:9-shaped custom size
    const xml = presentation(`<p:sldSz cx="12192000" cy="6858000" type="custom"/>`)
    expect(extractSlideSize(xml)?.preset).toBe('screen16x9')
  })

  it('labels exotic sizes as custom when they do not match any known aspect', () => {
    // Portrait-ish 1000x1500 px in EMU (9525 EMU/px).
    const xml = presentation(`<p:sldSz cx="${1000 * 9525}" cy="${1500 * 9525}" type="custom"/>`)
    const size = extractSlideSize(xml)
    expect(size?.width).toBe(1000)
    expect(size?.height).toBe(1500)
    expect(size?.preset).toBe('custom')
  })

  it('rounds sub-pixel dimensions to whole pixels', () => {
    // 10.001" wide, 7.5" tall — not a whole number of pixels at 96 DPI.
    const xml = presentation(`<p:sldSz cx="9145000" cy="6858000"/>`)
    const size = extractSlideSize(xml)
    expect(Number.isInteger(size?.width)).toBe(true)
    expect(Number.isInteger(size?.height)).toBe(true)
    expect(size?.width).toBe(960)
    expect(size?.height).toBe(720)
  })

  it('preserves A4 landscape dimensions', () => {
    // A4 portrait in EMU: 7560000 x 10692000; landscape swaps them.
    const xml = presentation(`<p:sldSz cx="10692000" cy="7560000" type="A4"/>`)
    const size = extractSlideSize(xml)
    expect(size?.width).toBeGreaterThan(1100)
    expect(size?.height).toBeGreaterThan(790)
    // Unknown `A4` casing maps via aspect classifier to 'custom'.
    expect(['custom', 'a4']).toContain(size?.preset)
  })
})
