import { ConfirmationModalState } from '../types'

interface UseConfirmationModalProps {
  confirmationModal: ConfirmationModalState
  setConfirmationModal: (modal: ConfirmationModalState) => void
}

/**
 * Hook to manage confirmation modal actions
 * Handles confirm and cancel operations for the confirmation dialog
 */
export function useConfirmationModal({ confirmationModal, setConfirmationModal }: UseConfirmationModalProps) {
  const handleConfirm = async () => {
    if (confirmationModal.action) {
      await confirmationModal.action()
    }
    setConfirmationModal({ ...confirmationModal, open: false })
  }

  const handleCancel = () => {
    setConfirmationModal({ ...confirmationModal, open: false })
  }

  return {
    handleConfirm,
    handleCancel
  }
}
