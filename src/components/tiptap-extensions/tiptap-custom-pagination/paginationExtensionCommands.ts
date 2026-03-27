import type { CommandProps, Editor } from '@tiptap/core'
import { applyMeasuredPageHeightsToView } from './paginationLayoutHelpers'
import { clearPaginationOwnedGrowthSuppression } from './paginationRuntimeBookkeeping'
import {
  getPaginationOverlayManager,
  getRuntimeOptions,
  getWindowedRenderer,
  syncEditorStorage
} from './paginationRuntimeRegistry'
import {
  createPaginationCommandController,
  requestViewportPageFocus as focusPaginationViewportPage
} from './paginationCommandController'
import {
  applyPaginationOptionRefresh,
  closePaginationOverlayAndRefresh,
  updatePaginationOverlayAccentColor
} from './overlayCommandController'
import { applyPaginationOverlayOptionRefresh, resolveActivePaginationOverlayEditor } from './overlayLifecycleController'
import { applyPaginationOptionUpdates } from './paginationOptionsController'
import { createWindowedPaginationRenderer } from './windowedRenderer'
import { getMountedEditorView } from './paginationExtensionLifecycle'
import type {
  OpenHeaderFooterEditorParams,
  PageFormatInput,
  PagesHeaderFooter,
  PagesOptionUpdates,
  PagesOptions,
  PagesStorage
} from './types'

function updatesAffectPageNumberOptions(updates: PagesOptionUpdates) {
  return (
    updates.pageNumberRegion !== undefined ||
    updates.pageNumberNumeralStyle !== undefined ||
    updates.pageNumberStartAt !== undefined ||
    updates.pageNumberAlignment !== undefined ||
    updates.pageNumberShowOnFirstPage !== undefined
  )
}

/**
 * Pagination `refresh()` dispatches its own transaction. Tiptap's `editor.commands.*` reuses one
 * chain `tr` from when `.commands` was read and dispatches it after the command returns; after an
 * internal refresh the doc has advanced, so that outer `tr` is stale and ProseMirror throws
 * "Applying a mismatched transaction".
 */
function suppressStaleOuterCommandDispatch(tr: CommandProps['tr']): void {
  tr.setMeta('preventDispatch', true)
}

