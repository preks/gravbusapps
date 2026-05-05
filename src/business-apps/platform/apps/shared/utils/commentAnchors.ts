import type { Editor } from '@tiptap/core'

type InlineCommentMeta = {
  selectionStart?: number
  selectionEnd?: number
  selectedText?: string
}

export type PanelCommentAnchor = {
  editor: Editor
  from: number
  to: number
  selectedText: string
}

function isWordChar(char: string): boolean {
  return /[\p{L}\p{M}\p{N}_]/u.test(char)
}

export function findWordRangeAtCursor(
  editor: Editor,
  pos: number
): {
  from: number
  to: number
} | null {
  const doc = editor.state.doc
  const $pos = doc.resolve(pos)
  const parent = $pos.parent
  if (!parent.isTextblock || parent.isLeaf) return null

  const start = $pos.start()
  const text = parent.textContent
  const len = text.length
  const offset = Math.min(Math.max(0, pos - start), len)

  const bounds = (index: number): { from: number; to: number } | null => {
    if (index < 0 || index >= len || !isWordChar(text[index]!)) return null

    let left = index
    let right = index + 1

    while (left > 0 && isWordChar(text[left - 1]!)) left--
    while (right < len && isWordChar(text[right]!)) right++

    const from = start + left
    const to = start + right
    return to > from ? { from, to } : null
  }

  const direct = bounds(offset)
  if (direct) return direct

  if (offset > 0) {
    const previous = bounds(offset - 1)
    if (previous) return previous
  }

  if (offset < len) {
    return bounds(offset)
  }

  return null
}

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

    return {
      editor,
      from: word.from,
      to: word.to,
      selectedText
    }
  }

  return null
}

export function findInlineCommentSelection(
  editor: { state: { doc: any } },
  commentId: string,
  comment?: InlineCommentMeta | null
): { from: number; to: number } | null {
  const { doc } = editor.state
  const ranges: Array<{ from: number; to: number }> = []

  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return

    for (const mark of node.marks ?? []) {
      if (mark?.type?.name === 'inlineComment' && mark?.attrs?.commentId === commentId) {
        ranges.push({ from: pos, to: pos + node.nodeSize })
        break
      }
    }
  })

  const docSize = doc.content.size
  const tryStoredRange = (): { from: number; to: number } | null => {
    if (
      comment?.selectionStart == null ||
      comment?.selectionEnd == null ||
      comment.selectionEnd <= comment.selectionStart
    ) {
      return null
    }

    const from = Math.max(0, Math.min(comment.selectionStart, docSize))
    const to = Math.max(from, Math.min(comment.selectionEnd, docSize))
    return to > from ? { from, to } : null
  }

  if (!ranges.length) {
    return tryStoredRange()
  }

  ranges.sort((a, b) => a.from - b.from)
  const merged: Array<{ from: number; to: number }> = []

  for (const range of ranges) {
    const previous = merged[merged.length - 1]
    if (previous && range.from <= previous.to) {
      previous.to = Math.max(previous.to, range.to)
    } else {
      merged.push({ ...range })
    }
  }

  if (merged.length > 1) {
    const stored = tryStoredRange()
    if (stored) return stored

    return merged
      .slice(1)
      .reduce(
        (current, candidate) => (candidate.to - candidate.from > current.to - current.from ? candidate : current),
        merged[0]
      )
  }

  const single = merged[0]
  const expectedLength = comment?.selectedText?.trim().length ?? 0
  const markLength = single.to - single.from

  if (expectedLength > 0 && markLength < expectedLength * 0.85) {
    const stored = tryStoredRange()
    if (stored && stored.to - stored.from >= expectedLength * 0.85) {
      return stored
    }
  }

  return single
}
