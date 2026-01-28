import React from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { PiFloppyDisk } from 'react-icons/pi'

interface FormActionsProps {
  isEditing: boolean
  isSubmitting: boolean
  onSave: () => void
  onCancel: () => void
}

export const FormActions: React.FC<FormActionsProps> = ({ isEditing, isSubmitting, onSave, onCancel }) => {
  return (
    <div className="gba:flex gba:justify-end gba:gap-4">
      <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onClick={onSave} disabled={isSubmitting} className="gba:flex gba:items-center gba:gap-2">
        {isSubmitting ? <Spinner size="sm" /> : <PiFloppyDisk className="gba:h-4 gba:w-4" />}
        {isEditing ? 'Update Rule' : 'Create Rule'}
      </Button>
    </div>
  )
}
