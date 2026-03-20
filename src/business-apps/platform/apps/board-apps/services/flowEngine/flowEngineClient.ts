/**
 * Flow Engine REST client for board-apps.
 *
 * Uses the shared Flow Engine URL helper and reuses the BoardApiService
 * auth-token provider so callers don't need to manage tokens.
 */

import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import type {
  FlowTemplateSummary,
  FlowTemplateDefinition,
  FlowSummaryRecord,
  FlowTaskRecord,
  FlowProgressComplete,
  FlowEngineTagFilter
} from './flowEngineTypes'

let tokenProvider: (() => string | null) | null = null

export function setFlowEngineTokenProvider(provider: (() => string | null) | null) {
  tokenProvider = provider
}

function getToken(): string | null {
  try {
    return tokenProvider?.() || null
  } catch {
    return null
  }
}

function appendTags(params: URLSearchParams, tags?: FlowEngineTagFilter[]) {
  if (!tags?.length) return
  for (const t of tags) {
    if (t.key && t.value) params.set(`tag.${t.key}`, t.value)
  }
}

async function feRequest<T>(endpoint: string): Promise<T> {
  const token = getToken()
  if (!token) throw new Error('Flow Engine: access token not available')

  const baseUrl = getFlowEngineApiBaseUrl()
  const res = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) {
    throw new Error(`Flow Engine ${res.status}: ${res.statusText}`)
  }

  return res.json() as Promise<T>
}

// ── Templates ───────────────────────────────────────────────────────────

const TEMPLATE_PAGE_SIZE = 100

export async function listTemplates(opts?: {
  search?: string
  tags?: FlowEngineTagFilter[]
  limit?: number
  offset?: number
}): Promise<FlowTemplateSummary[]> {
  const p = new URLSearchParams()
  p.set('onlyLatest', 'true')
  if (opts?.search) p.set('search', opts.search)
  if (opts?.limit) p.set('limit', String(opts.limit))
  if (opts?.offset) p.set('offset', String(opts.offset))
  appendTags(p, opts?.tags)

  const qs = p.toString()
  const raw = await feRequest<any>(`/templates/list${qs ? `?${qs}` : ''}`)
  const list = raw.data ?? raw.templates ?? raw ?? []
  if (!Array.isArray(list)) return []
  return list.map(mapTemplate)
}

/**
 * Fetches ALL templates by paginating through the backend
 * (which caps each page at 100).
 */
export async function listAllTemplates(opts?: {
  search?: string
  tags?: FlowEngineTagFilter[]
}): Promise<FlowTemplateSummary[]> {
  const all: FlowTemplateSummary[] = []
  let offset = 0

  while (true) {
    const p = new URLSearchParams()
    p.set('onlyLatest', 'true')
    p.set('limit', String(TEMPLATE_PAGE_SIZE))
    p.set('offset', String(offset))
    if (opts?.search) p.set('search', opts.search)
    appendTags(p, opts?.tags)

    const qs = p.toString()
    const raw = await feRequest<any>(`/templates/list?${qs}`)
    const list = raw.data ?? raw.templates ?? raw ?? []
    if (!Array.isArray(list) || list.length === 0) break

    all.push(...list.map(mapTemplate))

    const hasMore = raw.hasMore ?? list.length >= TEMPLATE_PAGE_SIZE
    if (!hasMore) break
    offset += list.length
  }

  return all
}

export async function getTemplate(templateId: string): Promise<FlowTemplateDefinition | null> {
  try {
    const raw = await feRequest<any>(`/templates/${templateId}`)
    const data = raw.data ?? raw
    const steps = (data.steps ?? []).map((s: any) => ({
      name: s.name ?? s.title,
      title: s.title ?? s.name,
      type: s.type,
      nextStep: s.nextStep ?? null,
      defaultNextStep: s.defaultNextStep ?? null,
      branches: Array.isArray(s.branches)
        ? s.branches.map((b: any) => ({ condition: b.condition ?? '', nextStep: b.nextStep }))
        : undefined
    }))
    return { id: data.id ?? data.name ?? templateId, name: data.name ?? templateId, steps }
  } catch {
    return null
  }
}

