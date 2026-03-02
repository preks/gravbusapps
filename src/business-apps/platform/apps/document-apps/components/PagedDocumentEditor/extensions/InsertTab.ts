/**
 * InsertTab extension: Tab key inserts a tab character (Word-like behavior).
 * When the cursor is inside a table cell, Tab is not handled so the table
 * extension can use it for cell navigation.
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
        if (isInsideTableCell(this.editor)) return false
        return this.editor.commands.insertContent('\t')
      }
    }
  }
})

export default InsertTab
