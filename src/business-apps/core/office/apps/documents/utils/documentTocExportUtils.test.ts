import type { Editor } from '@tiptap/core'
import { enrichDocumentTableOfContentsForExport } from './documentTocExportUtils'

const labels = {
  blockTitle: 'Table of contents',
  emptyMessage: 'No headings yet',
  untitledHeading: 'Untitled'
}

describe('documentTocExportUtils', () => {
  it('returns html unchanged when editor has no ProseMirror document', () => {
    const html = '<div data-document-toc=""><span>old</span></div>'
    expect(enrichDocumentTableOfContentsForExport({} as Editor, html, labels)).toBe(html)
  })

  it('returns empty string when html is empty', () => {
    expect(enrichDocumentTableOfContentsForExport({ state: { doc: {} } } as unknown as Editor, '', labels)).toBe('')
  })

  it('renders the stored snapshot instead of recalculating from live headings', () => {
    const html = '<div data-document-toc=""><span>old</span></div>'
    const snapshotJson = JSON.stringify({
      version: 2,
      entries: [
        {
          level: 1,
          text: 'Stored heading',
          pos: 12,
          blockStart: 11,
          pageNumber: '7'
        }
      ],
      updatedAt: '2026-04-14T10:00:00.000Z',
      updateMode: 'entire',
      layoutVersion: 3
    })
    const editor = {
      state: {
        doc: {
          descendants: (
            visit: (
              node: { type: { name: string }; nodeSize: number; attrs: Record<string, unknown> },
              pos: number
            ) => void
          ) =>
            visit(
              {
                type: { name: 'documentTableOfContents' },
                nodeSize: 1,
                attrs: {
                  snapshotJson,
                  showPageNumbers: true,
                  rightAlignPageNumbers: true,
                  tabLeader: 'dot'
                }
              },
              0
            )
        }
      }
    } as unknown as Editor

    const result = enrichDocumentTableOfContentsForExport(editor, html, labels)

    expect(result).toContain('Stored heading')
    expect(result).toContain('>7<')
    expect(result).not.toContain('old')
  })
})
