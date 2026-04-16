import React from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { Trash2, X, Pin } from 'lucide-react'
import translations from '../_i18n'

export interface NoteBulkActionsProps {
  selectedCount: number
  onDelete: () => void
  onPin?: () => void
  onClearSelection: () => void
  'data-testid'?: string
}

export const NoteBulkActions: React.FC<NoteBulkActionsProps> = ({
  selectedCount,
  onDelete,
  onPin,
  onClearSelection,
  'data-testid': testId = 'note-bulk-actions'
}) => {
  const { t } = useTranslation(translations)

  if (selectedCount === 0) return null

  return (
    <div
      className="gba:sticky gba:bottom-4 gba:z-20 gba:mx-auto gba:w-fit gba:flex gba:items-center gba:gap-1.5 gba:px-4 gba:py-2 gba:bg-foreground/90 gba:backdrop-blur-lg gba:text-background gba:rounded-full gba:shadow-xl gba:border gba:border-foreground/10"
      data-testid={testId}
    >
      <span className="gba:text-sm gba:font-medium gba:px-2 gba:tabular-nums">
        {t('bulk-selected', { count: selectedCount })}
      </span>

      <div className="gba:w-px gba:h-4 gba:bg-background/20 gba:mx-1" />

      {onPin && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onPin}
          className="gba:gap-1.5 gba:text-background hover:gba:bg-background/10 hover:gba:text-background gba:h-7"
          data-testid={`${testId}-pin`}
        >
          <Pin className="gba:w-3.5 gba:h-3.5" />
          {t('menu-pin')}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="gba:gap-1.5 gba:text-red-400 hover:gba:bg-red-500/20 hover:gba:text-red-300 gba:h-7"
        data-testid={`${testId}-delete`}
      >
        <Trash2 className="gba:w-3.5 gba:h-3.5" />
        {t('menu-delete')}
      </Button>

      <div className="gba:w-px gba:h-4 gba:bg-background/20 gba:mx-1" />

      <Button
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        className="gba:text-background/60 hover:gba:text-background hover:gba:bg-background/10 gba:h-7 gba:w-7"
        data-testid={`${testId}-clear`}
      >
        <X className="gba:w-3.5 gba:h-3.5" />
      </Button>
    </div>
  )
}
