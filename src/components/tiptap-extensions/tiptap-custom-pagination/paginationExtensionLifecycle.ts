import type { Editor } from '@tiptap/core'
import type { EditorView } from '@tiptap/pm/view'
import { clearPaginationOwnedGrowthSuppression } from './paginationRuntimeBookkeeping'
import {
  destroyPaginationRuntimeRegistries,
  getPaginationOverlayManager,
  getRuntimeOptions,
  getWindowedRenderer,
  syncEditorStorage
} from './paginationRuntimeRegistry'
import { createWindowedPaginationRenderer } from './windowedRenderer'
import type { PagesOptions, PagesStorage } from './types'

export function getMountedEditorView(editor: Editor): EditorView | null {
  const candidate = (editor as unknown as { editorView?: EditorView | null }).editorView
  return candidate ?? null
}

export function initializePaginationExtension(options: {
  editor: Editor
  storage: PagesStorage
  extensionOptions: PagesOptions
  defaultOptions: PagesOptions
  syncStorageFromOptions: (storage: PagesStorage, options: PagesOptions) => void
}) {
  const runtimeOptions = getRuntimeOptions(options.editor, options.extensionOptions, options.defaultOptions)
  const windowedRenderer = getWindowedRenderer(options.editor, () =>
    createWindowedPaginationRenderer({
      resolveCurrentEditorDom: () => getMountedEditorView(options.editor)?.dom ?? null
    })
  )

  syncEditorStorage(options.editor as unknown as { storage: Record<string, unknown> }, options.storage)
  getPaginationOverlayManager({
    editor: options.editor,
    getRuntimeOptions: () => runtimeOptions,
    getStorage: () => options.storage
  })

  options.syncStorageFromOptions(options.storage, runtimeOptions)
  options.storage.getPageCount = () => Math.max(1, options.storage.pageCount)
  windowedRenderer.syncRootPresentation({
    editorDom: options.editor.view.dom,
    options: runtimeOptions,
    storage: options.storage
  })
}

export function destroyPaginationExtension(editor: object) {
  destroyPaginationRuntimeRegistries(editor)
  clearPaginationOwnedGrowthSuppression(editor)
}
