import { useCallback, useRef, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { useFlowClient } from '@/common/network/flows/useFlowClient'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { ExpenseData } from '../../../../types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getErrorMessage } from '../../../../utils/errorUtils'
import translations from '../../../../_i18n'

const MIN_TRANSFER_LOCK_MS = 1200
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const mapRecordToExpenseRequest = (record: ExpenseData) => ({
  id: record.id || '',
  version: record.version || '',
  currencyRef: record.currencyRef || '',
  status: record.status || '',
  requestTypeRef: record.requestTypeRef || '',
  employee: record.employeeId || '',
  title: record.title || '',
  totalAmount: record.totalAmount != null ? String(record.totalAmount) : ''
})

export const useExpenseRequestTransfer = (
  props: Readonly<BusinessAppContextProps>,
  refetchData?: () => void,
  clearSelection?: () => void
) => {
  const { t } = useTranslation(translations)
  const flowClient = useFlowClient(props)
  const [transferInProgressIds, setTransferInProgressIds] = useState<Set<string>>(new Set())
  const [isBulkTransferInProgress, setIsBulkTransferInProgress] = useState(false)
  const transferInProgressIdsRef = useRef<Set<string>>(new Set())
  const isBulkTransferInProgressRef = useRef(false)

  const handleTransferPayment = useCallback(
    async (record: ExpenseData) => {
      const startedAt = Date.now()
      const requestId = record.id || ''
      if (!requestId) {
        return
      }
      if (transferInProgressIdsRef.current.has(requestId) || isBulkTransferInProgressRef.current) {
        return
      }
      transferInProgressIdsRef.current.add(requestId)
      setTransferInProgressIds(prev => {
        const next = new Set(prev)
        next.add(requestId)
        return next
      })
      try {
        const expenseRequests = [mapRecordToExpenseRequest(record)]

        await flowClient.initiateFlow('employee-expense', 'temporaryTransferExpenseRequest', { expenseRequests })

        showToast(t('transfer-success'), 'success')

        await Promise.resolve(refetchData?.())
        clearSelection?.()
      } catch (error) {
        console.error('Error starting process:', getErrorMessage(error))
        showToast(t('transfer-error'), 'error')
      } finally {
        const elapsedMs = Date.now() - startedAt
        if (elapsedMs < MIN_TRANSFER_LOCK_MS) {
          await wait(MIN_TRANSFER_LOCK_MS - elapsedMs)
        }
        transferInProgressIdsRef.current.delete(requestId)
        setTransferInProgressIds(prev => {
          const next = new Set(prev)
          next.delete(requestId)
          return next
        })
      }
    },
    [flowClient, refetchData, clearSelection, t]
  )

  const handleBulkTransferPayment = useCallback(
    async (records: ExpenseData[]) => {
      const startedAt = Date.now()
      if (isBulkTransferInProgressRef.current) {
        return
      }
      const requestIds = records.map(record => record.id).filter((id): id is string => Boolean(id))
      if (requestIds.length === 0) {
        return
      }
      isBulkTransferInProgressRef.current = true
      requestIds.forEach(id => transferInProgressIdsRef.current.add(id))
      setIsBulkTransferInProgress(true)
      setTransferInProgressIds(prev => {
        const next = new Set(prev)
        requestIds.forEach(id => next.add(id))
        return next
      })
      try {
        const expenseRequests = records.map(mapRecordToExpenseRequest)

        await flowClient.initiateFlow('employee-expense', 'temporaryTransferExpenseRequest', { expenseRequests })

        showToast(t('transfer-bulk-success', { count: records.length }), 'success')

        await Promise.resolve(refetchData?.())

        clearSelection?.()
      } catch (error) {
        console.error('Error starting bulk process:', getErrorMessage(error))
        showToast(t('transfer-bulk-error'), 'error')
      } finally {
        const elapsedMs = Date.now() - startedAt
        if (elapsedMs < MIN_TRANSFER_LOCK_MS) {
          await wait(MIN_TRANSFER_LOCK_MS - elapsedMs)
        }
        isBulkTransferInProgressRef.current = false
        requestIds.forEach(id => transferInProgressIdsRef.current.delete(id))
        setIsBulkTransferInProgress(false)
        setTransferInProgressIds(prev => {
          const next = new Set(prev)
          requestIds.forEach(id => next.delete(id))
          return next
        })
      }
    },
    [flowClient, refetchData, clearSelection, t]
  )

  const isTransferInProgress = useCallback(
    (expenseRequestId?: string) => {
      if (!expenseRequestId) return false
      return transferInProgressIds.has(expenseRequestId)
    },
    [transferInProgressIds]
  )

  return {
    handleTransferPayment,
    handleBulkTransferPayment,
    isTransferInProgress,
    isBulkTransferInProgress
  }
}
