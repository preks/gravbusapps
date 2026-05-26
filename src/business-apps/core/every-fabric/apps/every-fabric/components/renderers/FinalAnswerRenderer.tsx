import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Badge, Button, toast } from '@newwork/nw-design-system'
import {
  ArrowSquareOutIcon,
  CaretDownIcon,
  CaretRightIcon,
  DownloadSimpleIcon,
  FileCodeIcon,
  FileCssIcon,
  FileHtmlIcon,
  FileIcon,
  FileJsIcon,
  FilePyIcon,
  FileTextIcon,
  ImageIcon,
  PresentationIcon
} from '@phosphor-icons/react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { resolveEntityLink } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import type {
  EnterprisePresentationMode,
  TodoItem,
  ActionSummary,
  WorkspaceDocument,
  SessionAttachment,
  MessageAttachmentRef
} from '../../types/enterpriseAgent'
import { formatDuration } from '../../utils/renderUtils'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import { ChartInlineBody } from '../workspace/chartInlineBody'
import { AutoHeightHtmlIframe } from '../artifacts/AutoHeightHtmlIframe'

interface FinalAnswerArtifact {
  name: string
  path: string
  mime_type: string
  size: number
  rendererType: string
}

export interface FinalAnswerRendererProps {
  output: string
  todos?: TodoItem[]
  actionsPerformed?: ActionSummary[]
  durationMs?: number
  artifacts?: FinalAnswerArtifact[]
  workspaceDocuments?: WorkspaceDocument[]
  /** PDF (and other) files attached to the session after export/upload tools run. */
  sessionAttachments?: Array<SessionAttachment | MessageAttachmentRef>
  /**
   * True when the answer was produced instantly (e.g. greeting/capability
   * fast-path) and should be revealed progressively with a typewriter effect
   * rather than appearing as a wall of text. Also soften the "Completed"
   * treatment since no real work was done.
   */
  isInstant?: boolean
  /** Session ID used to construct artifact download URLs for inline previews. */
  sessionId?: string
  /** Bearer token for authenticated artifact fetches in inline chart previews. */
  accessToken?: string
  onViewArtifact?: (artifactName: string) => void
  presentationMode?: EnterprisePresentationMode
}

const getArtifactIcon = (rendererType: string) => {
  const iconClass = 'gba:h-4 gba:w-4 gba:shrink-0'
  switch (rendererType) {
    case 'html':
      return <FileHtmlIcon className={`${iconClass} gba:text-orange-500`} />
    case 'markdown':
    case 'document':
      return <FileTextIcon className={`${iconClass} gba:text-blue-500`} />
    case 'css':
      return <FileCssIcon className={`${iconClass} gba:text-blue-400`} />
    case 'javascript':
    case 'typescript':
      return <FileJsIcon className={`${iconClass} gba:text-yellow-500`} />
    case 'python':
      return <FilePyIcon className={`${iconClass} gba:text-blue-600`} />
    case 'code':
      return <FileCodeIcon className={`${iconClass} gba:text-purple-500`} />
    default:
      return <FileIcon className={`${iconClass} gba:text-muted-foreground`} />
  }
}

const DOC_TYPE_ICON: Record<WorkspaceDocument['type'], React.FC<{ className?: string }>> = {
  document: FileTextIcon,
  slides: PresentationIcon,
  note: FileTextIcon
}

const DOC_TYPE_LABEL: Record<WorkspaceDocument['type'], string> = {
  document: 'Document',
  slides: 'Presentation',
  note: 'Note'
}

const workspaceDocCardClassName =
  'gba:flex gba:items-center gba:gap-2.5 gba:px-3.5 gba:py-2.5 gba:rounded-xl gba:border gba:border-border gba:bg-card gba:hover:bg-accent/50 gba:transition-all gba:duration-200 gba:cursor-pointer gba:w-full gba:no-underline gba:group'

