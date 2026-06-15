import { useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import personalTranslations from '../../apps/personal-expenses/_i18n'
import { useDiscardExpenseEntityAction } from '../../apps/personal-expenses/common/discard/useDiscardExpenseEntityAction'
import type { DiscardExpenseEntityDialogLabels, DiscardEntityRecord, TranslateFn } from '../discard/types'
import type { ExpenseOwnerActionItem } from '../utils/expenseRequestOwnerActions'

export interface ExpenseEntityOwnerActionsParams<TEntity extends DiscardEntityRecord> {
  entity: TEntity | null
  accessToken?: string
  currentEmployeeId?: string
  onClose?: () => void
  onDiscardSuccess?: () => void
  buildActions: (
    entity: TEntity,
    context: {
      employeeId: string
      accessToken: string
      onClose?: () => void
      onDiscard: (entity: TEntity) => void
    },
    t: TranslateFn
  ) => ExpenseOwnerActionItem[]
  discardEntity: (params: { accessToken: string; entityId: string; reason: string }) => Promise<void>
  discardDialogLabels: DiscardExpenseEntityDialogLabels
  discardSuccessMessageKey: string
  discardErrorMessageKey: string
  discardErrorLogContext: string
}

export function useExpenseEntityOwnerActions<TEntity extends DiscardEntityRecord>({
  entity,
  accessToken,
  currentEmployeeId = '',
  onClose,
  onDiscardSuccess,
  buildActions,
  discardEntity,
  discardDialogLabels,
  discardSuccessMessageKey,
  discardErrorMessageKey,
  discardErrorLogContext
}: Readonly<ExpenseEntityOwnerActionsParams<TEntity>>) {
  const { t } = useTranslation(personalTranslations)

  const handleDiscardSuccess = useCallback(() => {
    onClose?.()
    onDiscardSuccess?.()
  }, [onClose, onDiscardSuccess])

  const {
    discardDialogOpen,
    discardTarget,
    isDiscarding,
    handleOpenDiscardDialog,
    handleDiscardDialogOpenChange,
    handleConfirmDiscard
  } = useDiscardExpenseEntityAction({
    accessToken,
    t,
    onSuccess: handleDiscardSuccess,
    discardEntity,
    successMessageKey: discardSuccessMessageKey,
    errorMessageKey: discardErrorMessageKey,
    errorLogContext: discardErrorLogContext
  })

  const handleOpenDiscard = useCallback(
    (item: TEntity) => {
      handleOpenDiscardDialog({
        id: item.id,
        title: item.title ?? entity?.title
      })
    },
    [entity?.title, handleOpenDiscardDialog]
  )

  const actions = useMemo(() => {
    if (!entity?.id) {
      return []
    }

    return buildActions(
      entity,
      {
        employeeId: currentEmployeeId,
        accessToken: accessToken ?? '',
        onClose,
        onDiscard: handleOpenDiscard
      },
      t
    )
  }, [accessToken, buildActions, currentEmployeeId, entity, handleOpenDiscard, onClose, t])

  return {
    actions,
    discardDialogOpen,
    discardTarget,
    isDiscarding,
    handleDiscardDialogOpenChange,
    handleConfirmDiscard,
    discardDialogLabels,
    t
  }
}
