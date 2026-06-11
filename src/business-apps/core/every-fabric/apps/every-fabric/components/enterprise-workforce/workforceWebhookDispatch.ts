// Toast helpers for workforce webhook test dispatch responses.

import { toast } from 'sonner'
import type { WorkforceInboundDispatchResponse } from '@/common/network/ai/prompt-manager/PromptManagerClient'

export function describeWebhookDispatchResult(result: WorkforceInboundDispatchResponse): string {
  if (result.accepted && result.session_id) {
    return `Workforce run started via webhook (session: ${result.session_id}).`
  }
  if (result.accepted && !result.session_id) {
    return `Webhook accepted, but the agent did not start a run. ${result.reason ?? ''}`.trim()
  }
  return 'Webhook dispatch was not accepted.'
}

export function notifyWebhookDispatchResult(
  result: WorkforceInboundDispatchResponse,
  onOpenRun?: (sessionId: string) => void
): void {
  const description = describeWebhookDispatchResult(result)
  if (result.accepted && result.session_id) {
    toast.success('Webhook sent', { description })
    if (onOpenRun) {
      onOpenRun(result.session_id)
    }
    return
  }
  if (result.accepted && !result.session_id) {
    toast.warning('Webhook not run', { description })
    return
  }
  toast.error('Webhook failed', { description })
}
