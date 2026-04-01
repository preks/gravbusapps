import { useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { CaretDown, CaretRight, DownloadSimple, File, Globe, NotePencil, Code } from '@phosphor-icons/react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import type { TodoItem, ActionSummary } from '../../types/enterpriseAgent'
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
  onViewArtifact?: (artifactName: string) => void
}

export const FinalAnswerRenderer = ({
  output,
  actionsPerformed,
  durationMs,
  artifacts,
  onViewArtifact
}: FinalAnswerRendererProps) => {
  const [actionsExpanded, setActionsExpanded] = useState(false)

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
        <div className="gba:pt-4">
          <p className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-2">
            Artifacts
          </p>
          <div className="gba:grid gba:gap-2 sm:gba:grid-cols-2">
            {artifacts.map(artifact => (
              <button
                key={artifact.path || artifact.name}
                onClick={() => onViewArtifact?.(artifact.path || artifact.name)}
                className="gba:flex gba:flex-col gba:items-stretch gba:gap-0 gba:overflow-hidden gba:rounded-xl gba:border gba:border-border gba:bg-background gba:text-left gba:hover:bg-muted/25 gba:transition-colors"
                data-testid={`enterprise-agent-final-artifact-${artifact.name}`}
              >
                <ArtifactCardPreview artifact={artifact} />
                <div className="gba:flex gba:items-start gba:gap-3 gba:px-3 gba:py-3">
                  <File className="gba:mt-0.5 gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground" />
                  <div className="gba:min-w-0 gba:flex-1">
                    <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{artifact.name}</p>
                    <p className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
                      {artifact.rendererType} · {(artifact.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
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
              <CaretDown className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
            ) : (
              <CaretRight className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
            )}
          </button>
          {actionsExpanded && (
            <div className="gba:pb-3 gba:space-y-1">
              {actionsPerformed.map((action, index) => (
                <div
                  key={`${action.step}-${action.tool ?? 'none'}`}
                  className="gba:flex gba:items-start gba:gap-2 gba:text-sm"
                >
                  <span className="gba:text-muted-foreground/50 gba:flex-shrink-0">{index + 1}.</span>
                  <span className="gba:flex-1">{action.step}</span>
                  {action.tool && (
                    <span className="gba:text-xs gba:font-mono gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded gba:text-muted-foreground gba:flex-shrink-0">
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
        <Button
          variant="ghost"
          size="sm"
          className="gba:h-7 gba:gap-1.5 gba:text-xs gba:ml-auto"
          onClick={handleExport}
          data-testid="enterprise-agent-final-export"
        >
          <DownloadSimple className="gba:h-3.5 gba:w-3.5" />
          Export
        </Button>
      </div>
    </div>
  )
}

const ArtifactCardPreview = ({ artifact }: { artifact: FinalAnswerArtifact }) => {
  if (artifact.rendererType === 'html') {
    return (
      <div className="gba:h-24 gba:border-b gba:border-border gba:bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] gba:px-3 gba:py-3">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <Globe className="gba:h-4 gba:w-4 gba:text-sky-600" />
          <span className="gba:text-xs gba:font-semibold gba:text-slate-700">HTML Preview</span>
        </div>
        <div className="gba:rounded-lg gba:border gba:border-slate-200 gba:bg-white gba:px-3 gba:py-2 gba:shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="gba:h-2 gba:w-24 gba:rounded-full gba:bg-slate-200" />
          <div className="gba:mt-2 gba:space-y-1.5">
            <div className="gba:h-2 gba:w-full gba:rounded-full gba:bg-slate-100" />
            <div className="gba:h-2 gba:w-4/5 gba:rounded-full gba:bg-slate-100" />
            <div className="gba:h-2 gba:w-2/3 gba:rounded-full gba:bg-slate-100" />
          </div>
        </div>
      </div>
    )
  }

  if (artifact.rendererType === 'markdown' || artifact.rendererType === 'document') {
    return (
      <div className="gba:h-24 gba:border-b gba:border-border gba:bg-[linear-gradient(135deg,#fafaf9_0%,#f8fafc_100%)] gba:px-3 gba:py-3">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <NotePencil className="gba:h-4 gba:w-4 gba:text-blue-600" />
          <span className="gba:text-xs gba:font-semibold gba:text-slate-700">Document Preview</span>
        </div>
        <div className="gba:space-y-1.5">
          <div className="gba:h-2.5 gba:w-3/4 gba:rounded-full gba:bg-slate-300" />
          <div className="gba:h-2 gba:w-full gba:rounded-full gba:bg-slate-200" />
          <div className="gba:h-2 gba:w-5/6 gba:rounded-full gba:bg-slate-200" />
          <div className="gba:h-2 gba:w-2/3 gba:rounded-full gba:bg-slate-200" />
        </div>
      </div>
    )
  }

  return (
    <div className="gba:h-24 gba:border-b gba:border-border gba:bg-[linear-gradient(135deg,#f8fafc_0%,#f1f5f9_100%)] gba:px-3 gba:py-3">
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
        <Code className="gba:h-4 gba:w-4 gba:text-emerald-600" />
        <span className="gba:text-xs gba:font-semibold gba:text-slate-700">Generated File</span>
      </div>
      <div className="gba:grid gba:grid-cols-2 gba:gap-2">
        <div className="gba:h-8 gba:rounded-lg gba:bg-white/85 gba:border gba:border-slate-200" />
        <div className="gba:h-8 gba:rounded-lg gba:bg-white/85 gba:border gba:border-slate-200" />
        <div className="gba:col-span-2 gba:h-8 gba:rounded-lg gba:bg-white/85 gba:border gba:border-slate-200" />
      </div>
    </div>
  )
}
