import { useCallback, useState } from 'react'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { getErrorMessage } from '@/business-apps/fin/expenses/apps/backoffice-expenses/utils/errorUtils'
import { DISCARD_EXPENSE_ENTITY_REASON } from '@/business-apps/fin/expenses/common/discard/discardConstants'
import type { DiscardEntityRecord, TranslateFn } from './types'

export interface UseDiscardExpenseEntityActionParams {
  accessToken: string | undefined
  t: TranslateFn
  onSuccess?: () => void
  discardEntity: (params: { accessToken: string; entityId: string; reason: string }) => Promise<void>
  successMessageKey: string
  errorMessageKey: string
  errorLogContext: string
}

export interface UseDiscardExpenseEntityActionResult {
  discardDialogOpen: boolean
  discardTarget: DiscardEntityRecord | null
  isDiscarding: boolean
  handleOpenDiscardDialog: (record: DiscardEntityRecord) => void
  handleDiscardDialogOpenChange: (open: boolean) => void
  handleConfirmDiscard: () => Promise<void>
}

export function useDiscardExpenseEntityAction({
  accessToken,
  t,
  onSuccess,
  discardEntity,
  successMessageKey,
  errorMessageKey,
  errorLogContext
}: Readonly<UseDiscardExpenseEntityActionParams>): UseDiscardExpenseEntityActionResult {
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false)
  const [discardTarget, setDiscardTarget] = useState<DiscardEntityRecord | null>(null)
  const [isDiscarding, setIsDiscarding] = useState(false)

  const resetDiscardState = useCallback(() => {
    setDiscardDialogOpen(false)
    setDiscardTarget(null)
  }, [])

  const handleOpenDiscardDialog = useCallback((record: DiscardEntityRecord) => {
    setDiscardTarget(record)
    setDiscardDialogOpen(true)
  }, [])

  const handleDiscardDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isDiscarding) {
        resetDiscardState()
        return
      }
      setDiscardDialogOpen(open)
    },
    [isDiscarding, resetDiscardState]
  )

  const handleConfirmDiscard = useCallback(async () => {
    if (!accessToken?.trim()) {
      console.error(`Access token missing for ${errorLogContext}`)
      showToast(t(errorMessageKey), 'error')
      return
    }

    if (!discardTarget?.id) {
      showToast(t(errorMessageKey), 'error')
      return
    }

    setIsDiscarding(true)

    try {
      await discardEntity({
        accessToken,
        entityId: discardTarget.id,
        reason: DISCARD_EXPENSE_ENTITY_REASON
      })

      showToast(t(successMessageKey), 'success')
      resetDiscardState()
      onSuccess?.()
    } catch (error) {
      console.error(`Failed to ${errorLogContext}:`, getErrorMessage(error))
      showToast(t(errorMessageKey), 'error')
    } finally {
      setIsDiscarding(false)
    }
  }, [
    accessToken,
    discardEntity,
    discardTarget,
    errorLogContext,
    errorMessageKey,
    onSuccess,
    resetDiscardState,
    successMessageKey,
    t
  ])

  return {
    discardDialogOpen,
    discardTarget,
    isDiscarding,
    handleOpenDiscardDialog,
    handleDiscardDialogOpenChange,
    handleConfirmDiscard
  }
}
