import { extractTableElements } from '../extractTables'
import { parseXML } from '../ooxmlUtils'
import type { OoxmlTheme } from '../types'
import type { ParserMessage } from '../../usePowerPointParser'

const theme: OoxmlTheme = {
  colors: new Map(),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri'
}

function slideXml(content: string): Document {
  return parseXML(`
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <p:cSld><p:spTree>${content}</p:spTree></p:cSld>
    </p:sld>
  `)
}

describe('extractTableElements', () => {
  it('extracts a table with headers and rows', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:graphicFrame>
        <p:xfrm>
          <a:xfrm>
            <a:off x="914400" y="914400"/>
            <a:ext cx="4572000" cy="2286000"/>
          </a:xfrm>
        </p:xfrm>
        <a:tbl>
          <a:tblPr firstRow="1"/>
          <a:tr>
            <a:tc><a:txBody><a:p><a:r><a:t>Name</a:t></a:r></a:p></a:txBody></a:tc>
            <a:tc><a:txBody><a:p><a:r><a:t>Value</a:t></a:r></a:p></a:txBody></a:tc>
          </a:tr>
          <a:tr>
            <a:tc><a:txBody><a:p><a:r><a:t>Alpha</a:t></a:r></a:p></a:txBody></a:tc>
            <a:tc><a:txBody><a:p><a:r><a:t>100</a:t></a:r></a:p></a:txBody></a:tc>
          </a:tr>
          <a:tr>
            <a:tc><a:txBody><a:p><a:r><a:t>Beta</a:t></a:r></a:p></a:txBody></a:tc>
            <a:tc><a:txBody><a:p><a:r><a:t>200</a:t></a:r></a:p></a:txBody></a:tc>
          </a:tr>
        </a:tbl>
      </p:graphicFrame>
    `)

    const elements = extractTableElements(xml, theme, messages, 0)

    expect(elements).toHaveLength(1)
    expect(elements[0].type).toBe('table')
    expect(elements[0].headers).toEqual(['Name', 'Value'])
    expect(elements[0].rows).toEqual([
      ['Alpha', '100'],
      ['Beta', '200']
    ])

    const info = messages.find(m => m.message === 'parser-table-imported')
    expect(info).toBeDefined()
    expect(info!.params!.rows).toBe('2')
    expect(info!.params!.cols).toBe('2')
  })

  it('handles table without firstRow flag', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:graphicFrame>
        <p:xfrm>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="914400"/>
          </a:xfrm>
        </p:xfrm>
        <a:tbl>
          <a:tblPr/>
          <a:tr>
            <a:tc><a:txBody><a:p><a:r><a:t>H1</a:t></a:r></a:p></a:txBody></a:tc>
          </a:tr>
          <a:tr>
            <a:tc><a:txBody><a:p><a:r><a:t>D1</a:t></a:r></a:p></a:txBody></a:tc>
          </a:tr>
        </a:tbl>
      </p:graphicFrame>
    `)

    const elements = extractTableElements(xml, theme, messages, 0)
    expect(elements).toHaveLength(1)
    expect(elements[0].headers).toEqual(['H1'])
    expect(elements[0].rows).toEqual([['D1']])
  })
})
