import { useMemo } from 'react'
import {
  ArrowsClockwiseIcon,
  BrainIcon,
  CheckCircleIcon,
  DatabaseIcon,
  DownloadSimpleIcon,
  FileCodeIcon,
  FileDocIcon,
  FileHtmlIcon,
  FileIcon,
  FileTextIcon,
  NoteIcon,
  PresentationIcon,
  ShareNetworkIcon,
  SpinnerGapIcon,
  WrenchIcon,
  XCircleIcon
} from '@phosphor-icons/react'
import type { ArtifactPreview } from '../../hooks/useArtifactPreview'
import type { DecisionItem } from '../../hooks/useFabricDecisions'
import type { ActivityEvent, WorkspaceDocument } from '../../types/enterpriseAgent'
import type { ArtifactFile, FabricSubAgent, FabricTaskNode } from '../../types/fabric'
import { parseIsoTimestamp, toolCategoryColor } from '../../utils/renderUtils'
import { DecisionsCard } from './DecisionsCard'
import { LivePreviewCard } from './LivePreviewCard'
import { PanelCard } from './PanelCard'
import { PlanCard } from './PlanCard'

function activityTimestampSortValue(timestamp: string): number {
  const date = parseIsoTimestamp(timestamp)
  return date ? date.getTime() : 0
}