const ArtifactCreatedCard: React.FC<{
  doc: WorkspaceDocument
  accessToken?: string
}> = ({ doc }) => {
  const Icon = DOC_TYPE_ICON[doc.type] ?? FileTextIcon
  const label = DOC_TYPE_LABEL[doc.type] ?? 'Document'
  const body = (
    <>
      <div className="gba:h-8 gba:w-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:shrink-0">
        <Icon className="gba:h-4 gba:w-4 gba:text-primary" />
      </div>
      <div className="gba:text-left gba:min-w-0 gba:flex-1">
        <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:block gba:truncate">
          {label} created
        </span>
        <span className="gba:text-[10px] gba:text-muted-foreground gba:block">Click to view on canvas</span>
      </div>
      <Badge variant="secondary" className="gba:ml-auto gba:text-[10px] gba:shrink-0">
        View
      </Badge>
    </>
  )
  const isEntityProtocol = /^\w+:\/\//.test(doc.url) && !/^https?:\/\//i.test(doc.url)
  const resolvedHref = isEntityProtocol ? (resolveEntityLink(doc.url)?.url ?? doc.url) : doc.url
  return (
    <a
      href={resolvedHref}
      target="_blank"
      rel="noopener noreferrer"
      className={workspaceDocCardClassName}
      data-testid={`workspace-doc-card-${doc.id}`}
    >
      {body}
    </a>
  )
}

