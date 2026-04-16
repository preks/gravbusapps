import type { Editor } from '@tiptap/core'
import { enrichDocumentTableOfContentsForExport } from './documentTocExportUtils'
import { stringifyDocumentTocStyles } from './documentTocStyleUtils'

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

  it('filters exported rows by max heading level and includes persisted typography styles', () => {
    const html = '<div data-document-toc=""><span>old</span></div>'
    const snapshotJson = JSON.stringify({
      version: 2,
      entries: [
        {
          level: 1,
          text: 'Visible heading',
          pos: 12,
          blockStart: 11,
          pageNumber: '2'
        },
        {
          level: 4,
          text: 'Hidden heading',
          pos: 22,
          blockStart: 21,
          pageNumber: '9'
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
                  stylesJson: stringifyDocumentTocStyles({
                    title: {
                      fontFamily: 'Arial, sans-serif',
                      fontSizePt: 14,
                      bold: false,
                      italic: true,
                      color: '#990000'
                    },
                    entries: {
                      fontFamily: 'Calibri, Candara, Segoe UI, sans-serif',
                      fontSizePt: 11,
                      bold: true,
                      italic: false,
                      color: '#123456'
                    }
                  }),
                  showPageNumbers: true,
                  rightAlignPageNumbers: true,
                  tabLeader: 'dot',
                  maxHeadingLevel: 3
                }
              },
              0
            )
        }
      }
    } as unknown as Editor

    const result = enrichDocumentTableOfContentsForExport(editor, html, labels)

    expect(result).toContain('Visible heading')
    expect(result).toContain('>2<')
    expect(result).not.toContain('Hidden heading')
    expect(result).not.toContain('>9<')
    expect(result).toContain('font-family: Arial, sans-serif')
    expect(result).toContain('font-style: italic')
    expect(result).toContain('font-family: Calibri, Candara, Segoe UI, sans-serif')
    expect(result).toContain('font-size: 11pt')
    expect(result).toContain('color: #123456')
  })
})
