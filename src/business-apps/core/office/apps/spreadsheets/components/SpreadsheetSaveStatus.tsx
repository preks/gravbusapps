/**
 * Inline save status for spreadsheet viewer.
 * Typography matches PagedDocumentEditor `renderSaveStatus` (saved row): text-xs + muted-foreground + flex + gap-1 + CheckCircle w-3 h-3 text-success.
 */

import React, { useMemo } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { CheckCircle, Clock, Loader2, AlertCircle, Save } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import sharedTranslations from '../../../../../platform/apps/shared/_i18n'
import spreadsheetTranslations from '../_i18n'

const JUST_SAVED_MS = 45_000

export interface SpreadsheetSaveStatusProps {
  isSaving: boolean
  lastSaveTime: Date | null
  hasUnsavedChanges: boolean
  onManualSave?: () => void
  persistenceError?: string | null
  'data-testid'?: string
}

export const SpreadsheetSaveStatus: React.FC<SpreadsheetSaveStatusProps> = ({
  isSaving,
  lastSaveTime,
  hasUnsavedChanges,
  onManualSave,
  persistenceError,
  'data-testid': testId = 'spreadsheet-save-status'
}) => {
  const { t } = useTranslation(sharedTranslations)
  const { t: tSheet } = useTranslation(spreadsheetTranslations)

  const statusText = useMemo(() => {
    if (isSaving) return t('autosave-saving')
    if (persistenceError) return persistenceError
    if (hasUnsavedChanges) return t('autosave-unsaved')
    if (lastSaveTime) {
      const ms = Date.now() - lastSaveTime.getTime()
      if (ms >= 0 && ms < JUST_SAVED_MS) {
        return tSheet('spreadsheet-save-just-now')
      }
      const timeStr = formatDistanceToNow(lastSaveTime, { addSuffix: true })
      return t('autosave-saved-ago', { time: timeStr })
    }
    return t('autosave-not-saved')
  }, [hasUnsavedChanges, isSaving, lastSaveTime, persistenceError, t, tSheet])

  const stateKey = isSaving
    ? 'saving'
    : persistenceError
      ? 'error'
      : hasUnsavedChanges
        ? 'unsaved'
        : lastSaveTime
          ? 'saved'
          : 'idle'

  const spanClass =
    stateKey === 'error'
      ? 'gba:text-xs gba:text-destructive gba:flex gba:items-center gba:gap-1 gba:min-w-0'
      : stateKey === 'unsaved'
        ? 'gba:text-xs gba:text-warning gba:font-medium gba:flex gba:items-center gba:gap-1 gba:min-w-0'
        : 'gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1 gba:min-w-0'

  const icon =
    stateKey === 'saving' ? (
      <Loader2 className="gba:h-3 gba:w-3 gba:flex-shrink-0 gba:animate-spin" aria-hidden />
    ) : stateKey === 'error' ? (
      <AlertCircle className="gba:h-3 gba:w-3 gba:flex-shrink-0" aria-hidden />
    ) : stateKey === 'unsaved' ? (
      <Clock className="gba:h-3 gba:w-3 gba:flex-shrink-0 gba:text-warning" aria-hidden />
    ) : stateKey === 'saved' ? (
      <CheckCircle className="gba:h-3 gba:w-3 gba:flex-shrink-0 gba:text-success" aria-hidden />
    ) : (
      <Clock className="gba:h-3 gba:w-3 gba:flex-shrink-0" aria-hidden />
    )

  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid={testId}>
      <span className="gba:w-40 gba:min-w-0" title={statusText}>
        <span className={spanClass} data-testid={`${testId}-${stateKey}`}>
          {icon}
          <span className="gba:truncate">{statusText}</span>
        </span>
      </span>
      {onManualSave && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onManualSave}
          disabled={isSaving}
          title={t('autosave-save-checkpoint')}
          data-testid="manual-checkpoint-button"
          className="gba:h-8"
        >
          <Save className="gba:h-4 gba:w-4" />
        </Button>
      )}
    </div>
  )
}
