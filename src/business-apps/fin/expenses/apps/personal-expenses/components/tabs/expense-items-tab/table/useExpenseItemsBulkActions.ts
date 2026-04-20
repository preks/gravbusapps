import { notification } from 'antd'
import { useTranslation } from '@newwork/nw-design-system'
import { useCallback } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
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
        message: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.error_message_create_request',
          'Cannot Create Expense Request'
        ),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.error_message_item',
          'An Expense Request can be started only with items in status DRAFT.'
        ),
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
        message: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.error_message_create_request',
          'Cannot Create Expense Request'
        ),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_item_list.multiple_currencies_error_text',
          'The selected expense items must have the same currency to proceed.'
        ),
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
  }, [selectedRowKeys, items, userInfo])

  const handleDeleteSelection = useCallback(
    (ids?: string[]) => {
      const targetIds = ids || selectedRowKeys.map(String)
      if (!targetIds.length) return

      const selectedItems = items.filter(item => targetIds.includes(item.id))
      const allAllowed = selectedItems.every(item => item.status === 'CREATED' || item.status === 'ASSIGNED')
      if (!allAllowed) {
        notification.error({
          message: getTranslationFromI18nKeyAndLabel(
            'lowcoder:personal_expenses.delete_selection_error',
            'Cannot Delete Selection'
          ),
          description: getTranslationFromI18nKeyAndLabel(
            'lowcoder:personal_expenses.error_message_delete_selectiondiscard_error_draft',
            tPersonal('delete-selection-discard-error-draft')
          ),
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
