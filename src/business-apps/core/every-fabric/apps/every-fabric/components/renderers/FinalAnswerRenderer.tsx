import { useState } from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import {
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
  PresentationIcon
} from '@phosphor-icons/react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import type { TodoItem, ActionSummary, WorkspaceDocument } from '../../types/enterpriseAgent'
import { formatDuration } from '../../utils/renderUtils'
import HtmlPreviewCard from '../artifacts/HtmlPreviewCard'

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
  /**
   * True when the answer was produced instantly (e.g. greeting/capability
   * fast-path) and should be revealed progressively with a typewriter effect
   * rather than appearing as a wall of text. Also soften the "Completed"
   * treatment since no real work was done.
   */
  isInstant?: boolean
  onViewArtifact?: (artifactName: string) => void
  /** Session ID for constructing artifact download URLs (inline HTML preview) */
  sessionId?: string
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

const ArtifactCreatedCard: React.FC<{ doc: WorkspaceDocument }> = ({ doc }) => {
  const Icon = DOC_TYPE_ICON[doc.type] ?? FileTextIcon
  const label = DOC_TYPE_LABEL[doc.type] ?? 'Document'
  return (
    <a
      href={doc.url}
      target="_blank"
      rel="noopener noreferrer"
      className="gba:flex gba:items-center gba:gap-2.5 gba:px-3.5 gba:py-2.5 gba:rounded-xl gba:border gba:border-border gba:bg-card gba:hover:bg-accent/50 gba:transition-all gba:duration-200 gba:cursor-pointer gba:w-full gba:no-underline gba:group"
      data-testid={`workspace-doc-card-${doc.id}`}
    >
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
    </a>
  )
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

const ArtifactsList: React.FC<ArtifactsListProps> = ({ artifacts, onViewArtifact }) => (
  <div className="gba:pt-4 gba:space-y-2">
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
  isInstant,
  onViewArtifact,
  sessionId
}: FinalAnswerRendererProps) => {
  const hasWorkspaceDocs = !!workspaceDocuments && workspaceDocuments.length > 0
  // Filter out leftover "ghost" artifacts produced by the agent: zero-byte
  // entries with no mime type are backend scaffolding that should never reach
  // the user. When a workspace document already represents the deliverable we
  // also hide the raw artifact list entirely to avoid duplicate cards.
  const displayArtifacts = (artifacts ?? []).filter(a => {
    const isGhost = (!a.mime_type || a.mime_type === '') && (!a.size || a.size === 0)
    if (isGhost) return false
    return true
  })
  const visibleArtifacts = hasWorkspaceDocs ? [] : displayArtifacts
  const htmlArtifacts = visibleArtifacts.filter(a => a.rendererType === 'html')
  const nonHtmlArtifacts = visibleArtifacts.filter(a => a.rendererType !== 'html')
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
    >
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
        <span className="gba:text-[12px] gba:font-bold gba:tracking-[0.01em] gba:text-foreground">
          NEWWORK Enterprise Agents
        </span>
        <StatusIndicator isInstant={isInstant} />
      </div>

      <div className="gba:border-t gba:border-border/70" />

      {hasWorkspaceDocs ? (
        <>
          {/* Compact summary — mirrors Nexus: short text + artifact card */}
          <div className="gba:pt-4">
            <p className="gba:text-sm gba:text-foreground gba:leading-relaxed">
              {buildCompactSummary(workspaceDocuments!)}
            </p>
          </div>

          <div className="gba:pt-3 gba:space-y-2">
            {workspaceDocuments!.map(doc => (
              <ArtifactCreatedCard key={doc.id} doc={doc} />
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
                  <MarkdownWithChipsRenderer content={output} />
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="gba:pt-5">
          <MarkdownWithChipsRenderer content={output} />
        </div>
      )}

      {htmlArtifacts.length > 0 &&
        sessionId &&
        htmlArtifacts.map(artifact => (
          <HtmlPreviewCard
            key={artifact.path || artifact.name}
            artifactPath={artifact.path || artifact.name}
            artifactName={artifact.name}
            sessionId={sessionId}
            onExpand={() => onViewArtifact?.(artifact.path || artifact.name)}
          />
        ))}

      {nonHtmlArtifacts.length > 0 && <ArtifactsList artifacts={nonHtmlArtifacts} onViewArtifact={onViewArtifact} />}

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
