// Command regressions for the document table-of-contents extension.

import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { DEFAULT_DOCUMENT_TOC_STYLES, stringifyDocumentTocStyles } from '../../../utils/documentTocStyleUtils'

jest.mock('@tiptap/react', () => ({
  ReactNodeViewRenderer: () => jest.fn()
}))

jest.mock('../../../utils/tocLayoutBridge', () => ({
  getDocumentTocLayoutHints: jest.fn(() => null)
}))

import { DocumentTableOfContents } from './DocumentTableOfContents'

function createEditor(content: Record<string, unknown>) {
  return new Editor({
    extensions: [
      StarterKit.configure({
        undoRedo: false
      }),
      DocumentTableOfContents
    ],
    content
  })
}

describe('DocumentTableOfContents commands', () => {
  it('updates page numbers for an empty snapshot without applying a mismatched transaction', () => {
    const editor = createEditor({
      type: 'doc',
      content: [
        {
          type: 'documentTableOfContents',
          attrs: {
            snapshotJson: '[]',
            stylesJson: stringifyDocumentTocStyles(DEFAULT_DOCUMENT_TOC_STYLES),
            showPageNumbers: true,
            rightAlignPageNumbers: true,
            tabLeader: 'dot',
            headingLinks: true,
            maxHeadingLevel: 3
          }
        },
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Overview' }]
        }
      ]
    })

    try {
      expect(() => editor.commands.updateDocumentTableOfContentsPageNumbers(0)).not.toThrow()

      const tocNode = editor.state.doc.nodeAt(0)
      expect(tocNode?.type.name).toBe('documentTableOfContents')
      expect(tocNode?.attrs.snapshotJson).not.toBe('[]')
      expect(String(tocNode?.attrs.snapshotJson)).toContain('Overview')
    } finally {
      editor.destroy()
    }
  })
})
