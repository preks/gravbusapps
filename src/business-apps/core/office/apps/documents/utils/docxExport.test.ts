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

  it('emits picture border line properties when a border is configured', async () => {
    const html = [
      '<figure data-node-type="custom-image"',
      ' data-image-border-visible="true"',
      ' data-image-border-color="#1F4E79"',
      ' data-image-border-width-pt="2.25"',
      ' data-image-border-dash="dash-dot">',
      '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sWwaP8AAAAASUVORK5CYII=" width="240" height="120" />',
      '</figure>'
    ].join('')

    const blob = await buildDocxBlob('Border doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<a:ln w="28575">')
    expect(documentXml).toContain('<a:srgbClr val="1F4E79"/>')
    expect(documentXml).toContain('<a:prstDash val="dashDot"/>')
  })

  it('exports each wrap mode with the matching WordprocessingML wrapping element', async () => {
    const base64Image =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sWwaP8AAAAASUVORK5CYII='
    const html = [
      `<figure data-node-type="custom-image" data-image-wrap="tight"><img src="${base64Image}" width="120" height="80" /></figure>`,
      `<figure data-node-type="custom-image" data-image-wrap="through"><img src="${base64Image}" width="120" height="80" /></figure>`,
      `<figure data-node-type="custom-image" data-image-wrap="top-bottom"><img src="${base64Image}" width="120" height="80" /></figure>`,
      `<figure data-node-type="custom-image" data-image-wrap="square" data-image-wrap-text-side="right"><img src="${base64Image}" width="120" height="80" /></figure>`,
      `<figure data-node-type="custom-image" data-image-wrap="square" data-image-wrap-text-side="left" data-image-align="right"><img src="${base64Image}" width="120" height="80" /></figure>`
    ].join('')

    const blob = await buildDocxBlob('Wrap doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<wp:wrapTight wrapText="bothSides">')
    expect(documentXml).toContain('<wp:wrapThrough wrapText="bothSides">')
    expect(documentXml).toContain('<wp:wrapTopAndBottom/>')
    expect(documentXml).toContain('<wp:wrapSquare wrapText="right"/>')
    expect(documentXml).toContain('<wp:wrapSquare wrapText="left"/>')
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

  it('exports document ToC blocks as refreshable Word TOC fields with cached rows', async () => {
    const html = `
      <div
        data-document-toc=""
        data-toc-snapshot='{"version":2,"entries":[{"level":1,"text":"Overview","pos":12,"blockStart":11,"pageNumber":"3"}],"updatedAt":"2026-04-14T10:00:00.000Z","updateMode":"entire","layoutVersion":1}'
        data-toc-show-page-numbers="true"
        data-toc-right-align-page-numbers="true"
        data-toc-tab-leader="dot"
        data-toc-heading-links="true"
        data-toc-max-heading-level="3"
      >
        <div class="document-toc-print-inner">
          <div class="document-toc-print-title">Table of contents</div>
        </div>
      </div>
      <h1>Overview</h1>
    `

    const blob = await buildDocxBlob('ToC doc', html)
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('TOC \\o &quot;1-3&quot; \\h')
    expect(documentXml).toContain('fldCharType="begin"')
    expect(documentXml).toContain('fldCharType="separate"')
    expect(documentXml).toContain('fldCharType="end"')
    expect(documentXml).toContain('Table of contents')
    expect(documentXml).toContain('Overview')
    expect(documentXml).toContain('<w:tab/>')
    expect(documentXml).toContain('<w:pStyle w:val="Heading1"/>')
  })

  it('writes live page setup values into the DOCX section properties', async () => {
    const blob = await buildDocxBlob('Layout doc', '<p>Layout</p>', {
      pageSize: 'A4',
      orientation: 'landscape',
      marginUnit: 'cm',
      margins: {
        top: 1,
        right: 2,
        bottom: 3,
        left: 4
      },
      pages: {
        headerTopMargin: 40,
        footerBottomMargin: 56
      }
    })
    const documentXml = await readDocumentXml(blob)

    expect(documentXml).toContain('<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>')
    expect(documentXml).toContain(
      '<w:pgMar w:top="567" w:right="1134" w:bottom="1701" w:left="2268" w:header="600" w:footer="840" w:gutter="0"/>'
    )
  })
})
