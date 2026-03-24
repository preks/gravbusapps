import type { Editor } from '@tiptap/core'

/**
 * Tab in document editors: navigate table cells (Shift+Tab previous) or insert a tab character.
 * Matches main PagedDocumentEditor body behavior for header/footer overlays and the primary editor.
 */
export function handleTiptapTabKey(event: KeyboardEvent, editor: Editor | null | undefined): boolean {
  if (event.key !== 'Tab') return false
  event.preventDefault()
  if (!editor) return true

  const $from = editor.state.selection.$from
  let inTableCell = false
  for (let d = $from.depth; d > 0; d--) {
    const nodeName = $from.node(d).type.name
    if (nodeName === 'tableCell' || nodeName === 'tableHeader') {
      inTableCell = true
      break
    }
  }

  if (inTableCell) {
    if (event.shiftKey) {
      editor.commands.goToPreviousCell()
    } else {
      const moved = editor.commands.goToNextCell()
      if (!moved) editor.chain().addRowAfter().goToNextCell().run()
    }
  } else if (!event.shiftKey) {
    editor.commands.insertContent('\t')
  }

  return true
}
