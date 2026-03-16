import { Editor, Extension } from '@tiptap/core'
import type { Node as PMNode } from 'prosemirror-model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import {
  AddMarkStep,
  AttrStep,
  RemoveMarkStep,
  RemoveNodeMarkStep,
  ReplaceAroundStep,
  ReplaceStep
} from '@tiptap/pm/transform'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import {
  createFirstPageHeader,
  createPaginationWrapper,
  ensurePagesStyles,
  applyRootStyles,
  refreshPageMinHeight
} from './dom'
import { HeaderFooterOverlayManager } from './headerFooterOverlay'
import type {
  OpenHeaderFooterEditorParams,
  PageFormatInput,
  PagesHeaderFooter,
  PagesOptionUpdates,
  PagesOptions,
  PagesStorage
} from './types'
import {
  calculatePageCount,
  createStorageFromOptions,
  getHeaderFooterExtensions,
  getInitialEditorContent,
  getPageLayoutHeights,
  getPageSpacerHeight,
  getExistingPageCount,
  measureHeaderFooterContentHeights,
  resolvePageFormat,
  syncStorageFromOptions
} from './utils'

const REFRESH_META = 'RM_PAGES_REFRESH'
const paginationKey = new PluginKey<DecorationSet>('rm-pages-pagination')
const hardBreakKey = new PluginKey<DecorationSet>('rm-pages-hard-breaks')
const overlayManagers = new WeakMap<object, HeaderFooterOverlayManager>()
const runtimeOptions = new WeakMap<object, PagesOptions>()

function getRuntimeOptions(editor: object, fallback: PagesOptions): PagesOptions {
  const existing = runtimeOptions.get(editor)
  if (existing) return existing

  const next = { ...defaultOptions, ...fallback }
  runtimeOptions.set(editor, next)
  return next
}

function syncEditorStorage(editor: { storage: Record<string, unknown> }, storage: PagesStorage) {
  editor.storage.pages = storage
}

function getOverlayManager(editor: object, create: () => HeaderFooterOverlayManager) {
  const existing = overlayManagers.get(editor)
  if (existing) return existing

  const next = create()
  overlayManagers.set(editor, next)
  return next
}

function getMountedEditorView(editor: Editor): EditorView | null {
  const candidate = (editor as unknown as { editorView?: EditorView | null }).editorView
  return candidate ?? null
}

function applyMeasuredPageHeightsToView(view: EditorView, storage: PagesStorage, options: PagesOptions) {
  const pageCount = Math.max(1, getExistingPageCount(view) || storage.pageCount)
  const measured = measureHeaderFooterContentHeights(view.dom, pageCount, storage.pageFormat, storage)
  let smallestBodyHeight = Number.POSITIVE_INFINITY

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const headerHeight = measured.headerHeights.get(pageNumber) ?? options.headerHeight
    const footerHeight = measured.footerHeights.get(pageNumber) ?? options.footerHeight
    const layout = getPageLayoutHeights(storage.pageFormat, storage, headerHeight, footerHeight)

    smallestBodyHeight = Math.min(smallestBodyHeight, layout.bodyHeight)
    view.dom.style.setProperty(
      `--rm-page-content-${pageNumber}`,
      `${getPageSpacerHeight(storage.pageFormat, storage, pageNumber, headerHeight, footerHeight)}px`
    )
  }

  const firstPageHeaderHeight = measured.headerHeights.get(1) ?? options.headerHeight
  const firstPageFooterHeight = measured.footerHeights.get(1) ?? options.footerHeight
  const generalPageNumber = Math.max(2, pageCount + 1)
  const generalHeaderHeight = measured.headerHeights.get(generalPageNumber) ?? options.headerHeight
  const generalFooterHeight = measured.footerHeights.get(generalPageNumber) ?? options.footerHeight

  view.dom.style.setProperty(
    '--rm-page-content-first',
    `${getPageSpacerHeight(storage.pageFormat, storage, 1, firstPageHeaderHeight, firstPageFooterHeight)}px`
  )
  view.dom.style.setProperty(
    '--rm-page-content-general',
    `${getPageSpacerHeight(storage.pageFormat, storage, generalPageNumber, generalHeaderHeight, generalFooterHeight)}px`
  )

  if (Number.isFinite(smallestBodyHeight)) {
    view.dom.style.setProperty('--rm-max-content-child-height', `${Math.max(1, smallestBodyHeight - 10)}px`)
  }

  return measured
}

