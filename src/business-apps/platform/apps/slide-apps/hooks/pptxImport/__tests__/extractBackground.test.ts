import { describe, it, expect } from 'vitest'
import './setup'
import { extractBackground } from '../extractBackground'
import { parseXML } from '../ooxmlUtils'
import type { OoxmlTheme, SlideRelationships } from '../types'

const emptyRels: SlideRelationships = {
  images: new Map(),
  hyperlinks: new Map(),
  chartPaths: new Map()
}

const theme: OoxmlTheme = {
  colors: new Map([
    ['accent1', '#4472C4'],
    ['dk1', '#000000'],
    ['lt1', '#FFFFFF']
  ]),
  majorFont: 'Calibri Light',
  minorFont: 'Calibri'
}

function slideXml(bgXml: string): Document {
  return parseXML(`
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <p:cSld>${bgXml}<p:spTree/></p:cSld>
    </p:sld>
  `)
}

describe('extractBackground', () => {
  it('returns white fallback when no background element', () => {
    const xml = slideXml('')
    const bg = extractBackground(xml, theme, emptyRels, new Map())
    expect(bg).toEqual({ type: 'solid', color: '#ffffff' })
  })

  it('extracts solid fill background', () => {
    const xml = slideXml(`
      <p:bg>
        <p:bgPr>
          <a:solidFill><a:srgbClr val="1E3A5F"/></a:solidFill>
        </p:bgPr>
      </p:bg>
    `)

    const bg = extractBackground(xml, theme, emptyRels, new Map())
    expect(bg.type).toBe('solid')
    expect(bg.color).toBe('#1E3A5F')
  })

  it('extracts gradient background', () => {
    const xml = slideXml(`
      <p:bg>
        <p:bgPr>
          <a:gradFill>
            <a:gsLst>
              <a:gs pos="0"><a:srgbClr val="FF0000"/></a:gs>
              <a:gs pos="100000"><a:srgbClr val="0000FF"/></a:gs>
            </a:gsLst>
            <a:lin ang="5400000"/>
          </a:gradFill>
        </p:bgPr>
      </p:bg>
    `)

    const bg = extractBackground(xml, theme, emptyRels, new Map())
    expect(bg.type).toBe('gradient')
    expect(bg.gradient).toBeDefined()
    expect(bg.gradient!.stops).toHaveLength(2)
  })

  it('resolves scheme color background via theme', () => {
    const xml = slideXml(`
      <p:bg>
        <p:bgPr>
          <a:solidFill><a:schemeClr val="dk1"/></a:solidFill>
        </p:bgPr>
      </p:bg>
    `)

    const bg = extractBackground(xml, theme, emptyRels, new Map())
    expect(bg.type).toBe('solid')
    expect(bg.color).toBe('#000000')
  })
})
