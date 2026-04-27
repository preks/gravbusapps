import {
  emuToPixels,
  hundredthsPointToPixels,
  rotationToAngle,
  parseXML,
  extractTransform,
  parseSolidFill,
  parseGradientFill
} from '../ooxmlUtils'
import type { OoxmlTheme } from '../types'

describe('ooxmlUtils', () => {
  describe('emuToPixels', () => {
    it('converts EMU to pixels correctly', () => {
      expect(emuToPixels(9525)).toBeCloseTo(1)
      expect(emuToPixels(914400)).toBeCloseTo(96)
      expect(emuToPixels(0)).toBe(0)
    })
  })

  describe('hundredthsPointToPixels', () => {
    it('converts hundredths of a point to pixels', () => {
      expect(hundredthsPointToPixels(2400)).toBeCloseTo(32, 0)
      expect(hundredthsPointToPixels(1800)).toBeCloseTo(24, 0)
    })
  })

  describe('rotationToAngle', () => {
    it('converts 60,000ths of a degree to degrees', () => {
      expect(rotationToAngle(5400000)).toBe(90)
      expect(rotationToAngle(0)).toBe(0)
      expect(rotationToAngle(undefined)).toBe(0)
    })
  })

  describe('extractTransform', () => {
    it('extracts position and size from a:xfrm', () => {
      const xml = parseXML(`
        <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
               xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:spPr>
            <a:xfrm rot="5400000">
              <a:off x="914400" y="457200"/>
              <a:ext cx="1828800" cy="914400"/>
            </a:xfrm>
          </p:spPr>
        </p:sp>
      `)
      const sp = xml.getElementsByTagName('p:sp')[0]
      const transform = extractTransform(sp)

      expect(transform).toBeDefined()
      expect(transform!.x).toBe(914400)
      expect(transform!.y).toBe(457200)
      expect(transform!.cx).toBe(1828800)
      expect(transform!.cy).toBe(914400)
      expect(transform!.rotation).toBe(5400000)
    })

    it('returns undefined when a:xfrm is missing', () => {
      const xml = parseXML(`
        <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:spPr/>
        </p:sp>
      `)
      const sp = xml.getElementsByTagName('p:sp')[0]
      expect(extractTransform(sp)).toBeUndefined()
    })
  })

  describe('parseSolidFill', () => {
    it('resolves srgb color', () => {
      const xml = parseXML(`
        <a:solidFill xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:srgbClr val="FF5733"/>
        </a:solidFill>
      `)
      const fillNode = xml.documentElement
      expect(parseSolidFill(fillNode)).toBe('#FF5733')
    })

    it('resolves scheme color via theme', () => {
      const theme: OoxmlTheme = {
        colors: new Map([['accent1', '#4472C4']]),
        majorFont: 'Calibri Light',
        minorFont: 'Calibri'
      }
      const xml = parseXML(`
        <a:solidFill xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:schemeClr val="accent1"/>
        </a:solidFill>
      `)
      const fillNode = xml.documentElement
      expect(parseSolidFill(fillNode, theme)).toBe('#4472C4')
    })

    it('resolves prstClr to hex', () => {
      const xml = parseXML(`
        <a:solidFill xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:prstClr val="navy"/>
        </a:solidFill>
      `)
      expect(parseSolidFill(xml.documentElement)).toBe('#000080')
    })

    it('resolves prstClr accent1 from theme', () => {
      const theme: OoxmlTheme = {
        colors: new Map([['accent1', '#112233']]),
        majorFont: 'x',
        minorFont: 'y'
      }
      const xml = parseXML(`
        <a:solidFill xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:prstClr val="accent1"/>
        </a:solidFill>
      `)
      expect(parseSolidFill(xml.documentElement, theme)).toBe('#112233')
    })

    it('applies lumMod/lumOff to a scheme color (PowerPoint "darker/lighter" shades)', () => {
      // Office emits lumMod=75000 lumOff=0 for a "25% darker" accent tone.
      // For the accent FF0000 this should drop luminance to 37.5% lightness.
      const theme: OoxmlTheme = {
        colors: new Map([['accent1', '#FF0000']]),
        majorFont: 'x',
        minorFont: 'y'
      }
      const xml = parseXML(`
        <a:solidFill xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:schemeClr val="accent1">
            <a:lumMod val="75000"/>
            <a:lumOff val="0"/>
          </a:schemeClr>
        </a:solidFill>
      `)
      const result = parseSolidFill(xml.documentElement, theme)
      expect(result).toBeDefined()
      expect(result).toMatch(/^#[0-9A-F]{6}$/)
      // Must be darker than the base red (lower R value).
      expect(parseInt(result!.slice(1, 3), 16)).toBeLessThan(0xff)
    })

    it('applies alpha transform and returns rgba()', () => {
      const xml = parseXML(`
        <a:solidFill xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:srgbClr val="FF0000">
            <a:alpha val="50000"/>
          </a:srgbClr>
        </a:solidFill>
      `)
      const result = parseSolidFill(xml.documentElement)
      expect(result).toMatch(/^rgba\(/)
      // ~50% alpha.
      expect(result).toContain('0.5')
    })

    it('applies tint for a lighter shade', () => {
      const xml = parseXML(`
        <a:solidFill xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:srgbClr val="000000">
            <a:tint val="50000"/>
          </a:srgbClr>
        </a:solidFill>
      `)
      const result = parseSolidFill(xml.documentElement)
      // Tinting pure black toward white by 50% produces a mid-grey.
      expect(result).toBeDefined()
      const r = parseInt(result!.slice(1, 3), 16)
      expect(r).toBeGreaterThan(0x60)
      expect(r).toBeLessThan(0xa0)
    })
  })

  describe('parseGradientFill', () => {
    it('parses linear gradient with stops', () => {
      const xml = parseXML(`
        <a:gradFill xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:gsLst>
            <a:gs pos="0">
              <a:srgbClr val="FF0000"/>
            </a:gs>
            <a:gs pos="100000">
              <a:srgbClr val="0000FF"/>
            </a:gs>
          </a:gsLst>
          <a:lin ang="5400000"/>
        </a:gradFill>
      `)
      const result = parseGradientFill(xml.documentElement)

      expect(result).toBeDefined()
      expect(result!.type).toBe('linear')
      expect(result!.angle).toBe(180)
      expect(result!.stops).toHaveLength(2)
      expect(result!.stops[0].color).toBe('#FF0000')
      expect(result!.stops[0].position).toBe(0)
      expect(result!.stops[1].color).toBe('#0000FF')
      expect(result!.stops[1].position).toBe(100)
    })

    it('normalizes OOXML 0deg to the app left-to-right angle', () => {
      const xml = parseXML(`
        <a:gradFill xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:gsLst>
            <a:gs pos="0">
              <a:srgbClr val="EA5929"/>
            </a:gs>
            <a:gs pos="100000">
              <a:srgbClr val="54275F"/>
            </a:gs>
          </a:gsLst>
          <a:lin ang="0"/>
        </a:gradFill>
      `)
      const result = parseGradientFill(xml.documentElement)

      expect(result).toBeDefined()
      expect(result!.type).toBe('linear')
      expect(result!.angle).toBe(90)
    })
  })
})
