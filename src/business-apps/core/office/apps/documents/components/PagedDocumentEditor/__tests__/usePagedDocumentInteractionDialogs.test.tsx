import { act, renderHook } from '@testing-library/react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import { Schema } from '@tiptap/pm/model'
import {
  createPendingInlineSelection,
  mapImageReplacementPosThroughTransaction,
  mapPendingInlineSelectionThroughTransaction,
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

function createBasicSchema() {
  return new Schema({
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
}

function createTrackedEditor(options?: { initialText?: string; selection?: { from: number; to: number } }) {
  const schema = createBasicSchema()
  const handlers: Record<string, Array<(payload?: unknown) => void>> = {}
  let text = options?.initialText ?? 'Hello world'
  let selection = options?.selection ?? { from: 1, to: 5 }
  const pageBody = document.createElement('div')
  pageBody.className = 'rm-page-body-layer'
  pageBody.dataset.rmPageNumber = '3'
  const targetNode = document.createElement('span')
  pageBody.appendChild(targetNode)

  const buildDoc = (value: string) => schema.node('doc', null, [schema.node('paragraph', null, [schema.text(value)])])
  const editor = {
    schema,
    state: {
      get selection() {
        return selection
      },
      get doc() {
        return buildDoc(text)
      }
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
    },
    on: jest.fn((event: string, callback: (payload?: unknown) => void) => {
      handlers[event] = handlers[event] ?? []
      handlers[event]!.push(callback)
    }),
    off: jest.fn((event: string, callback: (payload?: unknown) => void) => {
      handlers[event] = (handlers[event] ?? []).filter(entry => entry !== callback)
    })
  } as unknown as TiptapEditor

  return {
    editor,
    handlers,
    setDocument(next: { text?: string; selection?: { from: number; to: number } }) {
      text = next.text ?? text
      selection = next.selection ?? selection
    }
  }
}

function createTrackedImageEditor() {
  const handlers: Record<string, Array<(payload?: unknown) => void>> = {}
  const setNodeMarkup = jest.fn(() => ({ id: 'transaction' }))
  let imagePositions = new Set([12])

  const editor = {
    state: {
      doc: {
        nodeAt: jest.fn((pos: number) =>
          imagePositions.has(pos)
            ? {
                type: { name: 'image' },
                attrs: { src: `src-${pos}`, alt: 'diagram' }
              }
            : null
        )
      },
      tr: {
        setNodeMarkup
      }
    },
    view: {
      dispatch: jest.fn(),
      focus: jest.fn()
    },
    on: jest.fn((event: string, callback: (payload?: unknown) => void) => {
      handlers[event] = handlers[event] ?? []
      handlers[event]!.push(callback)
    }),
    off: jest.fn((event: string, callback: (payload?: unknown) => void) => {
      handlers[event] = (handlers[event] ?? []).filter(entry => entry !== callback)
    })
  } as unknown as TiptapEditor

  return {
    editor,
    handlers,
    setImagePositions(nextPositions: number[]) {
      imagePositions = new Set(nextPositions)
    },
    setNodeMarkup
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

describe('pending inline selection helpers', () => {
  it('creates a normalized pending selection snapshot from the editor state', () => {
    const { editor } = createTrackedEditor()

    expect(createPendingInlineSelection(editor, 1, 5)).toEqual({
      from: 1,
      to: 5,
      text: 'Hell',
      html: 'Hell'
    })
  })

  it('maps a pending selection through document transactions', () => {
    const { editor } = createTrackedEditor()

    expect(
      mapPendingInlineSelectionThroughTransaction(
        {
          from: 1,
          to: 5,
          text: 'Hell',
          html: 'Hell'
        },
        editor,
        {
          mapping: {
            mapResult: (pos: number) => ({ pos: pos + 2, deleted: false })
          }
        }
      )
    ).toEqual({
      from: 3,
      to: 7,
      text: 'llo',
      html: 'llo'
    })
  })

  it('maps an image replacement position through document transactions', () => {
    const { editor, setImagePositions } = createTrackedImageEditor()
    setImagePositions([14])

    expect(
      mapImageReplacementPosThroughTransaction(12, editor, {
        mapping: {
          mapResult: (pos: number) => ({ pos: pos + 2, deleted: false })
        }
      })
    ).toBe(14)
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

  it('maps the replacement image position while the replace dialog stays open', () => {
    const { editor, handlers, setImagePositions, setNodeMarkup } = createTrackedImageEditor()
    setImagePositions([14])
    const replaceImagePosRef = { current: null as number | null }
    const { result } = renderHook(() =>
      usePagedDocumentInteractionDialogs(
        createHookParams({
          activeEditor: editor,
          replaceImagePosRef
        })
      )
    )

    act(() => {
      result.current.openReplaceImageDialog(12)
    })

    act(() => {
      handlers.transaction?.forEach(callback =>
        callback({
          transaction: {
            docChanged: true,
            mapping: {
              mapResult: (pos: number) => ({ pos: pos + 2, deleted: false })
            }
          }
        })
      )
    })

    act(() => {
      result.current.handleReplaceSelectedImage('new-src')
    })

    expect(replaceImagePosRef.current).toBe(14)
    expect(setNodeMarkup).toHaveBeenCalledWith(
      14,
      undefined,
      expect.objectContaining({
        src: 'new-src',
        alt: 'diagram'
      })
    )
  })

  it('closes the replace image dialog when the tracked image is deleted', () => {
    const { editor, handlers } = createTrackedImageEditor()
    const replaceImagePosRef = { current: null as number | null }
    const { result } = renderHook(() =>
      usePagedDocumentInteractionDialogs(
        createHookParams({
          activeEditor: editor,
          replaceImagePosRef
        })
      )
    )

    act(() => {
      result.current.openReplaceImageDialog(12)
    })

    expect(result.current.showInsertImageDialog).toBe(true)

    act(() => {
      handlers.transaction?.forEach(callback =>
        callback({
          transaction: {
            docChanged: true,
            mapping: {
              mapResult: () => ({ pos: 12, deleted: true })
            }
          }
        })
      )
    })

    expect(replaceImagePosRef.current).toBeNull()
    expect(result.current.showInsertImageDialog).toBe(false)
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
    const schema = createBasicSchema()
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
    const schema = createBasicSchema()
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

  it('maps pending inline selections through document transactions while the popover stays open', () => {
    const { editor, handlers, setDocument } = createTrackedEditor()
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

    act(() => {
      setDocument({
        text: 'Hello world',
        selection: { from: 3, to: 7 }
      })
      handlers.transaction?.forEach(callback =>
        callback({
          transaction: {
            docChanged: true,
            mapping: {
              mapResult: (pos: number) => ({ pos: pos + 2, deleted: false })
            }
          }
        })
      )
    })

    expect(result.current.pendingSelection).toEqual({
      from: 3,
      to: 7,
      text: 'llo',
      html: 'llo'
    })
  })

  it('refreshes the AI selection snapshot after doc-only transactions', () => {
    const { editor, handlers, setDocument } = createTrackedEditor()
    const { result } = renderHook(() =>
      usePagedDocumentInteractionDialogs(
        createHookParams({
          editor,
          documentId: 'doc-1'
        })
      )
    )

    act(() => {
      global.localStorage.setItem('document-ai-edit-entrypoint', 'dialog')
      result.current.handleAiEditClick()
    })

    expect(result.current.aiSelectionSnapshot).toBe('Hell')

    act(() => {
      setDocument({
        text: 'Brave world',
        selection: { from: 1, to: 6 }
      })
      handlers.transaction?.forEach(callback =>
        callback({
          transaction: {
            docChanged: true,
            selectionSet: false
          }
        })
      )
    })

    expect(result.current.aiSelectionSnapshot).toBe('Brave')
    expect(result.current.aiSelectionSnapshotHtml).toBe('Brave')

    global.localStorage.removeItem('document-ai-edit-entrypoint')
  })
})
