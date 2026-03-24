import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction
} from 'react'
import type {
  ActivePagesEditorState,
  PaginationPlusStorage as PagesStorage
} from '@/components/tiptap-extensions/tiptap-custom-pagination'
import type { Document, DocumentFormatting, DocumentPagesFormatting } from '../../../types'
import {
  DEFAULT_PAGE_COLOR,
  getDefaultPageLayout,
  getPagesConfigFromFormatting,
  getPaginationConfigFromFormatting,
  getPrintStyleConfigFromFormatting,
  normalizeStoredPagesFormatting,
  omitCustomPageDimensions,
  resolvePageLayout,
  sanitizeStandalonePageNumberTemplates
} from '../../../utils/pageLayoutUtils'
import type * as Y from 'yjs'

type FormattingYMap = Pick<Y.Map<unknown>, 'get' | 'set' | 'observe' | 'unobserve'>
const isDevelopmentEnvironment = process.env.NODE_ENV !== 'production'

export function readPagesFormattingFromStorage(storage?: PagesStorage | null): DocumentPagesFormatting | undefined {
  if (!storage) return undefined

  return normalizeStoredPagesFormatting({
    differentFirstPage: storage.differentFirstPage,
    differentOddEven: storage.differentOddEven,
    header: storage.headerHTML,
    footer: storage.footerHTML,
    headerFirstPage: storage.headerFirstPageHTML,
    footerFirstPage: storage.footerFirstPageHTML,
    headerOdd: storage.headerOddHTML,
    headerEven: storage.headerEvenHTML,
    footerOdd: storage.footerOddHTML,
    footerEven: storage.footerEvenHTML,
    headerHeight: storage.headerHeight,
    footerHeight: storage.footerHeight,
    headerTopMargin: storage.headerTopMargin,
    footerBottomMargin: storage.footerBottomMargin
  })
}

export interface UsePagedDocumentFormattingStateParams {
  documentFormatting?: Document['formatting']
  initialFormatting?: DocumentFormatting
  getPagesStorageSnapshot: () => PagesStorage | null
}

export interface UsePagedDocumentFormattingStateResult {
  layoutFormatting: DocumentFormatting
  setLayoutFormatting: Dispatch<SetStateAction<DocumentFormatting>>
  layoutFormattingRef: MutableRefObject<DocumentFormatting>
  resolvedLayout: ReturnType<typeof resolvePageLayout>
  paginationConfig: ReturnType<typeof getPaginationConfigFromFormatting>
  pagesFormattingConfig: ReturnType<typeof getPagesConfigFromFormatting>
  printStyleConfig: ReturnType<typeof getPrintStyleConfigFromFormatting>
  layoutInputsKey: string
  isPageless: boolean
  pageColor: string
  getPersistedPagesFormatting: (fallback?: DocumentPagesFormatting) => DocumentPagesFormatting | undefined
  buildPersistedFormatting: (
    formattingSource?: DocumentFormatting,
    pagesOverride?: DocumentPagesFormatting
  ) => DocumentFormatting
}