function getMeasuredPageCount(
  view: EditorView,
  storage: PagesStorage,
  options: PagesOptions,
  measured: ReturnType<typeof applyMeasuredPageHeightsToView>
) {
  return calculatePageCount(view, storage.pageFormat, options.pageGap, {
    storage,
    headerHeights: measured.headerHeights,
    footerHeights: measured.footerHeights,
    defaultHeaderHeight: options.headerHeight,
    defaultFooterHeight: options.footerHeight
  })
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pages: {
      setPagesOptions: (updates: PagesOptionUpdates) => ReturnType
      setPageFormat: (pageFormat: PageFormatInput) => ReturnType
      setHeader: (header: PagesHeaderFooter) => ReturnType
      setFooter: (footer: PagesHeaderFooter) => ReturnType
      setHeaderTopMargin: (margin: number) => ReturnType
      setFooterBottomMargin: (margin: number) => ReturnType
      setDifferentFirstPage: (enabled: boolean) => ReturnType
      setHeaderFirstPage: (header: PagesHeaderFooter) => ReturnType
      setFooterFirstPage: (footer: PagesHeaderFooter) => ReturnType
      setDifferentOddEven: (enabled: boolean) => ReturnType
      setHeaderOdd: (header: PagesHeaderFooter) => ReturnType
      setHeaderEven: (header: PagesHeaderFooter) => ReturnType
      setFooterOdd: (footer: PagesHeaderFooter) => ReturnType
      setFooterEven: (footer: PagesHeaderFooter) => ReturnType
      openHeaderEditor: (params: OpenHeaderFooterEditorParams) => ReturnType
      openFooterEditor: (params: OpenHeaderFooterEditorParams) => ReturnType
      closeHeaderFooterEditors: () => ReturnType
      closeHeaderEditor: () => ReturnType
      closeFooterEditor: () => ReturnType
      setAccentColor: (color: string) => ReturnType
      setHeaderAccentColor: (color: string) => ReturnType
      setFooterAccentColor: (color: string) => ReturnType
    }
  }

  interface Storage {
    pages: PagesStorage
  }
}

function buildHardBreakDecorations(doc: PMNode): DecorationSet {
  const decorations: Decoration[] = []

  doc.descendants((node, pos) => {
    if (node.type.name !== 'hardBreak') return

    decorations.push(
      Decoration.widget(pos + 1, () => {
        const element = document.createElement('span')
        element.classList.add('rm-br-decoration')
        return element
      })
    )
  })

  return DecorationSet.create(doc, decorations)
}

const defaultOptions: PagesOptions = {
  pageFormat: 'A4',
  headerHeight: 50,
  footerHeight: 50,
  pageGap: 50,
  pageBreakBackground: '#f3f4f6',
  header: '',
  footer: '{page}',
  differentFirstPage: false,
  differentOddEven: false,
  accentColor: '#6366f1'
}

