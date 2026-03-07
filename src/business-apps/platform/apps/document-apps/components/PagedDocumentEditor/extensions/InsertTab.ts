/**
 * InsertTab extension: Tab inserts a tab character in text (Word-like);
 * in tables, Tab / Shift-Tab move to next/previous cell.
 */

import { Extension } from '@tiptap/core'

function isInsideTableCell(editor: {
  state: { selection: { $from: { depth: number; node: (d: number) => { type: { name: string } } } } }
}): boolean {
  const { state } = editor
  const $pos = state.selection.$from
  for (let d = $pos.depth; d > 0; d--) {
    if ($pos.node(d).type.name === 'tableCell') return true
  }
  return false
}

export const InsertTab = Extension.create({
  name: 'insertTab',

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (isInsideTableCell(this.editor)) {
          const moved = this.editor.commands.goToNextCell()
          if (moved) return true
          return this.editor.chain().addRowAfter().goToNextCell().run()
        }
        return this.editor.commands.insertContent('\t')
      },
      'Shift-Tab': () => {
        if (isInsideTableCell(this.editor)) {
          return this.editor.commands.goToPreviousCell()
        }
        return false
      }
    }
  }
})

export default InsertTab
