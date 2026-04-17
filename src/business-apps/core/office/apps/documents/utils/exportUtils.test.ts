import { sanitizeHtmlForExport } from './exportUtils'

describe('sanitizeHtmlForExport', () => {
  it('preserves safe visual styles when explicitly requested', () => {
    const html =
      '<table style="width: 80%; margin-left: auto; border-style: dashed; border-width: 2pt; border-color: #2563eb; border-radius: 6pt;"><tr><td style="border-top-style: dotted; border-top-width: 3pt; border-top-color: #0f766e; vertical-align: middle;">Cell</td></tr></table>'

    const result = sanitizeHtmlForExport(html, { preserveVisualStyles: true })

    expect(result).toContain('width: 80%')
    expect(result).toContain('margin-left: auto')
    expect(result).toContain('border-style: dashed')
    expect(result).toContain('border-radius: 6pt')
    expect(result).toContain('border-top-style: dotted')
    expect(result).toContain('vertical-align: middle')
  })

  it('still strips non-allowed style properties', () => {
    const html = '<p style="position: fixed; left: 0; top: 0; border-style: solid; border-color: #111111;">Test</p>'

    const result = sanitizeHtmlForExport(html, { preserveVisualStyles: true })

    expect(result).toContain('border-style: solid')
    expect(result).toContain('border-color: #111111')
    expect(result).not.toContain('position: fixed')
    expect(result).not.toContain('left: 0')
    expect(result).not.toContain('top: 0')
  })
})
