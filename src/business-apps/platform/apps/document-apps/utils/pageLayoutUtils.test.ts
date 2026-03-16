import { getPaginationConfigFromFormatting, getPagesConfigFromFormatting } from './pageLayoutUtils'

describe('pageLayoutUtils', () => {
  it('builds a local pageFormat from document formatting', () => {
    const result = getPaginationConfigFromFormatting({
      pageSize: 'LETTER',
      orientation: 'landscape',
      margins: {
        top: 2.54,
        right: 1,
        bottom: 2.54,
        left: 1
      },
      pageless: false
    })

    expect(result).not.toBeNull()
    expect(result?.pageFormat.name).toBe('Letter')
    expect(result?.pageFormat.width).toBe(result?.pageWidth)
    expect(result?.pageFormat.height).toBe(result?.pageHeight)
    expect(result?.pageFormat.margins.top).toBe(result?.marginTop)
    expect(result?.pageFormat.margins.left).toBe(result?.marginLeft)
  })

  it('extracts persisted header and footer options for the local pages extension', () => {
    const result = getPagesConfigFromFormatting({
      pages: {
        differentFirstPage: true,
        differentOddEven: true,
        header: '<p>Default Header</p>',
        footer: 'Page {page} of {total}',
        headerFirstPage: '<p>Cover Header</p>',
        footerEven: '<p>Even Footer</p>',
        headerTopMargin: 24,
        footerBottomMargin: 16
      }
    })

    expect(result).toEqual(
      expect.objectContaining({
        differentFirstPage: true,
        differentOddEven: true,
        header: '<p>Default Header</p>',
        footer: 'Page {page} of {total}',
        headerFirstPage: '<p>Cover Header</p>',
        footerEven: '<p>Even Footer</p>',
        headerTopMargin: 24,
        footerBottomMargin: 16
      })
    )
  })
})
