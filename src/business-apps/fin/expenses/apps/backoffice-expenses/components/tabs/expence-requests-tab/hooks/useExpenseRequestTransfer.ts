import { useCallback, useRef, useState } from 'react'
import { useFlowClient } from '@/common/network/flows/useFlowClient'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ExpenseData } from '../../../../types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const MIN_TRANSFER_LOCK_MS = 1200
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const useExpenseRequestTransfer = (
  props: BusinessAppContextProps,
  refetchData?: () => void,
  clearSelection?: () => void
) => {
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'post-fix',
            hypothesisId: 'H16',
            location: 'useExpenseRequestTransfer.ts:handleTransferPayment:guard',
            message: 'Single transfer blocked because transfer is already running',
            data: {
              requestId,
              alreadyInProgress: transferInProgressIdsRef.current.has(requestId),
              bulkInProgress: isBulkTransferInProgressRef.current
            },
            timestamp: Date.now()
          })
        }).catch(() => {})
        // #endregion
        return
      }
      transferInProgressIdsRef.current.add(requestId)
      setTransferInProgressIds(prev => {
        const next = new Set(prev)
        next.add(requestId)
        return next
      })
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: 'post-fix',
          hypothesisId: 'H16',
          location: 'useExpenseRequestTransfer.ts:handleTransferPayment:start',
          message: 'Single transfer started',
          data: { requestId },
          timestamp: Date.now()
        })
      }).catch(() => {})
      // #endregion
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

        await Promise.resolve(refetchData?.())
        clearSelection?.()
      } catch (error) {
        console.error('Error starting process:', error)
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'expense.request.transfer.error',
            'Failed to start transfer payment process. Please try again.'
          ),
          'error'
        )
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'post-fix',
            hypothesisId: 'H16',
            location: 'useExpenseRequestTransfer.ts:handleTransferPayment:finish',
            message: 'Single transfer finished',
            data: { requestId },
            timestamp: Date.now()
          })
        }).catch(() => {})
        // #endregion
      }
    },
    [flowClient, refetchData, clearSelection]
  )

  const handleBulkTransferPayment = useCallback(
    async (records: ExpenseData[]) => {
      const startedAt = Date.now()
      if (isBulkTransferInProgressRef.current) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'post-fix',
            hypothesisId: 'H17',
            location: 'useExpenseRequestTransfer.ts:handleBulkTransferPayment:guard',
            message: 'Bulk transfer blocked because another bulk transfer is running',
            data: { recordsCount: Array.isArray(records) ? records.length : 0 },
            timestamp: Date.now()
          })
        }).catch(() => {})
        // #endregion
        return
      }
      const requestIds = records.map(record => record.id).filter(Boolean) as string[]
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: 'post-fix',
          hypothesisId: 'H17',
          location: 'useExpenseRequestTransfer.ts:handleBulkTransferPayment:start',
          message: 'Bulk transfer started',
          data: { recordsCount: records.length, requestIdsCount: requestIds.length },
          timestamp: Date.now()
        })
      }).catch(() => {})
      // #endregion
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

        await Promise.resolve(refetchData?.())

        clearSelection?.()
      } catch (error) {
        console.error('Error starting bulk process:', error)
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'expense.request.bulk.transfer.error',
            'Failed to start bulk transfer payment process. Please try again.'
          ),
          'error'
        )
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'post-fix',
            hypothesisId: 'H17',
            location: 'useExpenseRequestTransfer.ts:handleBulkTransferPayment:finish',
            message: 'Bulk transfer finished',
            data: { requestIdsCount: requestIds.length },
            timestamp: Date.now()
          })
        }).catch(() => {})
        // #endregion
      }
    },
    [flowClient, refetchData, clearSelection, isBulkTransferInProgress]
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
