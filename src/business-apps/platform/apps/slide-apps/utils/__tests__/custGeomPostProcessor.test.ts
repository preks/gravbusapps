import JSZip from 'jszip'
import {
  applyCustGeomPostProcessing,
  createCustGeomCollector,
  createCustGeomMarker,
  custGeomXmlFor,
  CUSTGEOM_MARKER_PREFIX
} from '../custGeomPostProcessor'

/**
 * Jest runs in jsdom / node where `Blob.arrayBuffer()` may be missing. This
 * helper bridges whichever method is available on the current Blob polyfill
 * so the tests care only about the bytes.
 */
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  const maybe = (blob as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer
  if (typeof maybe === 'function') return maybe.call(blob)
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

describe('custGeomPostProcessor: XML generation', () => {
  it('produces well-formed <a:custGeom> with pathLst for a rectangle', () => {
    const rectPath = 'M 0 0 L 1 0 L 1 1 L 0 1 Z'
    const xml = custGeomXmlFor(rectPath)
    expect(xml).toMatch(/<a:custGeom>/)
    expect(xml).toMatch(/<a:pathLst>/)
    expect(xml).toMatch(/<a:moveTo>/)
    expect(xml).toMatch(/<a:close\/>/)
    expect(xml).not.toMatch(/NaN|undefined/)
  })

  it('emits cubicBezTo when the source path contains cubic handles', () => {
    const curved = 'M 0 0 C 0.2 0.2 0.8 0.8 1 1'
    const xml = custGeomXmlFor(curved)
    expect(xml).toMatch(/<a:cubicBezTo>/)
  })

  it('normalises coordinates to the 0..100000 OOXML path space', () => {
    const xml = custGeomXmlFor('M 0 0 L 0.5 0.5 Z')
    expect(xml).toMatch(/a:path w="100000" h="100000"/)
    expect(xml).toMatch(/x="50000" y="50000"/)
  })
})

describe('custGeomPostProcessor: marker factory', () => {
  it('creates unique markers with the expected prefix', () => {
    const a = createCustGeomMarker()
    const b = createCustGeomMarker()
    expect(a).not.toBe(b)
    expect(a.startsWith(CUSTGEOM_MARKER_PREFIX)).toBe(true)
  })
})

describe('custGeomPostProcessor: zip rewriting', () => {
  it('no-op when the collector is empty', async () => {
    const zip = new JSZip()
    zip.file('ppt/slides/slide1.xml', '<p:sp><p:cNvPr name="x"/><a:prstGeom prst="rect"/></p:sp>')
    const buf = await zip.generateAsync({ type: 'arraybuffer' })
    const collector = createCustGeomCollector()
    const blob = await applyCustGeomPostProcessing(buf, collector)
    const re = await JSZip.loadAsync(await blobToArrayBuffer(blob))
    const xml = await re.file('ppt/slides/slide1.xml')!.async('string')
    expect(xml).toMatch(/<a:prstGeom/)
    expect(xml).not.toMatch(/<a:custGeom/)
  })

  it('swaps <a:prstGeom> for <a:custGeom> only on marked shapes', async () => {
    const marker = createCustGeomMarker()
    const xmlIn = `<?xml version="1.0"?>
<p:sld>
  <p:sp>
    <p:nvSpPr><p:cNvPr id="1" name="unmarked"/></p:nvSpPr>
    <p:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
  </p:sp>
  <p:sp>
    <p:nvSpPr><p:cNvPr id="2" name="${marker}"/></p:nvSpPr>
    <p:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
  </p:sp>
</p:sld>`
    const zip = new JSZip()
    zip.file('ppt/slides/slide1.xml', xmlIn)
    const buf = await zip.generateAsync({ type: 'arraybuffer' })

    const collector = createCustGeomCollector()
    collector.add(marker, 'M 0 0 L 1 0 L 1 1 L 0 1 Z')

    const blob = await applyCustGeomPostProcessing(buf, collector)
    const re = await JSZip.loadAsync(await blobToArrayBuffer(blob))
    const xmlOut = await re.file('ppt/slides/slide1.xml')!.async('string')

    // Unmarked shape still has prstGeom.
    expect(xmlOut).toMatch(/name="unmarked"[\s\S]*?<a:prstGeom/)

    // Marked shape has custGeom and no more prstGeom block in its span.
    const markedSpan = xmlOut.match(new RegExp(`name="${marker}"[\\s\\S]*?</p:sp>`))
    expect(markedSpan).toBeTruthy()
    expect(markedSpan![0]).toMatch(/<a:custGeom>/)
    expect(markedSpan![0]).not.toMatch(/<a:prstGeom/)
    expect(markedSpan![0]).toMatch(/<a:moveTo>/)
    expect(markedSpan![0]).toMatch(/<a:close\/>/)
  })

  it('generated custGeom round-trips back to the same anchors when re-parsed', async () => {
    const marker = createCustGeomMarker()
    const zip = new JSZip()
    const xmlIn = `<p:sp><p:nvSpPr><p:cNvPr id="1" name="${marker}"/></p:nvSpPr><p:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:sp>`
    zip.file('ppt/slides/slide1.xml', xmlIn)
    const buf = await zip.generateAsync({ type: 'arraybuffer' })

    const collector = createCustGeomCollector()
    const path = 'M 0.1 0.1 L 0.9 0.1 L 0.9 0.9 L 0.1 0.9 Z'
    collector.add(marker, path)

    const blob = await applyCustGeomPostProcessing(buf, collector)
    const re = await JSZip.loadAsync(await blobToArrayBuffer(blob))
    const xmlOut = await re.file('ppt/slides/slide1.xml')!.async('string')

    // Extract integer coordinates and verify they are at the expected per-mille
    // positions (10000 / 90000 map back to 0.1 / 0.9 in the unit box).
    expect(xmlOut).toMatch(/x="10000" y="10000"/)
    expect(xmlOut).toMatch(/x="90000" y="10000"/)
    expect(xmlOut).toMatch(/x="90000" y="90000"/)
    expect(xmlOut).toMatch(/x="10000" y="90000"/)
  })
})
