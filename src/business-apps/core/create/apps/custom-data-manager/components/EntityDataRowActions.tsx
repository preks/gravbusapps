import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { FloppyDisk, PencilSimple, SpinnerGap, Trash, X } from '@phosphor-icons/react'

interface EntityDataRowActionsProps {
  mode: 'editing' | 'viewing'
  mutating?: boolean
  disabled?: boolean
  onSave?: () => void
  onCancel?: () => void
  onEdit?: () => void
  onDelete?: () => void
  testId: string
}

export const EntityDataRowActions: React.FC<EntityDataRowActionsProps> = ({
  mode,
  mutating,
  disabled,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  testId
}) => {
  if (mode === 'editing') {
    return (
      <div className="gba:flex gba:items-center gba:gap-1">
        <Button variant="ghost" size="sm" onClick={onSave} disabled={mutating} data-testid={`${testId}-save`}>
          {mutating ? (
            <SpinnerGap className="gba:h-4 gba:w-4 gba:animate-spin" />
          ) : (
            <FloppyDisk className="gba:h-4 gba:w-4" />
          )}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={mutating} data-testid={`${testId}-cancel`}>
          <X className="gba:h-4 gba:w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-1">
      {onEdit && (
        <Button variant="ghost" size="sm" onClick={onEdit} disabled={disabled} data-testid={`${testId}-edit-row`}>
          <PencilSimple className="gba:h-4 gba:w-4" />
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onDelete} disabled={disabled} data-testid={`${testId}-delete-row`}>
        <Trash className="gba:h-4 gba:w-4 gba:text-destructive" />
      </Button>
    </div>
  )
}
