import React from 'react'
import { Button, Input, Label } from '@newwork/nw-design-system'
import { Plus, Trash2 } from 'lucide-react'

interface UserDecisionCustomOptionsSectionProps {
  options: Array<{ id: string; label: string }>
  onChangeLabel: (index: number, label: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
  'data-testid': string
}

export const UserDecisionCustomOptionsSection: React.FC<UserDecisionCustomOptionsSectionProps> = ({
  options,
  onChangeLabel,
  onAdd,
  onRemove,
  'data-testid': testId
}) => {
  return (
    <>
      <p className="gba:text-xs gba:text-muted-foreground">
        Define custom options for the assignee to choose from. Each option creates a corresponding branch.
      </p>

      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-medium">Decision Options</Label>
        <div className="gba:flex gba:flex-col gba:gap-1">
          {options.map((opt, i) => (
            <div key={opt.id} className="gba:flex gba:items-center gba:gap-2">
              <Input
                value={opt.label}
                onChange={e => onChangeLabel(i, e.target.value)}
                className="gba:h-8 gba:text-xs"
                placeholder={`Option ${i + 1}`}
                data-testid={`${testId}-option-${i}`}
              />
              <Button
                variant="ghost"
                size="sm"
                disabled={options.length <= 2}
                onClick={() => onRemove(i)}
                data-testid={`${testId}-remove-${i}`}
              >
                <Trash2 className="gba:h-3 gba:w-3" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={onAdd} data-testid={`${testId}-add`}>
            <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
            Add Option
          </Button>
        </div>
      </div>
    </>
  )
}
