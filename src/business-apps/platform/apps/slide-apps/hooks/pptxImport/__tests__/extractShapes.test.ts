import { describe, it, expect } from 'vitest'
import './setup'
import { extractShapeElements } from '../extractShapes'
import { parseXML } from '../ooxmlUtils'
import type { OoxmlTheme } from '../types'
import type { ParserMessage } from '../../usePowerPointParser'

const theme: OoxmlTheme = {
  colors: new Map([['accent1', '#4472C4']]),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri'
}

function slideXml(spXml: string): Document {
  return parseXML(`
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <p:cSld><p:spTree>${spXml}</p:spTree></p:cSld>
    </p:sld>
  `)
}

describe('extractShapeElements', () => {
  it('extracts rectangle shape with fill', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="914400"/>
            <a:ext cx="1828800" cy="914400"/>
          </a:xfrm>
          <a:prstGeom prst="rect"/>
          <a:solidFill><a:srgbClr val="3B82F6"/></a:solidFill>
        </p:spPr>
      </p:sp>
    `)

    const elements = extractShapeElements(xml, theme, messages, 0)

    expect(elements).toHaveLength(1)
    expect(elements[0].shapeType).toBe('rectangle')
    expect(elements[0].fill).toBe('#3B82F6')
  })

  it('maps ellipse to circle when aspect ratio is 1:1', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="914400"/>
          </a:xfrm>
          <a:prstGeom prst="ellipse"/>
          <a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>
        </p:spPr>
      </p:sp>
    `)

    const elements = extractShapeElements(xml, theme, messages, 0)
    expect(elements[0].shapeType).toBe('circle')
  })

  it('skips shapes that contain text', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="rect"/>
        </p:spPr>
        <p:txBody>
          <a:p><a:r><a:t>Text inside</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractShapeElements(xml, theme, messages, 0)
    expect(elements).toHaveLength(0)
  })

  it('falls back to rectangle for unsupported presets and adds warning', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="unknownGeometry123"/>
        </p:spPr>
      </p:sp>
    `)

    const elements = extractShapeElements(xml, theme, messages, 0)
    expect(elements).toHaveLength(1)
    expect(elements[0].shapeType).toBe('rectangle')
    expect(messages.some(m => m.message === 'parser-shape-unsupported')).toBe(true)
  })

  it('extracts stroke properties', () => {
    const messages: ParserMessage[] = []
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="0" y="0"/>
            <a:ext cx="914400" cy="457200"/>
          </a:xfrm>
          <a:prstGeom prst="rect"/>
          <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
          <a:ln w="19050">
            <a:solidFill><a:srgbClr val="000000"/></a:solidFill>
            <a:prstDash val="dash"/>
          </a:ln>
        </p:spPr>
      </p:sp>
    `)

    const elements = extractShapeElements(xml, theme, messages, 0)
    expect(elements[0].strokeWidth).toBe(2)
    expect(elements[0].strokeColor).toBe('#000000')
    expect(elements[0].strokeStyle).toBe('dashed')
  })
})