export function usePagedDocumentFormattingState({
  documentFormatting,
  initialFormatting,
  getPagesStorageSnapshot
}: UsePagedDocumentFormattingStateParams): UsePagedDocumentFormattingStateResult {
  const [layoutFormatting, setLayoutFormatting] = useState<DocumentFormatting>(() => getDefaultPageLayout())
  const layoutFormattingRef = useRef(layoutFormatting)
  layoutFormattingRef.current = layoutFormatting

  useEffect(() => {
    const sourceFormatting = documentFormatting ?? initialFormatting
    const fromDoc = resolvePageLayout(sourceFormatting)
    setLayoutFormatting({
      ...getDefaultPageLayout(),
      ...sourceFormatting,
      pageSize: fromDoc.pageSize,
      orientation: fromDoc.orientation,
      margins: fromDoc.margins,
      marginUnit: fromDoc.marginUnit,
      pageColor: fromDoc.pageColor,
      pageless: fromDoc.pageless,
      customPageWidthCm: fromDoc.customPageWidthCm,
      customPageHeightCm: fromDoc.customPageHeightCm
    })
  }, [documentFormatting, initialFormatting])

  const resolvedLayout = useMemo(() => resolvePageLayout(layoutFormatting), [layoutFormatting])
  const paginationConfig = useMemo(() => getPaginationConfigFromFormatting(layoutFormatting), [layoutFormatting])
  const pagesFormattingConfig = useMemo(() => getPagesConfigFromFormatting(layoutFormatting), [layoutFormatting])
  const printStyleConfig = useMemo(() => getPrintStyleConfigFromFormatting(layoutFormatting), [layoutFormatting])
  const layoutInputsKey = useMemo(() => JSON.stringify(layoutFormatting ?? {}), [layoutFormatting])
  const isPageless = resolvedLayout.pageless
  const pageColor = resolvedLayout.pageColor ?? DEFAULT_PAGE_COLOR

  const getPersistedPagesFormatting = useCallback(
    (fallback?: DocumentPagesFormatting): DocumentPagesFormatting | undefined => {
      const normalizedFallback = normalizeStoredPagesFormatting(fallback)
      const pagesFromEditor = readPagesFormattingFromStorage(getPagesStorageSnapshot())
      if (!pagesFromEditor) {
        if (isDevelopmentEnvironment) {
          console.info('[document-pages-debug] persist pages (no editor HTML snapshot)', {
            fallbackPages: sanitizeStandalonePageNumberTemplates(normalizedFallback)
          })
        }
        return sanitizeStandalonePageNumberTemplates(normalizedFallback)
      }
      if (!normalizedFallback) {
        if (isDevelopmentEnvironment) {
          console.info('[document-pages-debug] persist pages (editor only)', {
            pagesFromEditor: sanitizeStandalonePageNumberTemplates(pagesFromEditor)
          })
        }
        return sanitizeStandalonePageNumberTemplates(pagesFromEditor)
      }

      const merged =
        sanitizeStandalonePageNumberTemplates({
          ...normalizedFallback,
          ...pagesFromEditor,
          header: pagesFromEditor.header ?? normalizedFallback.header,
          footer: pagesFromEditor.footer ?? normalizedFallback.footer,
          headerFirstPage: pagesFromEditor.headerFirstPage ?? normalizedFallback.headerFirstPage,
          footerFirstPage: pagesFromEditor.footerFirstPage ?? normalizedFallback.footerFirstPage,
          headerOdd: pagesFromEditor.headerOdd ?? normalizedFallback.headerOdd,
          headerEven: pagesFromEditor.headerEven ?? normalizedFallback.headerEven,
          footerOdd: pagesFromEditor.footerOdd ?? normalizedFallback.footerOdd,
          footerEven: pagesFromEditor.footerEven ?? normalizedFallback.footerEven,
          pageNumberNumeralStyle: normalizedFallback.pageNumberNumeralStyle,
          pageNumberStartAt: normalizedFallback.pageNumberStartAt,
          pageNumberAlignment: normalizedFallback.pageNumberAlignment,
          pageNumberRegion: normalizedFallback.pageNumberRegion,
          pageNumberShowOnFirstPage: normalizedFallback.pageNumberShowOnFirstPage
        }) ?? normalizedFallback

      if (isDevelopmentEnvironment) {
        console.info('[document-pages-debug] persist pages merge', {
          fallbackSnippet: {
            footer: normalizedFallback.footer,
            header: normalizedFallback.header,
            pageNumberNumeralStyle: normalizedFallback.pageNumberNumeralStyle
          },
          fromEditorSnippet: {
            footer: pagesFromEditor.footer,
            header: pagesFromEditor.header
          },
          mergedSnippet: {
            footer: merged.footer,
            header: merged.header,
            pageNumberNumeralStyle: merged.pageNumberNumeralStyle
          }
        })
      }

      return merged
    },
    [getPagesStorageSnapshot]
  )

  const buildPersistedFormatting = useCallback(
    (
      formattingSource: DocumentFormatting = layoutFormatting,
      pagesOverride?: DocumentPagesFormatting
    ): DocumentFormatting => {
      const resolved = resolvePageLayout(formattingSource)
      return {
        ...documentFormatting,
        ...omitCustomPageDimensions(formattingSource),
        pageSize: resolved.pageSize,
        orientation: resolved.orientation,
        margins: resolved.margins,
        marginUnit: resolved.marginUnit,
        pageColor: resolved.pageColor,
        pageless: resolved.pageless,
        ...(resolved.pageSize === 'CUSTOM'
          ? {
              customPageWidthCm: resolved.customPageWidthCm,
              customPageHeightCm: resolved.customPageHeightCm
            }
          : {}),
        pages: getPersistedPagesFormatting(pagesOverride ?? formattingSource.pages)
      }
    },
    [documentFormatting, getPersistedPagesFormatting, layoutFormatting]
  )

  return {
    layoutFormatting,
    setLayoutFormatting,
    layoutFormattingRef,
    resolvedLayout,
    paginationConfig,
    pagesFormattingConfig,
    printStyleConfig,
    layoutInputsKey,
    isPageless,
    pageColor,
    getPersistedPagesFormatting,
    buildPersistedFormatting
  }
}

