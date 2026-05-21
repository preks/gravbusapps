import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { toast } from 'sonner'

import type { SpreadsheetMutationFacade } from '../core'
import type { SpreadsheetApp, SpreadsheetSheet } from '../types'
import type { ViewerRow } from '../utils/spreadsheetViewerRows'
import { buildExcelCollectionSubmitFormData } from '../utils/spreadsheetCollectionSubmission'

export interface UseSpreadsheetCollectionSubmissionParams {
  app: SpreadsheetApp
  userId: string | undefined
  activeSheet: SpreadsheetSheet
  mutationFacadeRef: MutableRefObject<SpreadsheetMutationFacade | null>
  onAppUpdate?: (next: SpreadsheetApp) => void
  onBack?: () => void
  getActiveSessionRows: () => ViewerRow[]
  completeExcelCollectionTask?: (
    copyAppId: string,
    formData?: Record<string, unknown>
  ) => Promise<{ success: boolean; error?: string }>
  hasExcelCollectionTaskForApp?: (copyAppId: string) => Promise<boolean>
  fetchBulkCollectionResponses: () => Promise<void>
  translateSubmitSuccess: () => string
  translateSubmitFailed: () => string
}

export interface UseSpreadsheetCollectionSubmissionResult {
  hasEnabledSheetCollectionAutomation: boolean
  handleCheckCollectionResponses: () => void
  isCollectionCopy: boolean
  collectionSubmittedAt: string | null
  /** Undefined when collection submit is not offered in the header. */
  onSubmitCollection: (() => Promise<void>) | undefined
}

export function useSpreadsheetCollectionSubmission(
  params: UseSpreadsheetCollectionSubmissionParams
): UseSpreadsheetCollectionSubmissionResult {
  const {
    app,
    userId,
    activeSheet,
    mutationFacadeRef,
    onAppUpdate,
    onBack,
    getActiveSessionRows,
    completeExcelCollectionTask,
    hasExcelCollectionTaskForApp,
    fetchBulkCollectionResponses,
    translateSubmitSuccess,
    translateSubmitFailed
  } = params

  const hasEnabledSheetCollectionAutomation = useMemo(
    () =>
      (activeSheet.automations ?? []).some(
        a => (a.type === 'bulk_collection' || a.type === 'excel_collection') && a.isEnabled
      ),
    [activeSheet.automations]
  )

  const handleCheckCollectionResponses = useCallback(() => {
    void fetchBulkCollectionResponses()
  }, [fetchBulkCollectionResponses])

  const [hasTaskForCollectionCopy, setHasTaskForCollectionCopy] = useState(false)
  const appSettings = (app.settings ?? {}) as unknown as Record<string, unknown>
  const fromCollectionLink =
    typeof globalThis !== 'undefined' && new URLSearchParams(globalThis.location.search).get('excel_collection') === '1'
  const isCollectionCopy = Boolean(appSettings.excel_collection_copy || hasTaskForCollectionCopy || fromCollectionLink)
  const isCopyOwner = Boolean(userId && app.createdBy && app.createdBy === userId)
  const canSubmitCollection = Boolean(
    ((appSettings.excel_collection_copy as boolean | undefined) && isCopyOwner) || hasTaskForCollectionCopy
  )
  const collectionSubmittedAt = (appSettings.excel_collection_submitted_at || null) as string | null
  const collectionCopyFlagPersistedRef = useRef(false)

  useEffect(() => {
    if (collectionCopyFlagPersistedRef.current) return
    if (!fromCollectionLink) return
    if (appSettings.excel_collection_copy === true) return

    collectionCopyFlagPersistedRef.current = true
    const nextSettings = { ...app.settings, excel_collection_copy: true }
    const facade = mutationFacadeRef.current
    if (!facade) {
      collectionCopyFlagPersistedRef.current = false
      return
    }
    void facade
      .updateAppMetadata({ settings: nextSettings })
      .then(() => {
        onAppUpdate?.({ ...app, settings: nextSettings })
      })
      .catch(() => {
        collectionCopyFlagPersistedRef.current = false
      })
  }, [app, fromCollectionLink, mutationFacadeRef, onAppUpdate])

  useEffect(() => {
    if (appSettings.excel_collection_copy || !userId || !app.id || !hasExcelCollectionTaskForApp) {
      return
    }
    let isUnmounted = false
    const runCheck = () =>
      void hasExcelCollectionTaskForApp(app.id).then(has => {
        if (!isUnmounted && has) setHasTaskForCollectionCopy(true)
      })
    runCheck()
    const retryTimer = globalThis.setTimeout(() => {
      runCheck()
    }, 1500)
    return () => {
      isUnmounted = true
      globalThis.clearTimeout(retryTimer)
    }
  }, [app.id, app.settings, hasExcelCollectionTaskForApp, userId])

  const handleSubmitCollection = useCallback(async () => {
    if (!userId || !completeExcelCollectionTask) return

    const formData = buildExcelCollectionSubmitFormData({
      sourceRows: getActiveSessionRows(),
      visibleColumns: activeSheet.columns.filter(c => c.isVisible !== false)
    })

    const result = await completeExcelCollectionTask(app.id, formData)
    if (result.success) {
      const submittedAt = new Date().toISOString()
      try {
        const facade = mutationFacadeRef.current
        if (facade) {
          await facade.updateAppMetadata({
            settings: { ...app.settings, excel_collection_submitted_at: submittedAt }
          })
          onAppUpdate?.({
            ...app,
            settings: { ...app.settings, excel_collection_submitted_at: submittedAt }
          })
        }
      } catch {
        // Non-critical: task completion already succeeded on workflow side.
      }
      toast.success(translateSubmitSuccess())
      onBack?.()
    } else {
      toast.error(result.error || translateSubmitFailed())
    }
  }, [
    activeSheet.columns,
    app,
    completeExcelCollectionTask,
    getActiveSessionRows,
    mutationFacadeRef,
    onAppUpdate,
    onBack,
    translateSubmitFailed,
    translateSubmitSuccess,
    userId
  ])

  const onSubmitCollection = canSubmitCollection && !collectionSubmittedAt ? handleSubmitCollection : undefined

  return {
    hasEnabledSheetCollectionAutomation,
    handleCheckCollectionResponses,
    isCollectionCopy,
    collectionSubmittedAt,
    onSubmitCollection
  }
}
