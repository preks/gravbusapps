import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { ChartInlineBody } from '../../workspace/chartInlineBody'
import translations from '../../../_i18n'
import type { RendererProps } from './index'

function parseJson(content: string | null): Record<string, unknown> | null {
  if (!content) return null
  try {
    const parsed = JSON.parse(content)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

const ChartArtifact: React.FC<RendererProps> = ({ content, viewMode }) => {
  const { t } = useTranslation(translations)
  const emptyLabel = t('artifact-chart-empty')

  if (viewMode === 'code') {
    return (
      <pre className="gba:h-full gba:overflow-auto gba:bg-muted/30 gba:p-4 gba:text-xs gba:font-mono">
        {content ?? emptyLabel}
      </pre>
    )
  }

  const parsed = parseJson(content)
  if (!parsed) {
    return <div className="gba:p-6 gba:text-sm gba:text-muted-foreground">{emptyLabel}</div>
  }

  return (
    <div className="gba:h-full gba:overflow-auto gba:p-6">
      <ChartInlineBody data={parsed} />
    </div>
  )
}

export default ChartArtifact
