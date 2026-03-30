import DOMPurify from 'dompurify'
import type { Editor } from '@tiptap/react'

function getSelectionText(editor: Editor): string {
  const { from, to } = editor.state.selection
  if (from === to) return ''

  return editor.state.doc.textBetween(from, to, '\n\n', '\n')
}

export function canReadClipboard(): boolean {
  return Boolean(globalThis.navigator?.clipboard?.read || globalThis.navigator?.clipboard?.readText)
}

export function canWriteClipboard(): boolean {
  return Boolean(globalThis.navigator?.clipboard?.writeText)
}

export async function pasteClipboardContent(editor: Editor): Promise<void> {
  if (globalThis.navigator?.clipboard?.read) {
    const items = await globalThis.navigator.clipboard.read()
    for (const item of items) {
      if (item.types.includes('text/html')) {
        const blob = await item.getType('text/html')
        const html = await blob.text()
        const sanitized = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }) || ''
        if (sanitized) {
          editor.chain().focus().insertContent(sanitized).run()
          return
        }
      }
    }
  }

  if (globalThis.navigator?.clipboard?.readText) {
    const text = await globalThis.navigator.clipboard.readText()
    if (text) {
      editor.chain().focus().insertContent(text).run()
    }
  }
}

export async function pasteTextOnly(editor: Editor): Promise<void> {
  const text = await globalThis.navigator?.clipboard?.readText?.()
  if (text) {
    editor.chain().focus().insertContent(text).run()
  }
}

export async function pasteWithMergeFormatting(editor: Editor): Promise<void> {
  const text = await globalThis.navigator?.clipboard?.readText?.()
  if (text) {
    editor.chain().focus().insertText(text).run()
  }
}

export async function copySelectionToClipboard(editor: Editor): Promise<boolean> {
  if (!canWriteClipboard()) {
    return false
  }

  const text = getSelectionText(editor)
  if (!text) {
    return false
  }

  await globalThis.navigator.clipboard.writeText(text)
  return true
}

export async function cutSelectionToClipboard(editor: Editor): Promise<boolean> {
  const copied = await copySelectionToClipboard(editor)
  if (!copied) {
    return false
  }

  editor.chain().focus().deleteSelection().run()
  return true
}
