import React, { useMemo, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { CaretDownIcon, CaretRightIcon, DownloadSimpleIcon } from '@phosphor-icons/react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { formatDuration } from '../../../utils/renderUtils'
import { ActionsTakenPanel } from './ActionsTakenPanel'
import { ArtifactsList } from './ArtifactsList'
import { ChartArtifactPreviewCard } from './ChartArtifactPreviewCard'
import { HtmlArtifactPreviewCard } from './HtmlArtifactPreviewCard'
import { PdfExportCard } from './PdfExportCard'
import { ReferencesRail } from './ReferencesRail'
import { StatusIndicator } from './StatusIndicator'
import { WorkspaceDocCard } from './WorkspaceDocCard'
import { buildCompactSummary, compactOutputForChartDeliverable, pdfAttachmentsFromSession } from './finalAnswerOutput'
import type { FinalAnswerRendererProps } from './types'

export const FinalAnswerRenderer = ({
  output,
  todos,
  actionsPerformed,
  durationMs,
  artifacts,
  workspaceDocuments,
  sessionAttachments,
  references,
  isInstant,
  sessionId,
  accessToken,
  onViewArtifact,
  presentationMode = 'default'
}: FinalAnswerRendererProps) => {
  const markdownVariant = presentationMode === 'enterprise_agents' ? 'enterprise' : 'default'
  const markdownTopSpacingClass = presentationMode === 'enterprise_agents' ? 'gba:pt-6' : 'gba:pt-5'
  const workspaceDocs = workspaceDocuments ?? []
  const hasWorkspaceDocs = workspaceDocs.length > 0
  const pdfAttachments = pdfAttachmentsFromSession(sessionAttachments)
  const hasPdfExports = pdfAttachments.length > 0
  const hasDeliverableCards = hasWorkspaceDocs || hasPdfExports
  const displayArtifacts = (artifacts ?? []).filter(a => {
    const isGhost = (!a.mime_type || a.mime_type === '') && (!a.size || a.size === 0)
    if (isGhost) return false
    return true
  })
  const visualArtifacts = displayArtifacts.filter(
    a => a.rendererType === 'chart' || a.rendererType === 'dashboard' || a.rendererType === 'html'
  )
  const visibleArtifacts = hasDeliverableCards ? visualArtifacts : displayArtifacts
  const htmlArtifacts = visibleArtifacts.filter(a => a.rendererType === 'html')
  const chartArtifacts = useMemo(() => {
    const charts = visibleArtifacts.filter(a => a.rendererType === 'chart' || a.rendererType === 'dashboard')
    return [...charts].sort((a, b) => {
      const aPath = a.path || a.name || ''
      const bPath = b.path || b.name || ''
      const aPlatform = aPath.includes('provider/charts/')
      const bPlatform = bPath.includes('provider/charts/')
      if (aPlatform !== bPlatform) return aPlatform ? -1 : 1
      const aExpertDash = aPath.includes('_dashboard.dashboard.json')
      const bExpertDash = bPath.includes('_dashboard.dashboard.json')
      if (aExpertDash !== bExpertDash) return aExpertDash ? 1 : -1
      return 0
    })
  }, [visibleArtifacts])
  const primaryChartArtifact = chartArtifacts[0]
  const otherArtifacts = visibleArtifacts.filter(
    a => a.rendererType !== 'html' && a.rendererType !== 'chart' && a.rendererType !== 'dashboard'
  )
  const hasVisualDeliverable = chartArtifacts.length > 0 || htmlArtifacts.length > 0
  const showChartPreviews = htmlArtifacts.length === 0
  const displayOutput = compactOutputForChartDeliverable(output, hasVisualDeliverable)
  const [fullOutputVisible, setFullOutputVisible] = useState(true)
  const [actionsExpanded, setActionsExpanded] = useState(false)
  const todoCount = todos?.length ?? 0
  const hasActions = !!actionsPerformed && actionsPerformed.length > 0
  const hasArtifacts = visibleArtifacts.length > 0
  const hasFooterSignals = (durationMs !== undefined && !isInstant) || todoCount > 0
  const showFooter = !isInstant || hasActions || hasArtifacts || hasFooterSignals

  const handleExport = () => {
    const blob = new Blob([output], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agent-output-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    // No overflow-hidden on the root: the references rail cards scale/tilt on
    // hover and must not be clipped. Wide markdown is contained per-section.
    <div
      className="gba:w-full"
      data-testid="enterprise-agent-final-answer"
      data-instant={isInstant ? 'true' : 'false'}
      data-presentation-mode={presentationMode}
    >
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
        <span className="gba:text-[12px] gba:font-bold gba:tracking-[0.01em] gba:text-foreground">
          NEWWORK Enterprise Agents
        </span>
        <StatusIndicator isInstant={isInstant} />
      </div>

      <div className="gba:border-t gba:border-border/70" />

      {hasDeliverableCards ? (
        <>
          {hasWorkspaceDocs && (
            <div className="gba:pt-4">
              <p className="gba:text-sm gba:text-foreground gba:leading-relaxed">
                {buildCompactSummary(workspaceDocs)}
              </p>
            </div>
          )}

          {output.length > 0 && (
            <div className="gba:pt-3">
              <button
                onClick={() => setFullOutputVisible(v => !v)}
                className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
                data-testid="enterprise-agent-final-toggle-output"
              >
                {fullOutputVisible ? (
                  <CaretDownIcon className="gba:h-3 gba:w-3" />
                ) : (
                  <CaretRightIcon className="gba:h-3 gba:w-3" />
                )}
                {fullOutputVisible ? 'Hide full response' : 'Show full response'}
              </button>
              {fullOutputVisible && (
                <div className="gba:pt-2 gba:overflow-hidden">
                  <MarkdownWithChipsRenderer content={output} variant={markdownVariant} accessToken={accessToken} />
                </div>
              )}
            </div>
          )}

          {/* Deliverable cards render at the end of the response so the
              agent's summary/findings read first, then the actionable
              Open / Download cards close it out. */}
          <div className="gba:pt-3 gba:space-y-2">
            {workspaceDocs.map(doc => (
              <WorkspaceDocCard key={doc.id} doc={doc} />
            ))}
            {pdfAttachments.map(att => (
              <PdfExportCard key={att.id} attachment={att} sessionId={sessionId} accessToken={accessToken} />
            ))}
          </div>
        </>
      ) : (
        <div className={`${markdownTopSpacingClass} gba:overflow-hidden`}>
          <MarkdownWithChipsRenderer content={displayOutput} variant={markdownVariant} accessToken={accessToken} />
        </div>
      )}

      <ReferencesRail references={references} accessToken={accessToken} />

      {htmlArtifacts.length > 0 &&
        sessionId &&
        htmlArtifacts.map(artifact => (
          <HtmlArtifactPreviewCard
            key={artifact.path || artifact.name}
            artifact={artifact}
            sessionId={sessionId}
            accessToken={accessToken}
            onViewArtifact={onViewArtifact}
          />
        ))}

      {showChartPreviews && primaryChartArtifact && sessionId && (
        <ChartArtifactPreviewCard
          key={primaryChartArtifact.path || primaryChartArtifact.name}
          artifact={primaryChartArtifact}
          sessionId={sessionId}
          accessToken={accessToken}
          onViewArtifact={onViewArtifact}
        />
      )}

      {otherArtifacts.length > 0 && <ArtifactsList artifacts={otherArtifacts} onViewArtifact={onViewArtifact} />}

      {htmlArtifacts.length > 0 && !sessionId && (
        <ArtifactsList artifacts={htmlArtifacts} onViewArtifact={onViewArtifact} />
      )}

      {actionsPerformed && actionsPerformed.length > 0 && (
        <ActionsTakenPanel
          actions={actionsPerformed}
          expanded={actionsExpanded}
          onToggle={() => setActionsExpanded(v => !v)}
        />
      )}

      {showFooter && (
        <div className="gba:flex gba:items-center gba:gap-4 gba:pt-3 gba:border-t gba:border-border/70">
          {durationMs !== undefined && !isInstant && (
            <span className="gba:text-xs gba:text-muted-foreground">
              Duration: <strong>{formatDuration(durationMs)}</strong>
            </span>
          )}
          {todoCount > 0 && (
            <span className="gba:text-xs gba:text-muted-foreground">
              Tasks: <strong>{todoCount}</strong>
            </span>
          )}
          {!isInstant && (
            <Button
              variant="ghost"
              size="sm"
              className="gba:h-7 gba:gap-1.5 gba:text-xs gba:ml-auto"
              onClick={handleExport}
              data-testid="enterprise-agent-final-export"
            >
              <DownloadSimpleIcon className="gba:h-3.5 gba:w-3.5" />
              Export
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
