import { useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { cardStatusStyle, type GlassCardStatus } from './glassCardModel'

export function useGlassCardI18n() {
  const { t } = useTranslation(translations)

  const statusLabel = useCallback((status: GlassCardStatus) => t(cardStatusStyle(status).labelKey), [t])

  return { t, statusLabel }
}
