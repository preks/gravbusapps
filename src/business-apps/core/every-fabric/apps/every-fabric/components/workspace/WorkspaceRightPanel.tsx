import React, { useEffect, useMemo, useState } from 'react'
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
  SparkleIcon,
  SpinnerGapIcon,
  WrenchIcon,
  XCircleIcon
} from '@phosphor-icons/react'
import type { ArtifactPreview } from '../../hooks/useArtifactPreview'
import type { CaseState } from '../../hooks/useFabricCases'
import type { DecisionItem } from '../../hooks/useFabricDecisions'
import { useFabricDelegation, computeDelegationStats } from '../../hooks/useFabricDelegation'
import type { ActivityEvent, AgentStreamEvent, WorkspaceDocument } from '../../types/enterpriseAgent'
import type { ArtifactFile, FabricSubAgent, FabricTaskNode } from '../../types/fabric'
import { parseIsoTimestamp, toolCategoryColor } from '../../utils/renderUtils'
import { CasePanel } from './CasePanel'
import { CollaborationPanel } from './collaboration/CollaborationPanel'
import { DecisionsCard } from './DecisionsCard'
import { LivePreviewCard } from './LivePreviewCard'
import { PanelCard } from './PanelCard'
import { PlanCard } from './PlanCard'
import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'

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

