import React from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import { X } from 'lucide-react'
import { getLabelChipClassName } from '../../utils/labelUtils'
import type { EmailLabel } from '../../types'

interface EditableLabelListProps {
  labels: EmailLabel[]
  messageId: string
  isMutating: boolean
  variant: 'inline' | 'menu'
  keyPrefix: string
  editTestIdPrefix: string
  removeTestIdPrefix: string
  onStartEdit: (label: EmailLabel) => void
  onRemove: (labelName: string) => void
}

export const EditableLabelList: React.FC<EditableLabelListProps> = ({
  labels,
  messageId,
  isMutating,
  variant,
  keyPrefix,
  editTestIdPrefix,
  removeTestIdPrefix,
  onStartEdit,
  onRemove
}) => {
  return (
    <>
      {labels.map(label => {
        const key = `${messageId}-${keyPrefix}-${label.id || label.name}`
        if (variant === 'inline') {
          return (
            <span key={key} className="gba:inline-flex gba:items-center gba:gap-1">
              <button
                type="button"
                className="gba:inline-flex"
                onClick={() => onStartEdit(label)}
                disabled={isMutating}
                data-testid={`${editTestIdPrefix}-${label.name}`}
              >
                <Badge variant="secondary" className={`gba:h-5 gba:text-[10px] ${getLabelChipClassName(label.color)}`}>
                  {label.name}
                </Badge>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-5 gba:w-5"
                onClick={() => onRemove(label.name)}
                disabled={isMutating}
                data-testid={`${removeTestIdPrefix}-${label.name}`}
              >
                <X className="gba:w-3 gba:h-3" />
              </Button>
            </span>
          )
        }

        return (
          <div key={key} className="gba:flex gba:w-full gba:items-center gba:gap-1">
            <button
              type="button"
              className="gba:flex-1 gba:inline-flex"
              onClick={() => onStartEdit(label)}
              disabled={isMutating}
              data-testid={`${editTestIdPrefix}-${label.name}`}
            >
              <Badge
                variant="secondary"
                className={`gba:text-[10px] gba:h-6 gba:w-full gba:justify-start ${getLabelChipClassName(label.color)}`}
              >
                {label.name}
              </Badge>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-6 gba:w-6"
              onClick={() => onRemove(label.name)}
              disabled={isMutating}
              data-testid={`${removeTestIdPrefix}-${label.name}`}
            >
              <X className="gba:w-3 gba:h-3" />
            </Button>
          </div>
        )
      })}
    </>
  )
}
