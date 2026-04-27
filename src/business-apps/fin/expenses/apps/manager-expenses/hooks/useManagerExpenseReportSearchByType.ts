import { useCallback, useLayoutEffect, useRef } from 'react'
import { ReportType } from './useExpenseReportData'

type Params = {
  selectedReportType: ReportType | null
  setLocalSearchText: (value: string) => void
  setSearchTerm: (term: string) => void
  setCurrentPage: (page: number) => void
}

/**
 * Wires the reports toolbar search to the current report type:
 * - `resetSearchState` for the tab handler (clears in the same turn as a tab click, before
 *   `setSelectedReportType`, so the design-system `ToolbarSearch` is not one frame behind).
 * - A layout effect when `selectedReportType` *value* changes from URL or history, without
 *   the effect re-running on unrelated updates (stale `reset` callbacks used to re-clear on
 *   every keystroke and collapse the search field).
 */
export function useManagerExpenseReportSearchByType({
  selectedReportType,
  setLocalSearchText,
  setSearchTerm,
  setCurrentPage
}: Params) {
  const previousReportTypeRef = useRef<ReportType | null>(null)

  const resetSearchState = useCallback(() => {
    setLocalSearchText('')
    setSearchTerm('')
    setCurrentPage(1)
  }, [setCurrentPage, setSearchTerm])

  // Depend only on `selectedReportType`. Do not list setters: if this effect re-runs when
  // search or pagination updates (e.g. unstable `setX` identity), it would clear the
  // toolbar and match "search closes when I stop typing" / after debounced fetch.
  useLayoutEffect(() => {
    const next = selectedReportType ?? ReportType.EXPENSE_ITEM
    if (previousReportTypeRef.current === null) {
      previousReportTypeRef.current = next
      return
    }
    if (previousReportTypeRef.current === next) {
      return
    }
    previousReportTypeRef.current = next
    setLocalSearchText('')
    setSearchTerm('')
    setCurrentPage(1)
  }, [selectedReportType])

  return { resetSearchState }
}
