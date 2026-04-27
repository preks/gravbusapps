import { extractTheme, mapThemeToSlideThemeId } from '../extractTheme'
import type { OoxmlTheme } from '../types'

function createMockZip(files: Record<string, string>) {
  return {
    file(path: string) {
      const content = files[path]
      if (!content) return null
      return {
        async async() {
          return content
        }
      }
    }
  } as any
}

describe('extractTheme', () => {
  it('returns default theme when theme file is missing', async () => {
    const zip = createMockZip({})
    const theme = await extractTheme(zip)

    expect(theme.colors.get('dk1')).toBe('#000000')
    expect(theme.colors.get('lt1')).toBe('#FFFFFF')
    expect(theme.majorFont).toBe('Calibri Light')
    expect(theme.minorFont).toBe('Calibri')
  })

  it('extracts scheme colors and fonts from theme XML', async () => {
    const themeXml = `
      <a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:themeElements>
          <a:clrScheme name="Test">
            <a:dk1><a:srgbClr val="1A1A1A"/></a:dk1>
            <a:lt1><a:srgbClr val="F5F5F5"/></a:lt1>
            <a:dk2><a:srgbClr val="333333"/></a:dk2>
            <a:lt2><a:srgbClr val="E0E0E0"/></a:lt2>
            <a:accent1><a:srgbClr val="FF5733"/></a:accent1>
            <a:accent2><a:srgbClr val="33FF57"/></a:accent2>
            <a:accent3><a:srgbClr val="3357FF"/></a:accent3>
            <a:accent4><a:srgbClr val="FFFF33"/></a:accent4>
            <a:accent5><a:srgbClr val="FF33FF"/></a:accent5>
            <a:accent6><a:srgbClr val="33FFFF"/></a:accent6>
            <a:hlink><a:srgbClr val="0066CC"/></a:hlink>
            <a:folHlink><a:srgbClr val="996633"/></a:folHlink>
          </a:clrScheme>
          <a:fontScheme name="Test">
            <a:majorFont><a:latin typeface="Arial"/></a:majorFont>
            <a:minorFont><a:latin typeface="Verdana"/></a:minorFont>
          </a:fontScheme>
        </a:themeElements>
      </a:theme>
    `

    const zip = createMockZip({ 'ppt/theme/theme1.xml': themeXml })
    const theme = await extractTheme(zip)

    expect(theme.colors.get('dk1')).toBe('#1A1A1A')
    expect(theme.colors.get('accent1')).toBe('#FF5733')
    expect(theme.majorFont).toBe('Arial')
    expect(theme.minorFont).toBe('Verdana')
  })

  it('captures fmtScheme fillStyleLst/lnStyleLst entries for fillRef expansion', async () => {
    const themeXml = `
      <a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:themeElements>
          <a:clrScheme name="Test">
            <a:dk1><a:srgbClr val="000000"/></a:dk1>
            <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
            <a:accent1><a:srgbClr val="4472C4"/></a:accent1>
          </a:clrScheme>
          <a:fontScheme name="Test">
            <a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont>
            <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>
          </a:fontScheme>
          <a:fmtScheme name="Test">
            <a:fillStyleLst>
              <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
              <a:gradFill><a:gsLst>
                <a:gs pos="0"><a:schemeClr val="phClr"><a:lumMod val="110000"/></a:schemeClr></a:gs>
                <a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="78000"/></a:schemeClr></a:gs>
              </a:gsLst></a:gradFill>
              <a:solidFill><a:schemeClr val="phClr"><a:shade val="51000"/></a:schemeClr></a:solidFill>
            </a:fillStyleLst>
            <a:lnStyleLst>
              <a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
              <a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
              <a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
            </a:lnStyleLst>
            <a:effectStyleLst></a:effectStyleLst>
            <a:bgFillStyleLst>
              <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
            </a:bgFillStyleLst>
          </a:fmtScheme>
        </a:themeElements>
      </a:theme>
    `
    const zip = createMockZip({ 'ppt/theme/theme1.xml': themeXml })
    const theme = await extractTheme(zip)

    expect(theme.fmtFillStyles).toBeDefined()
    expect(theme.fmtFillStyles).toHaveLength(3)
    expect(theme.fmtLineStyles).toBeDefined()
    expect(theme.fmtLineStyles).toHaveLength(3)
    expect(theme.fmtBgFillStyles).toBeDefined()
    expect(theme.fmtBgFillStyles).toHaveLength(1)

    expect(theme.fmtFillStyles![0].tagName).toBe('a:solidFill')
    expect(theme.fmtFillStyles![1].tagName).toBe('a:gradFill')
    expect(theme.fmtFillStyles![2].tagName).toBe('a:solidFill')
  })

  it('extracts system colors (sysClr)', async () => {
    const themeXml = `
      <a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:themeElements>
          <a:clrScheme name="Office">
            <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
            <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
          </a:clrScheme>
          <a:fontScheme name="Office">
            <a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont>
            <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>
          </a:fontScheme>
        </a:themeElements>
      </a:theme>
    `

    const zip = createMockZip({ 'ppt/theme/theme1.xml': themeXml })
    const theme = await extractTheme(zip)

    expect(theme.colors.get('dk1')).toBe('#000000')
    expect(theme.colors.get('lt1')).toBe('#FFFFFF')
  })
})

describe('mapThemeToSlideThemeId', () => {
  it('returns corporate for light backgrounds', () => {
    const theme: OoxmlTheme = {
      colors: new Map([['lt1', '#FFFFFF']]),
      majorFont: 'Calibri',
      minorFont: 'Calibri'
    }
    expect(mapThemeToSlideThemeId(theme)).toBe('corporate')
  })

  it('returns dark for dark backgrounds', () => {
    const theme: OoxmlTheme = {
      colors: new Map([['lt1', '#1A1A2E']]),
      majorFont: 'Calibri',
      minorFont: 'Calibri'
    }
    expect(mapThemeToSlideThemeId(theme)).toBe('dark')
  })
})
