/**
 * Default sizing for newly inserted note editor images (clamp to note content width).
 */

import type { Editor } from '@tiptap/core'
import type { CustomImageAttributes } from '@/components/tiptap-extensions/tiptap-custom-image'
import {
  buildInitialInsertedImageAttrs,
  measureLocalContentWidthPx
} from '@/business-apps/core/office/apps/documents/utils/initialInsertedImageLayout'

/** max-w-6xl (1152px) minus typical horizontal padding (40px each side). */
export const NOTE_EDITOR_CONTENT_FALLBACK_WIDTH_PX = 1072

export function resolveNoteEditorAvailableWidthPx(editor: Editor, insertPos: number): number {
  const local = measureLocalContentWidthPx(editor, insertPos)
  if (local != null && local > 0) {
    return local
  }

  const editorDom = editor.view.dom
  if (editorDom instanceof HTMLElement && editorDom.clientWidth > 0) {
    return Math.floor(editorDom.clientWidth)
  }

  return NOTE_EDITOR_CONTENT_FALLBACK_WIDTH_PX
}

export async function buildNoteInsertedImageAttrs(input: {
  src: string
  file: File
  editor: Editor
  insertPos: number
}): Promise<CustomImageAttributes> {
  return buildInitialInsertedImageAttrs({
    src: input.src,
    file: input.file,
    paginationConfig: null,
    editor: input.editor,
    insertPos: input.insertPos,
    availableWidthPx: resolveNoteEditorAvailableWidthPx(input.editor, input.insertPos)
  })
}
