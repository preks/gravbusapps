type EmailAssistantEventName =
  | 'assistant.open'
  | 'assistant.generateDraft'
  | 'assistant.rewrite'
  | 'assistant.temperatureCheck'
  | 'assistant.replySuggest'
  | 'assistant.preview.accepted'
  | 'assistant.preview.rejected'
  | 'assistant.request.error'

interface EmailAssistantTelemetryPayload {
  action?: string
  success?: boolean
  durationMs?: number
  error?: string
  mode?: string
}

export function trackEmailAssistantEvent(
  eventName: EmailAssistantEventName,
  payload: EmailAssistantTelemetryPayload = {}
) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('email-assistant-telemetry', {
      detail: {
        event: eventName,
        ...payload,
        timestamp: Date.now()
      }
    })
  )
}
