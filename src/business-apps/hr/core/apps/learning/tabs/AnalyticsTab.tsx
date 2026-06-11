import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { ComingSoon } from '../components/ComingSoon'
import translations from '../_i18n'

export const AnalyticsTab: React.FC = () => {
  const { t } = useTranslation(translations)
  return <ComingSoon title={t('learning-tab-analytics')} />
}
