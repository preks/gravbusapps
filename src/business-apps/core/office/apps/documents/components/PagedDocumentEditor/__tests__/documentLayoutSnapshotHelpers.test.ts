import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { collectDocumentLayoutAnchors, collectDocumentLayoutTableFragments } from '../documentLayoutSnapshotHelpers'

describe('documentLayoutSnapshotHelpers caching', () => {
  it('reuses cached anchor collections when doc and layout inputs are unchanged', () => {
    const descendants = jest.fn()
    const doc = { descendants } as unknown as ProseMirrorNode
    const editor = {
      isDestroyed: false,
      state: {
        doc
      }
    } as never
    const pageSpans = [{ pageNumber: 1, startPos: 1, endPos: 10, source: 'mounted' as const }]
    const pageBounds = [{ pageNumber: 1, left: 0, right: 100, top: 0, bottom: 100 }]

    expect(collectDocumentLayoutAnchors(editor, pageSpans, pageBounds)).toEqual({
      comments: [],
      images: [],
      links: [],
      tables: []
    })
    expect(collectDocumentLayoutAnchors(editor, pageSpans, pageBounds)).toEqual({
      comments: [],
      images: [],
      links: [],
      tables: []
    })
    expect(descendants).toHaveBeenCalledTimes(2)
  })

  it('reuses cached table fragment collections when doc and page spans are unchanged', () => {
    const descendants = jest.fn()
    const doc = { descendants } as unknown as ProseMirrorNode
    const editor = {
      isDestroyed: false,
      state: {
        doc
      }
    } as never
    const pageSpans = [{ pageNumber: 1, startPos: 1, endPos: 10, source: 'mounted' as const }]

    expect(collectDocumentLayoutTableFragments(editor, pageSpans)).toEqual([])
    expect(collectDocumentLayoutTableFragments(editor, pageSpans)).toEqual([])
    expect(descendants).toHaveBeenCalledTimes(1)
  })
})