function mapTemplate(t: any): FlowTemplateSummary {
  return {
    id: t.id ?? t.name,
    name: t.name ?? t.id ?? 'Untitled',
    description: t.description,
    type: t.type,
    version: t.version,
    tags: t.tags
  }
}

// ── Flows ───────────────────────────────────────────────────────────────

export interface ListFlowsOpts {
  status?: string
  search?: string
  limit?: number
  offset?: number
  participationType?: 'initiated' | 'participated'
  userId?: string
  tags?: FlowEngineTagFilter[]
  templateIds?: string[]
  includeDynamic?: boolean
}

export async function listFlows(opts: ListFlowsOpts = {}): Promise<{
  flows: FlowSummaryRecord[]
  totalCount: number
}> {
  const p = new URLSearchParams()
  if (opts.status) p.set('status', opts.status)
  if (opts.search) p.set('search', opts.search)
  if (opts.limit) p.set('limit', String(opts.limit))
  if (opts.offset) p.set('offset', String(opts.offset))
  if (opts.participationType) p.set('participationType', opts.participationType)
  if (opts.userId) p.set('userId', opts.userId)
  if (!opts.includeDynamic) p.set('excludeDynamic', 'true')
  appendTags(p, opts.tags)

  let endpoint = '/flows/list'
  if (opts.userId && opts.participationType === 'initiated') {
    endpoint = `/flows/user/${opts.userId}/initiated`
  } else if (opts.userId && opts.participationType === 'participated') {
    endpoint = `/flows/user/${opts.userId}/participated`
  }

  const qs = p.toString()
  const raw = await feRequest<any>(`${endpoint}${qs ? `?${qs}` : ''}`)
  const flowArr = raw.data?.flows ?? raw.flows ?? []
  const total = raw.data?.totalCount ?? flowArr.length

  const flows: FlowSummaryRecord[] = (Array.isArray(flowArr) ? flowArr : []).map((f: any) => ({
    flowId: f.flowId ?? f.id,
    flowName: f.flowName ?? f.name ?? 'Unknown',
    templateId: f.templateId ?? '',
    templateName: f.templateName ?? f.templateId ?? '',
    status: f.status ?? 'UNKNOWN',
    startTime: f.startTime ?? '',
    updateTime: f.updateTime ?? '',
    endTime: f.endTime,
    progressPercentage: f.progressPercentage ?? 0,
    currentStep: f.stepStatus?.completed ?? f.currentStep ?? 0,
    totalSteps: f.stepStatus?.total ?? f.totalSteps ?? 0,
    initiatedBy: f.initiatedBy ?? '',
    initiatedById: f.initiatedById ?? '',
    participants: f.participants ?? [],
    priority: f.priority,
    isOverdue: f.timeInsights?.isOverdue ?? false,
    durationMinutes: f.durationMinutes
  }))

  return { flows, totalCount: total }
}

// ── Tasks ───────────────────────────────────────────────────────────────

export interface ListTasksOpts {
  templateId?: string
  userId?: string
  includeAssigned?: boolean
  includeClaimable?: boolean
  search?: string
  customStatus?: string
  priority?: string
  limit?: number
  offset?: number
  tags?: FlowEngineTagFilter[]
}