const PdfExportCard: React.FC<{
  attachment: SessionAttachment | MessageAttachmentRef
  sessionId?: string
  accessToken?: string
}> = ({ attachment, sessionId, accessToken }) => {
  const client = useEnterpriseAgentClient(accessToken ?? '')
  const [downloading, setDownloading] = useState(false)
  const fileName = attachment.name || 'export.pdf'

  const handleDownload = useCallback(async () => {
    if (!sessionId || !attachment.id) {
      toast.error('PDF unavailable — missing session or attachment id.')
      return
    }
    setDownloading(true)
    try {
      const blob = await client.fetchAttachmentContent(sessionId, attachment.id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown error'
      toast.error(`Could not download PDF: ${detail}`)
    } finally {
      setDownloading(false)
    }
  }, [attachment.id, client, fileName, sessionId])

  return (
    <button
      type="button"
      onClick={() => void handleDownload()}
      disabled={!sessionId || !attachment.id || downloading}
      className="gba:flex gba:items-center gba:gap-2.5 gba:px-3.5 gba:py-2.5 gba:rounded-xl gba:border gba:border-border gba:bg-card gba:hover:bg-accent/50 gba:transition-all gba:duration-200 gba:cursor-pointer gba:w-full gba:text-left"
      data-testid={`pdf-export-card-${attachment.id}`}
    >
      <div className="gba:h-8 gba:w-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:shrink-0">
        <FileTextIcon className="gba:h-4 gba:w-4 gba:text-primary" />
      </div>
      <div className="gba:min-w-0 gba:flex-1">
        <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:block gba:truncate">PDF ready</span>
        <span className="gba:text-[10px] gba:text-muted-foreground gba:block gba:truncate">{fileName}</span>
      </div>
      <Badge
        variant="secondary"
        className="gba:ml-auto gba:text-[10px] gba:shrink-0 gba:inline-flex gba:items-center gba:gap-1"
      >
        <DownloadSimpleIcon className="gba:h-3 gba:w-3" />
        {downloading ? '…' : 'Download'}
      </Badge>
    </button>
  )
}

function pdfAttachmentsFromSession(
  attachments?: Array<SessionAttachment | MessageAttachmentRef>
): Array<SessionAttachment | MessageAttachmentRef> {
  if (!attachments?.length) return []
  return attachments.filter(a => (a.mime_type || '').toLowerCase() === 'application/pdf')
}

const StatusIndicator: React.FC<{ isInstant?: boolean }> = ({ isInstant }) => {
  if (!isInstant) {
    return <span className="gba:text-[11px] gba:text-muted-foreground">Completed</span>
  }
  return null
}

interface ActionsTakenPanelProps {
  actions: ActionSummary[]
  expanded: boolean
  onToggle: () => void
}

const ActionsTakenPanel: React.FC<ActionsTakenPanelProps> = ({ actions, expanded, onToggle }) => (
  <div className="gba:mt-4 gba:border-t gba:border-border/70">
    <button
      className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:py-2.5 gba:hover:bg-muted/15 gba:transition-colors gba:text-left"
      onClick={onToggle}
      data-testid="enterprise-agent-final-actions-toggle"
    >
      <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide">
        Actions taken
      </span>
      {expanded ? (
        <CaretDownIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
      ) : (
        <CaretRightIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
      )}
    </button>
    {expanded && (
      <div className="gba:pb-3 gba:space-y-1">
        {actions.map((action, index) => (
          <div
            key={`${index}-${action.step}-${action.tool ?? 'none'}-${action.outcome}`}
            className="gba:flex gba:items-start gba:gap-2 gba:text-sm"
          >
            <span className="gba:text-muted-foreground/50 gba:shrink-0">{index + 1}.</span>
            <span className="gba:flex-1">{action.step}</span>
            {action.tool && (
              <span className="gba:text-xs gba:font-mono gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded gba:text-muted-foreground gba:shrink-0">
                {action.tool}
              </span>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
)

interface ArtifactsListProps {
  artifacts: FinalAnswerArtifact[]
  onViewArtifact?: (artifactName: string) => void
}

/** Extract ### Summary body without regex (avoids Sonar S5852 ReDoS hotspot). */
function extractSummarySection(output: string): string | null {
  const lines = output.split('\n')
  let summaryLine = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.toLowerCase() === '### summary' || line.toLowerCase().startsWith('### summary ')) {
      summaryLine = i
      break
    }
  }
  if (summaryLine === -1) return null

  const bodyLines: string[] = []
  for (let i = summaryLine + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (trimmed.startsWith('### ')) break
    bodyLines.push(lines[i])
  }
  const body = bodyLines.join('\n').trim()
  return body || null
}

/** When a dashboard or timeline artifact exists, hide redundant markdown from the orchestrator. */
function compactOutputForChartDeliverable(output: string, hasVisualArtifacts: boolean): string {
  if (!hasVisualArtifacts || !output.trim()) return output
  const isChartDeliverable =
    /chart rendered successfully/i.test(output) ||
    /timeline rendered successfully/i.test(output) ||
    /dashboard artifact/i.test(output) ||
    /open the (dashboard |timeline )?artifact/i.test(output)
  if (!isChartDeliverable) return output

  const summaryBody = extractSummarySection(output)
  if (summaryBody) {
    return `### Summary\n\n${summaryBody}`
  }

  const firstParagraph = output
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join('\n')
  return firstParagraph || 'Dashboard ready — see the visualization below.'
}

function buildArtifactDownloadUrl(sessionId: string, artifactPath: string): string {
  const base = PROMPT_MANAGER_API_URL.endsWith('/') ? PROMPT_MANAGER_API_URL.slice(0, -1) : PROMPT_MANAGER_API_URL
  return `${base}/deep-agent/sessions/${encodeURIComponent(sessionId)}/artifacts/${encodeURIComponent(artifactPath)}`
}

const HtmlArtifactPreviewCard: React.FC<{
  artifact: FinalAnswerArtifact
  sessionId: string
  onViewArtifact?: (artifactName: string) => void
}> = ({ artifact, sessionId, onViewArtifact }) => {
  const artifactPath = artifact.path || artifact.name
  const downloadUrl = buildArtifactDownloadUrl(sessionId, artifactPath)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleDownloadPng = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const iframe = iframeRef.current
      if (!iframe?.contentWindow) return

      const expectedOrigin = new URL(downloadUrl, globalThis.location.href).origin
      const onMessage = (ev: MessageEvent) => {
        if (ev.origin !== expectedOrigin) return
        if (ev.data?.type === 'capture-png-result' && ev.data.dataUrl) {
          globalThis.removeEventListener('message', onMessage)
          const link = document.createElement('a')
          link.download = artifact.name.replace(/\.html?$/i, '') + '.png'
          link.href = ev.data.dataUrl
          document.body.appendChild(link)
          link.click()
          link.remove()
        } else if (ev.data?.type === 'capture-png-error') {
          globalThis.removeEventListener('message', onMessage)
        }
      }
      globalThis.addEventListener('message', onMessage)
      setTimeout(() => globalThis.removeEventListener('message', onMessage), 10_000)
      iframe.contentWindow.postMessage({ type: 'capture-png' }, expectedOrigin)
    },
    [artifact.name, downloadUrl]
  )

  const handleOpenNewTab = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      globalThis.open(downloadUrl, '_blank', 'noopener,noreferrer')
    },
    [downloadUrl]
  )

  return (
    <div
      className="gba:w-full gba:max-w-full gba:min-w-0 gba:bg-white gba:text-left gba:group"
      data-testid={`enterprise-agent-final-artifact-${artifact.name}`}
    >
      <AutoHeightHtmlIframe
        src={downloadUrl}
        title={artifact.name}
        iframeRef={iframeRef}
        className="gba:bg-white gba:max-w-full"
      />
      <div className="gba:flex gba:items-center gba:justify-end gba:gap-1.5 gba:bg-white gba:px-2 gba:py-2">
        <button
          type="button"
          onClick={handleDownloadPng}
          title="Download as PNG"
          className="gba:inline-flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:cursor-pointer gba:border-0 gba:bg-transparent"
        >
          <ImageIcon className="gba:h-3.5 gba:w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleOpenNewTab}
          title="Open in new tab"
          className="gba:inline-flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:cursor-pointer gba:border-0 gba:bg-transparent"
        >
          <ArrowSquareOutIcon className="gba:h-3.5 gba:w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onViewArtifact?.(artifact.path || artifact.name)}
          title="Open full view"
          className="gba:text-xs gba:font-medium gba:text-primary gba:hover:text-primary/80 gba:transition-colors gba:cursor-pointer gba:ml-1 gba:border-0 gba:bg-transparent"
        >
          Open
        </button>
      </div>
    </div>
  )
}

const ChartArtifactPreviewCard: React.FC<{
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
        if (!cancelled) setChartData(JSON.parse(raw) as Record<string, unknown>)
      })
      .catch(() => {
        if (!cancelled) setChartData(null)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, artifactPath, client, sessionId])

  if (!chartData) return null

  return (
    <div
      className="gba:pt-4 gba:w-full gba:max-w-full gba:min-w-0 gba:overflow-hidden"
      data-testid={`chart-preview-card-${artifact.name}`}
    >
      <div className="gba:rounded-xl gba:border gba:border-border gba:overflow-hidden gba:bg-background gba:shadow-sm gba:p-5 gba:max-w-full">
        <ChartInlineBody data={chartData} />
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

const ArtifactsList: React.FC<ArtifactsListProps> = ({ artifacts, onViewArtifact }) => (
  <div className="gba:pt-4 gba:space-y-2 gba:min-w-0 gba:max-w-full gba:overflow-hidden">
    {artifacts.map(artifact => (
      <button
        key={artifact.path || artifact.name}
        onClick={() => onViewArtifact?.(artifact.path || artifact.name)}
        className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2.5 gba:text-left gba:hover:bg-muted/40 gba:transition-colors"
        data-testid={`enterprise-agent-final-artifact-${artifact.name}`}
      >
        {getArtifactIcon(artifact.rendererType)}
        <div className="gba:min-w-0 gba:flex-1">
          <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{artifact.name}</p>
          <p className="gba:text-xs gba:text-muted-foreground">
            {artifact.rendererType} · {(artifact.size / 1024).toFixed(1)} KB
          </p>
        </div>
        <CaretRightIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
      </button>
    ))}
  </div>
)

function buildCompactSummary(docs: WorkspaceDocument[]): string {
  if (docs.length === 1) {
    const d = docs[0]
    const label = DOC_TYPE_LABEL[d.type]?.toLowerCase() ?? 'document'
    return `I've created the ${label} "${d.title}". You can review it on the canvas, refine it with follow-up instructions, or save it to your documents.`
  }
  const titles = docs.map(d => `"${d.title}"`).join(', ')
  return `I've created ${docs.length} items: ${titles}. You can review them on the canvas or save them to your workspace.`
}

export const FinalAnswerRenderer = ({
  output,
  todos,
  actionsPerformed,
  durationMs,
  artifacts,
  workspaceDocuments,
  sessionAttachments,
  isInstant,
  sessionId,
  accessToken,
  onViewArtifact,
  presentationMode = 'default'
}: FinalAnswerRendererProps) => {
  const markdownVariant = presentationMode === 'enterprise_agents' ? 'enterprise' : 'default'
  // Enterprise sessions get a touch more vertical breathing room above the
  // markdown body so headings/lists don't feel cramped against the bubble
  // chrome. Non-enterprise keeps the existing rhythm.
  const markdownTopSpacingClass = presentationMode === 'enterprise_agents' ? 'gba:pt-6' : 'gba:pt-5'
  const hasWorkspaceDocs = !!workspaceDocuments && workspaceDocuments.length > 0
  const pdfAttachments = pdfAttachmentsFromSession(sessionAttachments)
  const hasPdfExports = pdfAttachments.length > 0
  const hasDeliverableCards = hasWorkspaceDocs || hasPdfExports
  // Filter out leftover "ghost" artifacts produced by the agent: zero-byte
  // entries with no mime type are backend scaffolding that should never reach
  // the user. When a workspace document already represents the deliverable we
  // also hide the raw artifact list entirely to avoid duplicate cards.
  const displayArtifacts = (artifacts ?? []).filter(a => {
    const isGhost = (!a.mime_type || a.mime_type === '') && (!a.size || a.size === 0)
    if (isGhost) return false
    return true
  })
  const visibleArtifacts = hasDeliverableCards ? [] : displayArtifacts
  const htmlArtifacts = visibleArtifacts.filter(a => a.rendererType === 'html')
  const chartArtifacts = visibleArtifacts.filter(a => a.rendererType === 'chart' || a.rendererType === 'dashboard')
  const otherArtifacts = visibleArtifacts.filter(
    a => a.rendererType !== 'html' && a.rendererType !== 'chart' && a.rendererType !== 'dashboard'
  )
  const hasVisualDeliverable = chartArtifacts.length > 0 || htmlArtifacts.length > 0
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
    <div
      className="gba:w-full gba:overflow-hidden"
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
          {/* Compact summary — mirrors Nexus: short text + artifact card */}
          {hasWorkspaceDocs && (
            <div className="gba:pt-4">
              <p className="gba:text-sm gba:text-foreground gba:leading-relaxed">
                {buildCompactSummary(workspaceDocuments!)}
              </p>
            </div>
          )}

          <div className="gba:pt-3 gba:space-y-2">
            {workspaceDocuments?.map(doc => (
              <ArtifactCreatedCard key={doc.id} doc={doc} accessToken={accessToken} />
            ))}
            {pdfAttachments.map(att => (
              <PdfExportCard key={att.id} attachment={att} sessionId={sessionId} accessToken={accessToken} />
            ))}
          </div>

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
                <div className="gba:pt-2">
                  <MarkdownWithChipsRenderer content={output} variant={markdownVariant} />
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className={markdownTopSpacingClass}>
          <MarkdownWithChipsRenderer content={displayOutput} variant={markdownVariant} />
        </div>
      )}

      {htmlArtifacts.length > 0 &&
        sessionId &&
        htmlArtifacts.map(artifact => (
          <HtmlArtifactPreviewCard
            key={artifact.path || artifact.name}
            artifact={artifact}
            sessionId={sessionId}
            onViewArtifact={onViewArtifact}
          />
        ))}

      {chartArtifacts.length > 0 &&
        sessionId &&
        chartArtifacts.map(artifact => (
          <ChartArtifactPreviewCard
            key={artifact.path || artifact.name}
            artifact={artifact}
            sessionId={sessionId}
            accessToken={accessToken}
            onViewArtifact={onViewArtifact}
          />
        ))}

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
