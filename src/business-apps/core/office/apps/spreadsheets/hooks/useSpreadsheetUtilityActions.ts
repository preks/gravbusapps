import { useCallback } from 'react'
import { toast } from 'sonner'

export interface UseSpreadsheetUtilityActionsParams {
  isExporting: boolean
  setIsExporting: (value: boolean) => void
  appName: string
  activeSheetName: string
  getWorkbookSnapshot: () => Record<string, unknown> | null
  exportSnapshotAsXlsx: (snapshot: Record<string, unknown>, fileName: string) => Promise<void>
  createReviewComment: (content: string) => Promise<boolean>
  messages: {
    reviewCommentCreateFailed: string
    reviewCommentCreated: string
  }
}

export interface UseSpreadsheetUtilityActionsResult {
  handleExportToExcel: () => Promise<void>
  handleCreateReviewComment: (content: string) => Promise<boolean>
}

export function useSpreadsheetUtilityActions(
  params: UseSpreadsheetUtilityActionsParams
): UseSpreadsheetUtilityActionsResult {
  const {
    isExporting,
    setIsExporting,
    appName,
    activeSheetName,
    getWorkbookSnapshot,
    exportSnapshotAsXlsx,
    createReviewComment,
    messages
  } = params

  const handleExportToExcel = useCallback(async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const snapshot = getWorkbookSnapshot()
      if (!snapshot) {
        console.error('[SpreadsheetAppViewer] Export failed: workbook snapshot unavailable')
        return
      }
      const safeName =
        (appName || activeSheetName || 'spreadsheet').replace(/[/\\?%*:|"<>]/g, '-').trim() || 'spreadsheet'
      await exportSnapshotAsXlsx(snapshot, safeName)
    } catch (err) {
      console.error('[SpreadsheetAppViewer] Export to Excel failed:', err)
    } finally {
      setIsExporting(false)
    }
  }, [activeSheetName, appName, exportSnapshotAsXlsx, getWorkbookSnapshot, isExporting, setIsExporting])

  const handleCreateReviewComment = useCallback(
    async (content: string): Promise<boolean> => {
      const created = await createReviewComment(content)
      if (!created) {
        toast.error(messages.reviewCommentCreateFailed)
        return false
      }
      toast.success(messages.reviewCommentCreated)
      return true
    },
    [createReviewComment, messages.reviewCommentCreateFailed, messages.reviewCommentCreated]
  )

  return { handleExportToExcel, handleCreateReviewComment }
}
