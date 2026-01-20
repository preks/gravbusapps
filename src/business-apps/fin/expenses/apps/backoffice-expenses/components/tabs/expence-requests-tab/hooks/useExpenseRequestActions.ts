import { useCallback } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { ResponseType } from '@/common/network/rest/RestClient'
import { env } from '@/common/env/EnvUtils'
import { startProcess } from '@/common/utils/start-process'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ExpenseData } from '../../../../types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export const useExpenseRequestActions = (props: BusinessAppContextProps) => {
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const handleDownloadAccountingNote = useCallback(
    async (record: ExpenseData) => {
      try {
        const response = await restClient.get(`/cs-selgros/expense-sheets/expense-request/${record.id}/csv`, {
          responseType: ResponseType.TEXT,
          headers: {
            Authorization: `Bearer ${props.accessToken}`
          }
        })

        // Process CSV to remove commas from cell values
        const processedCsv = processCsvContent(response)

        const originalName = record.employeeDocument?.name || `accounting-note-${record.code}`
        const csvFileName = originalName.replace(/\.[^/.]+$/, '.csv')

        const blob = new Blob([processedCsv], { type: 'text/csv;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = csvFileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch {
        console.error('Error downloading accounting note:', error)
      }
    },
    [restClient, props.accessToken]
  )

  /**
   * Process CSV content for SAP CKF compatibility:
   * 1. Remove quotes from all fields
   * 2. Replace period (.) with comma (,) as decimal separator in numeric values
   */
  const processCsvContent = (csvText: string): string => {
    const lines = csvText.split('\n')

    const processedLines = lines.map(line => {
      // Parse CSV line handling quoted values
      const cells: string[] = []
      let currentCell = ''
      let insideQuotes = false

      for (const char of line) {
        if (char === '"') {
          // Skip quotes - don't add them to output
          insideQuotes = !insideQuotes
        } else if (char === ';' && !insideQuotes) {
          // Semicolon delimiter - process and add cell
          cells.push(formatCellValue(currentCell))
          currentCell = ''
        } else {
          currentCell += char
        }
      }
      // Push the last cell
      cells.push(formatCellValue(currentCell))

      return cells.join(';')
    })

    return processedLines.join('\n')
  }

  /**
   * Format cell value: replace period with comma for decimal numbers
   * E.g., "57.50" becomes "57,50"
   */
  const formatCellValue = (value: string): string => {
    const trimmedValue = value.trim()
    // Replace all decimal numbers: digits followed by period followed by digits
    // This handles cases like 57.50, 123.45, -10.00, 307.5
    return trimmedValue.replaceAll(/(\d)\.(\d)/g, '$1,$2')
  }

  const handleTriggerCSV = useCallback(async (record: ExpenseData) => {
    try {
      await startProcess({
        domain: 'cs-selgros',
        processName: 'createSelgrosExpenseSheetManualTrigger',
        payload: {
          employeeId: record.employeeId,
          expenseRequestId: record.id
        }
      })

      // Show success toast
      showToast(
        getTranslationFromI18nKeyAndLabel('expense.request.csv.trigger.success', 'CSV was generated successfully'),
        'success'
      )
    } catch {
      console.error('Failed to trigger CSV process:', error)

      // Show error toast
      showToast(
        getTranslationFromI18nKeyAndLabel(
          'expense.request.csv.trigger.error',
          'Failed to generate CSV. Please try again.'
        ),
        'error'
      )
    }
  }, [])

  return {
    handleDownloadAccountingNote,
    handleTriggerCSV
  }
}
