import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../../_i18n'

export const StatusIndicator: React.FC<{ isInstant?: boolean }> = ({ isInstant }) => {
  const { t } = useTranslation(translations)

  if (!isInstant) {
    return <span className="gba:text-[11px] gba:text-muted-foreground">{t('renderer-final-status-completed')}</span>
  }
  return null
}
