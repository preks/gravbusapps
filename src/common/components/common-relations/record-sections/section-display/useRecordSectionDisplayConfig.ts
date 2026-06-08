import { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from './_i18n'
import { buildSectionDisplayConfigs } from './buildSectionDisplayConfigs'
import type { RecordSectionDisplayConfigs } from './types'

export const useRecordSectionDisplayConfig = (): RecordSectionDisplayConfigs => {
  const { t } = useTranslation(translations)

  return useMemo(() => buildSectionDisplayConfigs(t), [t])
}
