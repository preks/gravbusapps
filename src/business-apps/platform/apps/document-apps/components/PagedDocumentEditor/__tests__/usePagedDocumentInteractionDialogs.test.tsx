import { act, renderHook } from '@testing-library/react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import {
  resolveLinkDialogRequest,
  usePagedDocumentInteractionDialogs
} from '../hooks/usePagedDocumentInteractionDialogs'

function createHookParams(overrides?: Partial<Parameters<typeof usePagedDocumentInteractionDialogs>[0]>) {
  return {
    editor: null,
    activeEditor: null,
    documentId: 'doc-1',
    title: 'Test document',
    rightSidebar: 'closed' as const,
    setRightSidebar: jest.fn(),
    replaceImagePosRef: {
      current: null
    },
    ...overrides
  }
}

describe('resolveLinkDialogRequest', () => {
  it('returns edit mode for an active link selection', () => {
    expect(
      resolveLinkDialogRequest({
        isLinkActive: true,
        selectionText: 'Existing link',
        href: 'https://example.com',
        target: '_blank',
        isEmptySelection: false
      })
    ).toEqual({
      mode: 'edit',
      initialValues: {
        href: 'https://example.com',
        displayText: 'Existing link',
        openInNewTab: true
      },
      insertWithNoSelection: false
    })
  })

  it('returns insert mode with empty display text for a collapsed selection', () => {
    expect(
      resolveLinkDialogRequest({
        isLinkActive: false,
        selectionText: '',
        isEmptySelection: true
      })
    ).toEqual({
      mode: 'insert',
      initialValues: {
        href: '',
        displayText: '',
        openInNewTab: false
      },
      insertWithNoSelection: true
    })
  })
})

describe('usePagedDocumentInteractionDialogs', () => {
  it('opens the link dialog with selected text when inserting a new link', () => {
    const activeEditor = {
      state: {
        selection: { from: 2, to: 8 },
        doc: {
          textBetween: jest.fn(() => 'Sample')
        }
      },
      isActive: jest.fn(() => false),
      getAttributes: jest.fn(() => ({}))
    } as unknown as TiptapEditor

    const { result } = renderHook(() =>
      usePagedDocumentInteractionDialogs(
        createHookParams({
          activeEditor
        })
      )
    )

    act(() => {
      result.current.openLinkDialog()
    })

    expect(result.current.showLinkDialog).toBe(true)
    expect(result.current.linkDialogMode).toBe('insert')
    expect(result.current.linkDialogInitialValues).toEqual({
      href: '',
      displayText: 'Sample',
      openInNewTab: false
    })
  })

  it('replaces the currently selected image node when the replace dialog submits', () => {
    const tr = { id: 'transaction' }
    const setNodeMarkup = jest.fn(() => tr)
    const dispatch = jest.fn()
    const focus = jest.fn()
    const activeEditor = {
      state: {
        doc: {
          nodeAt: jest.fn(() => ({
            type: { name: 'image' },
            attrs: { src: 'old-src', alt: 'diagram' }
          }))
        },
        tr: {
          setNodeMarkup
        }
      },
      view: {
        dispatch,
        focus
      }
    } as unknown as TiptapEditor

    const { result } = renderHook(() =>
      usePagedDocumentInteractionDialogs(
        createHookParams({
          activeEditor
        })
      )
    )

    act(() => {
      result.current.openReplaceImageDialog(12)
      result.current.handleReplaceSelectedImage('new-src')
    })

    expect(result.current.showInsertImageDialog).toBe(true)
    expect(result.current.imageDialogMode).toBe('replace')
    expect(setNodeMarkup).toHaveBeenCalledWith(
      12,
      undefined,
      expect.objectContaining({
        src: 'new-src',
        alt: 'diagram'
      })
    )
    expect(dispatch).toHaveBeenCalledWith(tr)
    expect(focus).toHaveBeenCalled()
  })

  it('moves the inline comment selection into the AI dialog state', () => {
    const { result } = renderHook(() => usePagedDocumentInteractionDialogs(createHookParams()))

    act(() => {
      result.current.setPendingSelection({
        from: 1,
        to: 5,
        text: 'Hello',
        html: '<p>Hello</p>'
      })
      result.current.setShowInlineCommentPopover(true)
    })

    act(() => {
      result.current.openAiFromPendingSelection()
    })

    expect(result.current.showAiInstructionDialog).toBe(true)
    expect(result.current.aiInstruction).toBe('')
    expect(result.current.aiSelectionSnapshot).toBe('Hello')
    expect(result.current.aiSelectionSnapshotHtml).toBe('<p>Hello</p>')
    expect(result.current.showInlineCommentPopover).toBe(false)
    expect(result.current.pendingSelection).toBeNull()
  })
})
