import { describe, it, expect } from 'vitest'
import './setup'
import { extractTextElements } from '../extractText'
import { parseXML } from '../ooxmlUtils'
import type { OoxmlTheme, SlideRelationships } from '../types'

const emptyRels: SlideRelationships = {
  images: new Map(),
  hyperlinks: new Map(),
  chartPaths: new Map()
}

const theme: OoxmlTheme = {
  colors: new Map([['accent1', '#4472C4']]),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri'
}

function slideXml(spXml: string): Document {
  return parseXML(`
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <p:cSld><p:spTree>${spXml}</p:spTree></p:cSld>
    </p:sld>
  `)
}

describe('extractTextElements', () => {
  it('extracts plain text with position and size', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="457200"/>
            <a:ext cx="4572000" cy="914400"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p>
            <a:r>
              <a:rPr lang="en-US"/>
              <a:t>Hello World</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(xml, theme, emptyRels)

    expect(elements).toHaveLength(1)
    expect(elements[0].content).toBe('Hello World')
    expect(elements[0].position.x).toBeCloseTo(96, 0)
    expect(elements[0].position.y).toBeCloseTo(48, 0)
  })

  it('extracts bold and italic formatting', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="457200"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p>
            <a:r>
              <a:rPr b="1" i="1" sz="2400"/>
              <a:t>Bold Italic Text</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(xml, theme, emptyRels)

    expect(elements).toHaveLength(1)
    expect(elements[0].fontWeight).toBe('bold')
    expect(elements[0].fontStyle).toBe('italic')
    expect(elements[0].fontSize).toBe(32)
  })

  it('extracts text color from srgb', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="457200"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p>
            <a:r>
              <a:rPr>
                <a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>
              </a:rPr>
              <a:t>Red text</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(xml, theme, emptyRels)
    expect(elements[0].color).toBe('#FF0000')
  })

  it('resolves hyperlinks from relationships', () => {
    const rels: SlideRelationships = {
      images: new Map(),
      hyperlinks: new Map([['rId5', 'https://example.com']]),
      chartPaths: new Map()
    }

    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="457200"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p>
            <a:r>
              <a:rPr>
                <a:hlinkClick r:id="rId5"/>
              </a:rPr>
              <a:t>Click here</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(xml, theme, rels)
    expect(elements[0].links).toBeDefined()
    expect(elements[0].links![0].url).toBe('https://example.com')
  })

  it('skips shapes without text content', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="457200"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p></a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(xml, theme, emptyRels)
    expect(elements).toHaveLength(0)
  })

  it('concatenates multiple paragraphs with newline', () => {
    const xml = slideXml(`
      <p:sp>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:p><a:r><a:t>Line one</a:t></a:r></a:p>
          <a:p><a:r><a:t>Line two</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    `)

    const elements = extractTextElements(xml, theme, emptyRels)
    expect(elements[0].content).toBe('Line one\nLine two')
  })
})
