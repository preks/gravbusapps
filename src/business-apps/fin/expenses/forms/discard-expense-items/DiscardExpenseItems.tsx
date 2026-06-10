import React, { useEffect, useState, useMemo } from 'react'
import { Separator, useTranslation } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import translations from './_i18n'
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
  const { t } = useTranslation(translations)
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
    if (!accessToken?.trim()) {
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
  }, [isMultiple, expenseItemsIds, accessToken, graphqlClient])

  const confirmationMessage = useMemo(() => {
    if (isMultiple) {
      const useAssigned = !multiStatusLoaded || hasAssignedItems
      if (useAssigned) {
        return t('assigned-expense-items')
      }
      return t('delete-expense-items')
    }
    if (expenseItemStatus === 'CREATED') {
      return t('delete-expense-item')
    }
    return t('assigned-expense-item')
  }, [expenseItemStatus, isMultiple, hasAssignedItems, multiStatusLoaded, t])

  const title = useMemo(() => {
    if (isMultiple) {
      return t('discard-expense-items')
    }
    return t('discard-expense-item')
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
      submitButtonText={t('action-yes')}
      cancelButtonText={t('action-cancel')}
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
        <p className="gba:text-base gba:text-foreground gba:text-center gba:p-5">{confirmationMessage}</p>
        <Separator className="gba:my-4" />
      </div>
    </AppActionForm>
  )
}

export default DiscardExpenseItems
