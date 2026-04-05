import { act, renderHook } from '@testing-library/react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type { DocumentFormatting, DocumentPagesFormatting } from '../../../types'
import { readPagesFormattingFromStorage } from '../hooks/usePagedDocumentFormatting'
import { usePagedDocumentPageNumberActions } from '../hooks/usePagedDocumentPageNumberActions'

beforeEach(() => {
  jest.spyOn(console, 'info').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('usePagedDocumentPageNumberActions', () => {
  it('applies page number placement and marks the document as unsaved', () => {
    const persistFormatting = jest.fn()
    const buildPersistedFormatting = jest.fn((formatting: DocumentFormatting) => formatting)
    const markUnsavedChanges = jest.fn()
    const layoutFormattingRef = {
      current: {
        fontSize: 12,
        pages: {
          pageNumberShowOnFirstPage: false
        }
      } satisfies DocumentFormatting
    }
    const getPersistedPagesFormatting = jest.fn((fb?: DocumentPagesFormatting) => fb)

    const { result } = renderHook(() =>
      usePagedDocumentPageNumberActions({
        editor: null,
        layoutFormattingRef,
        getPersistedPagesFormatting,
        buildPersistedFormatting,
        persistFormatting,
        markUnsavedChanges
      })
    )

    act(() => {
      result.current.handlePageNumbersApply({
        position: 'footer',
        alignment: 'center',
        showOnFirstPage: true,
        numeralStyle: 'decimal',
        startAt: 3
      })
    })

    expect(buildPersistedFormatting).toHaveBeenCalledWith(
      expect.objectContaining({
        fontSize: 12,
        pages: expect.objectContaining({
          pageNumberRegion: 'footer',
          pageNumberAlignment: 'center',
          pageNumberStartAt: 3,
          pageNumberShowOnFirstPage: true
        })
      }),
      expect.objectContaining({
        pageNumberRegion: 'footer',
        pageNumberAlignment: 'center',
        pageNumberStartAt: 3,
        pageNumberShowOnFirstPage: true
      })
    )
    expect(persistFormatting).toHaveBeenCalledWith(
      expect.objectContaining({
        pages: expect.objectContaining({
          pageNumberRegion: 'footer',
          pageNumberAlignment: 'center'
        })
      })
    )
    expect(markUnsavedChanges).toHaveBeenCalled()
  })

  it('merges pages from editor storage and removes page number placement through the editor command', () => {
    const persistFormatting = jest.fn()
    const buildPersistedFormatting = jest.fn((formatting: DocumentFormatting) => formatting)
    const markUnsavedChanges = jest.fn()
    const setPagesOptions = jest.fn(() => true)
    const editor = {
      commands: {
        setPagesOptions
      }
    } as unknown as TiptapEditor
    const layoutFormattingRef = {
      current: {
        pages: {
          header: '<p>existing header</p>',
          pageNumberRegion: 'header',
          pageNumberAlignment: 'left'
        }
      } satisfies DocumentFormatting
    }
    const editorRef = {
      current: {
        storage: {
          pages: {
            footerHTML: '<p>editor footer</p>'
          }
        }
      }
    }

    const getPersistedPagesFormatting = jest.fn((fallback?: DocumentPagesFormatting) => {
      const pagesFromEditor = readPagesFormattingFromStorage(editorRef.current.storage.pages as never)
      if (!pagesFromEditor) return fallback
      if (!fallback) return pagesFromEditor
      return {
        ...fallback,
        ...pagesFromEditor,
        header: pagesFromEditor.header ?? fallback.header,
        footer: pagesFromEditor.footer ?? fallback.footer,
        headerFirstPage: pagesFromEditor.headerFirstPage ?? fallback.headerFirstPage,
        footerFirstPage: pagesFromEditor.footerFirstPage ?? fallback.footerFirstPage,
        headerOdd: pagesFromEditor.headerOdd ?? fallback.headerOdd,
        headerEven: pagesFromEditor.headerEven ?? fallback.headerEven,
        footerOdd: pagesFromEditor.footerOdd ?? fallback.footerOdd,
        footerEven: pagesFromEditor.footerEven ?? fallback.footerEven,
        pageNumberNumeralStyle: fallback.pageNumberNumeralStyle,
        pageNumberStartAt: fallback.pageNumberStartAt,
        pageNumberAlignment: fallback.pageNumberAlignment,
        pageNumberRegion: fallback.pageNumberRegion,
        pageNumberShowOnFirstPage: fallback.pageNumberShowOnFirstPage
      }
    })

    const { result } = renderHook(() =>
      usePagedDocumentPageNumberActions({
        editor,
        layoutFormattingRef,
        getPersistedPagesFormatting,
        buildPersistedFormatting,
        persistFormatting,
        markUnsavedChanges
      })
    )

    act(() => {
      result.current.persistPagesFromEditor()
    })

    expect(persistFormatting).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        pages: expect.objectContaining({
          header: '<p>existing header</p>',
          footer: '<p>editor footer</p>'
        })
      })
    )

    act(() => {
      result.current.handlePageNumbersRemove()
    })

    expect(setPagesOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        pageNumberRegion: null,
        pageNumberAlignment: null
      })
    )
    expect(markUnsavedChanges).toHaveBeenCalled()
  })
})
