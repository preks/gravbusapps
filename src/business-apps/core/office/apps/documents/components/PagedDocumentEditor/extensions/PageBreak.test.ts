import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { PageBreak } from './PageBreak'

function createEditor(content: string): Editor {
  return new Editor({
    extensions: [
      StarterKit.configure({
        undoRedo: false
      }),
      PageBreak
    ],
    content
  })
}

function collectTopLevelNodeNames(editor: Editor): string[] {
  const nodeNames: string[] = []
  editor.state.doc.forEach(node => {
    nodeNames.push(node.type.name)
  })
  return nodeNames
}

describe('PageBreak', () => {
  it('parses imported hr.page-break markup as a pageBreak node', () => {
    const editor = createEditor('<p>Before</p><hr class="page-break"><p>After</p>')

    try {
      expect(collectTopLevelNodeNames(editor)).toEqual(['paragraph', 'pageBreak', 'paragraph'])
      expect(editor.getHTML()).toContain('data-page-break')
      expect(editor.getHTML()).not.toContain('<hr')
    } finally {
      editor.destroy()
    }
  })

  it('parses legacy div[data-page-break] markup as a pageBreak node', () => {
    const editor = createEditor(
      '<p>Before</p><div data-page-break="" class="page-break"><div class="page-break-line"></div><span class="page-break-label">Page Break</span></div><p>After</p>'
    )

    try {
      expect(collectTopLevelNodeNames(editor)).toEqual(['paragraph', 'pageBreak', 'paragraph'])
    } finally {
      editor.destroy()
    }
  })
})
