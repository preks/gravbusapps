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

        const originalName = record.employeeDocument?.name || `accounting-note-${record.code}`
        const csvFileName = originalName.replace(/\.[^/.]+$/, '.csv')

        const blob = new Blob([response], { type: 'text/csv;charset=utf-8' })
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
