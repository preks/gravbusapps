import { Schema } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'
import type { Editor as TiptapEditor } from '@tiptap/react'
const mockGetSelectedImageState = jest.fn((editor: TiptapEditor) => {
  const selection = editor.state.selection as NodeSelection | { from: number; to: number }

  if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
    return {
      pos: selection.from,
      nodeSize: selection.node.nodeSize,
      attrs: selection.node.attrs
    }
  }

  return null
})
const mockGetSelectedTableState = jest.fn(() => null)

jest.mock('../hooks/usePagedDocumentSelectionSidebars', () => ({
  getSelectedImageState: (editor: TiptapEditor) => mockGetSelectedImageState(editor),
  getSelectedTableState: (editor: TiptapEditor) => mockGetSelectedTableState(editor)
}))

import { buildContextMenuState, resolveContextMenuKind, syncContextMenuSelection } from '../useDocumentContextMenu'

function createImageSchema() {
  return new Schema({
    nodes: {
      doc: { content: 'block+' },
      image: {
        group: 'block',
        atom: true,
        selectable: true,
        attrs: {
          src: { default: '' }
        },
        toDOM: node => ['img', { src: node.attrs.src }]
      },
      text: { group: 'inline' }
    }
  })
}

function createImageEditor() {
  const schema = createImageSchema()
  const doc = schema.node('doc', null, [schema.node('image', { src: 'diagram.png' })])
  const imageAnchor = document.createElement('span')
  imageAnchor.dataset.testid = 'document-editor-image-anchor'

  let selection: { from: number; to: number } | NodeSelection = { from: 0, to: 0 }
  const transaction = {
    selection: null as { from: number; to: number } | NodeSelection | null,
    setSelection(nextSelection: { from: number; to: number } | NodeSelection) {
      this.selection = nextSelection
      return this
    }
  }

  const chain = {
    focus: jest.fn(() => chain),
    setTextSelection: jest.fn((pos: number) => {
      selection = { from: pos, to: pos }
      return chain
    }),
    run: jest.fn()
  }

  const editor = {
    state: {
      doc,
      get selection() {
        return selection
      },
      tr: transaction
    },
    view: {
      posAtDOM: jest.fn(() => 0),
      posAtCoords: jest.fn(() => ({ pos: 0 })),
      dispatch: jest.fn((tr: typeof transaction) => {
        if (tr.selection) {
          selection = tr.selection
        }
      }),
      focus: jest.fn()
    },
    chain: jest.fn(() => chain),
    isActive: jest.fn(() => false),
    getAttributes: jest.fn(() => ({}))
  } as unknown as TiptapEditor

  return {
    editor,
    imageAnchor,
    getSelection: () => selection
  }
}

describe('useDocumentContextMenu helpers', () => {
  afterEach(() => {
    mockGetSelectedImageState.mockClear()
    mockGetSelectedTableState.mockClear()
  })

  it('prefers image and table menus over text and defaults', () => {
    expect(resolveContextMenuKind({ hasTextSelection: false, imageSelection: null, tableSelection: null })).toBe(
      'default'
    )
    expect(resolveContextMenuKind({ hasTextSelection: true, imageSelection: null, tableSelection: null })).toBe('text')
    expect(
      resolveContextMenuKind({ hasTextSelection: true, imageSelection: null, tableSelection: { tablePos: 12 } })
    ).toBe('table')
    expect(
      resolveContextMenuKind({
        hasTextSelection: true,
        imageSelection: {
          pos: 3,
          nodeSize: 1,
          attrs: { src: 'diagram.png' }
        },
        tableSelection: { tablePos: 12 }
      })
    ).toBe('image')
  })

  it('selects the clicked image before building menu state', () => {
    const { editor, imageAnchor, getSelection } = createImageEditor()

    syncContextMenuSelection(editor, {
      clientX: 12,
      clientY: 24,
      target: imageAnchor
    })

    expect(editor.view.dispatch).toHaveBeenCalled()
    expect(getSelection()).toBeInstanceOf(NodeSelection)

    const state = buildContextMenuState(editor)
    expect(state.kind).toBe('image')
    expect(state.imageSelection?.pos).toBe(0)
  })

  it('selects a page-projected image via the stamped node position', () => {
    const { editor, getSelection } = createImageEditor()
    const projectedImageAnchor = document.createElement('span')
    projectedImageAnchor.dataset.imagePageAnchor = 'true'
    projectedImageAnchor.dataset.imageNodePos = '0'

    syncContextMenuSelection(editor, {
      clientX: 12,
      clientY: 24,
      target: projectedImageAnchor
    })

    expect(editor.view.posAtDOM).not.toHaveBeenCalled()
    expect(editor.view.dispatch).toHaveBeenCalled()
    expect(getSelection()).toBeInstanceOf(NodeSelection)
  })

  it('keeps link actions available for a collapsed caret inside a link', () => {
    const editor = {
      state: {
        selection: {
          from: 4,
          to: 4
        }
      },
      isActive: jest.fn((name: string) => name === 'link'),
      getAttributes: jest.fn(() => ({ href: 'https://example.com' }))
    } as unknown as TiptapEditor

    const state = buildContextMenuState(editor)

    expect(state.kind).toBe('default')
    expect(state.hasTextSelection).toBe(false)
    expect(state.isLinkActive).toBe(true)
    expect(state.linkHref).toBe('https://example.com')
  })
})
