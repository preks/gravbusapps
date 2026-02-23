/**
 * AutoSaveIndicator Component
 *
 * Displays the auto-save status and provides manual checkpoint button.
 * When currentVersion is provided, shows the current saved version name instead of "Saved X ago".
 */

import React from 'react'
import { Button, Badge, useTranslation } from '@newwork/nw-design-system'
import { Save, Check, Clock, Loader2 } from 'lucide-react'
import sharedTranslations from '../_i18n'
import { formatDistanceToNow } from 'date-fns'

export interface VersionLabel {
  version: number
  changeDescription?: string
}

export interface AutoSaveIndicatorMessages {
  saving?: string
  unsavedChanges?: string
  notSaved?: string
  savedAgo?: string
  versionHistory?: string
  saveCheckpoint?: string
}

export interface AutoSaveIndicatorProps {
  isSaving: boolean
  lastSaveTime: Date | null
  hasUnsavedChanges: boolean
  onManualSave?: () => void
  /** When set, show this version name instead of save-status text (e.g. "v3" or "v3 • Draft"). When null and showVersionOnly is true, show "v—". */
  currentVersion?: VersionLabel | null
  /** When true, never show "Saved X ago"; show only version label or "Saving...". Use with document editors that show save status elsewhere. */
  showVersionOnly?: boolean
  /** When provided, the version badge is clickable (e.g. to open version history). Only applies when showing a version label. */
  onVersionClick?: () => void
  messages?: AutoSaveIndicatorMessages
  'data-testid'?: string
}

/**
 * Indicator showing auto-save status or current version name
 */
export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  isSaving,
  lastSaveTime,
  hasUnsavedChanges,
  onManualSave,
  currentVersion,
  showVersionOnly = false,
  onVersionClick,
  messages: messagesProp,
  'data-testid': testId = 'auto-save-indicator'
}) => {
  const { t } = useTranslation(sharedTranslations)
  const defaultAutoSaveMessages = {
    saving: t('autosave-saving'),
    unsavedChanges: t('autosave-unsaved'),
    notSaved: t('autosave-not-saved'),
    versionHistory: t('autosave-version-history'),
    saveCheckpoint: t('autosave-save-checkpoint'),
    savedAgo: t('autosave-saved-ago')
  }
  const messages = { ...defaultAutoSaveMessages, ...messagesProp }
  const isVersionLabel = showVersionOnly || currentVersion != null
  const isVersionClickable = Boolean(onVersionClick && isVersionLabel && !isSaving)
  const getStatusText = () => {
    if (isSaving) return messages.saving
    if (showVersionOnly) {
      if (currentVersion != null) {
        const label = `v${currentVersion.version}`
        return currentVersion.changeDescription ? `${label} • ${currentVersion.changeDescription}` : label
      }
      return t('autosave-version-placeholder')
    }
    if (currentVersion != null) {
      const label = `v${currentVersion.version}`
      return currentVersion.changeDescription ? `${label} • ${currentVersion.changeDescription}` : label
    }
    if (hasUnsavedChanges) return messages.unsavedChanges
    if (lastSaveTime) {
      const timeStr = formatDistanceToNow(lastSaveTime, { addSuffix: true })
      return messages.savedAgo
        ? messages.savedAgo.replace(/{[^}]*time[^}]*}/g, timeStr)
        : t('autosave-saved-ago', { time: timeStr })
    }
    return messages.notSaved
  }

  const getStatusIcon = () => {
    if (isSaving) return <Loader2 className="gba:h-3 gba:w-3 gba:animate-spin" />
    if (showVersionOnly || currentVersion != null) return <Check className="gba:h-3 gba:w-3" />
    if (hasUnsavedChanges) return <Clock className="gba:h-3 gba:w-3" />
    return <Check className="gba:h-3 gba:w-3" />
  }

  const getStatusVariant = () => {
    if (isSaving) return 'default'
    if (showVersionOnly || currentVersion != null) return 'secondary'
    if (hasUnsavedChanges) return 'warning'
    return 'success'
  }

  const badgeContent = (
    <span className="gba:flex gba:items-center gba:gap-1">
      {getStatusIcon()}
      {getStatusText()}
    </span>
  )

  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid={testId}>
      {isVersionClickable ? (
        <button
          type="button"
          onClick={onVersionClick}
          title={messages.versionHistory}
          className="gba:cursor-pointer gba:rounded-md gba:border-0 gba:bg-transparent gba:p-0 gba:inline-flex gba:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring gba:focus-visible:ring-offset-2"
          data-testid={`${testId}-version-button`}
        >
          <Badge variant={getStatusVariant()} className="gba:text-xs">
            {badgeContent}
          </Badge>
        </button>
      ) : (
        <Badge variant={getStatusVariant()} className="gba:text-xs">
          {badgeContent}
        </Badge>
      )}

      {onManualSave && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onManualSave}
          disabled={isSaving}
          title={messages.saveCheckpoint}
          data-testid="manual-checkpoint-button"
        >
          <Save className="gba:h-4 gba:w-4" />
        </Button>
      )}
    </div>
  )
}
