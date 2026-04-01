import { useMemo, useState } from 'react'
import {
  ArrowsClockwise,
  Brain,
  CaretDown,
  CaretUp,
  CheckCircle,
  Database,
  DownloadSimple,
  File,
  FileCode,
  FileDoc,
  FileHtml,
  ListChecks,
  ShareNetwork,
  SpinnerGap,
  WifiHigh,
  WifiX,
  Wrench,
  XCircle,
  FileText,
  Presentation,
  Note
} from '@phosphor-icons/react'
import type { ActivityEvent, WorkspaceDocument } from '../../types/enterpriseAgent'
import type { ArtifactFile, FabricSubAgent, FabricTaskNode, FabricTaskStatus } from '../../types/fabric'
import { formatRelativeTime, toolCategoryColor } from '../../utils/renderUtils'

// ─── Shared card shell ────────────────────────────────────────────────────────

interface CardProps {
  title: string
  badge?: number
  extra?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}

const Card: React.FC<CardProps> = ({ title, badge, extra, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="gba:rounded-[1.25rem] sm:gba:rounded-[1.5rem] gba:border gba:border-border/75 gba:bg-card/96 gba:backdrop-blur-sm gba:overflow-hidden gba:shadow-[0_4px_14px_rgba(15,23,42,0.03)]">
      <button
        onClick={() => setOpen(v => !v)}
        className="gba:w-full gba:flex gba:items-center gba:justify-between gba:px-3.5 sm:gba:px-4 gba:py-2.5 sm:gba:py-3 gba:border-b gba:border-border/50 gba:hover:bg-muted/15 gba:transition-colors gba:shrink-0"
        data-testid={`fabric-panel-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:tracking-wide">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="gba:inline-flex gba:items-center gba:justify-center gba:min-w-[18px] gba:h-[18px] gba:px-1 gba:rounded-full gba:text-[10px] gba:font-semibold gba:bg-muted gba:text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          {extra}
          {open ? (
            <CaretUp className="gba:h-3 gba:w-3 gba:text-muted-foreground/60" />
          ) : (
            <CaretDown className="gba:h-3 gba:w-3 gba:text-muted-foreground/60" />
          )}
        </div>
      </button>
      {open && children}
    </div>
  )
}

// ─── Progress card ────────────────────────────────────────────────────────────

const STEP_STATUS_CLASSES: Record<FabricTaskStatus, string> = {
  done: 'gba:bg-green-100 gba:text-green-600 dark:gba:bg-green-900/30 dark:gba:text-green-400',
  active: 'gba:bg-primary gba:text-primary-foreground',
  failed: 'gba:bg-destructive/10 gba:text-destructive',
  skipped: 'gba:bg-muted gba:text-muted-foreground/40',
  pending: 'gba:bg-muted gba:text-muted-foreground/60'
}

const ProgressStep: React.FC<{ node: FabricTaskNode; index: number }> = ({ node, index }) => {
  const isActive = node.status === 'active'
  const isDone = node.status === 'done'

  return (
    <div
      className={`gba:flex gba:items-start gba:gap-2.5 gba:px-4 gba:py-2 gba:transition-colors gba:rounded-lg ${
        isActive ? 'gba:bg-primary/5' : ''
      }`}
      data-testid={`fabric-task-${node.id}`}
    >
      {/* Step number / status indicator */}
      <div
        className={`gba:shrink-0 gba:flex gba:items-center gba:justify-center gba:w-5 gba:h-5 gba:rounded-full gba:text-[10px] gba:font-semibold gba:mt-0.5 gba:transition-all ${
          STEP_STATUS_CLASSES[node.status]
        }`}
      >
        {isDone ? (
          <CheckCircle className="gba:h-3 gba:w-3" weight="fill" />
        ) : isActive ? (
          <SpinnerGap className="gba:h-3 gba:w-3 gba:animate-spin" weight="bold" />
        ) : node.status === 'failed' ? (
          <XCircle className="gba:h-3 gba:w-3" weight="fill" />
        ) : (
          <span>{index + 1}</span>
        )}
      </div>

      <div className="gba:flex-1 gba:min-w-0">
        <p
          className={`gba:text-[13px] gba:leading-snug gba:wrap-break-word ${
            isDone
              ? 'gba:text-muted-foreground/50'
              : isActive
                ? 'gba:text-foreground gba:font-medium'
                : 'gba:text-foreground/80'
          }`}
        >
          {node.label}
        </p>

        {node.sublabel && (
          <p className="gba:text-[11px] gba:text-muted-foreground/50 gba:font-mono gba:mt-0.5">{node.sublabel}</p>
        )}

        {node.subAgents.length > 0 && (
          <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-1.5">
            {node.subAgents.map(sa => (
              <span
                key={sa.id}
                className={`gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:text-[11px] gba:font-medium ${
                  sa.status === 'running'
                    ? 'gba:bg-purple-100 gba:text-purple-700 dark:gba:bg-purple-900/30 dark:gba:text-purple-300'
                    : sa.status === 'failed'
                      ? 'gba:bg-destructive/10 gba:text-destructive'
                      : 'gba:bg-muted gba:text-muted-foreground'
                }`}
              >
                <ShareNetwork className="gba:h-3 gba:w-3" weight="duotone" />
                {sa.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ProgressCardProps {
  nodes: FabricTaskNode[]
  completedCount: number
  totalCount: number
  progressPercent: number
  isConnected: boolean
  isStreaming: boolean
}

const ProgressCard: React.FC<ProgressCardProps> = ({
  nodes,
  completedCount,
  totalCount,
  progressPercent,
  isConnected,
  isStreaming
}) => {
  const hasActiveWork = nodes.some(node => node.status === 'active' || node.status === 'pending')
  const displayPercent = isStreaming && totalCount > 0 && completedCount >= totalCount ? 96 : progressPercent
  const progressLabel =
    totalCount === 0
      ? 'Waiting to start'
      : isStreaming && hasActiveWork
        ? `${completedCount} of ${totalCount} done`
        : isStreaming && completedCount >= totalCount
          ? 'Finalizing response…'
          : `${completedCount} of ${totalCount} done`
  const connectionBadge = (
    <div className="gba:flex gba:items-center gba:gap-1">
      {isConnected ? (
        <>
          <WifiHigh className="gba:h-3 gba:w-3 gba:text-green-500" />
          <span className="gba:text-[11px] gba:text-green-600 gba:font-medium">Live</span>
        </>
      ) : (
        <WifiX className="gba:h-3 gba:w-3 gba:text-muted-foreground/40" />
      )}
    </div>
  )

  return (
    <Card title="Progress" extra={connectionBadge} defaultOpen>
      <div className="gba:px-4 gba:pt-3 gba:pb-1">
        {/* Mini progress bar */}
        {totalCount > 0 && (
          <div className="gba:mb-3">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1.5">
              <span className="gba:text-[11px] gba:text-muted-foreground/60">{progressLabel}</span>
              <span className="gba:text-[11px] gba:font-semibold gba:text-foreground">{displayPercent}%</span>
            </div>
            <div className="gba:h-1 gba:w-full gba:rounded-full gba:bg-border gba:overflow-hidden">
              <div
                className="gba:h-full gba:rounded-full gba:bg-primary gba:transition-all gba:duration-500"
                style={{ width: `${displayPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {nodes.length === 0 ? (
        <div className="gba:px-4 gba:pb-4">
          <p className="gba:text-xs gba:text-muted-foreground/50 gba:italic">
            Steps will appear once the agent starts…
          </p>
        </div>
      ) : (
        <div className="gba:py-1 gba:space-y-0.5">
          {nodes.map((node, i) => (
            <ProgressStep key={node.id} node={node} index={i} />
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── Artifacts card ───────────────────────────────────────────────────────────

function getArtifactIcon(file: ArtifactFile) {
  switch (file.rendererType) {
    case 'html':
      return <FileHtml className="gba:h-4 gba:w-4 gba:text-orange-500" weight="duotone" />
    case 'document':
    case 'markdown':
      return <FileDoc className="gba:h-4 gba:w-4 gba:text-blue-500" weight="duotone" />
    case 'code':
      return <FileCode className="gba:h-4 gba:w-4 gba:text-green-500" weight="duotone" />
    default:
      return <File className="gba:h-4 gba:w-4 gba:text-muted-foreground" weight="duotone" />
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const workspaceDocPanelIcon = (type: WorkspaceDocument['type']) => {
  if (type === 'slides') return <Presentation className="gba:h-3.5 gba:w-3.5 gba:text-violet-500 gba:shrink-0" />
  if (type === 'note') return <Note className="gba:h-3.5 gba:w-3.5 gba:text-amber-500 gba:shrink-0" />
  return <FileText className="gba:h-3.5 gba:w-3.5 gba:text-blue-500 gba:shrink-0" />
}

const WorkspaceDocumentsCard: React.FC<{ docs: WorkspaceDocument[] }> = ({ docs }) => (
  <Card title="Workspace Documents" badge={docs.length} defaultOpen>
    <div className="gba:py-1">
      {docs.map(doc => (
        <a
          key={doc.id}
          href={doc.url}
          target="_self"
          rel="noopener noreferrer"
          className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-2.5 gba:hover:bg-muted/30 gba:transition-colors gba:no-underline"
          data-testid={`fabric-workspace-doc-${doc.id}`}
        >
          {workspaceDocPanelIcon(doc.type)}
          <div className="gba:flex-1 gba:min-w-0">
            <p className="gba:text-xs gba:font-medium gba:text-foreground gba:truncate">{doc.title}</p>
            <p className="gba:text-[11px] gba:text-muted-foreground/50 gba:capitalize">{doc.type}</p>
          </div>
        </a>
      ))}
    </div>
  </Card>
)

const ArtifactsCard: React.FC<{ artifacts: ArtifactFile[]; onView: (id: string) => void }> = ({
  artifacts,
  onView
}) => (
  <Card title="Artifacts" badge={artifacts.length} defaultOpen>
    <div className="gba:py-1">
      {artifacts.map(file => (
        <div
          key={file.artifactKey}
          className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-2.5 gba:hover:bg-muted/30 gba:transition-colors gba:group"
          data-testid={`fabric-artifact-${file.name}`}
        >
          {getArtifactIcon(file)}
          <div className="gba:flex-1 gba:min-w-0">
            <p className="gba:text-xs gba:font-medium gba:text-foreground gba:truncate">{file.name}</p>
            <p className="gba:text-[11px] gba:text-muted-foreground/50">
              {file.rendererType} · {formatFileSize(file.size)}
            </p>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity">
            <button
              onClick={() => onView(file.artifactKey)}
              className="gba:px-2 gba:py-1 gba:rounded-lg gba:text-[11px] gba:font-medium gba:text-primary gba:hover:bg-primary/10 gba:transition-colors"
              data-testid={`fabric-artifact-view-${file.name}`}
            >
              View
            </button>
            <a
              href={file.downloadUrl}
              download={file.name}
              className="gba:flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
              title="Download"
            >
              <DownloadSimple className="gba:h-3.5 gba:w-3.5" />
            </a>
          </div>
        </div>
      ))}
    </div>
  </Card>
)

const ENTERPRISE_EXPERT_ACCENT = {
  badge: 'gba:bg-sky-100 gba:text-sky-700 dark:gba:bg-sky-950/40 dark:gba:text-sky-300',
  running: 'gba:text-sky-600',
  done: 'gba:text-green-500',
  failed: 'gba:text-destructive'
}

const normalizeExpertName = (value: string) => value.trim().replace(/\s+/g, ' ')
const inferExpertLabelFromSummary = (summary?: string) => {
  const normalized = (summary ?? '').trim().toLowerCase()
  if (!normalized) return 'Enterprise expert'
  if (/\b(market|competitor|industry|research|trend)\b/.test(normalized)) return 'Market research'
  if (/\b(hr|human resources|manager|employee|role|permission|admin)\b/.test(normalized)) return 'HR operations'
  if (/\b(salary|bonus|stock|compensation|budget|pay|allocation)\b/.test(normalized)) return 'Compensation'
  if (/\b(expense|spend|cost|finance|financial|pricing|revenue)\b/.test(normalized)) return 'Finance'
  if (/\b(workflow|approval|process|submission|orchestrat)\b/.test(normalized)) return 'Workflow design'
  if (/\b(report|write|summary|brief|document)\b/.test(normalized)) return 'Writing'
  if (/\b(chart|diagram|visual|analysis|analytics|data)\b/.test(normalized)) return 'Data analysis'
  if (/\b(vpn|access|security|infrastructure|diagnos|troubleshoot|it\b)\b/.test(normalized)) return 'IT support'
  return 'Enterprise expert'
}

const isMeaningfulExpertLabel = (value?: string) => {
  const normalized = normalizeExpertName(value ?? '').toLowerCase()
  return !!normalized && normalized !== 'sub-agent' && normalized !== 'enterprise expert'
}

const EnterpriseExpertsCard: React.FC<{ nodes: FabricTaskNode[]; events: ActivityEvent[] }> = ({ nodes, events }) => {
  const experts = useMemo(() => {
    const seen = new Map<string, FabricSubAgent>()

    for (const node of nodes) {
      for (const expert of node.subAgents) {
        const normalizedName = normalizeExpertName(expert.name)
        const displayName =
          normalizedName && normalizedName.toLowerCase() !== 'sub-agent'
            ? normalizedName
            : inferExpertLabelFromSummary(expert.summary)
        const key = `${displayName.toLowerCase()}::${(expert.summary ?? '').trim().toLowerCase()}`
        const existing = seen.get(key)
        if (!existing || (existing.status !== 'running' && expert.status === 'running')) {
          seen.set(key, { ...expert, name: displayName })
        }
      }
    }

    for (const event of events) {
      if (event.type !== 'subagent_spawn') continue
      const displayName = isMeaningfulExpertLabel(event.agent)
        ? normalizeExpertName(event.agent!)
        : inferExpertLabelFromSummary(event.summary)
      const key = `${displayName.toLowerCase()}::${(event.summary ?? '').trim().toLowerCase()}`
      const existing = seen.get(key)
      if (!existing) {
        seen.set(key, {
          id: event.id,
          name: displayName,
          summary: event.summary,
          status: 'running'
        })
      }
    }

    return [...seen.values()]
  }, [nodes, events])

  if (experts.length === 0) return null

  return (
    <Card title="Enterprise experts" badge={experts.length} defaultOpen>
      <div className="gba:py-1 gba:space-y-1">
        {experts.map(expert => (
          <div
            key={expert.id}
            className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-2.5 gba:hover:bg-muted/20 gba:transition-colors"
            data-testid={`fabric-expert-${expert.id}`}
          >
            <span
              className={`gba:flex gba:h-8 gba:w-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full ${ENTERPRISE_EXPERT_ACCENT.badge}`}
            >
              <ShareNetwork className="gba:h-4 gba:w-4" />
            </span>
            <div className="gba:flex-1 gba:min-w-0">
              <p className="gba:text-xs gba:font-semibold gba:text-foreground gba:truncate">{expert.name}</p>
              {expert.summary && (
                <p className="gba:text-[11px] gba:text-muted-foreground/70 gba:line-clamp-2">{expert.summary}</p>
              )}
              <p className="gba:text-[11px] gba:text-muted-foreground/50 gba:mt-0.5">
                {expert.status === 'running' ? 'Running' : expert.status === 'failed' ? 'Failed' : 'Done'}
              </p>
            </div>
            {expert.status === 'running' ? (
              <SpinnerGap className={`gba:h-3.5 gba:w-3.5 gba:animate-spin ${ENTERPRISE_EXPERT_ACCENT.running}`} />
            ) : expert.status === 'done' ? (
              <CheckCircle className={`gba:h-3.5 gba:w-3.5 ${ENTERPRISE_EXPERT_ACCENT.done}`} weight="fill" />
            ) : (
              <XCircle className={`gba:h-3.5 gba:w-3.5 ${ENTERPRISE_EXPERT_ACCENT.failed}`} weight="fill" />
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Activity card ────────────────────────────────────────────────────────────

const EVENT_ICON: Record<ActivityEvent['type'], React.ReactNode> = {
  tool_call: <Wrench className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  tool_result: <ArrowsClockwise className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  plan_update: <ListChecks className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  reflection: <Brain className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  subagent_spawn: <ShareNetwork className="gba:h-3.5 gba:w-3.5 gba:text-sky-600" />,
  memory_access: <Database className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
}

const normalizeActivityText = (value?: string) => (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
const isLikelyTaskText = (value?: string) => {
  const compact = (value ?? '').trim()
  if (!compact) return false
  return compact.length > 42 || compact.split(/\s+/).length > 5
}

const ActivityCard: React.FC<{ events: ActivityEvent[] }> = ({ events }) => (
  <Card title="Activity" badge={events.length} defaultOpen={false}>
    <div className="gba:py-1">
      {[...events]
        .reverse()
        .slice(0, 20)
        .map(event => {
          const isSubagent = event.type === 'subagent_spawn'
          const showAgentBadge =
            isSubagent &&
            !!event.agent &&
            !isLikelyTaskText(event.agent) &&
            normalizeActivityText(event.agent) !== normalizeActivityText(event.summary)
          return (
            <div
              key={event.id}
              className={`gba:flex gba:items-start gba:gap-2.5 gba:px-4 gba:py-2 gba:hover:bg-muted/20 gba:transition-colors ${
                isSubagent ? 'gba:border-l-2 gba:border-sky-400/60' : ''
              }`}
              data-testid={`fabric-activity-${event.id}`}
            >
              <div className="gba:shrink-0 gba:mt-0.5">{EVENT_ICON[event.type]}</div>
              <div className="gba:flex-1 gba:min-w-0">
                {event.toolName && (
                  <span
                    className={`gba:inline-flex gba:items-center gba:px-1.5 gba:py-0.5 gba:rounded gba:text-[11px] gba:font-mono gba:font-semibold gba:mb-0.5 ${toolCategoryColor(event.toolName)}`}
                  >
                    {event.toolName}
                  </span>
                )}
                {showAgentBadge && (
                  <span className="gba:mb-0.5 gba:inline-flex gba:items-center gba:rounded-full gba:bg-sky-100 gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-semibold gba:text-sky-700 dark:gba:bg-sky-950/40 dark:gba:text-sky-300">
                    {event.agent}
                  </span>
                )}
                <p className="gba:text-xs gba:text-foreground gba:leading-snug">{event.summary}</p>
                <div className="gba:flex gba:items-center gba:gap-2 gba:mt-0.5">
                  <span className="gba:text-[11px] gba:text-muted-foreground/50">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                  {event.durationMs !== undefined && (
                    <span className="gba:text-[11px] gba:text-muted-foreground/40">
                      {(event.durationMs / 1000).toFixed(2)}s
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
    </div>
  </Card>
)

// ─── Main component ───────────────────────────────────────────────────────────

interface WorkspaceRightPanelProps {
  taskNodes: FabricTaskNode[]
  completedCount: number
  totalCount: number
  progressPercent: number
  activityEvents: ActivityEvent[]
  artifacts: ArtifactFile[]
  workspaceDocs?: WorkspaceDocument[]
  isConnected: boolean
  isStreaming: boolean
  onViewArtifact: (name: string) => void
}

export const WorkspaceRightPanel: React.FC<WorkspaceRightPanelProps> = ({
  taskNodes,
  completedCount,
  totalCount,
  progressPercent,
  activityEvents,
  artifacts,
  workspaceDocs,
  isConnected,
  isStreaming,
  onViewArtifact
}) => (
  <div
    className="gba:flex gba:flex-col gba:h-full gba:max-h-full gba:min-h-0 gba:overflow-y-auto gba:rounded-[1.5rem] sm:gba:rounded-[2rem] gba:bg-transparent gba:p-0 sm:gba:p-1 gba:space-y-2 sm:gba:space-y-3"
    data-testid="fabric-right-panel"
  >
    <ProgressCard
      nodes={taskNodes}
      completedCount={completedCount}
      totalCount={totalCount}
      progressPercent={progressPercent}
      isConnected={isConnected}
      isStreaming={isStreaming}
    />

    <EnterpriseExpertsCard nodes={taskNodes} events={activityEvents} />

    {artifacts.length > 0 && <ArtifactsCard artifacts={artifacts} onView={onViewArtifact} />}

    {workspaceDocs && workspaceDocs.length > 0 && <WorkspaceDocumentsCard docs={workspaceDocs} />}

    {activityEvents.length > 0 && <ActivityCard events={activityEvents} />}
  </div>
)
