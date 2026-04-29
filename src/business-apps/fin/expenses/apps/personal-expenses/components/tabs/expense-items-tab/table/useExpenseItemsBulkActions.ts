import { notification } from 'antd'
import { useTranslation } from '@newwork/nw-design-system'
import { useCallback } from 'react'
import { startProcess } from '@/common/utils/start-process'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { ExpenseItem } from '../../../../hooks/useGetExpenseItems'
import personalTranslations from '../../../../_i18n'

interface UseExpenseItemsBulkActionsParams {
  selectedRowKeys: React.Key[]
  items: ExpenseItem[]
  userInfo?: BusinessAppContextProps['userInfo']
}

export function useExpenseItemsBulkActions({ selectedRowKeys, items, userInfo }: UseExpenseItemsBulkActionsParams) {
  const { t: tPersonal } = useTranslation(personalTranslations)

  const handleCreateExpenseRequest = useCallback(() => {
    if (!selectedRowKeys.length) return
    const selectedItems = items.filter(item => selectedRowKeys.includes(item.id))

    const allCreated = selectedItems.every(item => (item?.status ?? '').toString().toUpperCase() === 'CREATED')
    if (!allCreated) {
      notification.error({
        message: tPersonal('expense-items-bulk-error-create-request-title'),
        description: tPersonal('expense-items-bulk-error-create-request-description'),
        placement: 'bottomRight',
        duration: 5,
        className: 'gba:error-toast'
      })
      return
    }

    const currencies = selectedItems.map(item => item.currency?.code || item.currencyRef)
    const uniqueCurrencies = [...new Set(currencies)]
    if (uniqueCurrencies.length > 1) {
      notification.error({
        message: tPersonal('expense-items-bulk-error-create-request-title'),
        description: tPersonal('expense-items-bulk-error-multi-currency'),
        placement: 'bottomRight',
        duration: 5,
        className: 'gba:error-toast'
      })
      return
    }

    const payload = {
      employeeId: userInfo?.employeeDetails?.employeeId,
      expenseItems: selectedItems.map(item => ({
        itemId: item.id,
        currencyId: item.currencyRef
      }))
    }

    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpenseRequest',
      payload,
      builderType: 'NATIVE_SCREEN'
    })
  }, [selectedRowKeys, items, userInfo, tPersonal])

  const handleDeleteSelection = useCallback(
    (ids?: string[]) => {
      const targetIds = ids || selectedRowKeys.map(String)
      if (!targetIds.length) return

      const selectedItems = items.filter(item => targetIds.includes(item.id))
      const allAllowed = selectedItems.every(item => item.status === 'CREATED' || item.status === 'ASSIGNED')
      if (!allAllowed) {
        notification.error({
          message: tPersonal('expense-items-bulk-error-delete-title'),
          description: tPersonal('delete-selection-discard-error-draft'),
          placement: 'bottomRight',
          duration: 5,
          className: 'gba:error-toast'
        })
        return
      }

      startProcess({
        domain: 'employee-expense',
        processName: 'discardExpenseItems',
        payload: {
          employeeId: userInfo?.employeeDetails?.employeeId,
          expenseItemsIds: targetIds
        }
      })
    },
    [selectedRowKeys, items, userInfo, tPersonal]
  )

  return { handleCreateExpenseRequest, handleDeleteSelection }
}
