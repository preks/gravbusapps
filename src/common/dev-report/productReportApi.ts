import { env } from '@/common/env/EnvUtils'
import type { CreateGravityIssueRequest, CreateGravityIssueResponse } from './types'

function getBaseUrl(): string | undefined {
  const raw = env('NEXT_PUBLIC_PRODUCT_REPORT_BASE_URL')
  if (!raw) return undefined
  return String(raw).replace(/\/+$/, '')
}

export async function submitGravityIssue(payload: CreateGravityIssueRequest): Promise<CreateGravityIssueResponse> {
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    return { ok: false, error: 'Product Report URL is not configured' }
  }

  try {
    const resp = await fetch(`${baseUrl}/api/gravity/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const json = (await resp.json().catch(() => null)) as any

    if (!resp.ok) {
      return { ok: false, error: json?.error || `Request failed (${resp.status})` }
    }

    return { ok: true, issueId: json?.issueId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}
