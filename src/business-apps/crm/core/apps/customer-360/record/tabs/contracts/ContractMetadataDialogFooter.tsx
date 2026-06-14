import React from 'react'
import { Button, DialogFooter } from '@newwork/nw-design-system'

interface ContractMetadataDialogFooterProps {
  canSubmit: boolean
  isSubmitting: boolean
  isEditMode: boolean
  onCancel: () => void
  onSubmit: () => void
}

const ContractMetadataDialogFooter: React.FC<ContractMetadataDialogFooterProps> = ({
  canSubmit,
  isSubmitting,
  isEditMode,
  onCancel,
  onSubmit
}) => {
  let submitLabel = 'Assign contract'
  if (isSubmitting) {
    submitLabel = 'Saving...'
  } else if (isEditMode) {
    submitLabel = 'Save metadata'
  }

  return (
    <DialogFooter>
      <Button variant="outline" type="button" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" onClick={onSubmit} disabled={!canSubmit} data-testid="customer-360-contract-attach-submit">
        {submitLabel}
      </Button>
    </DialogFooter>
  )
}

export default ContractMetadataDialogFooter
