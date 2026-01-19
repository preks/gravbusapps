import { useState, useCallback } from 'react'

export interface Mention {
  id: string
  typeKey: string
  display: string
  start: number
  end: number
  raw?: any
}

export interface MentionOption {
  id: string
  typeKey: string
  typeLabel: string
  displayName: string
  subtitle?: string
  insertText: string
  raw: any
}

export function useMentions() {
  const [mentions, setMentions] = useState<Mention[]>([])

  const detectActiveMention = useCallback((text: string, caretPosition: number) => {
    const atIndex = text.lastIndexOf('@', Math.max(0, caretPosition - 1))
    if (atIndex === -1) return null

    // Ensure '@' starts a word
    if (atIndex > 0) {
      const prevChar = text.charAt(atIndex - 1)
      if (!/\s|\n|\t/.test(prevChar)) return null
    }

    const slice = text.slice(atIndex + 1, caretPosition)
    // Stop if slice contains whitespace or another '@'
    if (/[@\s\n\t]/.test(slice)) return null

    return { start: atIndex, query: slice }
  }, [])

  const updateMentionsForEdit = useCallback((oldText: string, newText: string) => {
    if (oldText === newText) return

    let start = 0
    const oldLen = oldText.length
    const newLen = newText.length
    const minLen = Math.min(oldLen, newLen)

    while (start < minLen && oldText[start] === newText[start]) start++

    let oldEnd = oldLen - 1
    let newEnd = newLen - 1

    while (oldEnd >= start && newEnd >= start && oldText[oldEnd] === newText[newEnd]) {
      oldEnd--
      newEnd--
    }

    const endOld = oldEnd + 1
    const endNew = newEnd + 1
    const delta = endNew - start - (endOld - start)

    setMentions(prev => {
      const next: Mention[] = []
      for (const m of prev) {
        if (m.end <= start) {
          next.push(m)
          continue
        }
        if (m.start >= endOld) {
          next.push({ ...m, start: m.start + delta, end: m.end + delta })
          continue
        }
        // Overlap - drop the mention
      }
      return next
    })
  }, [])

  const insertMention = useCallback(
    (selected: MentionOption, mentionStartIdx: number, caretPosition: number, currentValue: string) => {
      const before = currentValue.slice(0, mentionStartIdx)
      const after = currentValue.slice(caretPosition)
      const display = selected.insertText
      const replaced = `${before}${display} ${after}`
      const newStart = before.length
      const newEnd = newStart + display.length

      setMentions(prev => [
        ...prev,
        {
          id: selected.id,
          typeKey: selected.typeKey,
          display,
          start: newStart,
          end: newEnd,
          raw: selected.raw
        }
      ])

      return {
        newValue: replaced,
        newCaretPosition: (before + display + ' ').length
      }
    },
    []
  )

  const clearMentions = useCallback(() => {
    setMentions([])
  }, [])

  return {
    mentions,
    detectActiveMention,
    updateMentionsForEdit,
    insertMention,
    clearMentions
  }
}
