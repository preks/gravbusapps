import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import type { FlowRunStatus } from '../types'
import type { NoteActionItemFlow } from '../types'

export interface FlowStatusResult {
  status: FlowRunStatus
  completedAt?: string
  lastSyncedAt: string
}

function mapFlowStatus(status?: string): FlowRunStatus {
  const normalized = (status || '').toUpperCase()
  if (normalized === 'COMPLETED') return 'COMPLETED'
  if (normalized === 'FAILED') return 'FAILED'
  if (normalized === 'CANCELED' || normalized === 'CANCELLED') return 'CANCELED'
  if (normalized === 'RUNNING' || normalized === 'IN_PROGRESS' || normalized === 'ACTIVE') return 'RUNNING'
  return 'UNKNOWN'
}

export class FlowEngineApiService {
  constructor(private accessToken: string) {}

  async listBlinksForNote(params: { noteId: string; entityType?: string }): Promise<NoteActionItemFlow[]> {
    const noteId = params.noteId
    if (!noteId) return []

    const baseUrl = CUSTOM_FLOW_ENGINE_API_URL
    const query = new URLSearchParams({
      'tags.app': 'quick-task',
      'tags.entityId': noteId,
      ...(params.entityType ? { 'tags.entityType': params.entityType } : {})
    })

    const response = await fetch(`${baseUrl}/flows/list?${query.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const flows: Array<Record<string, unknown>> = (data?.data?.flows as any[]) || (data?.flows as any[]) || []

    return flows
      .map(flow => {
        const tags = (flow.tags as Record<string, string> | undefined) || {}
        const workflowId = (flow.workflowId as string) || (flow.id as string)
        if (!workflowId) return null

        const text =
          (flow.name as string | undefined) ||
          (flow.title as string | undefined) ||
          (tags.actionText as string | undefined) ||
          (tags.entityName as string | undefined) ||
          'Action item'

        const createdAt =
          (flow.startedAt as string | undefined) || (flow.createdAt as string | undefined) || new Date().toISOString()

        const status = mapFlowStatus(flow.status as string | undefined)
        const completedAt = (flow.completedAt as string | undefined) || (flow.finishedAt as string | undefined)

        return {
          id: `recovered_${workflowId}`,
          text,
          assigneeUserId: (tags.assignedUserId as string) || '',
          assigneeDisplayName: tags.assignedUserName || undefined,
          assigneeAvatarUrl: tags.assignedUserAvatarUrl || undefined,
          workflowId,
          status,
          createdAt,
          completedAt,
          lastSyncedAt: new Date().toISOString()
        } as NoteActionItemFlow
      })
      .filter(Boolean) as NoteActionItemFlow[]
  }

  async getFlowStatus(workflowId: string): Promise<FlowStatusResult | null> {
    if (!workflowId) return null

    const baseUrl = CUSTOM_FLOW_ENGINE_API_URL
    const lastSyncedAt = new Date().toISOString()

    const response = await fetch(`${baseUrl}/flows/${workflowId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Failed to fetch flow status: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const flow = (data?.data || data) as Record<string, unknown>
    const status = mapFlowStatus(flow.status as string | undefined)

    // Try to find completedAt in common fields
    let completedAt =
      (flow.completedAt as string | undefined) ||
      (flow.completed_at as string | undefined) ||
      (flow.finishedAt as string | undefined) ||
      (flow.finished_at as string | undefined)

    // If completed but no timestamp, try to derive from progress endpoint (best-effort)
    if (!completedAt && (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELED')) {
      try {
        const progressRes = await fetch(`${baseUrl}/flows/${workflowId}/progress`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        })

        if (progressRes.ok) {
          const progressData = await progressRes.json()
          const progress = (progressData?.data || progressData) as Record<string, unknown>
          const steps = (progress.steps as Array<Record<string, unknown>> | undefined) || []
          const lastCompleted = [...steps].reverse().find(s => !!s.completedAt || !!s.completed_at)
          completedAt =
            (lastCompleted?.completedAt as string | undefined) || (lastCompleted?.completed_at as string | undefined)
        }
      } catch {
        // ignore
      }
    }

    return { status, completedAt, lastSyncedAt }
  }
}
