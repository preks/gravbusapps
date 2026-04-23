import { useEffect, useLayoutEffect, useRef } from 'react'
import { type ReportType } from './useExpenseReportData'
import {
  readManagerExpenseReportTypeFromUrl,
  syncManagerExpenseReportTypeInUrl
} from '../utils/managerExpenseReportPageUrlUtils'

/**
 * Apply `?reportType=` on load and keep it in sync on tab change without racing the first paint.
 */
export const useManagerExpenseReportUrlSync = (
  setSelectedReportType: (t: ReportType) => void,
  selectedReportType: ReportType | null
) => {
  const skipNextUrlWrite = useRef(true)

  useLayoutEffect(() => {
    const fromUrl = readManagerExpenseReportTypeFromUrl()
    if (fromUrl) {
      setSelectedReportType(fromUrl)
    }
  }, [setSelectedReportType])

  useEffect(() => {
    if (typeof globalThis.location === 'undefined' || !selectedReportType) {
      return
    }
    if (skipNextUrlWrite.current) {
      skipNextUrlWrite.current = false
      return
    }
    syncManagerExpenseReportTypeInUrl(selectedReportType)
  }, [selectedReportType])
}