export async function listTasks(opts: ListTasksOpts = {}): Promise<{
  tasks: FlowTaskRecord[]
  totalCount: number
}> {
  const p = new URLSearchParams()
  if (opts.search) p.set('search', opts.search)
  if (opts.customStatus) p.set('customStatus', opts.customStatus)
  if (opts.priority) p.set('priority', opts.priority)
  if (opts.limit) p.set('limit', String(opts.limit))
  if (opts.offset) p.set('offset', String(opts.offset))

  for (const t of opts.tags ?? []) {
    if (t.key && t.value) p.set(`tags.${t.key}`, t.value)
  }

  let endpoint: string
  if (opts.userId) {
    endpoint = `/tasks/user/${opts.userId}`
    if (opts.includeAssigned != null) p.set('includeAssigned', String(opts.includeAssigned))
    if (opts.includeClaimable != null) p.set('includeClaimable', String(opts.includeClaimable))
    if (opts.templateId) p.set('templateId', opts.templateId)
  } else if (opts.templateId) {
    endpoint = `/tasks/template/${opts.templateId}`
  } else {
    endpoint = '/tasks/user/me'
  }

  const qs = p.toString()
  const raw = await feRequest<any>(`${endpoint}${qs ? `?${qs}` : ''}`)
  const taskArr = raw.tasks ?? raw.data?.tasks ?? raw.data ?? []
  const total = raw.totalCount ?? raw.data?.totalCount ?? taskArr.length

  const tasks: FlowTaskRecord[] = (Array.isArray(taskArr) ? taskArr : []).map((t: any) => ({
    id: t.id,
    flowId: t.flowId ?? '',
    flowName: t.flowName,
    stepIndex: t.stepIndex,
    title: t.title ?? t.name ?? 'Untitled',
    name: t.name ?? t.title ?? '',
    status: t.status ?? 'UNKNOWN',
    priority: t.priority,
    customStatus: t.customStatus,
    dueDate: t.dueDate,
    scheduledAt: t.scheduledAt,
    completedAt: t.completedAt,
    assignedTo: t.assignment?.assignedTo,
    claimedBy: t.assignment?.assignmentStatus === 'CLAIMED' ? t.assignment?.assignedTo : undefined,
    assignmentStatus: t.assignment?.assignmentStatus,
    message: t.message,
    templateId: t.templateId ?? t.workflowMeta?.processId,
    templateName: t.templateName
  }))

  return { tasks, totalCount: total }
}

// ── Flow progress (for row detail timeline) ─────────────────────────────

export async function getFlowProgressComplete(flowId: string): Promise<FlowProgressComplete | null> {
  try {
    const raw = await feRequest<any>(`/flows/${flowId}/progress/complete`)
    const data = raw.data ?? raw

    const stepAssignments: Record<string, any> = data.workflow?.workflow_input?.stepAssignments ?? {}

    const steps: FlowProgressComplete['steps'] = (data.steps ?? []).map((s: any, idx: number) => {
      const sa = stepAssignments[`step_${idx}`]?.assignment

      return {
        stepIndex: s.stepIndex ?? idx,
        stepKey: s.stepKey ?? s.key ?? `step_${idx}`,
        title: s.title ?? s.name ?? `Step ${idx + 1}`,
        type: s.type ?? 'TASK',
        status: s.status ?? 'UNKNOWN',
        assignedTo: s.assignedTo ?? sa?.assignedTo ?? s.assignment?.assignedTo ?? s.completedBy,
        claimedBy:
          s.claimedBy ??
          (sa?.assignmentStatus === 'CLAIMED' ? sa?.assignedTo : undefined) ??
          (s.assignment?.assignmentStatus === 'CLAIMED' ? s.assignment?.assignedTo : undefined),
        startedAt: s.startedAt ?? sa?.assignedAt,
        completedAt: s.completedAt ?? s.completionAt,
        dueDate: s.dueDate ?? data.workflow?.due_date
      }
    })

    return {
      flowId: data.flowId ?? data.workflow?.root_workflow_id ?? flowId,
      flowName: data.flowName ?? data.workflow?.workflow_name ?? data.name ?? 'Unknown',
      status: data.status ?? data.workflow?.conductor_status ?? 'UNKNOWN',
      progressPercentage: data.progressPercentage ?? parseFloat(data.workflow?.step_progress_percentage ?? '0') ?? 0,
      steps
    }
  } catch {
    return null
  }
}