const WorkspaceDocumentsCard: React.FC<{ docs: WorkspaceDocument[]; defaultCollapsed?: boolean }> = ({
  docs,
  defaultCollapsed = false
}) => (
  <PanelCard
    title="Workspace Documents"
    badge={docs.length}
    summary={docs[0]?.title ? `Latest: ${docs[0].title}` : undefined}
    defaultOpen={!defaultCollapsed}
  >
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

const ArtifactsCard: React.FC<{ artifacts: ArtifactFile[]; defaultCollapsed?: boolean }> = ({
  artifacts,
  defaultCollapsed = false
}) => (
  <PanelCard
    title="Artifacts"
    badge={artifacts.length}
    summary={artifacts[0]?.name ? `Latest: ${artifacts[0].name}` : undefined}
    defaultOpen={!defaultCollapsed}
  >
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
            <a
              href={file.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gba:px-2 gba:py-1 gba:rounded-lg gba:text-[11px] gba:font-medium gba:text-primary gba:hover:bg-primary/10 gba:transition-colors"
              data-testid={`fabric-artifact-view-${file.name}`}
            >
              View
            </a>
            <a
              href={file.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
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
  defaultCollapsed?: boolean
}> = ({ nodes, events, isStreaming, defaultCollapsed = false }) => {
  const experts = useMemo(() => {
    const seen = new Map<string, FabricSubAgent>()
    collectExpertsFromNodes(nodes, seen)
    collectExpertsFromEvents(events, isStreaming, seen)

    return [...seen.values()]
  }, [nodes, events, isStreaming])

  if (experts.length === 0) return null

  const expertSummary = (() => {
    const running = experts.filter(e => e.status === 'running').length
    const done = experts.filter(e => e.status === 'done').length
    const failed = experts.filter(e => e.status === 'failed').length
    if (running) return `${running} running · ${done} done${failed ? ` · ${failed} failed` : ''}`
    if (failed) return `${done} done · ${failed} failed`
    return `${done} done`
  })()

  return (
    <PanelCard
      title="Enterprise experts"
      badge={experts.length}
      summary={expertSummary}
      defaultOpen={!defaultCollapsed}
    >
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

const isSkillLoadActivity = (event: ActivityEvent): boolean =>
  event.type === 'tool_call' && event.toolName === 'skill_load' && !!event.skillId

const activityRowIcon = (event: ActivityEvent): React.ReactNode => {
  if (isSkillLoadActivity(event)) {
    return <SparkleIcon className="gba:h-3.5 gba:w-3.5 gba:text-amber-500" weight="duotone" />
  }
  return EVENT_ICON[event.type]
}

const getActivityBorderClass = (isSubagent: boolean, isSkillLoad: boolean): string => {
  if (isSubagent) return 'gba:border-l-2 gba:border-sky-400/60'
  if (isSkillLoad) return 'gba:border-l-2 gba:border-amber-400/60'
  return ''
}

const ActivityCard: React.FC<{ events: ActivityEvent[] }> = ({ events }) => {
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => activityTimestampSortValue(b.timestamp) - activityTimestampSortValue(a.timestamp)),
    [events]
  )

  const latestSummary = sortedEvents[0]?.summary
  const activitySummary = latestSummary ? `Latest: ${latestSummary}` : undefined

  return (
    <PanelCard title="Activity" badge={events.length} summary={activitySummary} defaultOpen={false}>
      <div className="gba:max-h-120 gba:min-h-0 gba:overflow-y-auto gba:overscroll-contain gba:py-1">
        {sortedEvents.map(event => {
          const isSubagent = event.type === 'subagent_spawn'
          const isSkillLoad = isSkillLoadActivity(event)
          const showAgentBadge =
            isSubagent &&
            !!event.agent &&
            !isLikelyTaskText(event.agent) &&
            normalizeActivityText(event.agent) !== normalizeActivityText(event.summary)
          const timestampLabel = formatActivityTimestamp(event.timestamp)
          return (
            <div
              key={event.id}
              className={`gba:flex gba:items-start gba:gap-2.5 gba:px-4 gba:py-2 gba:hover:bg-muted/20 gba:transition-colors ${getActivityBorderClass(
                isSubagent,
                isSkillLoad
              )}`}
              data-testid={`fabric-activity-${event.id}`}
            >
              <div className="gba:shrink-0 gba:mt-0.5">{activityRowIcon(event)}</div>
              <div className="gba:flex-1 gba:min-w-0">
                {isSkillLoad ? (
                  <span className="gba:mb-0.5 gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:border gba:border-amber-500/20 gba:bg-amber-500/10 gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-semibold gba:text-amber-700 dark:gba:text-amber-300">
                    <SparkleIcon className="gba:h-3 gba:w-3" weight="duotone" />
                    Skill: {event.skillName ?? event.skillId}
                  </span>
                ) : (
                  event.toolName && (
                    <span
                      className={`gba:inline-flex gba:items-center gba:px-1.5 gba:py-0.5 gba:rounded gba:text-[11px] gba:font-mono gba:font-semibold gba:mb-0.5 ${toolCategoryColor(event.toolName)}`}
                    >
                      {event.toolName}
                    </span>
                  )
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

interface DiagnosticsBundle {
  schema_version?: string
  session?: {
    session_id?: string
    status?: string
    route?: string | null
    ttft_ms?: number | null
    duration_ms?: number | null
  } | null
  summary?: {
    failed_tool_count?: number
    repeated_tool_count?: number
    hitl_pause_count?: number
    slow_phase_count?: number
    has_terminal_event?: boolean
    has_metadata_timings?: boolean
  } | null
  slow_phases?: Array<{ name: string; ms: number; threshold_ms?: number }>
  failed_tools?: Array<{ tool?: string; status?: string; error?: string | null }>
  repeated_tools?: Array<{ tool?: string; count?: number }>
  warnings?: string[]
  langsmith?: {
    enabled?: boolean
    project?: string | null
    filter?: string | null
    console_url?: string | null
  }
}

const _formatMs = (value?: number | null): string => {
  if (value == null) return '—'
  if (value >= 10_000) return `${(value / 1000).toFixed(1)}s`
  return `${value}ms`
}

function formatAnalyzerLineValue(line: unknown): string | null {
  if (typeof line === 'string') return line
  if (typeof line === 'number' && !Number.isNaN(line)) return String(line)
  return null
}

function formatAnalyzerObjectRecord(obj: Record<string, unknown>): string | null {
  const path = typeof obj.path === 'string' ? obj.path : null
  const note = typeof obj.note === 'string' ? obj.note : null
  if (path && note) return `${path} — ${note}`
  if (path) return path
  if (note) return note

  const file = typeof obj.file === 'string' ? obj.file : null
  const line = formatAnalyzerLineValue(obj.line)
  if (file && line) return `${file}:${line}`
  if (file) return file
  return null
}

function coerceAnalyzerDisplayItem(item: unknown): string {
  if (item == null) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'number' || typeof item === 'boolean') return String(item)
  if (typeof item === 'object') {
    const formatted = formatAnalyzerObjectRecord(item as Record<string, unknown>)
    if (formatted) return formatted
    try {
      return JSON.stringify(item)
    } catch {
      return Object.prototype.toString.call(item)
    }
  }
  return String(item)
}

function analyzerListItemKey(item: unknown): string {
  if (typeof item === 'string') return `s:${item}`
  if (typeof item === 'number' || typeof item === 'boolean') return `p:${item}`
  if (typeof item === 'object' && item !== null) {
    const obj = item as Record<string, unknown>
    const path = typeof obj.path === 'string' ? obj.path : ''
    const file = typeof obj.file === 'string' ? obj.file : ''
    const line = formatAnalyzerLineValue(obj.line) ?? ''
    if (path) return `path:${path}`
    if (file) return `file:${file}:${line}`
    try {
      return `j:${JSON.stringify(item)}`
    } catch {
      return `o:${Object.prototype.toString.call(item)}`
    }
  }
  return `u:${coerceAnalyzerDisplayItem(item)}`
}

const AnalyzerEvidenceList: React.FC<{ value: unknown }> = ({ value }) => {
  if (value == null) return null
  const items = Array.isArray(value) ? value : [value]
  if (items.length === 0) return null
  return (
    <ul className="gba:mt-0.5 gba:space-y-0.5 gba:text-muted-foreground">
      {items.map(item => (
        <li key={analyzerListItemKey(item)} className="gba:font-mono gba:text-[11px]">
          • {coerceAnalyzerDisplayItem(item)}
        </li>
      ))}
    </ul>
  )
}

const AnalyzerCard: React.FC<{
  analysis: AnalyzerFinding
  fromCache: boolean
  onRerun: (e: React.MouseEvent) => void
}> = ({ analysis, fromCache, onRerun }) => {
  return (
    <div className="gba:rounded-md gba:border gba:border-blue-200 gba:bg-blue-50/40 gba:p-2 gba:space-y-1.5 gba:text-[11px]">
      <div className="gba:flex gba:items-center gba:justify-between">
        <span className="gba:font-semibold gba:text-blue-900">AI analysis</span>
        <span className="gba:flex gba:items-center gba:gap-2 gba:text-[10px] gba:text-muted-foreground">
          {fromCache && analysis.cached_at ? (
            <span>cached {new Date(analysis.cached_at).toLocaleTimeString()}</span>
          ) : null}
          <button
            type="button"
            onClick={onRerun}
            className="gba:rounded gba:border gba:border-border gba:px-1.5 gba:py-0.5 gba:text-[10px] hover:gba:bg-muted"
          >
            Re-run
          </button>
        </span>
      </div>
      {analysis.root_cause ? (
        <div>
          <p className="gba:font-semibold gba:text-foreground">Root cause</p>
          <p className="gba:text-foreground">{coerceAnalyzerDisplayItem(analysis.root_cause)}</p>
        </div>
      ) : null}
      {analysis.affected_layer ? (
        <div>
          <p className="gba:font-semibold gba:text-foreground">Affected layer</p>
          <p className="gba:font-mono gba:text-foreground">{coerceAnalyzerDisplayItem(analysis.affected_layer)}</p>
        </div>
      ) : null}
      {analysis.evidence ? (
        <div>
          <p className="gba:font-semibold gba:text-foreground">Evidence</p>
          <AnalyzerEvidenceList value={analysis.evidence} />
        </div>
      ) : null}
      {analysis.code_locations ? (
        <div>
          <p className="gba:font-semibold gba:text-foreground">Code locations</p>
          <AnalyzerEvidenceList value={analysis.code_locations} />
        </div>
      ) : null}
      {analysis.suggested_fix ? (
        <div>
          <p className="gba:font-semibold gba:text-foreground">Suggested fix</p>
          <p className="gba:text-foreground">{coerceAnalyzerDisplayItem(analysis.suggested_fix)}</p>
        </div>
      ) : null}
      {analysis.test_command ? (
        <div>
          <p className="gba:font-semibold gba:text-foreground">Test command</p>
          <pre className="gba:mt-0.5 gba:overflow-x-auto gba:rounded gba:bg-muted gba:p-1.5 gba:font-mono gba:text-[10px] gba:text-foreground">
            {coerceAnalyzerDisplayItem(analysis.test_command)}
          </pre>
        </div>
      ) : null}
    </div>
  )
}

interface AnalyzerFinding {
  enabled?: boolean
  reason?: string
  error?: string
  root_cause?: string
  affected_layer?: string
  evidence?: string[] | string
  code_locations?: string[] | string
  suggested_fix?: string
  test_command?: string
  cached_at?: string
  [k: string]: any
}

interface AnalyzeResponse {
  session_id: string
  analysis: AnalyzerFinding
  from_cache: boolean
}

type AnalyzeState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'result'; data: AnalyzerFinding; fromCache: boolean }
  | { kind: 'disabled'; reason?: string }
  | { kind: 'error'; message: string }

function sessionStatusTone(status?: string): string {
  if (status === 'failed') return 'gba:bg-red-100 gba:text-red-800'
  if (status === 'waiting_for_human') return 'gba:bg-amber-100 gba:text-amber-800'
  if (status === 'completed') return 'gba:bg-emerald-100 gba:text-emerald-800'
  return 'gba:bg-muted gba:text-muted-foreground'
}

function analyzeButtonTone(analyze: AnalyzeState): string {
  if (analyze.kind === 'loading') return 'gba:border-border gba:bg-muted gba:text-muted-foreground'
  if (analyze.kind === 'error') return 'gba:border-red-300 gba:bg-red-50 gba:text-red-800'
  if (analyze.kind === 'result') return 'gba:border-blue-300 gba:bg-blue-50 gba:text-blue-800'
  return 'gba:border-border gba:text-foreground hover:gba:bg-muted'
}

function analyzeButtonLabel(analyze: AnalyzeState): string {
  if (analyze.kind === 'loading') return 'Analyzing...'
  if (analyze.kind === 'result') {
    return analyze.fromCache ? 'Explanation (cached)' : 'Explanation ready'
  }
  if (analyze.kind === 'error') return 'Analyze failed'
  return 'Explain this session'
}

function copyButtonTone(copyState: 'idle' | 'copied' | 'error'): string {
  if (copyState === 'copied') return 'gba:border-emerald-300 gba:bg-emerald-50 gba:text-emerald-800'
  if (copyState === 'error') return 'gba:border-red-300 gba:bg-red-50 gba:text-red-800'
  return 'gba:border-border gba:text-foreground hover:gba:bg-muted'
}

function copyButtonLabel(copyState: 'idle' | 'copied' | 'error'): string {
  if (copyState === 'copied') return 'Copied!'
  if (copyState === 'error') return 'Copy failed'
  return 'Copy debug context'
}

function analyzeStateFromResponse(body: AnalyzeResponse): AnalyzeState {
  const analysis = body.analysis || {}
  if (analysis.enabled === false) {
    return {
      kind: 'disabled',
      reason: analysis.reason || 'AI analyzer is disabled.'
    }
  }
  if (analysis.error) {
    return {
      kind: 'error',
      message: String(analysis.error)
    }
  }
  return {
    kind: 'result',
    data: analysis,
    fromCache: Boolean(body.from_cache)
  }
}

async function fetchSessionAnalysis(
  sessionId: string,
  accessToken: string,
  refresh: boolean
): Promise<AnalyzeResponse> {
  const base = PROMPT_MANAGER_API_URL.replace(/\/$/, '')
  const qs = refresh ? '?refresh=true' : ''
  const response = await fetch(
    `${base}/admin/agent-diagnostics/session/${encodeURIComponent(sessionId)}/analyze${qs}`,
    {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
    }
  )
  if (!response.ok) {
    throw new Error(`Analyzer failed: ${response.status}`)
  }
  return response.json()
}

function openDebugContextInNewTab(text: string): boolean {
  const win = globalThis.open('', '_blank')
  if (!win) return false
  const pre = win.document.createElement('pre')
  pre.textContent = text
  win.document.body.replaceChildren(pre)
  return true
}

async function copyTextToClipboard(text: string): Promise<'copied' | 'error'> {
  try {
    if (navigator.clipboard && globalThis.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return 'copied'
    }
    throw new Error('clipboard-unavailable')
  } catch (clipboardErr) {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.top = '0'
      ta.style.left = '0'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      await navigator.clipboard.writeText(text)
      ta.remove()
      return 'copied'
    } catch (fallbackErr) {
      if (openDebugContextInNewTab(text)) {
        return 'copied'
      }
      console.error('[every-fabric] copy debug context failed', {
        clipboardErr,
        fallbackErr
      })
      return 'error'
    }
  }
}

const DiagnosticsSummary: React.FC<{
  sessionId: string
  diagnostics: DiagnosticsBundle
  accessToken: string
}> = ({ sessionId, diagnostics, accessToken }) => {
  const session = diagnostics.session || {}
  const summary = diagnostics.summary || {}
  const slowPhases = diagnostics.slow_phases || []
  const failedTools = diagnostics.failed_tools || []
  const repeatedTools = diagnostics.repeated_tools || []
  const warnings = diagnostics.warnings || []
  const langsmith = diagnostics.langsmith || {}

  const [copyState, setCopyState] = React.useState<'idle' | 'copied' | 'error'>('idle')
  const [analyze, setAnalyze] = React.useState<AnalyzeState>({ kind: 'idle' })

  const runAnalyzer = async (e: React.MouseEvent, opts: { refresh?: boolean } = {}) => {
    e.preventDefault()
    e.stopPropagation()
    setAnalyze({ kind: 'loading' })
    try {
      const body = await fetchSessionAnalysis(sessionId, accessToken, Boolean(opts.refresh))
      setAnalyze(analyzeStateFromResponse(body))
    } catch (err) {
      setAnalyze({
        kind: 'error',
        message: err instanceof Error ? err.message : String(err)
      })
    }
  }

  const copyDebugContext = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const text = JSON.stringify(
      {
        session_id: sessionId,
        session,
        summary,
        slow_phases: slowPhases,
        failed_tools: failedTools,
        repeated_tools: repeatedTools,
        warnings,
        langsmith
      },
      null,
      2
    )

    const result = await copyTextToClipboard(text)
    setCopyState(result)
    globalThis.setTimeout(() => setCopyState('idle'), 1800)
  }

  const statusTone = sessionStatusTone(session.status)

  return (
    <div className="gba:rounded-lg gba:border gba:border-border/60 gba:bg-muted/30 gba:p-2 gba:space-y-2">
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5 gba:text-[11px]">
        <span className={`gba:rounded-full gba:px-2 gba:py-0.5 gba:font-semibold ${statusTone}`}>
          {session.status || 'unknown'}
        </span>
        {session.route && (
          <span className="gba:rounded-full gba:bg-blue-100 gba:px-2 gba:py-0.5 gba:text-blue-800">
            route:{session.route}
          </span>
        )}
        <span className="gba:text-muted-foreground">ttft {_formatMs(session.ttft_ms)}</span>
        <span className="gba:text-muted-foreground">dur {_formatMs(session.duration_ms)}</span>
        {summary.failed_tool_count ? (
          <span className="gba:rounded-full gba:bg-red-100 gba:px-2 gba:py-0.5 gba:text-red-800">
            failed:{summary.failed_tool_count}
          </span>
        ) : null}
        {summary.repeated_tool_count ? (
          <span className="gba:rounded-full gba:bg-orange-100 gba:px-2 gba:py-0.5 gba:text-orange-800">
            repeated:{summary.repeated_tool_count}
          </span>
        ) : null}
        {summary.hitl_pause_count ? (
          <span className="gba:rounded-full gba:bg-amber-100 gba:px-2 gba:py-0.5 gba:text-amber-800">
            hitl:{summary.hitl_pause_count}
          </span>
        ) : null}
        <button
          type="button"
          onClick={e => runAnalyzer(e)}
          disabled={analyze.kind === 'loading'}
          className={`gba:ml-auto gba:rounded-full gba:border gba:px-2 gba:py-0.5 gba:text-[11px] gba:transition-colors ${analyzeButtonTone(analyze)}`}
        >
          {analyzeButtonLabel(analyze)}
        </button>
        <button
          type="button"
          onClick={copyDebugContext}
          aria-live="polite"
          className={`gba:rounded-full gba:border gba:px-2 gba:py-0.5 gba:text-[11px] gba:transition-colors ${copyButtonTone(copyState)}`}
        >
          {copyButtonLabel(copyState)}
        </button>
      </div>

      {analyze.kind === 'disabled' && (
        <p className="gba:rounded-md gba:bg-muted gba:px-2 gba:py-1.5 gba:text-[11px] gba:text-muted-foreground">
          AI analyzer disabled. Set <code className="gba:font-mono">DEEP_AGENT_AI_ANALYZER_ENABLED=true</code> on
          prompt-manager to enable.
          {analyze.reason ? <span className="gba:ml-1">({analyze.reason})</span> : null}
        </p>
      )}

      {analyze.kind === 'error' && (
        <p className="gba:rounded-md gba:bg-red-50 gba:px-2 gba:py-1.5 gba:text-[11px] gba:text-red-800">
          Analyzer error: {analyze.message}
        </p>
      )}

      {analyze.kind === 'result' && (
        <AnalyzerCard
          analysis={analyze.data}
          fromCache={analyze.fromCache}
          onRerun={e => runAnalyzer(e, { refresh: true })}
        />
      )}

      {slowPhases.length > 0 && (
        <div className="gba:text-[11px]">
          <p className="gba:font-semibold gba:text-foreground">Slow phases</p>
          <ul className="gba:mt-0.5 gba:space-y-0.5">
            {slowPhases.slice(0, 6).map(phase => (
              <li key={phase.name} className="gba:font-mono gba:text-muted-foreground">
                {phase.name}: {_formatMs(phase.ms)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {failedTools.length > 0 && (
        <div className="gba:text-[11px]">
          <p className="gba:font-semibold gba:text-red-800">Failed tools</p>
          <ul className="gba:mt-0.5 gba:space-y-0.5">
            {failedTools.slice(0, 4).map((ft, idx) => (
              <li key={`${ft.tool}-${idx}`} className="gba:text-red-700">
                <span className="gba:font-mono">{ft.tool || '—'}</span>
                {ft.status ? <span className="gba:ml-1 gba:text-muted-foreground">({ft.status})</span> : null}
                {ft.error ? <span className="gba:ml-1">— {ft.error}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {repeatedTools.length > 0 && (
        <div className="gba:text-[11px]">
          <p className="gba:font-semibold gba:text-orange-800">Repeated tool calls</p>
          <ul className="gba:mt-0.5 gba:space-y-0.5">
            {repeatedTools.slice(0, 4).map(rt => (
              <li key={rt.tool} className="gba:text-orange-700">
                <span className="gba:font-mono">{rt.tool}</span>
                <span className="gba:ml-1">× {rt.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <ul className="gba:text-[11px] gba:text-amber-800 gba:space-y-0.5">
          {warnings.map(warning => (
            <li key={warning}>• {warning}</li>
          ))}
        </ul>
      )}

      {langsmith.enabled && langsmith.console_url && (
        <p className="gba:text-[11px] gba:text-muted-foreground">
          LangSmith project{' '}
          <a href={langsmith.console_url} target="_blank" rel="noreferrer" className="gba:underline">
            {langsmith.project || 'open'}
          </a>
          {langsmith.filter && (
            <code className="gba:ml-2 gba:rounded gba:bg-muted gba:px-1 gba:py-0.5 gba:font-mono gba:text-[10px]">
              {langsmith.filter}
            </code>
          )}
        </p>
      )}
    </div>
  )
}

const DebugTraceCard: React.FC<{ sessionId: string; accessToken: string }> = ({ sessionId, accessToken }) => {
  const [trace, setTrace] = useState<Record<string, any> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'decisions' | 'tools' | 'hitl' | 'errors' | 'artifacts'>('all')

  useEffect(() => {
    if (!sessionId) return
    const base = PROMPT_MANAGER_API_URL.replace(/\/$/, '')
    fetch(`${base}/deep-agent/sessions/${encodeURIComponent(sessionId)}/debug-trace`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
    })
      .then(async response => {
        if (!response.ok) throw new Error(`Debug trace failed: ${response.status}`)
        return response.json()
      })
      .then(setTrace)
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
  }, [sessionId, accessToken])

  if (!sessionId) return null

  const steps = Array.isArray(trace?.steps) ? trace.steps : []
  const interesting = steps.filter(step =>
    [
      'decision',
      'routing_plan',
      'tool_started',
      'tool_completed',
      'tool_result',
      'nested_tool_completed',
      'hitl_requested',
      'capability_missing',
      'artifact_created',
      'artifact_preview',
      'terminal'
    ].includes(String(step.kind))
  )
  const filtered = interesting.filter(step => {
    if (filter === 'all') return true
    if (filter === 'decisions') return step.kind === 'decision' || step.kind === 'routing_plan'
    if (filter === 'tools') return String(step.kind).startsWith('tool_') || step.kind === 'nested_tool_completed'
    if (filter === 'hitl') return String(step.kind).includes('hitl')
    if (filter === 'errors') return step.kind === 'capability_missing' || step.status === 'failed'
    if (filter === 'artifacts') return String(step.kind).includes('artifact')
    return true
  })

  const exportTrace = () => {
    if (!trace) return
    const blob = new Blob([JSON.stringify(trace, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `debug-trace-${sessionId}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const debugSummary = (() => {
    if (!trace) return error ? 'Failed to load trace' : 'Loading trace…'
    if (interesting.length === 0) return 'No traced steps yet'
    return `${interesting.length} traced step${interesting.length === 1 ? '' : 's'}`
  })()

  return (
    <PanelCard
      title="Debug Trace (dev only)"
      badge={interesting.length}
      summary={debugSummary}
      defaultOpen={false}
      subdued
    >
      <div className="gba:max-h-96 gba:overflow-y-auto gba:px-4 gba:py-3 gba:space-y-2">
        {error && <p className="gba:text-xs gba:text-destructive">{error}</p>}
        {!trace && !error && <p className="gba:text-xs gba:text-muted-foreground">Loading debug trace...</p>}
        {trace && (
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5">
            {(['all', 'decisions', 'tools', 'hitl', 'errors', 'artifacts'] as const).map(value => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] ${
                  filter === value ? 'gba:bg-foreground gba:text-background' : 'gba:bg-muted gba:text-muted-foreground'
                }`}
              >
                {value}
              </button>
            ))}
            <button
              type="button"
              onClick={exportTrace}
              className="gba:ml-auto gba:rounded-full gba:border gba:border-border gba:px-2 gba:py-0.5 gba:text-[11px] gba:text-foreground"
            >
              Export
            </button>
          </div>
        )}
        {trace?.diagnostics && (
          <DiagnosticsSummary sessionId={sessionId} diagnostics={trace.diagnostics} accessToken={accessToken} />
        )}
        {trace?.known_observability_gap && (
          <p className="gba:rounded-md gba:bg-amber-50 gba:px-3 gba:py-2 gba:text-[11px] gba:text-amber-800">
            {trace.known_observability_gap}
          </p>
        )}
        {filtered.map((step, idx) => {
          const isRouting = step.kind === 'routing_plan'
          const isGap = step.kind === 'capability_missing'
          const experts: Array<{ name?: string; subtask?: string; rationale?: string }> = Array.isArray(step.experts)
            ? step.experts
            : []
          const shortlist: Array<{ kind?: string; name?: string; score?: number; description?: string }> =
            Array.isArray(step.shortlist) ? step.shortlist : []
          return (
            <div
              key={`${step.seq ?? idx}-${step.kind}`}
              className={`gba:rounded-lg gba:border gba:p-2 ${
                isRouting
                  ? 'gba:border-blue-200 gba:bg-blue-50/50'
                  : isGap
                    ? 'gba:border-amber-200 gba:bg-amber-50/50'
                    : 'gba:border-border/60'
              }`}
            >
              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:text-[11px] gba:text-muted-foreground">
                <span>#{String(step.seq ?? idx)}</span>
                <span className="gba:font-semibold gba:text-foreground">{String(step.kind)}</span>
                {step.mode && <span className="gba:font-mono">mode:{String(step.mode)}</span>}
                {step.parallelizable && (
                  <span className="gba:rounded-full gba:bg-blue-100 gba:px-1.5 gba:text-[10px] gba:text-blue-800">
                    parallel
                  </span>
                )}
                {typeof step.used_llm === 'boolean' && (
                  <span className="gba:text-[10px] gba:text-muted-foreground/70">
                    router:{step.used_llm ? 'llm' : 'lexical'}
                  </span>
                )}
                {step.tool && <span className="gba:font-mono">{String(step.tool)}</span>}
                {step.expert && <span>via {String(step.expert)}</span>}
                {step.expert_name && <span>via {String(step.expert_name)}</span>}
                {step.provider_tool_ref && (
                  <span className="gba:font-mono gba:text-[10px] gba:text-muted-foreground/70">
                    provider:{String(step.provider_tool_ref)}
                  </span>
                )}
                {step.category && <span>{String(step.category)}</span>}
                {step.correlation_id && <span className="gba:font-mono">corr:{String(step.correlation_id)}</span>}
              </div>
              {(step.timestamp || step.duration_ms !== undefined) && (
                <p className="gba:mt-1 gba:text-[10px] gba:text-muted-foreground/60">
                  {step.timestamp ? formatActivityTimestamp(step.timestamp) : ''}
                  {step.timestamp && step.duration_ms !== undefined ? ' · ' : ''}
                  {step.duration_ms !== undefined ? `${(step.duration_ms / 1000).toFixed(2)}s` : ''}
                </p>
              )}
              {(step.reason ||
                step.rationale ||
                step.result_preview ||
                step.output_preview ||
                step.content_preview) && (
                <p className="gba:mt-1 gba:line-clamp-4 gba:text-xs gba:text-muted-foreground">
                  {String(
                    step.reason || step.rationale || step.result_preview || step.output_preview || step.content_preview
                  )}
                </p>
              )}
              {isRouting && experts.length > 0 && (
                <ul className="gba:mt-1 gba:space-y-0.5 gba:text-[11px] gba:text-foreground">
                  {experts.map((expert, expertIdx) => (
                    <li key={`${expert.name}-${expertIdx}`} className="gba:font-mono">
                      → <span className="gba:font-semibold">{expert.name}</span>
                      {expert.subtask ? (
                        <span className="gba:font-normal gba:text-muted-foreground"> · {expert.subtask}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {isRouting && shortlist.length > 0 && (
                <details className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">
                  <summary className="gba:cursor-pointer">Shortlist ({shortlist.length})</summary>
                  <ul className="gba:mt-1 gba:space-y-0.5">
                    {shortlist.slice(0, 8).map((item, itemIdx) => (
                      <li key={`${item.name}-${itemIdx}`} className="gba:font-mono">
                        [{String(item.kind || '?')}] {String(item.name || 'unknown')}
                        {typeof item.score === 'number' ? (
                          <span className="gba:text-[10px] gba:text-muted-foreground/60">
                            {' '}
                            · {item.score.toFixed(3)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {isRouting && Array.isArray(step.required_capabilities) && step.required_capabilities.length > 0 && (
                <div className="gba:mt-1 gba:flex gba:flex-wrap gba:gap-1">
                  {step.required_capabilities.map((cap: string, capIdx: number) => (
                    <span
                      key={`${cap}-${capIdx}`}
                      className="gba:rounded-full gba:bg-muted gba:px-1.5 gba:text-[10px] gba:text-muted-foreground"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              )}
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
  agentStreamEvents: AgentStreamEvent[]
  decisions: DecisionItem[]
  cases: CaseState[]
  artifacts: ArtifactFile[]
  workspaceDocs?: WorkspaceDocument[]
  isConnected: boolean
  isStreaming: boolean
  latestPreview?: ArtifactPreview | null
  accessToken?: string
  sessionId?: string
  /** Invoked when the user clicks "Try again" on a preview error card. */
  onRetryPreview?: (preview: ArtifactPreview) => void
  /** Whether the live-preview canvas is in its maximized layout. */
  isPreviewMaximized?: boolean
  /** Toggle handler wired to the expand/collapse button on the preview header. */
  onTogglePreviewMaximized?: () => void
}

export const WorkspaceRightPanel: React.FC<WorkspaceRightPanelProps> = ({
  taskNodes,
  hasPlan,
  completedCount,
  totalCount,
  progressPercent,
  activityEvents,
  agentStreamEvents,
  decisions,
  cases,
  artifacts,
  workspaceDocs,
  isConnected,
  isStreaming,
  latestPreview,
  accessToken = '',
  sessionId = '',
  onRetryPreview,
  isPreviewMaximized = false,
  onTogglePreviewMaximized
}) => {
  const delegation = useFabricDelegation(agentStreamEvents, { sessionId, accessToken, isStreaming })
  const delegationStats = useMemo(() => computeDelegationStats(delegation.flatNodes), [delegation.flatNodes])
  const showPreview =
    !!latestPreview &&
    (latestPreview.status === 'generating' ||
      latestPreview.status === 'draft_ready' ||
      latestPreview.status === 'ready' ||
      latestPreview.status === 'error')
  const caseFocus = cases.length > 0
  const collapseSecondaryPanels = showPreview || caseFocus

  return (
    <div
      className="gba:flex gba:h-full gba:max-h-full gba:max-w-full gba:min-h-0 gba:min-w-0 gba:flex-col gba:overflow-y-auto gba:overflow-x-hidden gba:bg-transparent gba:px-0 sm:gba:px-1 gba:py-1 sm:gba:py-1.5 gba:space-y-2 sm:gba:space-y-3"
      data-testid="fabric-right-panel"
    >
      {showPreview && (
        <div className="gba:shrink-0">
          <LivePreviewCard
            preview={latestPreview}
            accessToken={accessToken}
            sessionId={sessionId}
            onRetry={onRetryPreview ? () => onRetryPreview(latestPreview) : undefined}
            isMaximized={isPreviewMaximized}
            onToggleMaximized={onTogglePreviewMaximized}
          />
        </div>
      )}

      {cases.length > 0 && <CasePanel cases={cases} accessToken={accessToken} defaultCollapsed={false} />}

      {hasPlan && (
        <PlanCard
          nodes={taskNodes}
          completedCount={completedCount}
          totalCount={totalCount}
          progressPercent={progressPercent}
          isConnected={isConnected}
          isStreaming={isStreaming}
          defaultCollapsed={collapseSecondaryPanels}
        />
      )}

      {decisions.length > 0 && <DecisionsCard decisions={decisions} defaultCollapsed={collapseSecondaryPanels} />}

      {delegation.hasMultipleAgents ? (
        <CollaborationPanel
          root={delegation.rootNode}
          stats={delegationStats}
          defaultCollapsed={collapseSecondaryPanels}
        />
      ) : (
        <EnterpriseExpertsCard
          nodes={taskNodes}
          events={activityEvents}
          isStreaming={isStreaming}
          defaultCollapsed={collapseSecondaryPanels}
        />
      )}

      {artifacts.length > 0 && <ArtifactsCard artifacts={artifacts} defaultCollapsed={collapseSecondaryPanels} />}

      {workspaceDocs && workspaceDocs.length > 0 && (
        <WorkspaceDocumentsCard docs={workspaceDocs} defaultCollapsed={collapseSecondaryPanels} />
      )}

      {activityEvents.length > 0 && <ActivityCard events={activityEvents} />}

      {sessionId && <DebugTraceCard sessionId={sessionId} accessToken={accessToken} />}
    </div>
  )
}
