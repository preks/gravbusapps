import { act, renderHook } from '@testing-library/react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type { DocumentFormatting } from '../../../types'
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
    const editorRef = {
      current: null
    }

    const { result } = renderHook(() =>
      usePagedDocumentPageNumberActions({
        editor: null,
        editorRef,
        layoutFormattingRef,
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

    const { result } = renderHook(() =>
      usePagedDocumentPageNumberActions({
        editor,
        editorRef,
        layoutFormattingRef,
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
          header: null,
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
