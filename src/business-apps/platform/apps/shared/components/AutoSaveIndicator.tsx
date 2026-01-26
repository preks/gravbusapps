/**
 * AutoSaveIndicator Component
 *
 * Displays the auto-save status and provides manual checkpoint button.
 */

import React from 'react'
import { Button, Badge } from '@newwork/nw-design-system'
import { Save, Check, Clock, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export interface AutoSaveIndicatorProps {
  isSaving: boolean
  lastSaveTime: Date | null
  hasUnsavedChanges: boolean
  onManualSave?: () => void
  'data-testid'?: string
}

/**
 * Indicator showing auto-save status
 */
export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  isSaving,
  lastSaveTime,
  hasUnsavedChanges,
  onManualSave,
  'data-testid': testId = 'auto-save-indicator'
}) => {
  const getStatusText = () => {
    if (isSaving) return 'Saving...'
    if (hasUnsavedChanges) return 'Unsaved changes'
    if (lastSaveTime) {
      return `Saved ${formatDistanceToNow(lastSaveTime, { addSuffix: true })}`
    }
    return 'Not saved yet'
  }

  const getStatusIcon = () => {
    if (isSaving) return <Loader2 className="gba:h-3 gba:w-3 gba:animate-spin" />
    if (hasUnsavedChanges) return <Clock className="gba:h-3 gba:w-3" />
    return <Check className="gba:h-3 gba:w-3" />
  }

  const getStatusVariant = () => {
    if (isSaving) return 'default'
    if (hasUnsavedChanges) return 'warning'
    return 'success'
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid={testId}>
      <Badge variant={getStatusVariant()} className="gba:text-xs">
        <span className="gba:flex gba:items-center gba:gap-1">
          {getStatusIcon()}
          {getStatusText()}
        </span>
      </Badge>

      {onManualSave && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onManualSave}
          disabled={isSaving}
          title="Save checkpoint"
          data-testid="manual-checkpoint-button"
        >
          <Save className="gba:h-4 gba:w-4" />
        </Button>
      )}
    </div>
  )
}
