import React, { useEffect, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import type { ArtifactPreview } from '../../hooks/useArtifactPreview'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import { PanelCard } from './PanelCard'
import { ChartInlineBody } from './chartInlineBody'

export const ChartPreview: React.FC<{
  preview: ArtifactPreview
  sessionId?: string
  accessToken?: string
}> = ({ preview, sessionId, accessToken }) => {
  const { t } = useTranslation(translations)
  const client = useEnterpriseAgentClient(accessToken ?? '')
  const [fetchedContent, setFetchedContent] = useState<Record<string, unknown> | null>(null)

  const pathOnly =
    preview.content &&
    typeof preview.content.path === 'string' &&
    !preview.content.sections &&
    !preview.content.chartType

  useEffect(() => {
    if (!pathOnly || !sessionId || !accessToken) {
      setFetchedContent(null)
      return
    }
    let cancelled = false
    client
      .getArtifactContent(sessionId, preview.content!.path as string)
      .then(raw => {
        if (cancelled) return
        setFetchedContent(JSON.parse(raw) as Record<string, unknown>)
      })
      .catch(() => {
        if (!cancelled) setFetchedContent(null)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, client, pathOnly, preview.content, sessionId])

  const resolvedContent = fetchedContent ?? preview.content

  if (!resolvedContent) {
    return (
      <PanelCard title={t('workspace-live-preview-title')} defaultOpen>
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:p-6">
          <p className="gba:text-xs gba:text-muted-foreground">{t('workspace-chart-unavailable')}</p>
        </div>
      </PanelCard>
    )
  }

  return (
    <PanelCard title={t('workspace-live-preview-title')} defaultOpen>
      <div className="gba:p-3 gba:max-w-full gba:overflow-hidden" data-testid="fabric-live-preview-chart">
        <ChartInlineBody data={resolvedContent} />
      </div>
    </PanelCard>
  )
}
