import React, { useEffect, useState, useMemo } from 'react'
import { Separator } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useGetExpenseItem } from '@/business-apps/fin/expenses/apps/personal-expenses/hooks/useGetExpenseItems'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EXPENSE_ITEMS_STATUS_BY_IDS } from '@/business-apps/fin/expenses/apps/personal-expenses/queries/expenseItems'

interface DiscardExpenseItemsProps extends BusinessAppContextProps {
  onClose?: () => void
}

const DiscardExpenseItems: React.FC<DiscardExpenseItemsProps> = ({
  onClose,
  additionalData,
  accessToken,
  userInfo
}) => {
  const t = getTranslationFromI18nKeyAndLabel
  const graphqlClient = useGraphQLClient(accessToken || '')

  const expenseItemsIds = useMemo(() => {
    if (additionalData?.expenseItemsIds && Array.isArray(additionalData.expenseItemsIds)) {
      return additionalData.expenseItemsIds
    }
    if (
      additionalData?.psi_taskPayload?.psi_initialParameters?.expenseItemsIds &&
      Array.isArray(additionalData.psi_taskPayload.psi_initialParameters.expenseItemsIds)
    ) {
      return additionalData.psi_taskPayload.psi_initialParameters.expenseItemsIds
    }
    if (additionalData?.expenseItem?.id) {
      return [additionalData.expenseItem.id]
    }
    if (additionalData?.psi_taskPayload?.psi_initialParameters?.expenseItem?.id) {
      return [additionalData.psi_taskPayload.psi_initialParameters.expenseItem.id]
    }
    return []
  }, [additionalData])

  const isMultiple = expenseItemsIds.length > 1
  const expenseItemId = expenseItemsIds.length > 0 ? expenseItemsIds[0] : null

  const [expenseItemStatus, setExpenseItemStatus] = useState<string | null>(null)
  const [hasAssignedItems, setHasAssignedItems] = useState<boolean>(false)
  const [multiStatusLoaded, setMultiStatusLoaded] = useState(false)

  const context = useMemo(() => ({ accessToken, userInfo, additionalData }), [accessToken, userInfo, additionalData])
  const shouldFetchSingle = expenseItemId && !isMultiple
  const { item: fetchedItem } = useGetExpenseItem(
    shouldFetchSingle ? context : undefined,
    shouldFetchSingle ? expenseItemId : undefined
  )

  useEffect(() => {
    if (!isMultiple && fetchedItem?.status) {
      setExpenseItemStatus(fetchedItem.status)
    }
  }, [isMultiple, fetchedItem?.status])

  useEffect(() => {
    if (!isMultiple || expenseItemsIds.length === 0) {
      setMultiStatusLoaded(true)
      return
    }
    let cancelled = false
    setMultiStatusLoaded(false)
    graphqlClient
      .request<{ ExpenseItem: Array<{ id: string; status: string }> }>(GET_EXPENSE_ITEMS_STATUS_BY_IDS, {
        ids: expenseItemsIds
      })
      .then(data => {
        if (cancelled) return
        const items = data?.ExpenseItem ?? []
        const hasAssigned = items.some(i => i.status === 'ASSIGNED')
        setHasAssignedItems(hasAssigned)
        setMultiStatusLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setMultiStatusLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [isMultiple, expenseItemsIds, graphqlClient])

  const confirmationMessage = useMemo(() => {
    if (isMultiple) {
      const useAssigned = !multiStatusLoaded || hasAssignedItems
      if (useAssigned) {
        return t(
          'lowcoder:discard_expense_items.assigned_expense_items',
          'Are you sure you want to delete already assigned expense items?'
        )
      }
      return t(
        'lowcoder:discard_expense_items.draft_expense_items',
        'Are you sure you want to delete these expense items?'
      )
    }
    if (expenseItemStatus === 'CREATED' || expenseItemStatus === 'DRAFT') {
      return t(
        'lowcoder:discard_expense_items.draft_expense_item',
        'Are you sure you want to delete this expense item?'
      )
    }
    return t(
      'lowcoder:discard_expense_items.assigned_expense_item',
      'Are you sure you want to delete an already assigned expense item?'
    )
  }, [expenseItemStatus, isMultiple, hasAssignedItems, multiStatusLoaded, t])

  const title = useMemo(() => {
    if (isMultiple) {
      return t('lowcoder:discard_expense_items.discard_expense_items', 'Discard Expense Items')
    }
    return t('lowcoder:discard_expense_items.discard_expense_item', 'Discard Expense Item')
  }, [isMultiple, t])

  // Return payload only; AppActionForm dispatches once (same as JobRequestDeletePopup etc.).
  const handleSubmit = async () => {
    const expenseItemIds = expenseItemsIds
      .filter((id: unknown): id is string => id != null && id !== '' && typeof id === 'string')
      .map((id: string) => String(id))
    return {
      expenseItems: {
        expenseItemIds
      },
      event: 'pse_submit'
    }
  }

  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_abort', {
      event: 'pse_abort'
    })
    if (onClose) {
      onClose()
    }
  }

  const handleProcessCompletion = (detail: { resolution?: 'success' | 'failure' } | null) => {
    if (detail?.resolution === 'success' && onClose) {
      onClose()
    }
  }

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      formData={{}}
      onProcessCompletion={handleProcessCompletion}
      submitButtonText={t('lowcoder:discard_expense_items.confirm_button', 'Yes')}
      cancelButtonText={t('lowcoder:discard_expense_items.cancel_button', 'No')}
      submitButtonVariant="default"
      data-testid="discard-expense-items-form"
    >
      <div className="gba:space-y-4" data-testid="discard-expense-items-content">
        <div className="gba:mb-4">
          <h2
            className="gba:text-xl gba:font-semibold gba:text-center gba:mb-4"
            data-testid="discard-expense-items-title"
          >
            {title}
          </h2>
          <Separator className="gba:my-4" />
        </div>
        <p className="gba:text-base gba:text-foreground gba:text-center gba:font-medium">{confirmationMessage}</p>
        <Separator className="gba:my-4" />
      </div>
    </AppActionForm>
  )
}

export default DiscardExpenseItems
