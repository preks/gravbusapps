import { parseDocxPageFormatting } from '../utils/docxImportUtils'
import { act, renderHook } from '@testing-library/react'
import mammoth from 'mammoth'
import { useWordParser } from './useWordParser'

jest.mock('@newwork/nw-design-system', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

jest.mock('../utils/docxImportUtils', () => ({
  parseDocxImageLayouts: jest.fn(async () => []),
  enhanceImportedHtmlWithImageLayouts: jest.fn((html: string) => html),
  parseDocxPageFormatting: jest.fn(async () => undefined),
  parseDocxPageBreaks: jest.fn(async () => []),
  enhanceImportedHtmlWithPageBreaks: jest.fn((html: string) => html),
  parseDocxTableLayouts: jest.fn(async () => []),
  enhanceImportedHtmlWithTableLayouts: jest.fn((html: string) => html),
  // Default: pass the buffer through unchanged so the legacy flow-index-based
  // enhancer path stays active for tests that assert on it. Tests that want
  // to exercise the preprocessing branch override this mock.
  preprocessDocxBufferForPageBreaks: jest.fn(async (buffer: ArrayBuffer) => buffer),
  RM_PAGE_BREAK_STYLE_ID: 'RmPageBreak'
}))

jest.mock('../utils/docxTocImportUtils', () => ({
  parseDocxTableOfContents: jest.fn(async () => null),
  enhanceImportedHtmlWithTableOfContents: jest.fn((html: string) => html)
}))

jest.mock('mammoth', () => ({
  __esModule: true,
  default: {
    convertToHtml: jest.fn(),
    extractRawText: jest.fn(),
    images: {
      imgElement: jest.fn((converter: unknown) => converter)
    }
  }
}))

describe('useWordParser', () => {
  it('preserves empty paragraphs during mammoth conversion', async () => {
    jest.mocked(mammoth.convertToHtml).mockResolvedValue({
      value: '<p>First</p><p></p><p>Second</p>',
      messages: []
    } as Awaited<ReturnType<typeof mammoth.convertToHtml>>)
    jest.mocked(mammoth.extractRawText).mockResolvedValue({
      value: 'First\n\nSecond',
      messages: []
    } as Awaited<ReturnType<typeof mammoth.extractRawText>>)

    const file = {
      name: 'blank-lines.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 128,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
    } as unknown as File

    const { result } = renderHook(() => useWordParser())

    await act(async () => {
      await result.current.parseFile(file)
    })

    expect(mammoth.convertToHtml).toHaveBeenCalledWith(
      { arrayBuffer: expect.any(ArrayBuffer) },
      expect.objectContaining({
        ignoreEmptyParagraphs: false
      })
    )
    expect(result.current.parsedDocument?.html).toContain('<p></p>')
  })

  it('attaches imported docx formatting to the parsed document', async () => {
    jest.mocked(mammoth.convertToHtml).mockResolvedValue({
      value: '<p>Body</p>',
      messages: []
    } as Awaited<ReturnType<typeof mammoth.convertToHtml>>)
    jest.mocked(mammoth.extractRawText).mockResolvedValue({
      value: 'Body',
      messages: []
    } as Awaited<ReturnType<typeof mammoth.extractRawText>>)
    jest.mocked(parseDocxPageFormatting).mockResolvedValue({
      pageSize: 'A4',
      orientation: 'portrait',
      marginUnit: 'cm',
      margins: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
      fontFamily: 'Aptos',
      fontSize: 16,
      lineHeight: 1.15
    })

    const file = {
      name: 'formatted.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 256,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
    } as unknown as File

    const { result } = renderHook(() => useWordParser())

    await act(async () => {
      await result.current.parseFile(file)
    })

    expect(result.current.parsedDocument?.formatting).toEqual({
      pageSize: 'A4',
      orientation: 'portrait',
      marginUnit: 'cm',
      margins: { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 },
      fontFamily: 'Aptos',
      fontSize: 16,
      lineHeight: 1.15
    })
  })

  it('preserves imported manual page breaks in the parsed html', async () => {
    const { enhanceImportedHtmlWithPageBreaks, parseDocxPageBreaks, enhanceImportedHtmlWithTableLayouts } =
      jest.requireMock('../utils/docxImportUtils') as {
        enhanceImportedHtmlWithPageBreaks: jest.Mock
        parseDocxPageBreaks: jest.Mock
        enhanceImportedHtmlWithTableLayouts: jest.Mock
      }

    jest.mocked(mammoth.convertToHtml).mockResolvedValue({
      value: '<p>First</p><p></p><p>Second</p>',
      messages: []
    } as Awaited<ReturnType<typeof mammoth.convertToHtml>>)
    jest.mocked(mammoth.extractRawText).mockResolvedValue({
      value: 'First\n\nSecond',
      messages: []
    } as Awaited<ReturnType<typeof mammoth.extractRawText>>)
    parseDocxPageBreaks.mockResolvedValue([1])
    enhanceImportedHtmlWithPageBreaks.mockImplementation(
      () => '<p>First</p><div data-page-break="" class="page-break"></div><p>Second</p>'
    )

    const file = {
      name: 'page-break.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 512,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
    } as unknown as File

    const { result } = renderHook(() => useWordParser())

    await act(async () => {
      await result.current.parseFile(file)
    })

    expect(enhanceImportedHtmlWithTableLayouts).toHaveBeenCalledWith('<p>First</p><p></p><p>Second</p>', [])
    expect(enhanceImportedHtmlWithPageBreaks).toHaveBeenCalledWith('<p>First</p><p></p><p>Second</p>', [1])
    expect(result.current.parsedDocument?.html).toContain('data-page-break=""')
  })

  it('returns the Mammoth plus OOXML-upgraded image html in the parsed document', async () => {
    const {
      enhanceImportedHtmlWithImageLayouts,
      parseDocxImageLayouts,
      enhanceImportedHtmlWithPageBreaks,
      parseDocxPageBreaks,
      enhanceImportedHtmlWithTableLayouts
    } = jest.requireMock('../utils/docxImportUtils') as {
      enhanceImportedHtmlWithImageLayouts: jest.Mock
      parseDocxImageLayouts: jest.Mock
      enhanceImportedHtmlWithPageBreaks: jest.Mock
      parseDocxPageBreaks: jest.Mock
      enhanceImportedHtmlWithTableLayouts: jest.Mock
    }

    jest.mocked(mammoth.convertToHtml).mockResolvedValue({
      value: '<p><img src="data:image/png;base64,abc123" alt=""></p>',
      messages: []
    } as Awaited<ReturnType<typeof mammoth.convertToHtml>>)
    jest.mocked(mammoth.extractRawText).mockResolvedValue({
      value: 'Image',
      messages: []
    } as Awaited<ReturnType<typeof mammoth.extractRawText>>)
    parseDocxImageLayouts.mockResolvedValue([
      { wrapMode: 'square', wrapTextSide: 'right', align: 'right', widthPx: 240, heightPx: 120, rotation: 30 }
    ])
    parseDocxPageBreaks.mockResolvedValue([])
    enhanceImportedHtmlWithTableLayouts.mockImplementation((html: string) => html)
    enhanceImportedHtmlWithPageBreaks.mockImplementation((html: string) => html)
    enhanceImportedHtmlWithImageLayouts.mockImplementation(
      () =>
        '<figure data-node-type="custom-image" data-image-wrap="square" data-image-rotation="30"><img src="data:image/png;base64,abc123"></figure>'
    )

    const file = {
      name: 'image-layout.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 256,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
    } as unknown as File

    const { result } = renderHook(() => useWordParser())

    await act(async () => {
      await result.current.parseFile(file)
    })

    expect(enhanceImportedHtmlWithImageLayouts).toHaveBeenCalledWith(
      '<p><img src="data:image/png;base64,abc123" alt=""></p>',
      [{ wrapMode: 'square', wrapTextSide: 'right', align: 'right', widthPx: 240, heightPx: 120, rotation: 30 }]
    )
    expect(result.current.parsedDocument?.html).toContain('data-node-type="custom-image"')
    expect(result.current.parsedDocument?.html).toContain('data-image-rotation="30"')
  })

  it('skips the legacy page-break enhancer when the OOXML preprocessor rewrote the buffer', async () => {
    const {
      enhanceImportedHtmlWithPageBreaks,
      enhanceImportedHtmlWithImageLayouts,
      enhanceImportedHtmlWithTableLayouts,
      preprocessDocxBufferForPageBreaks
    } = jest.requireMock('../utils/docxImportUtils') as {
      enhanceImportedHtmlWithPageBreaks: jest.Mock
      enhanceImportedHtmlWithImageLayouts: jest.Mock
      enhanceImportedHtmlWithTableLayouts: jest.Mock
      preprocessDocxBufferForPageBreaks: jest.Mock
    }

    // Reset mocks that earlier tests may have reshaped so we see an unmodified
    // html pass-through here.
    enhanceImportedHtmlWithImageLayouts.mockImplementation((html: string) => html)
    enhanceImportedHtmlWithTableLayouts.mockImplementation((html: string) => html)

    // Simulate a successful OOXML rewrite by returning a different buffer instance.
    preprocessDocxBufferForPageBreaks.mockImplementation(async () => new ArrayBuffer(16))

    jest.mocked(mammoth.convertToHtml).mockResolvedValue({
      value: '<p>First</p><hr class="page-break"><p>Second</p>',
      messages: []
    } as Awaited<ReturnType<typeof mammoth.convertToHtml>>)
    jest.mocked(mammoth.extractRawText).mockResolvedValue({
      value: 'First\n\nSecond',
      messages: []
    } as Awaited<ReturnType<typeof mammoth.extractRawText>>)

    enhanceImportedHtmlWithPageBreaks.mockClear()

    const file = {
      name: 'preprocessed.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 512,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
    } as unknown as File

    const { result } = renderHook(() => useWordParser())

    await act(async () => {
      await result.current.parseFile(file)
    })

    expect(enhanceImportedHtmlWithPageBreaks).not.toHaveBeenCalled()
    expect(result.current.parsedDocument?.html).toContain('hr class="page-break"')
  })

  it('falls back to the legacy page-break enhancer when rewritten DOCX html still has no page-break markup', async () => {
    const {
      enhanceImportedHtmlWithPageBreaks,
      enhanceImportedHtmlWithImageLayouts,
      enhanceImportedHtmlWithTableLayouts,
      parseDocxPageBreaks,
      preprocessDocxBufferForPageBreaks
    } = jest.requireMock('../utils/docxImportUtils') as {
      enhanceImportedHtmlWithPageBreaks: jest.Mock
      enhanceImportedHtmlWithImageLayouts: jest.Mock
      enhanceImportedHtmlWithTableLayouts: jest.Mock
      parseDocxPageBreaks: jest.Mock
      preprocessDocxBufferForPageBreaks: jest.Mock
    }

    enhanceImportedHtmlWithImageLayouts.mockImplementation((html: string) => html)
    enhanceImportedHtmlWithTableLayouts.mockImplementation((html: string) => html)
    preprocessDocxBufferForPageBreaks.mockImplementation(async () => new ArrayBuffer(16))
    parseDocxPageBreaks.mockResolvedValue([1])
    enhanceImportedHtmlWithPageBreaks.mockImplementation(
      () => '<p>First</p><div data-page-break="" class="page-break"></div><p>Second</p>'
    )

    jest.mocked(mammoth.convertToHtml).mockResolvedValue({
      value: '<p>First</p><p>Second</p>',
      messages: []
    } as Awaited<ReturnType<typeof mammoth.convertToHtml>>)
    jest.mocked(mammoth.extractRawText).mockResolvedValue({
      value: 'First\nSecond',
      messages: []
    } as Awaited<ReturnType<typeof mammoth.extractRawText>>)

    const file = {
      name: 'rewritten-without-markers.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 512,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
    } as unknown as File

    const { result } = renderHook(() => useWordParser())

    await act(async () => {
      await result.current.parseFile(file)
    })

    expect(enhanceImportedHtmlWithPageBreaks).toHaveBeenCalledWith('<p>First</p><p>Second</p>', [1])
    expect(result.current.parsedDocument?.html).toContain('data-page-break=""')
  })
})