function formatActivityTimestamp(timestamp: string): string {
  const date = parseIsoTimestamp(timestamp)
  if (!date) return ''

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

// ─── Artifacts card ───────────────────────────────────────────────────────────

function getArtifactIcon(file: ArtifactFile) {
  switch (file.rendererType) {
    case 'html':
      return <FileHtmlIcon className="gba:h-4 gba:w-4 gba:text-orange-500" weight="duotone" />
    case 'document':
    case 'markdown':
      return <FileDocIcon className="gba:h-4 gba:w-4 gba:text-blue-500" weight="duotone" />
    case 'code':
      return <FileCodeIcon className="gba:h-4 gba:w-4 gba:text-green-500" weight="duotone" />
    default:
      return <FileIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" weight="duotone" />
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const workspaceDocPanelIcon = (type: WorkspaceDocument['type']) => {
  if (type === 'slides') return <PresentationIcon className="gba:h-3.5 gba:w-3.5 gba:text-violet-500 gba:shrink-0" />
  if (type === 'note') return <NoteIcon className="gba:h-3.5 gba:w-3.5 gba:text-amber-500 gba:shrink-0" />
  return <FileTextIcon className="gba:h-3.5 gba:w-3.5 gba:text-blue-500 gba:shrink-0" />
}

const WorkspaceDocumentsCard: React.FC<{ docs: WorkspaceDocument[] }> = ({ docs }) => (
  <PanelCard title="Workspace Documents" badge={docs.length} defaultOpen>
    <div className="gba:py-1">
      {docs.map(doc => (
        <a
          key={doc.id}
          href={doc.url}
          target="_blank"
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
  </PanelCard>
)

const ArtifactsCard: React.FC<{ artifacts: ArtifactFile[]; onView: (id: string) => void }> = ({
  artifacts,
  onView
}) => (
  <PanelCard title="Artifacts" badge={artifacts.length} defaultOpen>
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
              <DownloadSimpleIcon className="gba:h-3.5 gba:w-3.5" />
            </a>
          </div>
        </div>
      ))}
    </div>
  </PanelCard>
)

const ENTERPRISE_EXPERT_ACCENT = {
  badge: 'gba:bg-sky-100 gba:text-sky-700 dark:gba:bg-sky-950/40 dark:gba:text-sky-300',
  running: 'gba:text-sky-600',
  done: 'gba:text-green-500',
  failed: 'gba:text-destructive'
}

function enterpriseExpertStatusText(status: FabricSubAgent['status']): string {
  if (status === 'running') return 'Running'
  if (status === 'failed') return 'Failed'
  return 'Done'
}

const EnterpriseExpertTrailingIcon: React.FC<{ status: FabricSubAgent['status'] }> = ({ status }) => {
  if (status === 'running') {
    return <SpinnerGapIcon className={`gba:h-3.5 gba:w-3.5 gba:animate-spin ${ENTERPRISE_EXPERT_ACCENT.running}`} />
  }
  if (status === 'done') {
    return <CheckCircleIcon className={`gba:h-3.5 gba:w-3.5 ${ENTERPRISE_EXPERT_ACCENT.done}`} weight="fill" />
  }
  return <XCircleIcon className={`gba:h-3.5 gba:w-3.5 ${ENTERPRISE_EXPERT_ACCENT.failed}`} weight="fill" />
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

const DELEGATION_STATUS_RANK: Record<FabricSubAgent['status'], number> = {
  done: 3,
  failed: 2,
  running: 1
}

const pickRicherDelegationStatus = (
  a: FabricSubAgent['status'],
  b: FabricSubAgent['status']
): FabricSubAgent['status'] => (DELEGATION_STATUS_RANK[a] >= DELEGATION_STATUS_RANK[b] ? a : b)

function resolveExpertDisplayName(name: string | undefined, summary: string | undefined): string {
  if (isMeaningfulExpertLabel(name)) return normalizeExpertName(name ?? '')
  return inferExpertLabelFromSummary(summary)
}

function mergeSeenExpert(seen: Map<string, FabricSubAgent>, key: string, incoming: FabricSubAgent): void {
  const existing = seen.get(key)
  if (!existing) {
    seen.set(key, incoming)
    return
  }

  const mergedStatus = pickRicherDelegationStatus(existing.status, incoming.status)
  const chosen = mergedStatus === incoming.status ? incoming : existing
  seen.set(key, { ...chosen, name: incoming.name, status: mergedStatus })
}

function collectExpertsFromNodes(nodes: FabricTaskNode[], seen: Map<string, FabricSubAgent>): void {
  for (const node of nodes) {
    for (const expert of node.subAgents) {
      const displayName = resolveExpertDisplayName(expert.name, expert.summary)
      const key = `${displayName.toLowerCase()}::${(expert.summary ?? '').trim().toLowerCase()}`
      mergeSeenExpert(seen, key, { ...expert, name: displayName })
    }
  }
}

function collectExpertsFromEvents(
  events: ActivityEvent[],
  isStreaming: boolean,
  seen: Map<string, FabricSubAgent>
): void {
  for (const event of events) {
    if (event.type !== 'subagent_spawn') continue
    const displayName = resolveExpertDisplayName(event.agent, event.summary)
    const key = `${displayName.toLowerCase()}::${(event.summary ?? '').trim().toLowerCase()}`
    const incoming: FabricSubAgent = {
      id: event.id,
      name: displayName,
      summary: event.summary,
      status: resolveActivityDelegationStatus(event, isStreaming)
    }
    mergeSeenExpert(seen, key, incoming)
  }
}

/** Map activity row + stream state to FabricSubAgent status (matches deriveActivityFromEvents / SSE). */
const resolveActivityDelegationStatus = (event: ActivityEvent, isStreaming: boolean): FabricSubAgent['status'] => {
  if (event.type !== 'subagent_spawn') return 'running'
  if (event.delegationStatus === 'failed') return 'failed'
  if (event.delegationStatus === 'done') return 'done'
  if (event.durationMs !== undefined) return 'done'
  if (!isStreaming) return 'done'
  return 'running'
}

const EnterpriseExpertsCard: React.FC<{
  nodes: FabricTaskNode[]
  events: ActivityEvent[]
  isStreaming: boolean
}> = ({ nodes, events, isStreaming }) => {
  const experts = useMemo(() => {
    const seen = new Map<string, FabricSubAgent>()
    collectExpertsFromNodes(nodes, seen)
    collectExpertsFromEvents(events, isStreaming, seen)

    return [...seen.values()]
  }, [nodes, events, isStreaming])

  if (experts.length === 0) return null

  return (
    <PanelCard title="Enterprise experts" badge={experts.length} defaultOpen>
      <div className="gba:py-1 gba:space-y-1">
        {experts.map(expert => (
          <div
            key={`${expert.id}::${(expert.summary ?? '').slice(0, 64)}`}
            className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-2.5 gba:hover:bg-muted/20 gba:transition-colors"
            data-testid={`fabric-expert-${expert.id}`}
          >
            <span
              className={`gba:flex gba:h-8 gba:w-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full ${ENTERPRISE_EXPERT_ACCENT.badge}`}
            >
              <ShareNetworkIcon className="gba:h-4 gba:w-4" />
            </span>
            <div className="gba:flex-1 gba:min-w-0">
              <p className="gba:text-xs gba:font-semibold gba:text-foreground gba:truncate">{expert.name}</p>
              {expert.summary && (
                <p className="gba:text-[11px] gba:text-muted-foreground/70 gba:line-clamp-2">{expert.summary}</p>
              )}
              <p className="gba:text-[11px] gba:text-muted-foreground/50 gba:mt-0.5">
                {enterpriseExpertStatusText(expert.status)}
              </p>
            </div>
            <EnterpriseExpertTrailingIcon status={expert.status} />
          </div>
        ))}
      </div>
    </PanelCard>
  )
}

// ─── Activity card ────────────────────────────────────────────────────────────

const EVENT_ICON: Record<ActivityEvent['type'], React.ReactNode> = {
  tool_call: <WrenchIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  tool_result: <ArrowsClockwiseIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  reflection: <BrainIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />,
  subagent_spawn: <ShareNetworkIcon className="gba:h-3.5 gba:w-3.5 gba:text-sky-600" />,
  memory_access: <DatabaseIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
}

const normalizeActivityText = (value?: string) => (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
const isLikelyTaskText = (value?: string) => {
  const compact = (value ?? '').trim()
  if (!compact) return false
  return compact.length > 42 || compact.split(/\s+/).length > 5
}

const ActivityCard: React.FC<{ events: ActivityEvent[] }> = ({ events }) => {
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => activityTimestampSortValue(b.timestamp) - activityTimestampSortValue(a.timestamp)),
    [events]
  )

  return (
    <PanelCard title="Activity" badge={events.length} defaultOpen={false}>
      <div className="gba:max-h-120 gba:min-h-0 gba:overflow-y-auto gba:overscroll-contain gba:py-1">
        {sortedEvents.map(event => {
          const isSubagent = event.type === 'subagent_spawn'
          const showAgentBadge =
            isSubagent &&
            !!event.agent &&
            !isLikelyTaskText(event.agent) &&
            normalizeActivityText(event.agent) !== normalizeActivityText(event.summary)
          const timestampLabel = formatActivityTimestamp(event.timestamp)
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
                {(timestampLabel || event.durationMs !== undefined) && (
                  <p className="gba:mt-1 gba:text-[10px] gba:leading-4 gba:text-muted-foreground/38">
                    {timestampLabel}
                    {timestampLabel && event.durationMs !== undefined ? ' · ' : ''}
                    {event.durationMs !== undefined ? `${(event.durationMs / 1000).toFixed(2)}s` : ''}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </PanelCard>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface WorkspaceRightPanelProps {
  taskNodes: FabricTaskNode[]
  hasPlan: boolean
  completedCount: number
  totalCount: number
  progressPercent: number
  activityEvents: ActivityEvent[]
  decisions: DecisionItem[]
  artifacts: ArtifactFile[]
  workspaceDocs?: WorkspaceDocument[]
  isConnected: boolean
  isStreaming: boolean
  onViewArtifact: (name: string) => void
  latestPreview?: ArtifactPreview | null
  accessToken?: string
  sessionId?: string
  /** Invoked when the user clicks "Try again" on a preview error card. */
  onRetryPreview?: (preview: ArtifactPreview) => void
}

export const WorkspaceRightPanel: React.FC<WorkspaceRightPanelProps> = ({
  taskNodes,
  hasPlan,
  completedCount,
  totalCount,
  progressPercent,
  activityEvents,
  decisions,
  artifacts,
  workspaceDocs,
  isConnected,
  isStreaming,
  onViewArtifact,
  latestPreview,
  accessToken = '',
  sessionId = '',
  onRetryPreview
}) => {
  const showPreview =
    !!latestPreview &&
    (latestPreview.status === 'generating' ||
      latestPreview.status === 'draft_ready' ||
      latestPreview.status === 'ready' ||
      latestPreview.status === 'error')

  return (
    <div
      className="gba:flex gba:h-full gba:max-h-full gba:min-h-0 gba:flex-col gba:overflow-y-auto gba:bg-transparent gba:px-0 sm:gba:px-1 gba:py-1 sm:gba:py-1.5 gba:space-y-2 sm:gba:space-y-3"
      data-testid="fabric-right-panel"
    >
      {showPreview && (
        <div>
          <LivePreviewCard
            preview={latestPreview}
            accessToken={accessToken}
            sessionId={sessionId}
            onRetry={onRetryPreview ? () => onRetryPreview(latestPreview) : undefined}
          />
        </div>
      )}

      {hasPlan && (
        <PlanCard
          nodes={taskNodes}
          completedCount={completedCount}
          totalCount={totalCount}
          progressPercent={progressPercent}
          isConnected={isConnected}
          isStreaming={isStreaming}
          defaultCollapsed={showPreview}
        />
      )}

      {decisions.length > 0 && <DecisionsCard decisions={decisions} defaultCollapsed={showPreview} />}

      <EnterpriseExpertsCard nodes={taskNodes} events={activityEvents} isStreaming={isStreaming} />

      {artifacts.length > 0 && <ArtifactsCard artifacts={artifacts} onView={onViewArtifact} />}

      {workspaceDocs && workspaceDocs.length > 0 && <WorkspaceDocumentsCard docs={workspaceDocs} />}

      {activityEvents.length > 0 && <ActivityCard events={activityEvents} />}
    </div>
  )
}
