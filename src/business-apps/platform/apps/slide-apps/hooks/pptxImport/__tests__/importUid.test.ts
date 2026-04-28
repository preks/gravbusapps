import { nextImportUid } from '../ooxmlUtils'
import { extractTextElements } from '../extractText'
import { extractImageElements } from '../extractImages'
import { parseXML } from '../ooxmlUtils'
import type { OoxmlTheme, SlideRelationships } from '../types'

const theme: OoxmlTheme = {
  colors: new Map([['accent1', '#4472C4']]),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri'
}

function slideXml(inner: string): Document {
  return parseXML(`
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <p:cSld><p:spTree>${inner}</p:spTree></p:cSld>
    </p:sld>
  `)
}

describe('nextImportUid', () => {
  it('generates monotonically unique ids across tight loops', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      ids.add(nextImportUid('test'))
    }
    expect(ids.size).toBe(1000)
  })
})

describe('importer id uniqueness', () => {
  // Regression test: `assembleSlide` wraps each <p:sp>/<p:pic>/<p:cxnSp> in
  // its own fake doc and calls the relevant extractor. Each call iterates its
  // own loop counter starting at 0, so ids based on `${Date.now()}-${i}` used
  // to collide and trigger React "same key" warnings during import.
  const emptyRels: SlideRelationships = {
    images: new Map(),
    hyperlinks: new Map(),
    chartPaths: new Map()
  }

  it('text extraction produces unique ids across back-to-back calls', () => {
    const ids: string[] = []
    for (let i = 0; i < 10; i++) {
      const xml = slideXml(`
        <p:sp>
          <p:spPr>
            <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
          </p:spPr>
          <p:txBody>
            <a:p><a:r><a:t>text ${i}</a:t></a:r></a:p>
          </p:txBody>
        </p:sp>
      `)
      const elements = extractTextElements(xml, theme, emptyRels)
      ids.push(...elements.map(el => el.id))
    }
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('image extraction produces unique ids across back-to-back calls', () => {
    const rels: SlideRelationships = {
      images: new Map([['rId1', 'ppt/media/image1.png']]),
      hyperlinks: new Map(),
      chartPaths: new Map()
    }
    const imageData = new Map([['image1.png', 'data:image/png;base64,AA']])

    const ids: string[] = []
    for (let i = 0; i < 10; i++) {
      const xml = slideXml(`
        <p:pic>
          <p:blipFill><a:blip r:embed="rId1"/></p:blipFill>
          <p:spPr>
            <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
          </p:spPr>
        </p:pic>
      `)
      const elements = extractImageElements(xml, rels, imageData)
      ids.push(...elements.map(el => el.id))
    }
    expect(new Set(ids).size).toBe(ids.length)
  })
})
