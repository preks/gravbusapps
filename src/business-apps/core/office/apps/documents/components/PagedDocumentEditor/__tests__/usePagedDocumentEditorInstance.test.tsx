import { renderHook } from '@testing-library/react'
import type { MutableRefObject } from 'react'
import { Awareness } from 'y-protocols/awareness'
import * as Y from 'yjs'
import {
  createDocumentImageExtension,
  usePagedDocumentEditorInstance,
  type UsePagedDocumentEditorInstanceParams
} from '../hooks/usePagedDocumentEditorInstance'

const mockUseEditor = jest.fn(() => null)
const mockPagesConfigure = jest.fn(() => ({ name: 'pages-extension' }))
type DocumentImageConfigureOptions = {
  allowBase64?: boolean
  getAccessToken?: () => string
  HTMLAttributes?: {
    class?: string
  }
}

const mockDocumentImageConfigure = jest.fn((options: DocumentImageConfigureOptions) => ({
  name: 'document-image',
  options
}))
const mockTableConfigure = jest.fn(() => ({ name: 'table' }))
const mockPlaceholderConfigure = jest.fn(() => ({ name: 'placeholder' }))
const mockLineAndParagraphSpacingConfigure = jest.fn(() => ({ name: 'line-and-paragraph-spacing' }))
const mockInlineCommentConfigure = jest.fn(() => ({ name: 'inline-comment' }))

jest.mock('@tiptap/react', () => ({
  useEditor: (...args: Parameters<typeof mockUseEditor>) => mockUseEditor(...args)
}))

jest.mock('@tiptap/extension-placeholder', () => ({
  Placeholder: {
    configure: (...args: Parameters<typeof mockPlaceholderConfigure>) => mockPlaceholderConfigure(...args)
  }
}))

jest.mock('@/components/tiptap-extensions/tiptap-custom-pagination', () => ({
  Pages: {
    configure: (...args: Parameters<typeof mockPagesConfigure>) => mockPagesConfigure(...args)
  }
}))

jest.mock('@/components/tiptap-extensions/tiptap-custom-tables', () => ({
  Table: {
    configure: (...args: Parameters<typeof mockTableConfigure>) => mockTableConfigure(...args)
  },
  TableCell: { name: 'table-cell' },
  TableHeader: { name: 'table-header' },
  TableRow: { name: 'table-row' }
}))

jest.mock('../extensions', () => ({
  ColumnBreak: { name: 'column-break' },
  DocumentImage: {
    configure: (...args: Parameters<typeof mockDocumentImageConfigure>) => mockDocumentImageConfigure(...args)
  },
  DocumentSection: { name: 'document-section' },
  DocumentTableOfContents: { name: 'document-table-of-contents' },
  PageBreak: { name: 'page-break' },
  SearchHighlight: { name: 'search-highlight' },
  SectionedDocument: { name: 'sectioned-document' },
  Signature: { name: 'signature' }
}))

jest.mock('../extensions/YjsCursor', () => ({
  createYjsCursorExtension: () => ({ name: 'yjs-cursor' })
}))

jest.mock('../extensions/LineAndParagraphSpacing', () => ({
  LineAndParagraphSpacing: {
    configure: (...args: Parameters<typeof mockLineAndParagraphSpacingConfigure>) =>
      mockLineAndParagraphSpacingConfigure(...args)
  }
}))

jest.mock('../extensions/ParagraphIndent', () => ({
  ParagraphIndent: { name: 'paragraph-indent' }
}))

jest.mock('@/components/tiptap-extensions/documentUniqueId', () => ({
  DocumentUniqueID: { name: 'document-unique-id' }
}))

jest.mock('@/components/tiptap-extensions/legacyTableIdMigration', () => ({
  legacyTableIdMigrationExtension: { name: 'legacy-table-id-migration' }
}))

jest.mock('@/business-apps/platform/apps/shared/extensions/InlineCommentExtension', () => ({
  InlineComment: {
    configure: (...args: Parameters<typeof mockInlineCommentConfigure>) => mockInlineCommentConfigure(...args)
  }
}))

function createMutableRef<T>(current: T): MutableRefObject<T> {
  return { current }
}

function createParams(overrides?: Partial<UsePagedDocumentEditorInstanceParams>): UsePagedDocumentEditorInstanceParams {
  const ydoc = new Y.Doc()

  return {
    accessToken: '',
    documentTitle: 'Doc title',
    initialTitle: 'Initial title',
    editorContent: '<p>Hello</p>',
    editorEditable: true,
    ydoc,
    awareness: new Awareness(ydoc),
    paginationConfig: {
      pageFormat: {
        name: 'A4',
        width: 794,
        height: 1123,
        margins: {
          top: 96,
          right: 96,
          bottom: 96,
          left: 96
        }
      },
      pageWidth: 794,
      pageHeight: 1123,
      marginTop: 96,
      marginRight: 96,
      marginBottom: 96,
      marginLeft: 96
    },
    paginationDebugDisabled: false,
    pagesFormattingConfig: {},
    editorChromeRef: createMutableRef<HTMLDivElement | null>(null),
    editorRef: createMutableRef(null),
    onEditorUpdateRef: createMutableRef(() => {}),
    onActiveEditorChange: jest.fn(),
    onCommentClick: jest.fn(),
    translate: key => key,
    autocompleteSuggestionRef: createMutableRef(''),
    autocompleteCursorPosRef: createMutableRef<number | null>(null),
    clearAutocompleteSuggestion: jest.fn(),
    scheduleAutocompleteRef: createMutableRef(() => {}),
    ...overrides
  }
}

describe('usePagedDocumentEditorInstance', () => {
  beforeEach(() => {
    mockUseEditor.mockClear()
    mockPagesConfigure.mockClear()
  })

  it('enables base64 sources for imported document images', () => {
    const extension = createDocumentImageExtension('token-123')

    expect(extension.name).toBe('document-image')
    expect(mockDocumentImageConfigure).toHaveBeenCalledWith(
      expect.objectContaining({
        allowBase64: true,
        getAccessToken: expect.any(Function),
        HTMLAttributes: expect.objectContaining({
          class: 'editor-image'
        })
      })
    )
    expect(mockDocumentImageConfigure.mock.calls[0]?.[0]?.getAccessToken?.()).toBe('token-123')
  })

  it('mounts pagination extensions when pagination config is available', () => {
    renderHook(() => usePagedDocumentEditorInstance(createParams()))

    expect(mockPagesConfigure).toHaveBeenCalledTimes(1)
    expect(mockUseEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        extensions: expect.arrayContaining([{ name: 'pages-extension' }])
      }),
      expect.any(Array)
    )
  })

  it('skips pagination extensions when pagination config is unavailable', () => {
    renderHook(() => usePagedDocumentEditorInstance(createParams({ paginationConfig: null })))

    expect(mockPagesConfigure).not.toHaveBeenCalled()
    expect(mockUseEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        extensions: expect.not.arrayContaining([{ name: 'pages-extension' }])
      }),
      expect.any(Array)
    )
  })
})
