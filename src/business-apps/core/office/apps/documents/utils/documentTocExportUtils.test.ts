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
})
