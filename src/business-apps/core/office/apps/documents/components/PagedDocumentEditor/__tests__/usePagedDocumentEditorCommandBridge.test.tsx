import React from 'react'
import { act, renderHook } from '@testing-library/react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type { ActivePagesEditorState } from '@/components/tiptap-extensions/tiptap-custom-pagination'
import { usePagedDocumentEditorCommandBridge } from '../hooks/usePagedDocumentEditorCommandBridge'

function createParams(
  overrides?: Partial<Parameters<typeof usePagedDocumentEditorCommandBridge>[0]>
): Parameters<typeof usePagedDocumentEditorCommandBridge>[0] {
  const editor = {
    commands: {
      insertContent: jest.fn(),
      closeHeaderFooterEditors: jest.fn(),
      setPagesOptions: jest.fn(),
      setPaginationDocumentTitle: jest.fn()
    }
  } as unknown as TiptapEditor

  return {
    editor,
    editorRef: { current: editor },
    externalRef: React.createRef(),
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
    pagesFormattingConfig: {
      header: '<p>Header</p>',
      footer: '<p>Footer</p>',
      differentFirstPage: false,
      differentOddEven: false
    },
    title: '',
    documentTitle: 'Loaded title',
    initialTitle: 'Initial title',
    isYjsSynced: true,
    setPagesEditorState: jest.fn<void, [ActivePagesEditorState]>(),
    ...overrides
  }
}

describe('usePagedDocumentEditorCommandBridge', () => {
  it('syncs pagination options after the initial editor mount and keeps the pagination title updated', () => {
    const initialParams = createParams()
    const setPagesOptions = (initialParams.editor?.commands as { setPagesOptions: jest.Mock }).setPagesOptions
    const setPaginationDocumentTitle = (
      initialParams.editor?.commands as {
        setPaginationDocumentTitle: jest.Mock
      }
    ).setPaginationDocumentTitle

    const { rerender } = renderHook(params => usePagedDocumentEditorCommandBridge(params), {
      initialProps: initialParams
    })

    expect(setPagesOptions).not.toHaveBeenCalled()
    expect(setPaginationDocumentTitle).toHaveBeenCalledWith('Loaded title')

    rerender(
      createParams({
        ...initialParams,
        editor: initialParams.editor,
        editorRef: initialParams.editorRef,
        externalRef: initialParams.externalRef,
        setPagesEditorState: initialParams.setPagesEditorState,
        title: 'Edited title',
        pagesFormattingConfig: {
          ...initialParams.pagesFormattingConfig,
          header: '<p>Updated header</p>',
          pageNumberAlignment: 'center'
        }
      })
    )

    expect(setPagesOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        header: '<p>Updated header</p>',
        pageNumberAlignment: 'center'
      })
    )
    expect(setPaginationDocumentTitle).toHaveBeenLastCalledWith('Edited title')
  })

  it('closes header/footer editors and resets the local pages editor state', () => {
    const params = createParams()
    const closeHeaderFooterEditors = (
      params.editorRef.current?.commands as {
        closeHeaderFooterEditors: jest.Mock
      }
    ).closeHeaderFooterEditors

    const { result } = renderHook(() => usePagedDocumentEditorCommandBridge(params))

    act(() => {
      result.current.closeHeaderFooterEditorsAndSidebar()
    })

    expect(params.setPagesEditorState).toHaveBeenCalledWith({
      activeEditor: null,
      activeEditorType: null,
      activePageNumber: null
    })
    expect(closeHeaderFooterEditors).toHaveBeenCalled()
  })

  it('exposes an imperative insertAtCursor helper that sanitizes HTML before inserting', () => {
    const params = createParams()
    const insertContent = (params.editorRef.current?.commands as { insertContent: jest.Mock }).insertContent

    renderHook(() => usePagedDocumentEditorCommandBridge(params))

    act(() => {
      params.externalRef.current?.insertAtCursor('<script>alert(1)</script><p>Hello</p>')
    })

    expect(insertContent).toHaveBeenCalledTimes(1)
    expect(insertContent.mock.calls[0]?.[0]).toContain('<p>Hello</p>')
    expect(insertContent.mock.calls[0]?.[0]).not.toContain('<script>')
  })
})
