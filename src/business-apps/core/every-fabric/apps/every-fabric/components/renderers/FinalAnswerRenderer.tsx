import { useState } from 'react'
import { Button } from '@newwork/nw-design-system'
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
  GlobeIcon
} from '@phosphor-icons/react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import type { TodoItem, ActionSummary, WorkspaceDocument } from '../../types/enterpriseAgent'
import { formatDuration } from '../../utils/renderUtils'

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
  onViewArtifact?: (artifactName: string) => void
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

const workspaceDocIcon = (type: WorkspaceDocument['type']) => {
  const iconClass = 'gba:h-4 gba:w-4 gba:shrink-0'
  if (type === 'slides') return <FileTextIcon className={`${iconClass} gba:text-violet-500`} />
  if (type === 'note') return <FileTextIcon className={`${iconClass} gba:text-amber-500`} />
  return <FileTextIcon className={`${iconClass} gba:text-blue-500`} />
}

const WorkspaceDocCard = ({ doc }: { doc: WorkspaceDocument }) => (
  <a
    href={doc.url}
    target="_self"
    rel="noopener noreferrer"
    className="gba:flex gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2.5 gba:hover:bg-muted/40 gba:transition-colors gba:no-underline"
    data-testid={`workspace-doc-${doc.id}`}
  >
    {workspaceDocIcon(doc.type)}
    <div className="gba:min-w-0 gba:flex-1">
      <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{doc.title}</p>
      <p className="gba:text-xs gba:text-muted-foreground gba:capitalize">{doc.type}</p>
    </div>
    <GlobeIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:shrink-0" />
  </a>
)

export const FinalAnswerRenderer = ({
  output,
  todos,
  actionsPerformed,
  durationMs,
  artifacts,
  workspaceDocuments,
  onViewArtifact
}: FinalAnswerRendererProps) => {
  const [actionsExpanded, setActionsExpanded] = useState(false)
  const todoCount = todos?.length ?? 0

  const handleExport = () => {
    const text = output
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agent-output-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="gba:w-full gba:overflow-hidden" data-testid="enterprise-agent-final-answer">
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
        <span className="gba:text-[12px] gba:font-bold gba:tracking-[0.01em] gba:text-foreground">
          NEWWORK Enterprise Agents
        </span>
        <span className="gba:text-[11px] gba:text-muted-foreground">Completed</span>
      </div>

      <div className="gba:border-t gba:border-border/70" />

      {/* Output / findings */}
      <div className="gba:pt-5">
        <MarkdownWithChipsRenderer content={output} />
      </div>

      {artifacts && artifacts.length > 0 && (
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
      )}

      {workspaceDocuments && workspaceDocuments.length > 0 && (
        <div className="gba:pt-4 gba:space-y-2">
          {workspaceDocuments.map(doc => (
            <WorkspaceDocCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}

      {/* Actions accordion */}
      {actionsPerformed && actionsPerformed.length > 0 && (
        <div className="gba:mt-4 gba:border-t gba:border-border/70">
          <button
            className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:py-2.5 gba:hover:bg-muted/15 gba:transition-colors gba:text-left"
            onClick={() => setActionsExpanded(v => !v)}
            data-testid="enterprise-agent-final-actions-toggle"
          >
            <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide">
              Actions taken
            </span>
            {actionsExpanded ? (
              <CaretDownIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
            ) : (
              <CaretRightIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
            )}
          </button>
          {actionsExpanded && (
            <div className="gba:pb-3 gba:space-y-1">
              {actionsPerformed.map((action, index) => (
                <div
                  key={`${action.step}-${action.tool ?? 'none'}`}
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
      )}

      {/* Stats footer */}
      <div className="gba:flex gba:items-center gba:gap-4 gba:pt-3 gba:border-t gba:border-border/70">
        {durationMs !== undefined && (
          <span className="gba:text-xs gba:text-muted-foreground">
            Duration: <strong>{formatDuration(durationMs)}</strong>
          </span>
        )}
        {todoCount > 0 && (
          <span className="gba:text-xs gba:text-muted-foreground">
            Tasks: <strong>{todoCount}</strong>
          </span>
        )}
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
      </div>
    </div>
  )
}
