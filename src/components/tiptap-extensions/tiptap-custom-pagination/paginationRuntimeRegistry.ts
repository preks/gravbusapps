import type { Editor } from '@tiptap/core'
import type { PagesOptions, PagesStorage } from './types'
import { HeaderFooterOverlayManager } from './headerFooterOverlay'
import type { createWindowedPaginationRenderer } from './windowedRenderer'

type WindowedRenderer = ReturnType<typeof createWindowedPaginationRenderer>

const overlayManagers = new WeakMap<object, HeaderFooterOverlayManager>()
const runtimeOptionsByEditor = new WeakMap<object, PagesOptions>()
const windowedRenderers = new WeakMap<object, WindowedRenderer>()

export function getRuntimeOptions(editor: object, fallback: PagesOptions, defaultOptions: PagesOptions): PagesOptions {
  const existing = runtimeOptionsByEditor.get(editor)
  if (existing) return existing

  const next = { ...defaultOptions, ...fallback }
  runtimeOptionsByEditor.set(editor, next)
  return next
}

export function syncEditorStorage(editor: { storage: Record<string, unknown> }, storage: PagesStorage) {
  editor.storage.pages = storage
}

function getOverlayManager(editor: object, create: () => HeaderFooterOverlayManager) {
  const existing = overlayManagers.get(editor)
  if (existing) return existing

  const next = create()
  overlayManagers.set(editor, next)
  return next
}

export function getPaginationOverlayManager(params: {
  editor: Editor
  getRuntimeOptions: () => PagesOptions
  getStorage: () => PagesStorage
}) {
  return getOverlayManager(
    params.editor,
    () => new HeaderFooterOverlayManager(params.editor, params.getRuntimeOptions, params.getStorage)
  )
}

export function getWindowedRenderer(editor: object, create: () => WindowedRenderer) {
  const existing = windowedRenderers.get(editor)
  if (existing) return existing

  const next = create()
  windowedRenderers.set(editor, next)
  return next
}

export function destroyPaginationRuntimeRegistries(editor: object) {
  overlayManagers.get(editor)?.close()
  overlayManagers.delete(editor)

  windowedRenderers.get(editor)?.destroy()
  windowedRenderers.delete(editor)

  runtimeOptionsByEditor.delete(editor)
}
