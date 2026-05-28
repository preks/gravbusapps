import React, { useEffect, useState } from 'react'
import { ChartEmptyState, ChartInlineBody, isChartPreviewRenderable } from '../../workspace/chartInlineBody'
import { normalizeChartPayloadForRender } from '../../workspace/chartRenderers'
import { useEnterpriseAgentClient } from '../../../hooks/useEnterpriseAgentClient'
import type { FinalAnswerArtifact } from './types'

export const ChartArtifactPreviewCard: React.FC<{
  artifact: FinalAnswerArtifact
  sessionId: string
  accessToken?: string
  onViewArtifact?: (artifactName: string) => void
}> = ({ artifact, sessionId, accessToken, onViewArtifact }) => {
  const [chartData, setChartData] = useState<Record<string, unknown> | null>(null)
  const client = useEnterpriseAgentClient(accessToken ?? '')
  const artifactPath = artifact.path || artifact.name

  useEffect(() => {
    if (!sessionId || !accessToken) {
      setChartData(null)
      return
    }
    let cancelled = false
    client
      .getArtifactContent(sessionId, artifactPath)
      .then(raw => {
        if (!cancelled) {
          const parsed = JSON.parse(raw) as Record<string, unknown>
          setChartData(normalizeChartPayloadForRender(parsed))
        }
      })
      .catch(() => {
        if (!cancelled) setChartData(null)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, artifactPath, client, sessionId])

  if (chartData && !isChartPreviewRenderable(chartData)) return null

  return (
    <div
      className="gba:pt-4 gba:w-full gba:max-w-full gba:min-w-0 gba:overflow-hidden"
      data-testid={`chart-preview-card-${artifact.name}`}
    >
      <div className="gba:rounded-xl gba:border gba:border-border gba:overflow-hidden gba:bg-background gba:shadow-sm gba:p-5 gba:max-w-full">
        {chartData ? (
          <ChartInlineBody data={chartData} />
        ) : (
          <ChartEmptyState message="Chart data could not be loaded." />
        )}
        <div className="gba:flex gba:justify-end gba:pt-3 gba:mt-3 gba:border-t gba:border-border/50">
          <button
            type="button"
            onClick={() => onViewArtifact?.(artifactPath)}
            className="gba:text-xs gba:font-medium gba:text-primary gba:hover:text-primary/80 gba:transition-colors gba:cursor-pointer gba:border-0 gba:bg-transparent"
          >
            Open full view
          </button>
        </div>
      </div>
    </div>
  )
}