export const Pages = Extension.create<PagesOptions, PagesStorage>({
  name: 'pages',

  addOptions() {
    return defaultOptions
  },

  addStorage() {
    return createStorageFromOptions(defaultOptions)
  },

  onCreate() {
    const storage = this.storage
    syncEditorStorage(this.editor as unknown as { storage: Record<string, unknown> }, storage)
    runtimeOptions.set(this.editor, { ...defaultOptions, ...this.options })
    getOverlayManager(
      this.editor,
      () =>
        new HeaderFooterOverlayManager(
          this.editor,
          () => getRuntimeOptions(this.editor, this.options),
          () => storage
        )
    )

    syncStorageFromOptions(storage, getRuntimeOptions(this.editor, this.options))
    storage.getPageCount = () => Math.max(1, storage.pageCount)

    ensurePagesStyles(this.editor.view.dom.ownerDocument)
    applyRootStyles(this.editor.view.dom, storage.pageFormat, getRuntimeOptions(this.editor, this.options))
  },

  onDestroy() {
    overlayManagers.get(this.editor)?.close()
    overlayManagers.delete(this.editor)
    runtimeOptions.delete(this.editor)
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    const extensionOptions = this.options
    let measuredHeaderHeights = new Map<number, number>()
    let measuredFooterHeights = new Map<number, number>()
    let refreshQueued = false

    const requestRefresh = (view: EditorView) => {
      const transaction = view.state.tr.setMeta(REFRESH_META, true)
      view.dispatch(transaction)
    }

    const queueRefresh = (view: EditorView) => {
      if (refreshQueued) return
      refreshQueued = true

      queueMicrotask(() => {
        refreshQueued = false
        if ((view as EditorView & { isDestroyed?: boolean }).isDestroyed) return
        requestRefresh(view)
      })
    }

    const openEditor = (type: 'header' | 'footer', pageNumber: number, target: HTMLElement) => {
      const storage = this.storage
      const options = getRuntimeOptions(editor, extensionOptions)
      const overlayManager = getOverlayManager(
        editor,
        () =>
          new HeaderFooterOverlayManager(
            editor,
            () => getRuntimeOptions(editor, extensionOptions),
            () => storage
          )
      )

      const totalPages = storage.getPageCount()
      overlayManager.open({
        type,
        pageNumber,
        target,
        initialContent: getInitialEditorContent(storage, options, type, pageNumber, totalPages),
        storage,
        options,
        extensions: getHeaderFooterExtensions(options.headerFooterExtensions),
        onUpdate: () => {
          const mountedView = getMountedEditorView(editor)
          if (!mountedView) return

          const measured = applyMeasuredPageHeightsToView(mountedView, storage, options)
          measuredHeaderHeights = measured.headerHeights
          measuredFooterHeights = measured.footerHeights
          const currentPageCount = Math.max(1, getExistingPageCount(mountedView) || storage.pageCount)
          const measuredPageCount = getMeasuredPageCount(mountedView, storage, options, measured)
          storage.pageCount = currentPageCount

          if (measuredPageCount !== currentPageCount) {
            storage.pageCount = measuredPageCount
            queueRefresh(mountedView)
          }

          refreshPageMinHeight(mountedView.dom)
        },
        onClose: () => {
          const mountedView = getMountedEditorView(editor)
          if (!mountedView) return
          requestRefresh(mountedView)
        }
      })
    }

    const buildPageDecorations = (): DecorationSet =>
      DecorationSet.create(editor.state.doc, [
        Decoration.widget(
          0,
          view => {
            const storage = this.storage
            const options = getRuntimeOptions(editor, extensionOptions)
            syncStorageFromOptions(storage, options)
            const totalPages = calculatePageCount(view, storage.pageFormat, options.pageGap, {
              storage,
              headerHeights: measuredHeaderHeights,
              footerHeights: measuredFooterHeights,
              defaultHeaderHeight: options.headerHeight,
              defaultFooterHeight: options.footerHeight
            })
            storage.pageCount = totalPages

            return createPaginationWrapper({
              totalPages,
              pageFormat: storage.pageFormat,
              options,
              storage,
              extensions: getHeaderFooterExtensions(options.headerFooterExtensions),
              onOpenEditor: openEditor
            })
          },
          { side: -1 }
        ),
        Decoration.widget(
          0,
          view => {
            const storage = this.storage
            const options = getRuntimeOptions(editor, extensionOptions)
            const totalPages = Math.max(
              storage.pageCount,
              calculatePageCount(view, storage.pageFormat, options.pageGap, {
                storage,
                headerHeights: measuredHeaderHeights,
                footerHeights: measuredFooterHeights,
                defaultHeaderHeight: options.headerHeight,
                defaultFooterHeight: options.footerHeight
              })
            )

            return createFirstPageHeader({
              totalPages,
              pageFormat: storage.pageFormat,
              options,
              storage,
              extensions: getHeaderFooterExtensions(options.headerFooterExtensions),
              onOpenEditor: openEditor
            })
          },
          { side: -1 }
        )
      ])

    return [
      new Plugin({
        key: paginationKey,
        state: {
          init: () => buildPageDecorations(),
          apply: (tr, oldValue) => (tr.docChanged || tr.getMeta(REFRESH_META) ? buildPageDecorations() : oldValue)
        },
        props: {
          decorations(state) {
            return paginationKey.getState(state) ?? DecorationSet.empty
          }
        },
        view: () => ({
          update: updatedView => {
            const storage = this.storage
            const options = getRuntimeOptions(editor, extensionOptions)
            syncStorageFromOptions(storage, options)
            applyRootStyles(updatedView.dom, storage.pageFormat, options)
            const measured = applyMeasuredPageHeightsToView(updatedView, storage, options)
            measuredHeaderHeights = measured.headerHeights
            measuredFooterHeights = measured.footerHeights

            const currentPageCount = Math.max(1, getExistingPageCount(updatedView) || storage.pageCount)
            const measuredPageCount = getMeasuredPageCount(updatedView, storage, options, measured)

            storage.pageCount = currentPageCount
            if (measuredPageCount !== currentPageCount) {
              storage.pageCount = measuredPageCount
              queueRefresh(updatedView)
              return
            }

            refreshPageMinHeight(updatedView.dom)
          }
        })
      }),
      new Plugin({
        key: hardBreakKey,
        state: {
          init: (_, state) => buildHardBreakDecorations(state.doc),
          apply(tr, oldValue) {
            if (
              tr.docChanged ||
              tr.steps.some(step => step instanceof ReplaceStep) ||
              tr.steps.some(step => step instanceof ReplaceAroundStep) ||
              tr.steps.some(step => step instanceof AddMarkStep) ||
              tr.steps.some(step => step instanceof RemoveMarkStep) ||
              tr.steps.some(step => step instanceof RemoveNodeMarkStep) ||
              tr.steps.some(step => step instanceof AttrStep)
            ) {
              return buildHardBreakDecorations(tr.doc)
            }

            return oldValue
          }
        },
        props: {
          decorations(state) {
            return hardBreakKey.getState(state) ?? DecorationSet.empty
          }
        }
      })
    ]
  },

  addCommands() {
    const extensionOptions = this.options

    const refresh = (editor: typeof this.editor) => {
      const storage = editor.storage.pages as PagesStorage
      const options = getRuntimeOptions(editor, extensionOptions)
      syncStorageFromOptions(storage, options)
      syncEditorStorage(editor as unknown as { storage: Record<string, unknown> }, storage)
      const view = getMountedEditorView(editor)
      if (!view) return true

      applyRootStyles(view.dom, storage.pageFormat, options)
      view.dispatch(editor.state.tr.setMeta(REFRESH_META, true))
      return true
    }

    const closeOverlay = (editor: typeof this.editor) => {
      getOverlayManager(
        editor,
        () =>
          new HeaderFooterOverlayManager(
            editor,
            () => getRuntimeOptions(editor, extensionOptions),
            () => editor.storage.pages as PagesStorage
          )
      ).close()
    }

    const openEditorByType = (editor: typeof this.editor, type: 'header' | 'footer', pageNumber: number) => {
      const storage = editor.storage.pages as PagesStorage
      const options = getRuntimeOptions(editor, extensionOptions)
      const totalPages = storage.getPageCount()
      if (pageNumber < 1 || pageNumber > totalPages) return false
      const view = getMountedEditorView(editor)
      if (!view) return false

      const selector = `[data-rm-editor-type="${type}"][data-rm-page-number="${pageNumber}"]`
      const target = view.dom.querySelector(selector) as HTMLElement | null
      if (!target) return false

      const overlayManager = getOverlayManager(
        editor,
        () =>
          new HeaderFooterOverlayManager(
            editor,
            () => getRuntimeOptions(editor, extensionOptions),
            () => editor.storage.pages as PagesStorage
          )
      )

      overlayManager.open({
        type,
        pageNumber,
        target,
        initialContent: getInitialEditorContent(storage, options, type, pageNumber, totalPages),
        storage,
        options,
        extensions: getHeaderFooterExtensions(options.headerFooterExtensions),
        onUpdate: () => {
          const mountedView = getMountedEditorView(editor)
          if (!mountedView) return

          const measured = applyMeasuredPageHeightsToView(mountedView, storage, options)
          const currentPageCount = Math.max(1, getExistingPageCount(mountedView) || storage.pageCount)
          const measuredPageCount = getMeasuredPageCount(mountedView, storage, options, measured)
          storage.pageCount = currentPageCount

          if (measuredPageCount !== currentPageCount) {
            storage.pageCount = measuredPageCount
            refresh(editor)
            return
          }

          refreshPageMinHeight(mountedView.dom)
        },
        onClose: () => refresh(editor)
      })

      return true
    }

    const applyOptionUpdates = (editor: typeof this.editor, updates: PagesOptionUpdates) => {
      const options = getRuntimeOptions(editor, extensionOptions)

      if (updates.pageFormat !== undefined) {
        const storage = editor.storage.pages as PagesStorage
        options.pageFormat = updates.pageFormat
        storage.pageFormat = resolvePageFormat(updates.pageFormat)
        syncEditorStorage(editor as unknown as { storage: Record<string, unknown> }, storage)
        options.onPageFormatChange?.(storage.pageFormat)
      }
      if (updates.header !== undefined) options.header = updates.header
      if (updates.footer !== undefined) options.footer = updates.footer
      if (updates.headerTopMargin !== undefined) options.headerTopMargin = updates.headerTopMargin
      if (updates.footerBottomMargin !== undefined) options.footerBottomMargin = updates.footerBottomMargin
      if (updates.differentFirstPage !== undefined) options.differentFirstPage = updates.differentFirstPage
      if (updates.headerFirstPage !== undefined) options.headerFirstPage = updates.headerFirstPage
      if (updates.footerFirstPage !== undefined) options.footerFirstPage = updates.footerFirstPage
      if (updates.differentOddEven !== undefined) options.differentOddEven = updates.differentOddEven
      if (updates.headerOdd !== undefined) options.headerOdd = updates.headerOdd
      if (updates.headerEven !== undefined) options.headerEven = updates.headerEven
      if (updates.footerOdd !== undefined) options.footerOdd = updates.footerOdd
      if (updates.footerEven !== undefined) options.footerEven = updates.footerEven
      if (updates.accentColor !== undefined) options.accentColor = updates.accentColor
      if (updates.headerAccentColor !== undefined) options.headerAccentColor = updates.headerAccentColor
      if (updates.footerAccentColor !== undefined) options.footerAccentColor = updates.footerAccentColor
    }

    return {
      setPagesOptions:
        updates =>
        ({ editor }) => {
          closeOverlay(editor)
          applyOptionUpdates(editor, updates)
          getOverlayManager(
            editor,
            () =>
              new HeaderFooterOverlayManager(
                editor,
                () => getRuntimeOptions(editor, extensionOptions),
                () => editor.storage.pages as PagesStorage
              )
          ).updateAccentColor()
          return refresh(editor)
        },
      setPageFormat:
        pageFormat =>
        ({ editor }) => {
          closeOverlay(editor)
          applyOptionUpdates(editor, { pageFormat })
          return refresh(editor)
        },
      setHeader:
        header =>
        ({ editor }) => {
          applyOptionUpdates(editor, { header })
          return refresh(editor)
        },
      setFooter:
        footer =>
        ({ editor }) => {
          applyOptionUpdates(editor, { footer })
          return refresh(editor)
        },
      setHeaderTopMargin:
        margin =>
        ({ editor }) => {
          applyOptionUpdates(editor, { headerTopMargin: margin })
          return refresh(editor)
        },
      setFooterBottomMargin:
        margin =>
        ({ editor }) => {
          applyOptionUpdates(editor, { footerBottomMargin: margin })
          return refresh(editor)
        },
      setDifferentFirstPage:
        enabled =>
        ({ editor }) => {
          closeOverlay(editor)
          applyOptionUpdates(editor, { differentFirstPage: enabled })
          return refresh(editor)
        },
      setHeaderFirstPage:
        header =>
        ({ editor }) => {
          applyOptionUpdates(editor, { headerFirstPage: header })
          return refresh(editor)
        },
      setFooterFirstPage:
        footer =>
        ({ editor }) => {
          applyOptionUpdates(editor, { footerFirstPage: footer })
          return refresh(editor)
        },
      setDifferentOddEven:
        enabled =>
        ({ editor }) => {
          closeOverlay(editor)
          applyOptionUpdates(editor, { differentOddEven: enabled })
          return refresh(editor)
        },
      setHeaderOdd:
        header =>
        ({ editor }) => {
          applyOptionUpdates(editor, { headerOdd: header })
          return refresh(editor)
        },
      setHeaderEven:
        header =>
        ({ editor }) => {
          applyOptionUpdates(editor, { headerEven: header })
          return refresh(editor)
        },
      setFooterOdd:
        footer =>
        ({ editor }) => {
          applyOptionUpdates(editor, { footerOdd: footer })
          return refresh(editor)
        },
      setFooterEven:
        footer =>
        ({ editor }) => {
          applyOptionUpdates(editor, { footerEven: footer })
          return refresh(editor)
        },
      openHeaderEditor:
        ({ pageNumber }) =>
        ({ editor }) =>
          openEditorByType(editor, 'header', pageNumber),
      openFooterEditor:
        ({ pageNumber }) =>
        ({ editor }) =>
          openEditorByType(editor, 'footer', pageNumber),
      closeHeaderFooterEditors:
        () =>
        ({ editor }) => {
          closeOverlay(editor)
          return refresh(editor)
        },
      closeHeaderEditor:
        () =>
        ({ editor }) => {
          if ((editor.storage.pages as PagesStorage).activeEditorType !== 'header') return false
          closeOverlay(editor)
          return refresh(editor)
        },
      closeFooterEditor:
        () =>
        ({ editor }) => {
          if ((editor.storage.pages as PagesStorage).activeEditorType !== 'footer') return false
          closeOverlay(editor)
          return refresh(editor)
        },
      setAccentColor:
        color =>
        ({ editor }) => {
          getRuntimeOptions(editor, extensionOptions).accentColor = color
          getOverlayManager(
            editor,
            () =>
              new HeaderFooterOverlayManager(
                editor,
                () => getRuntimeOptions(editor, extensionOptions),
                () => editor.storage.pages as PagesStorage
              )
          ).updateAccentColor()
          return true
        },
      setHeaderAccentColor:
        color =>
        ({ editor }) => {
          getRuntimeOptions(editor, extensionOptions).headerAccentColor = color
          getOverlayManager(
            editor,
            () =>
              new HeaderFooterOverlayManager(
                editor,
                () => getRuntimeOptions(editor, extensionOptions),
                () => editor.storage.pages as PagesStorage
              )
          ).updateAccentColor()
          return true
        },
      setFooterAccentColor:
        color =>
        ({ editor }) => {
          getRuntimeOptions(editor, extensionOptions).footerAccentColor = color
          getOverlayManager(
            editor,
            () =>
              new HeaderFooterOverlayManager(
                editor,
                () => getRuntimeOptions(editor, extensionOptions),
                () => editor.storage.pages as PagesStorage
              )
          ).updateAccentColor()
          return true
        }
    }
  }
})

export const PaginationPlus = Pages
export type PaginationPlusOptions = PagesOptions
export type PaginationPlusStorage = PagesStorage
