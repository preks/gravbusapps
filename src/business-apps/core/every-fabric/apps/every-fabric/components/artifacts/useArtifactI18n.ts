import { useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { ArtifactRendererType } from '../../types/fabric'
import translations from '../../_i18n'

const TYPE_KEY: Record<ArtifactRendererType, string> = {
  html: 'artifact-type-html',
  document: 'artifact-type-document',
  markdown: 'artifact-type-markdown',
  slide: 'artifact-type-slide',
  chart: 'artifact-type-chart',
  table: 'artifact-type-table',
  diagram: 'artifact-type-diagram',
  'app-preview': 'artifact-type-app-preview',
  code: 'artifact-type-code',
  unknown: 'artifact-type-unknown'
}

export function useArtifactI18n() {
  const { t } = useTranslation(translations)

  const typeLabel = useCallback((type: ArtifactRendererType) => t(TYPE_KEY[type]), [t])

  return { t, typeLabel }
}