export interface UseSyncPagedDocumentFormattingParams {
  documentId?: string
  documentFormatting?: Document['formatting']
  formattingYMap: FormattingYMap
  isYjsSynced: boolean
  layoutFormatting: DocumentFormatting
  setLayoutFormatting: Dispatch<SetStateAction<DocumentFormatting>>
  getPersistedPagesFormatting: (fallback?: DocumentPagesFormatting) => DocumentPagesFormatting | undefined
  buildPersistedFormatting: (
    formattingSource?: DocumentFormatting,
    pagesOverride?: DocumentPagesFormatting
  ) => DocumentFormatting
  activeEditorType: ActivePagesEditorState['activeEditorType']
  onPersistFormatting?: (formatting: DocumentFormatting) => Promise<void> | void
}

export interface UseSyncPagedDocumentFormattingResult {
  persistFormatting: (nextFormatting: DocumentFormatting) => void
}

export function useSyncPagedDocumentFormatting({
  documentId,
  documentFormatting,
  formattingYMap,
  isYjsSynced,
  layoutFormatting,
  setLayoutFormatting,
  getPersistedPagesFormatting,
  buildPersistedFormatting,
  activeEditorType,
  onPersistFormatting
}: UseSyncPagedDocumentFormattingParams): UseSyncPagedDocumentFormattingResult {
  const previousPagesEditorTypeRef = useRef<ActivePagesEditorState['activeEditorType']>(null)

  const persistFormatting = useCallback(
    (nextFormatting: DocumentFormatting) => {
      setLayoutFormatting(nextFormatting)
      if (documentId && isYjsSynced) {
        formattingYMap.set('formatting', nextFormatting)
      }
      if (documentId && onPersistFormatting) {
        void onPersistFormatting(nextFormatting)
      }
    },
    [documentId, formattingYMap, isYjsSynced, onPersistFormatting, setLayoutFormatting]
  )

  useEffect(() => {
    if (!documentId) return
    if (!isYjsSynced) return
    if (formattingYMap.get('formatting')) return
    if (!documentFormatting) return
    formattingYMap.set('formatting', documentFormatting)
  }, [documentFormatting, documentId, formattingYMap, isYjsSynced])

  useEffect(() => {
    if (!documentId) return

    const applyFromYjs = () => {
      const next = formattingYMap.get('formatting') as DocumentFormatting | undefined
      if (!next) return
      setLayoutFormatting(prev => {
        const previousJson = JSON.stringify(prev ?? {})
        const nextJson = JSON.stringify(next ?? {})
        if (previousJson === nextJson) return prev
        return next
      })
    }

    applyFromYjs()
    const handler = () => applyFromYjs()
    formattingYMap.observe(handler)
    return () => formattingYMap.unobserve(handler)
  }, [documentId, formattingYMap, setLayoutFormatting])

  useEffect(() => {
    const previousType = previousPagesEditorTypeRef.current
    previousPagesEditorTypeRef.current = activeEditorType

    if (previousType === null || activeEditorType !== null) {
      return
    }

    const nextPagesFormatting = getPersistedPagesFormatting(layoutFormatting.pages)
    const nextFormatting = buildPersistedFormatting(
      { ...layoutFormatting, pages: nextPagesFormatting },
      nextPagesFormatting
    )

    setLayoutFormatting(prev => {
      const previousPages = JSON.stringify(prev.pages ?? {})
      const nextPages = JSON.stringify(nextPagesFormatting ?? {})
      if (previousPages === nextPages) return prev
      return { ...prev, pages: nextPagesFormatting }
    })

    if (documentId && isYjsSynced) {
      formattingYMap.set('formatting', nextFormatting)
    }
    if (documentId && onPersistFormatting) {
      void onPersistFormatting(nextFormatting)
    }
  }, [
    activeEditorType,
    buildPersistedFormatting,
    documentId,
    formattingYMap,
    getPersistedPagesFormatting,
    isYjsSynced,
    layoutFormatting,
    onPersistFormatting,
    setLayoutFormatting
  ])

  return { persistFormatting }
}