export function createPaginationExtensionCommands(options: {
  editor: Editor
  extensionOptions: PagesOptions
  defaultOptions: PagesOptions
  refreshMeta: string
  refreshAndStabilizeMeta: string
  syncStorageFromOptions: (storage: PagesStorage, options: PagesOptions) => void
}) {
  const { editor: extensionEditor, extensionOptions, defaultOptions } = options
  const windowedRenderer = getWindowedRenderer(extensionEditor, () =>
    createWindowedPaginationRenderer({
      resolveCurrentEditorDom: () => getMountedEditorView(extensionEditor)?.dom ?? null
    })
  )
  const getCommandOverlayManager = (editor: Editor) =>
    getPaginationOverlayManager({
      editor,
      getRuntimeOptions: () => getRuntimeOptions(editor, extensionOptions, defaultOptions),
      getStorage: () => editor.storage.pages
    })
  const commandController = createPaginationCommandController({
    getRuntimeOptions: editor => getRuntimeOptions(editor, extensionOptions, defaultOptions),
    getMountedEditorView,
    getOverlayManager: getCommandOverlayManager,
    syncStorageFromOptions: options.syncStorageFromOptions,
    syncEditorStorage,
    clearGrowthSuppression: clearPaginationOwnedGrowthSuppression,
    applyMeasuredPageHeightsToView,
    windowedRenderer,
    refreshMeta: options.refreshMeta,
    refreshAndStabilizeMeta: options.refreshAndStabilizeMeta
  })
  const {
    refresh,
    refreshAndStabilize,
    hydratePageBreakShells,
    closeOverlay,
    reopenActiveEditorAfterRefresh,
    openEditorByType
  } = commandController

  const applyOptionUpdates = (editor: Editor, updates: PagesOptionUpdates) => {
    const runtimeOptions = getRuntimeOptions(editor, extensionOptions, defaultOptions)
    const storage = editor.storage.pages

    applyPaginationOptionUpdates({
      updates,
      runtimeOptions,
      storage,
      onSyncEditorStorage: () => {
        syncEditorStorage(editor as unknown as { storage: Record<string, unknown> }, storage)
      }
    })
  }

  return {
    refreshPages:
      () =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return refresh(editor)
      },
    refreshPagesAndStabilize:
      () =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return refreshAndStabilize(editor)
      },
    hydratePageBreakShells:
      (pageNumbers: number[]) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return hydratePageBreakShells(editor, pageNumbers)
      },
    requestViewportPageFocus:
      (pageNumber: number) =>
      ({ editor }: { editor: Editor }) => {
        const view = getMountedEditorView(editor)
        if (!view) return false
        return focusPaginationViewportPage(view.dom, pageNumber)
      },
    setPagesOptions:
      (updates: PagesOptionUpdates) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        const storage = editor.storage.pages
        const activeEditor = updatesAffectPageNumberOptions(updates)
          ? resolveActivePaginationOverlayEditor(storage)
          : null
        const overlayManager = getCommandOverlayManager(editor)

        return applyPaginationOverlayOptionRefresh({
          activeEditor,
          overlayManager,
          closeOverlay: () => {
            closeOverlay(editor)
          },
          applyUpdates: () => {
            applyOptionUpdates(editor, updates)
          },
          refresh: () => refresh(editor),
          reopenActiveEditor: preservedActiveEditor => {
            reopenActiveEditorAfterRefresh(editor, preservedActiveEditor)
          }
        })
      },
    setPageFormat:
      (pageFormat: PageFormatInput) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return applyPaginationOptionRefresh({
          shouldCloseOverlay: true,
          closeOverlay: () => closeOverlay(editor),
          applyUpdates: () => applyOptionUpdates(editor, { pageFormat }),
          refresh: () => refresh(editor)
        })
      },
    setHeader:
      (header: PagesHeaderFooter) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return applyPaginationOptionRefresh({
          closeOverlay: () => closeOverlay(editor),
          applyUpdates: () => applyOptionUpdates(editor, { header }),
          refresh: () => refresh(editor)
        })
      },
    setFooter:
      (footer: PagesHeaderFooter) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return applyPaginationOptionRefresh({
          closeOverlay: () => closeOverlay(editor),
          applyUpdates: () => applyOptionUpdates(editor, { footer }),
          refresh: () => refresh(editor)
        })
      },
    setHeaderTopMargin:
      (margin: number) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return applyPaginationOptionRefresh({
          closeOverlay: () => closeOverlay(editor),
          applyUpdates: () => applyOptionUpdates(editor, { headerTopMargin: margin }),
          refresh: () => refresh(editor)
        })
      },
    setFooterBottomMargin:
      (margin: number) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return applyPaginationOptionRefresh({
          closeOverlay: () => closeOverlay(editor),
          applyUpdates: () => applyOptionUpdates(editor, { footerBottomMargin: margin }),
          refresh: () => refresh(editor)
        })
      },
    setPaginationDocumentTitle:
      (title: string) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return applyPaginationOptionRefresh({
          closeOverlay: () => closeOverlay(editor),
          applyUpdates: () => applyOptionUpdates(editor, { documentTitle: title }),
          refresh: () => refresh(editor)
        })
      },
    setDifferentFirstPage:
      (enabled: boolean) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return applyPaginationOptionRefresh({
          shouldCloseOverlay: true,
          closeOverlay: () => closeOverlay(editor),
          applyUpdates: () => applyOptionUpdates(editor, { differentFirstPage: enabled }),
          refresh: () => refresh(editor)
        })
      },
    setHeaderFirstPage:
      (header: PagesHeaderFooter) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return applyPaginationOptionRefresh({
          closeOverlay: () => closeOverlay(editor),
          applyUpdates: () => applyOptionUpdates(editor, { headerFirstPage: header }),
          refresh: () => refresh(editor)
        })
      },
    setFooterFirstPage:
      (footer: PagesHeaderFooter) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return applyPaginationOptionRefresh({
          closeOverlay: () => closeOverlay(editor),
          applyUpdates: () => applyOptionUpdates(editor, { footerFirstPage: footer }),
          refresh: () => refresh(editor)
        })
      },
    setDifferentOddEven:
      (enabled: boolean) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return applyPaginationOptionRefresh({
          shouldCloseOverlay: true,
          closeOverlay: () => closeOverlay(editor),
          applyUpdates: () => applyOptionUpdates(editor, { differentOddEven: enabled }),
          refresh: () => refresh(editor)
        })
      },
    setHeaderOdd:
      (header: PagesHeaderFooter) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return applyPaginationOptionRefresh({
          closeOverlay: () => closeOverlay(editor),
          applyUpdates: () => applyOptionUpdates(editor, { headerOdd: header }),
          refresh: () => refresh(editor)
        })
      },
    setHeaderEven:
      (header: PagesHeaderFooter) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return applyPaginationOptionRefresh({
          closeOverlay: () => closeOverlay(editor),
          applyUpdates: () => applyOptionUpdates(editor, { headerEven: header }),
          refresh: () => refresh(editor)
        })
      },
    setFooterOdd:
      (footer: PagesHeaderFooter) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return applyPaginationOptionRefresh({
          closeOverlay: () => closeOverlay(editor),
          applyUpdates: () => applyOptionUpdates(editor, { footerOdd: footer }),
          refresh: () => refresh(editor)
        })
      },
    setFooterEven:
      (footer: PagesHeaderFooter) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return applyPaginationOptionRefresh({
          closeOverlay: () => closeOverlay(editor),
          applyUpdates: () => applyOptionUpdates(editor, { footerEven: footer }),
          refresh: () => refresh(editor)
        })
      },
    openHeaderEditor:
      ({ pageNumber, clickPosition }: OpenHeaderFooterEditorParams) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return openEditorByType(editor, 'header', pageNumber, clickPosition)
      },
    openFooterEditor:
      ({ pageNumber, clickPosition }: OpenHeaderFooterEditorParams) =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return openEditorByType(editor, 'footer', pageNumber, clickPosition)
      },
    closeHeaderFooterEditors:
      () =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return closePaginationOverlayAndRefresh({
          activeEditorType: editor.storage.pages.activeEditorType,
          closeOverlay: () => closeOverlay(editor),
          refresh: () => refresh(editor)
        })
      },
    closeHeaderEditor:
      () =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return closePaginationOverlayAndRefresh({
          activeEditorType: editor.storage.pages.activeEditorType,
          requiredActiveEditorType: 'header',
          closeOverlay: () => closeOverlay(editor),
          refresh: () => refresh(editor)
        })
      },
    closeFooterEditor:
      () =>
      ({ editor, tr }: CommandProps) => {
        suppressStaleOuterCommandDispatch(tr)
        return closePaginationOverlayAndRefresh({
          activeEditorType: editor.storage.pages.activeEditorType,
          requiredActiveEditorType: 'footer',
          closeOverlay: () => closeOverlay(editor),
          refresh: () => refresh(editor)
        })
      },
    setAccentColor:
      (color: string) =>
      ({ editor }: { editor: Editor }) =>
        updatePaginationOverlayAccentColor({
          applyAccentColor: () => {
            getRuntimeOptions(editor, extensionOptions, defaultOptions).accentColor = color
          },
          updateOverlayAccentColor: () => {
            getCommandOverlayManager(editor).updateAccentColor()
          }
        }),
    setHeaderAccentColor:
      (color: string) =>
      ({ editor }: { editor: Editor }) =>
        updatePaginationOverlayAccentColor({
          applyAccentColor: () => {
            getRuntimeOptions(editor, extensionOptions, defaultOptions).headerAccentColor = color
          },
          updateOverlayAccentColor: () => {
            getCommandOverlayManager(editor).updateAccentColor()
          }
        }),
    setFooterAccentColor:
      (color: string) =>
      ({ editor }: { editor: Editor }) =>
        updatePaginationOverlayAccentColor({
          applyAccentColor: () => {
            getRuntimeOptions(editor, extensionOptions, defaultOptions).footerAccentColor = color
          },
          updateOverlayAccentColor: () => {
            getCommandOverlayManager(editor).updateAccentColor()
          }
        })
  }
}
