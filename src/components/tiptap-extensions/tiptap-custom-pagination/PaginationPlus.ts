import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { DecorationSet } from '@tiptap/pm/view'
import { createPaginationExtensionCommands } from './paginationExtensionCommands'
import { destroyPaginationExtension, initializePaginationExtension } from './paginationExtensionLifecycle'
import { createPaginationExtensionPlugins } from './paginationExtensionPlugins'
import type {
  OpenHeaderFooterEditorParams,
  PageFormatInput,
  PagesHeaderFooter,
  PagesOptionUpdates,
  PagesOptions,
  PagesStorage
} from './types'
import { createStorageFromOptions, syncStorageFromOptions } from './utils'

const REFRESH_META = 'RM_PAGES_REFRESH'
const REFRESH_AND_STABILIZE_META = 'RM_PAGES_REFRESH_AND_STABILIZE'
export const PAGINATION_OWNED_DOC_CHANGE_META = 'RM_PAGES_OWNED_DOC_CHANGE'
const paginationKey = new PluginKey<DecorationSet>('rm-pages-pagination')
const hardBreakKey = new PluginKey<DecorationSet>('rm-pages-hard-breaks')

export { resolvePaginationWidgetTotalPages, resolveRunawayPageGrowth } from './paginationPageCountPolicy'
export { markNextPaginationHydrationDocChange } from './paginationRuntimeBookkeeping'
export {
  createSafePaginationSelection,
  getPageBodyBands,
  resolvePaginationBodyClick,
  resolvePaginationSelectionBodyOverflow
} from './paginationLayoutHelpers'
export {
  DEFAULT_TABLE_STABILIZATION_ACTIONS_PER_PASS,
  resolveDeferredRepaginationActionPlan,
  resolveDeferredRepaginationControllerCycle,
  resolveDeferredRepaginationExecutionPlan,
  resolveDeferredRepaginationRefreshGate,
  MAX_TABLE_STABILIZATION_ACTIONS_PER_PASS,
  resolveDeferredRepaginationOutcome,
  resolveDeferredTableRefreshResult,
  resolveImmediateTableStabilizationDecision,
  resolveTablePaginationHeuristics,
  resolveTableStabilizationActionBudget,
  shouldDeferTablePaginationEvaluation,
  shouldDeferUpwardTableRefreshAcceptance,
  shouldRetryDeferredRepaginationStabilization,
  shouldScheduleDeferredRepaginationOnUpdate
} from './paginationStabilizationPolicy'

export const INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS = 4

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pages: {
      setPagesOptions: (updates: PagesOptionUpdates) => ReturnType
      refreshPages: () => ReturnType
      refreshPagesAndStabilize: () => ReturnType
      hydratePageBreakShells: (pageNumbers: number[]) => ReturnType
      requestViewportPageFocus: (pageNumber: number) => ReturnType
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
      setPaginationDocumentTitle: (title: string) => ReturnType
    }
  }

  interface Storage {
    pages: PagesStorage
  }
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
  accentColor: '#6366f1',
  documentTitle: '',
  pageNumberRegion: 'footer',
  pageNumberNumeralStyle: 'decimal',
  pageNumberStartAt: 1,
  pageNumberShowOnFirstPage: true
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
    initializePaginationExtension({
      editor: this.editor,
      storage: this.storage,
      extensionOptions: this.options,
      defaultOptions,
      syncStorageFromOptions
    })
  },

  onDestroy() {
    destroyPaginationExtension(this.editor)
  },

  addProseMirrorPlugins() {
    return createPaginationExtensionPlugins({
      editor: this.editor,
      storage: this.storage,
      extensionOptions: this.options,
      defaultOptions,
      paginationKey,
      hardBreakKey,
      refreshMeta: REFRESH_META,
      refreshAndStabilizeMeta: REFRESH_AND_STABILIZE_META,
      paginationOwnedDocChangeMeta: PAGINATION_OWNED_DOC_CHANGE_META,
      initialLayoutStabilizationMaxAttempts: INITIAL_LAYOUT_STABILIZATION_MAX_ATTEMPTS
    })
  },

  addCommands() {
    return createPaginationExtensionCommands({
      editor: this.editor,
      extensionOptions: this.options,
      defaultOptions,
      refreshMeta: REFRESH_META,
      refreshAndStabilizeMeta: REFRESH_AND_STABILIZE_META,
      syncStorageFromOptions
    })
  }
})

export const PaginationPlus = Pages
export type PaginationPlusOptions = PagesOptions
export type PaginationPlusStorage = PagesStorage
