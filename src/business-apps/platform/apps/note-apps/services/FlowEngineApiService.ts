import { env } from '@/common/env/EnvUtils'
import type { FlowRunStatus } from '../types'

export interface FlowStatusResult {
  status: FlowRunStatus
  completedAt?: string
  lastSyncedAt: string
}

function getFlowEngineBaseUrl(): string {
  return env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || `${env('NEXT_PUBLIC_BASE_URL')}/flow-engine`
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

  async getFlowStatus(workflowId: string): Promise<FlowStatusResult | null> {
    if (!workflowId) return null

    const baseUrl = getFlowEngineBaseUrl()
    const lastSyncedAt = new Date().toISOString()

    const response = await fetch(`${baseUrl}/api/flows/${workflowId}`, {
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
        const progressRes = await fetch(`${baseUrl}/api/flows/${workflowId}/progress`, {
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
