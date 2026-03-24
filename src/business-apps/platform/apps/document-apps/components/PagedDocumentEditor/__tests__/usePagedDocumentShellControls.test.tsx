import { act, renderHook } from '@testing-library/react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { sanitizePaginationRuntimeHtml } from '../../../utils/documentContentUtils'
import {
  embedImagesInHtml,
  exportToPDFWithStyle,
  exportToWord,
  printHtmlDocumentWithStyle
} from '../../../utils/exportUtils'
import { usePagedDocumentShellControls } from '../hooks/usePagedDocumentShellControls'

jest.mock('../../../utils/documentContentUtils', () => ({
  sanitizePaginationRuntimeHtml: jest.fn((html: string) => `sanitized:${html}`)
}))

jest.mock('../../../utils/exportUtils', () => ({
  embedImagesInHtml: jest.fn(async (html: string) => `embedded:${html}`),
  exportToPDFWithStyle: jest.fn(async () => undefined),
  exportToWord: jest.fn(async () => undefined),
  printHtmlDocumentWithStyle: jest.fn()
}))

jest.mock('dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: jest.fn((html: string) => `safe:${html}`)
  }
}))

function createHookParams(overrides?: Partial<Parameters<typeof usePagedDocumentShellControls>[0]>) {
  return {
    title: 'Document title',
    setTitle: jest.fn(),
    editor: {
      getHTML: jest.fn(() => '<p>hello</p>')
    } as unknown as TiptapEditor,
    documentId: 'doc-1',
    isReadOnly: false,
    isYjsSynced: true,
    metaYMap: {
      set: jest.fn()
    },
    lastSavedTitleRef: {
      current: 'Document title'
    },
    setLastSaved: jest.fn(),
    setHasUnsavedChanges: jest.fn(),
    onSave: jest.fn(async () => undefined),
    buildPersistedFormatting: jest.fn((formatting: unknown) => formatting),
    layoutFormatting: {
      pages: {}
    },
    printStyleConfig: {
      pageWidthMm: 210,
      pageHeightMm: 297
    } as never,
    getImageDataUrl: jest.fn(async () => 'data:image/png;base64,abc'),
    ...overrides
  }
}

describe('usePagedDocumentShellControls', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('saves the current document and opens the checkpoint dialog for persisted documents', async () => {
    const params = createHookParams({
      title: '  Saved title  '
    })

    const { result } = renderHook(() => usePagedDocumentShellControls(params))

    await act(async () => {
      await result.current.handleSave()
    })

    expect(params.metaYMap.set).toHaveBeenCalledWith('title', 'Saved title')
    expect(sanitizePaginationRuntimeHtml).toHaveBeenCalledWith('<p>hello</p>')
    expect(params.onSave).toHaveBeenCalledWith(
      'Saved title',
      'sanitized:<p>hello</p>',
      expect.objectContaining({
        pages: {}
      })
    )
    expect(params.setHasUnsavedChanges).toHaveBeenCalledWith(false)
    expect(params.setLastSaved).toHaveBeenCalledWith(expect.any(Date))
    expect(result.current.showCheckpointDialog).toBe(true)
  })

  it('marks title edits as unsaved', () => {
    const params = createHookParams()
    const { result } = renderHook(() => usePagedDocumentShellControls(params))

    act(() => {
      result.current.handleTitleChange({
        target: { value: 'Updated title' }
      } as React.ChangeEvent<HTMLInputElement>)
    })

    expect(params.setTitle).toHaveBeenCalledWith('Updated title')
    expect(params.setHasUnsavedChanges).toHaveBeenCalledWith(true)
  })

  it('exports pdf content using embedded and sanitized html', async () => {
    const params = createHookParams({
      printStyleConfig: {
        pageWidthMm: 210,
        pageHeightMm: 297,
        marginTopMm: 20,
        marginRightMm: 20,
        marginBottomMm: 20,
        marginLeftMm: 20
      } as never
    })
    const { result } = renderHook(() => usePagedDocumentShellControls(params))

    await act(async () => {
      await result.current.handleExportPDF()
    })

    expect(embedImagesInHtml).toHaveBeenCalledWith('<p>hello</p>', params.getImageDataUrl)
    expect(exportToPDFWithStyle).toHaveBeenCalledWith(
      'Document title',
      'safe:embedded:<p>hello</p>',
      params.printStyleConfig
    )
    expect(result.current.isExporting).toBe(false)
  })

  it('exports word content and prints the sanitized html', async () => {
    const params = createHookParams()
    const { result } = renderHook(() => usePagedDocumentShellControls(params))

    await act(async () => {
      await result.current.handleExportWord()
      await result.current.handlePrint()
    })

    expect(exportToWord).toHaveBeenCalledWith('Document title', 'safe:embedded:<p>hello</p>')
    expect(printHtmlDocumentWithStyle).toHaveBeenCalledWith(
      {
        title: 'Document title',
        htmlContent: 'safe:embedded:<p>hello</p>'
      },
      params.printStyleConfig
    )
  })
})
