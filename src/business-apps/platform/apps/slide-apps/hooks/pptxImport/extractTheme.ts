// Extract OOXML theme colors and fonts from ppt/theme/theme1.xml.

import type JSZip from 'jszip'
import type { OoxmlTheme } from './types'
import { parseXML, getChild } from './ooxmlUtils'

const SCHEME_COLOR_NAMES = [
  'dk1',
  'lt1',
  'dk2',
  'lt2',
  'accent1',
  'accent2',
  'accent3',
  'accent4',
  'accent5',
  'accent6',
  'hlink',
  'folHlink'
] as const

function extractColorValue(el: Element): string | undefined {
  const srgb = getChild(el, 'a:srgbClr')
  if (srgb) return `#${srgb.getAttribute('val') || '000000'}`

  const sysClr = getChild(el, 'a:sysClr')
  if (sysClr) return `#${sysClr.getAttribute('lastClr') || sysClr.getAttribute('val') || '000000'}`

  return undefined
}

export async function extractTheme(zip: JSZip): Promise<OoxmlTheme> {
  const defaultTheme: OoxmlTheme = {
    colors: new Map([
      ['dk1', '#000000'],
      ['lt1', '#FFFFFF'],
      ['dk2', '#44546A'],
      ['lt2', '#E7E6E6'],
      ['accent1', '#4472C4'],
      ['accent2', '#ED7D31'],
      ['accent3', '#A5A5A5'],
      ['accent4', '#FFC000'],
      ['accent5', '#5B9BD5'],
      ['accent6', '#70AD47'],
      ['hlink', '#0563C1'],
      ['folHlink', '#954F72']
    ]),
    majorFont: 'Calibri Light',
    minorFont: 'Calibri'
  }

  const themeFile = zip.file('ppt/theme/theme1.xml')
  if (!themeFile) return defaultTheme

  const themeContent = await themeFile.async('text')
  const themeXml = parseXML(themeContent)

  const colors = new Map<string, string>()
  const clrScheme = themeXml.getElementsByTagName('a:clrScheme')[0]
  if (clrScheme) {
    for (const name of SCHEME_COLOR_NAMES) {
      const el = getChild(clrScheme, `a:${name}`)
      if (el) {
        const color = extractColorValue(el)
        if (color) colors.set(name, color)
      }
    }
  }

  if (colors.size === 0) return defaultTheme

  let majorFont = defaultTheme.majorFont
  let minorFont = defaultTheme.minorFont

  const majorFontScheme = themeXml.getElementsByTagName('a:majorFont')[0]
  if (majorFontScheme) {
    const latin = getChild(majorFontScheme, 'a:latin')
    if (latin) majorFont = latin.getAttribute('typeface') || majorFont
  }

  const minorFontScheme = themeXml.getElementsByTagName('a:minorFont')[0]
  if (minorFontScheme) {
    const latin = getChild(minorFontScheme, 'a:latin')
    if (latin) minorFont = latin.getAttribute('typeface') || minorFont
  }

  return { colors, majorFont, minorFont }
}

export function mapThemeToSlideThemeId(theme: OoxmlTheme): string {
  const lt1 = theme.colors.get('lt1') || '#FFFFFF'
  const r = parseInt(lt1.slice(1, 3), 16)
  const g = parseInt(lt1.slice(3, 5), 16)
  const b = parseInt(lt1.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.5 ? 'corporate' : 'dark'
}
