import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'

interface SaveIndicatorProps {
  isDirty: boolean
  isSaving: boolean
  hasPage: boolean
}

export function SaveIndicator({ isDirty, isSaving, hasPage }: SaveIndicatorProps) {
  const { t } = useTranslation(translations)

  if (!hasPage) return null

  return (
    <div className="gba:flex gba:items-center gba:gap-1.5">
      <div
        className={`gba:h-1.5 gba:w-1.5 gba:rounded-full gba:transition-colors gba:duration-500 ${
          isSaving ? 'gba:bg-warning gba:animate-pulse' : isDirty ? 'gba:bg-warning' : 'gba:bg-success'
        }`}
      />
      <span className="gba:text-[11px] gba:text-muted-foreground/60 gba:transition-opacity gba:duration-300">
        {isSaving ? t('board-sync-saving') : isDirty ? t('board-sync-unsaved') : t('board-sync-saved')}
      </span>
    </div>
  )
}
