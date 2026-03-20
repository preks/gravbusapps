import type { Editor } from '@tiptap/core'

export type PanelCommentAnchor = {
  editor: Editor
  from: number
  to: number
  selectedText: string
}

function isWordChar(char: string): boolean {
  return /[\p{L}\p{M}\p{N}_]/u.test(char)
}

/**
 * Word (or number/underscore run) at cursor for empty selection; null if not in/on a word.
 */
export function findWordRangeAtCursor(editor: Editor, pos: number): { from: number; to: number } | null {
  const doc = editor.state.doc
  const $pos = doc.resolve(pos)
  const parent = $pos.parent
  if (!parent.isTextblock || parent.isLeaf) return null

  const start = $pos.start()
  const text = parent.textContent
  const len = text.length
  const offset = Math.min(Math.max(0, pos - start), len)

  const bounds = (i: number): { from: number; to: number } | null => {
    if (i < 0 || i >= len || !isWordChar(text[i]!)) return null
    let left = i
    let right = i + 1
    while (left > 0 && isWordChar(text[left - 1]!)) left--
    while (right < len && isWordChar(text[right]!)) right++
    const from = start + left
    const to = start + right
    return to > from ? { from, to } : null
  }

  const direct = bounds(offset)
  if (direct) return direct
  if (offset > 0) {
    const prev = bounds(offset - 1)
    if (prev) return prev
  }
  if (offset < len) {
    return bounds(offset)
  }
  return null
}

/**
 * Range for a new comment from the panel: non-empty selection, else word at cursor.
 */
export function computePanelCommentAnchor(editor: Editor | null): PanelCommentAnchor | null {
  if (!editor || editor.isDestroyed) return null

  const { from, to, empty } = editor.state.selection
  const doc = editor.state.doc
  const docSize = doc.content.size

  if (!empty && to > from && from >= 0 && to <= docSize) {
    const selectedText = doc.textBetween(from, to, '\n', ' ')
    if (!selectedText.trim()) return null
    return { editor, from, to, selectedText }
  }

  const word = findWordRangeAtCursor(editor, from)
  if (word && word.to > word.from && word.from >= 0 && word.to <= docSize) {
    const selectedText = doc.textBetween(word.from, word.to, '\n', ' ')
    if (!selectedText.trim()) return null
    return { editor, from: word.from, to: word.to, selectedText }
  }

  return null
}
