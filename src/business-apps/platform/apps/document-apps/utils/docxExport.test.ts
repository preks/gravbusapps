import JSZip from 'jszip'
import { buildDocxBlob } from './docxExport'

async function readDocumentXml(blob: Blob) {
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
  const zip = await JSZip.loadAsync(arrayBuffer)
  return zip.file('word/document.xml')?.async('string')
}

describe('docxExport image layout', () => {
  it('preserves image crop and rotation in generated drawing xml', async () => {
    const html = [
      '<figure data-node-type="custom-image"',
      ' data-image-wrap="front"',
      ' data-image-anchor="fixed"',
      ' data-image-rotation="30"',
      ' data-image-crop-top="0.1"',
      ' data-image-crop-right="0.2"',
      ' data-image-crop-bottom="0.05"',
      ' data-image-crop-left="0.15">',
      '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sWwaP8AAAAASUVORK5CYII=" width="240" height="120" />',
      '</figure>'
    ].join('')

    const blob = await buildDocxBlob('Picture doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<a:srcRect l="15000" t="10000" r="20000" b="5000"/>')
    expect(documentXml).toContain('rot="1800000"')
    expect(documentXml).toContain('<wp:anchor')
  })

  it('exports each wrap mode with the matching WordprocessingML wrapping element', async () => {
    const base64Image =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sWwaP8AAAAASUVORK5CYII='
    const html = [
      `<figure data-node-type="custom-image" data-image-wrap="tight"><img src="${base64Image}" width="120" height="80" /></figure>`,
      `<figure data-node-type="custom-image" data-image-wrap="through"><img src="${base64Image}" width="120" height="80" /></figure>`,
      `<figure data-node-type="custom-image" data-image-wrap="top-bottom"><img src="${base64Image}" width="120" height="80" /></figure>`,
      `<figure data-node-type="custom-image" data-image-wrap="square-left"><img src="${base64Image}" width="120" height="80" /></figure>`
    ].join('')

    const blob = await buildDocxBlob('Wrap doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<wp:wrapTight wrapText="bothSides">')
    expect(documentXml).toContain('<wp:wrapThrough wrapText="bothSides">')
    expect(documentXml).toContain('<wp:wrapTopAndBottom/>')
    expect(documentXml).toContain('<wp:wrapSquare wrapText="right"/>')
    expect(documentXml).toContain('<wp:wrapPolygon edited="0">')
    expect(documentXml).toContain('<wp:start x="0" y="0"/>')
    expect(documentXml).toContain('<wp:lineTo x="21600" y="21600"/>')
  })

  it('exports behind-text images as behindDoc anchors without text wrapping exclusion', async () => {
    const html = [
      '<figure data-node-type="custom-image"',
      ' data-image-wrap="behind"',
      ' data-image-anchor="move-with-text">',
      '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sWwaP8AAAAASUVORK5CYII=" width="180" height="90" />',
      '</figure>'
    ].join('')

    const blob = await buildDocxBlob('Behind doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<wp:anchor')
    expect(documentXml).toContain('behindDoc="1"')
    expect(documentXml).toContain('<wp:wrapNone/>')
  })
})
