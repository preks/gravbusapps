/**
 * RelationCellDisplay - rich inline display for relation column cells.
 *
 * Shows every linked item with its label + status badge (colored by design token).
 * Each item is clickable: dispatches a custom event picked up by BoardsHub to
 * navigate to the target board and highlight the linked row.
 */

import React, { useCallback } from 'react'
import { Link2 } from 'lucide-react'
import type { RelationConfig } from '../../types'

export interface RelationItemStatus {
  value: string
  label: string
  colorToken: string
}

export interface RelationCellDisplayProps {
  ids: string[]
  labels: string[]
  statuses: Array<RelationItemStatus | null>
  relationConfig?: RelationConfig
  'data-testid'?: string
}

const TOKEN_CLASSES: Record<string, string> = {
  primary: 'gba:bg-primary/15 gba:text-primary',
  success: 'gba:bg-success-secondary gba:text-success-secondary-foreground',
  info: 'gba:bg-info-secondary gba:text-info-secondary-foreground',
  warning: 'gba:bg-warning-secondary gba:text-warning-secondary-foreground',
  destructive: 'gba:bg-destructive-secondary gba:text-destructive-secondary-foreground',
  muted: 'gba:bg-muted gba:text-muted-foreground'
}

export const RelationCellDisplay: React.FC<RelationCellDisplayProps> = ({
  ids,
  labels,
  statuses,
  relationConfig,
  'data-testid': testId = 'relation-cell'
}) => {
  const handleItemClick = useCallback(
    (e: React.MouseEvent, rowId: string) => {
      e.stopPropagation()
      if (!relationConfig) return
      window.dispatchEvent(
        new CustomEvent('board:navigate-to-item', {
          detail: {
            boardId: relationConfig.targetAppId,
            sheetId: relationConfig.targetSheetId,
            rowId
          }
        })
      )
    },
    [relationConfig]
  )

  if (ids.length === 0) {
    return (
      <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground/30 gba:group-hover:text-muted-foreground/60 gba:transition-colors">
        <Link2 className="gba:w-3 gba:h-3" />
        <span className="gba:hidden gba:group-hover:inline">Link...</span>
      </span>
    )
  }

  return (
    <span className="gba:flex gba:flex-wrap gba:items-center gba:gap-1" data-testid={testId}>
      <Link2 className="gba:w-3 gba:h-3 gba:text-muted-foreground/40 gba:shrink-0" />
      {ids.map((id, i) => {
        const label = labels[i] || id.slice(0, 8)
        const status = statuses[i] || null
        const cls = status?.colorToken ? TOKEN_CLASSES[status.colorToken] || TOKEN_CLASSES.muted : null
        const isClickable = Boolean(relationConfig)

        return (
          <button
            key={id}
            type="button"
            onClick={isClickable ? e => handleItemClick(e, id) : undefined}
            className={`gba:inline-flex gba:items-center gba:gap-0.5 gba:rounded gba:text-xs gba:border-0 gba:py-0 gba:px-1.5 gba:bg-primary/10 gba:text-primary gba:transition-colors ${
              isClickable ? 'gba:cursor-pointer gba:hover:bg-primary/20' : 'gba:cursor-default'
            }`}
            data-testid={`${testId}-item-${id}`}
          >
            <span className="gba:truncate gba:max-w-28">{label}</span>
            {status && cls && (
              <span
                className={`gba:inline-block gba:px-1 gba:rounded gba:text-[10px] gba:font-medium gba:leading-4 ${cls}`}
              >
                {status.label}
              </span>
            )}
          </button>
        )
      })}
    </span>
  )
}
