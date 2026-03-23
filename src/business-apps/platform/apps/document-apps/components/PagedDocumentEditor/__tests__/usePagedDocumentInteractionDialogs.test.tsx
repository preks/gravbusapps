import { act, renderHook } from '@testing-library/react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { Schema } from '@tiptap/pm/model'
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
  const originalRequestAnimationFrame = global.requestAnimationFrame

  beforeEach(() => {
    global.requestAnimationFrame = callback => {
      callback(0)
      return 1
    }
  })

  afterEach(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame
  })

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

  it('positions the inline comment popover without hydrating when the selection is already measurable', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: {
          content: 'text*',
          group: 'block',
          toDOM: () => ['p', 0]
        },
        text: {
          group: 'inline'
        }
      }
    })
    const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('Hello world')])])
    const pageBody = document.createElement('div')
    pageBody.className = 'rm-page-body-layer'
    pageBody.dataset.rmPageNumber = '3'
    const targetNode = document.createElement('span')
    pageBody.appendChild(targetNode)

    const editor = {
      schema,
      state: {
        selection: { from: 1, to: 5 },
        doc
      },
      commands: {
        hydratePageBreakShells: jest.fn(() => true)
      },
      view: {
        dom: pageBody,
        nodeDOM: jest.fn(() => targetNode),
        domAtPos: jest.fn(() => ({ node: targetNode })),
        coordsAtPos: jest.fn(() => ({
          top: 180,
          bottom: 200
        }))
      }
    } as unknown as TiptapEditor

    const { result } = renderHook(() =>
      usePagedDocumentInteractionDialogs(
        createHookParams({
          editor
        })
      )
    )

    act(() => {
      result.current.handleAddInlineComment(undefined, { from: 1, to: 5 })
    })

    expect(editor.commands.hydratePageBreakShells).not.toHaveBeenCalled()
    expect(result.current.pendingSelection).toEqual({
      from: 1,
      to: 5,
      text: 'Hell',
      html: 'Hell'
    })
    expect(result.current.inlineCommentPosition).toEqual({
      top: 210,
      left: 0
    })
    expect(result.current.showInlineCommentPopover).toBe(true)
  })

  it('repositions the inline comment popover when the sparse window changes', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: {
          content: 'text*',
          group: 'block',
          toDOM: () => ['p', 0]
        },
        text: {
          group: 'inline'
        }
      }
    })
    const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('Hello world')])])
    const pageBody = document.createElement('div')
    pageBody.className = 'rm-page-body-layer'
    pageBody.dataset.rmPageNumber = '3'
    const targetNode = document.createElement('span')
    pageBody.appendChild(targetNode)

    let selectionTop = 180
    const editor = {
      schema,
      state: {
        selection: { from: 1, to: 5 },
        doc
      },
      commands: {
        hydratePageBreakShells: jest.fn(() => true)
      },
      view: {
        dom: pageBody,
        nodeDOM: jest.fn(() => targetNode),
        domAtPos: jest.fn(() => ({ node: targetNode })),
        coordsAtPos: jest.fn(() => ({
          top: selectionTop,
          bottom: selectionTop + 20
        }))
      }
    } as unknown as TiptapEditor

    const { result, rerender } = renderHook(
      props =>
        usePagedDocumentInteractionDialogs(
          createHookParams({
            editor,
            layoutViewportModel: props.layoutViewportModel
          })
        ),
      {
        initialProps: {
          layoutViewportModel: {
            mountedPageBodyBounds: [],
            pagePositionRanges: [],
            windowKey: 'window-1'
          }
        }
      }
    )

    act(() => {
      result.current.handleAddInlineComment(undefined, { from: 1, to: 5 })
    })

    expect(result.current.inlineCommentPosition).toEqual({
      top: 210,
      left: 0
    })

    selectionTop = 260

    act(() => {
      rerender({
        layoutViewportModel: {
          mountedPageBodyBounds: [],
          pagePositionRanges: [],
          windowKey: 'window-2'
        }
      })
    })

    expect(result.current.inlineCommentPosition).toEqual({
      top: 290,
      left: 0
    })
  })
})
