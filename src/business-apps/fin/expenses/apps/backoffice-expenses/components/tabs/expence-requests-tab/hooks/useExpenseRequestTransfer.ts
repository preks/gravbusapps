import { useCallback } from 'react'
import { useFlowClient } from '@/common/network/flows/useFlowClient'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ExpenseData } from '../../../../types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export const useExpenseRequestTransfer = (
  props: BusinessAppContextProps,
  refetchData?: () => void,
  clearSelection?: () => void
) => {
  const flowClient = useFlowClient(props)

  const handleTransferPayment = useCallback(
    async (record: ExpenseData) => {
      try {
        const expenseRequests = [
          {
            id: record.id || '',
            version: record.version || '',
            currencyRef: record.currencyRef || '',
            status: record.status || '',
            requestTypeRef: record.requestTypeRef || '',
            employee: record.employeeId || '',
            title: record.title || '',
            totalAmount: record.totalAmount || ''
          }
        ]

        await flowClient.initiateFlow('employee-expense', 'temporaryTransferExpenseRequest', { expenseRequests })

        showToast(
          getTranslationFromI18nKeyAndLabel(
            'expense.request.transfer.success',
            'Transfer payment process started successfully'
          ),
          'success'
        )

        refetchData?.()
        clearSelection?.()
      } catch {
        console.error('Error starting process:', error)
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'expense.request.transfer.error',
            'Failed to start transfer payment process. Please try again.'
          ),
          'error'
        )
      }
    },
    [flowClient, refetchData, clearSelection]
  )

  const handleBulkTransferPayment = useCallback(
    async (records: ExpenseData[]) => {
      try {
        const expenseRequests = records.map(record => ({
          id: record.id || '',
          version: record.version || '',
          currencyRef: record.currencyRef || '',
          status: record.status || '',
          requestTypeRef: record.requestTypeRef || '',
          employee: record.employeeId || '',
          title: record.title || '',
          totalAmount: record.totalAmount || ''
        }))

        await flowClient.initiateFlow('employee-expense', 'temporaryTransferExpenseRequest', { expenseRequests })

        showToast(
          getTranslationFromI18nKeyAndLabel(
            'expense.request.bulk.transfer.success',
            `Transfer payment process started successfully for ${records.length} expense requests`
          ),
          'success'
        )

        refetchData?.()

        clearSelection?.()
      } catch {
        console.error('Error starting bulk process:', error)
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'expense.request.bulk.transfer.error',
            'Failed to start bulk transfer payment process. Please try again.'
          ),
          'error'
        )
      }
    },
    [flowClient, refetchData, clearSelection]
  )

  return {
    handleTransferPayment,
    handleBulkTransferPayment
  }
}
