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
  enhanceImportedHtmlWithImageLayouts: jest.fn((html: string) => html)
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
})
