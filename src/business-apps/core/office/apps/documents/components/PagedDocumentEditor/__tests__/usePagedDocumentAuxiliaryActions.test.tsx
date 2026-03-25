import { act, renderHook } from '@testing-library/react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { usePagedDocumentAuxiliaryActions } from '../hooks/usePagedDocumentAuxiliaryActions'

function createParams(
  overrides?: Partial<Parameters<typeof usePagedDocumentAuxiliaryActions>[0]>
): Parameters<typeof usePagedDocumentAuxiliaryActions>[0] {
  const run = jest.fn()
  const setInlineComment = jest.fn(() => ({ run }))
  const focus = jest.fn(() => ({ setInlineComment, run }))
  const chain = jest.fn(() => ({ focus, setInlineComment, run }))

  const editor = {
    getHTML: jest.fn(() => '<div data-layout-window-active="true"><p>Template</p></div>'),
    chain
  } as unknown as TiptapEditor

  return {
    editor,
    title: 'Example document',
    onSaveAsTemplate: jest.fn(),
    setShowNavigationPanel: jest.fn(),
    setNavigationPanelTab: jest.fn(),
    setShowInsertTableDialog: jest.fn(),
    setPageNumbersDialogOpen: jest.fn(),
    setZoom: jest.fn(),
    createCheckpoint: jest.fn(async () => {}),
    publishDocument: jest.fn(async () => {}),
    createInlineComment: jest.fn(async () => ({
      id: 'comment-1',
      createdAt: '2026-03-21T12:00:00.000Z'
    })),
    pendingSelection: {
      from: 2,
      to: 7,
      text: 'Hello',
      html: '<p>Hello</p>'
    },
    currentUserId: 'user-1',
    currentUserName: 'Ada',
    currentUserAvatar: 'avatar.png',
    setPendingSelection: jest.fn(),
    setShowInlineCommentPopover: jest.fn(),
    ...overrides
  }
}

describe('usePagedDocumentAuxiliaryActions', () => {
  it('opens navigation-related dialogs and clamps zoom actions', () => {
    const params = createParams()
    const { result } = renderHook(() => usePagedDocumentAuxiliaryActions(params))

    act(() => {
      result.current.openNavigationPanelTab('replace')
      result.current.handleOpenInsertTableDialog()
      result.current.handleOpenPageNumbersDialog()
      result.current.handleZoomIn()
      result.current.handleZoomOut()
    })

    expect(params.setNavigationPanelTab).toHaveBeenCalledWith('replace')
    expect(params.setShowNavigationPanel).toHaveBeenCalledWith(true)
    expect(params.setShowInsertTableDialog).toHaveBeenCalledWith(true)
    expect(params.setPageNumbersDialogOpen).toHaveBeenCalledWith(true)

    const zoomUpdaterCalls = (params.setZoom as jest.Mock).mock.calls
    expect(zoomUpdaterCalls[0]?.[0](195)).toBe(200)
    expect(zoomUpdaterCalls[1]?.[0](55)).toBe(50)
  })

  it('delegates template, checkpoint, and publish actions', async () => {
    const params = createParams()
    const { result } = renderHook(() => usePagedDocumentAuxiliaryActions(params))

    await act(async () => {
      result.current.handleSaveAsTemplate()
      await result.current.handleSaveCheckpoint('Milestone')
      await result.current.handlePublishDocument('Ready', true)
    })

    expect(params.onSaveAsTemplate).toHaveBeenCalledWith('Example document', expect.stringContaining('<p>Template</p>'))
    expect(params.createCheckpoint).toHaveBeenCalledWith('Milestone')
    expect(params.publishDocument).toHaveBeenCalledWith('Ready', true)
  })

  it('creates an inline comment, annotates the editor selection, and clears pending state', async () => {
    const params = createParams()
    const editorChain = (params.editor as unknown as { chain: jest.Mock }).chain
    const { result } = renderHook(() => usePagedDocumentAuxiliaryActions(params))

    await act(async () => {
      await result.current.handleSubmitInlineComment('Comment body')
    })

    expect(params.createInlineComment).toHaveBeenCalledWith({
      type: 'inline',
      content: 'Comment body',
      selectionStart: 2,
      selectionEnd: 7,
      selectedText: 'Hello',
      createdByName: 'Ada',
      createdByAvatar: 'avatar.png'
    })
    expect(editorChain).toHaveBeenCalled()
    const chainResult = editorChain.mock.results[0]?.value
    expect(chainResult.focus).toHaveBeenCalled()
    expect(chainResult.setInlineComment).toHaveBeenCalledWith({
      commentId: 'comment-1',
      commentType: 'inline',
      createdBy: 'user-1',
      createdAt: '2026-03-21T12:00:00.000Z'
    })
    expect(chainResult.run).toHaveBeenCalled()
    expect(params.setPendingSelection).toHaveBeenCalledWith(null)

    act(() => {
      result.current.handleCloseInlineCommentPopover()
    })

    expect(params.setShowInlineCommentPopover).toHaveBeenCalledWith(false)
    expect(params.setPendingSelection).toHaveBeenLastCalledWith(null)
  })
})
