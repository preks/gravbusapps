import JSZip from 'jszip'
import { extractChartElements } from '../extractCharts'
import { parseXML } from '../ooxmlUtils'
import type { SlideRelationships } from '../types'
import type { ParserMessage } from '../../usePowerPointParser'

function slideXml(inner: string): Document {
  return parseXML(`
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
           xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <p:cSld><p:spTree>${inner}</p:spTree></p:cSld>
    </p:sld>
  `)
}

const graphicFrame = (relId: string) => `
  <p:graphicFrame>
    <p:nvGraphicFramePr/>
    <a:xfrm>
      <a:off x="914400" y="457200"/>
      <a:ext cx="3657600" cy="2743200"/>
    </a:xfrm>
    <a:graphic>
      <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart r:id="${relId}"/>
      </a:graphicData>
    </a:graphic>
  </p:graphicFrame>
`

function chartXml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
              xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
              xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:title><c:tx><c:rich><a:p><a:r><a:t>Revenue</a:t></a:r></a:p></c:rich></c:tx></c:title>
    <c:plotArea>
      ${body}
    </c:plotArea>
  </c:chart>
</c:chartSpace>`
}

function barSeries(): string {
  return `
    <c:barChart>
      <c:ser>
        <c:idx val="0"/>
        <c:order val="0"/>
        <c:tx><c:strRef><c:strCache><c:pt idx="0"><c:v>2024</c:v></c:pt></c:strCache></c:strRef></c:tx>
        <c:cat>
          <c:strRef>
            <c:strCache>
              <c:pt idx="0"><c:v>Q1</c:v></c:pt>
              <c:pt idx="1"><c:v>Q2</c:v></c:pt>
              <c:pt idx="2"><c:v>Q3</c:v></c:pt>
            </c:strCache>
          </c:strRef>
        </c:cat>
        <c:val>
          <c:numRef>
            <c:numCache>
              <c:pt idx="0"><c:v>10</c:v></c:pt>
              <c:pt idx="1"><c:v>20</c:v></c:pt>
              <c:pt idx="2"><c:v>30</c:v></c:pt>
            </c:numCache>
          </c:numRef>
        </c:val>
      </c:ser>
    </c:barChart>
  `
}

describe('extractChartElements', () => {
  it('imports a bar chart with categories and series values', async () => {
    const zip = new JSZip()
    zip.file('ppt/charts/chart1.xml', chartXml(barSeries()))

    const rels: SlideRelationships = {
      images: new Map(),
      hyperlinks: new Map(),
      chartPaths: new Map([['rId1', 'ppt/charts/chart1.xml']])
    }

    const messages: ParserMessage[] = []
    const charts = await extractChartElements(slideXml(graphicFrame('rId1')), rels, zip, messages, 0)

    expect(charts).toHaveLength(1)
    expect(charts[0].chartType).toBe('bar')
    expect(charts[0].title).toBe('Revenue')
    expect(charts[0].data).toHaveLength(3)
    expect(charts[0].data[0].label).toBe('Q1')
    expect(charts[0].series[0].label).toBe('2024')
    expect(messages.some(m => m.message === 'parser-chart-imported')).toBe(true)
  })

  it('skips unsupported chart types and emits a warning', async () => {
    const zip = new JSZip()
    zip.file(
      'ppt/charts/chart1.xml',
      chartXml(`
        <c:scatterChart>
          <c:ser><c:val><c:numRef><c:numCache><c:pt idx="0"><c:v>1</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser>
        </c:scatterChart>
      `)
    )
    const rels: SlideRelationships = {
      images: new Map(),
      hyperlinks: new Map(),
      chartPaths: new Map([['rId1', 'ppt/charts/chart1.xml']])
    }
    const messages: ParserMessage[] = []
    const charts = await extractChartElements(slideXml(graphicFrame('rId1')), rels, zip, messages, 0)
    expect(charts).toHaveLength(0)
    expect(messages.some(m => m.message === 'parser-chart-unsupported')).toBe(true)
  })

  it('returns empty when graphic frame has no matching chart rel', async () => {
    const zip = new JSZip()
    const rels: SlideRelationships = {
      images: new Map(),
      hyperlinks: new Map(),
      chartPaths: new Map()
    }
    const messages: ParserMessage[] = []
    const charts = await extractChartElements(slideXml(graphicFrame('rIdMissing')), rels, zip, messages, 0)
    expect(charts).toHaveLength(0)
  })

  it('falls back to generated labels when categories are missing', async () => {
    const zip = new JSZip()
    zip.file(
      'ppt/charts/chart1.xml',
      chartXml(`
        <c:lineChart>
          <c:ser>
            <c:idx val="0"/>
            <c:val>
              <c:numRef>
                <c:numCache>
                  <c:pt idx="0"><c:v>5</c:v></c:pt>
                  <c:pt idx="1"><c:v>9</c:v></c:pt>
                </c:numCache>
              </c:numRef>
            </c:val>
          </c:ser>
        </c:lineChart>
      `)
    )
    const rels: SlideRelationships = {
      images: new Map(),
      hyperlinks: new Map(),
      chartPaths: new Map([['rId1', 'ppt/charts/chart1.xml']])
    }
    const messages: ParserMessage[] = []
    const charts = await extractChartElements(slideXml(graphicFrame('rId1')), rels, zip, messages, 0)

    expect(charts).toHaveLength(1)
    expect(charts[0].chartType).toBe('line')
    expect(charts[0].data.map(d => d.label)).toEqual(['Item 1', 'Item 2'])
  })
})
