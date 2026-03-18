import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EmailApiService } from '../services/EmailApiService'
import { trackEmailAssistantEvent } from '../utils/emailAssistantTelemetry'
import type {
  EmailAssistantDraft,
  EmailAssistantDraftRequest,
  EmailAssistantReplySuggestRequest,
  EmailAssistantResponse,
  EmailAssistantRewriteRequest,
  EmailAssistantTemperatureCheckRequest
} from '../types'

type AssistantAction = 'draft' | 'rewrite' | 'replySuggest' | 'temperatureCheck'

interface LastActionPayload {
  action: AssistantAction
  payload:
    | EmailAssistantDraftRequest
    | EmailAssistantRewriteRequest
    | EmailAssistantReplySuggestRequest
    | EmailAssistantTemperatureCheckRequest
}

const TEMPERATURE_DEBOUNCE_MS = 700

function mergeAssistantResponse(
  previous: EmailAssistantResponse | null,
  next: EmailAssistantResponse
): EmailAssistantResponse {
  return {
    draft: next.draft ?? previous?.draft ?? null,
    insights: next.insights ?? previous?.insights ?? null,
    temperatureCheck: next.temperatureCheck ?? previous?.temperatureCheck ?? null,
    meta: next.meta ?? previous?.meta ?? null,
    missingContextPrompts:
      next.missingContextPrompts.length > 0 ? next.missingContextPrompts : (previous?.missingContextPrompts ?? [])
  }
}

export function useEmailAssistant(enabled: boolean) {
  const [isCapabilitiesLoading, setIsCapabilitiesLoading] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState<Record<AssistantAction, boolean>>({
    draft: false,
    rewrite: false,
    replySuggest: false,
    temperatureCheck: false
  })
  const [latestOutput, setLatestOutput] = useState<EmailAssistantResponse | null>(null)
  const [previewDraft, setPreviewDraft] = useState<EmailAssistantDraft | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastRequestAt, setLastRequestAt] = useState<number | null>(null)
  const [autoTemperatureCheck, setAutoTemperatureCheck] = useState(false)
  const [lastFailedAction, setLastFailedAction] = useState<LastActionPayload | null>(null)

  const controllersRef = useRef<Partial<Record<AssistantAction | 'capabilities', AbortController>>>({})
  const temperatureDebounceRef = useRef<ReturnType<typeof setTimeout>>()

  const clearPreviewDraft = useCallback(() => {
    setPreviewDraft(null)
  }, [])

  const setPreviewDraftOverride = useCallback((draft: EmailAssistantDraft) => {
    setPreviewDraft(draft)
    setLatestOutput(previous => {
      if (!previous) {
        return {
          draft,
          insights: null,
          temperatureCheck: null,
          meta: null,
          missingContextPrompts: []
        }
      }
      return { ...previous, draft }
    })
  }, [])

  const applyResponse = useCallback((action: AssistantAction, response: EmailAssistantResponse) => {
    setLatestOutput(previous => {
      const merged = mergeAssistantResponse(previous, response)

      // Temperature-check responses often don't include insights.
      // In that case, avoid showing stale insight data from older requests.
      if (action === 'temperatureCheck' && response.insights === null) {
        return { ...merged, insights: null }
      }

      return merged
    })
    if (response.draft) {
      setPreviewDraft(response.draft)
    }
  }, [])

  const runAction = useCallback(
    async <TPayload extends LastActionPayload['payload']>(
      action: AssistantAction,
      payload: TPayload,
      requestFn: (signal: AbortSignal) => Promise<EmailAssistantResponse>
    ): Promise<EmailAssistantResponse | null> => {
      if (!enabled || !isEnabled) return null

      controllersRef.current[action]?.abort()
      const controller = new AbortController()
      controllersRef.current[action] = controller

      setLoading(prev => ({ ...prev, [action]: true }))
      setLastError(null)
      setLastRequestAt(Date.now())
      const startedAt = performance.now()

      try {
        const response = await requestFn(controller.signal)
        applyResponse(action, response)
        setLastFailedAction(null)
        trackEmailAssistantEvent(`assistant.${action}` as const, {
          action,
          success: true,
          durationMs: Math.max(0, Math.round(performance.now() - startedAt))
        })
        return response
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return null
        }
        const message = error instanceof Error ? error.message : 'Assistant request failed'
        setLastError(message)
        setLastFailedAction({ action, payload })
        trackEmailAssistantEvent('assistant.request.error', {
          action,
          success: false,
          durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
          error: message
        })
        return null
      } finally {
        setLoading(prev => ({ ...prev, [action]: false }))
      }
    },
    [applyResponse, enabled, isEnabled]
  )

  const fetchCapabilities = useCallback(async () => {
    if (!enabled) return

    controllersRef.current.capabilities?.abort()
    const controller = new AbortController()
    controllersRef.current.capabilities = controller

    setIsCapabilitiesLoading(true)
    setLastError(null)
    try {
      const capabilities = await EmailApiService.getAssistantCapabilities({ signal: controller.signal })
      setIsEnabled(capabilities.enabled)
      if (capabilities.enabled) {
        trackEmailAssistantEvent('assistant.open')
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setIsEnabled(false)
        setLastError(error instanceof Error ? error.message : 'Failed to load assistant capabilities')
      }
    } finally {
      setIsCapabilitiesLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setIsEnabled(false)
      return
    }
    void fetchCapabilities()
  }, [enabled, fetchCapabilities])

  const generateDraft = useCallback(
    async (payload: EmailAssistantDraftRequest) =>
      runAction('draft', payload, signal => EmailApiService.generateAssistantDraft(payload, { signal })),
    [runAction]
  )

  const rewriteDraft = useCallback(
    async (payload: EmailAssistantRewriteRequest) =>
      runAction('rewrite', payload, signal => EmailApiService.rewriteAssistantDraft(payload, { signal })),
    [runAction]
  )

  const suggestReply = useCallback(
    async (payload: EmailAssistantReplySuggestRequest) =>
      runAction('replySuggest', payload, signal => EmailApiService.suggestAssistantReply(payload, { signal })),
    [runAction]
  )

  const runTemperatureCheck = useCallback(
    async (payload: EmailAssistantTemperatureCheckRequest) =>
      runAction('temperatureCheck', payload, signal =>
        EmailApiService.runAssistantTemperatureCheck(payload, { signal })
      ),
    [runAction]
  )

  const runDebouncedTemperatureCheck = useCallback(
    (payload: EmailAssistantTemperatureCheckRequest) => {
      if (!autoTemperatureCheck) return
      if (temperatureDebounceRef.current) clearTimeout(temperatureDebounceRef.current)
      temperatureDebounceRef.current = setTimeout(() => {
        void runTemperatureCheck(payload)
      }, TEMPERATURE_DEBOUNCE_MS)
    },
    [autoTemperatureCheck, runTemperatureCheck]
  )

  const retryLastAction = useCallback(async () => {
    if (!lastFailedAction) return null
    if (lastFailedAction.action === 'draft')
      return generateDraft(lastFailedAction.payload as EmailAssistantDraftRequest)
    if (lastFailedAction.action === 'rewrite')
      return rewriteDraft(lastFailedAction.payload as EmailAssistantRewriteRequest)
    if (lastFailedAction.action === 'replySuggest')
      return suggestReply(lastFailedAction.payload as EmailAssistantReplySuggestRequest)
    return runTemperatureCheck(lastFailedAction.payload as EmailAssistantTemperatureCheckRequest)
  }, [generateDraft, lastFailedAction, rewriteDraft, runTemperatureCheck, suggestReply])

  const cancelAction = useCallback((action: AssistantAction) => {
    controllersRef.current[action]?.abort()
  }, [])

  const cancelAll = useCallback(() => {
    controllersRef.current.capabilities?.abort()
    controllersRef.current.draft?.abort()
    controllersRef.current.rewrite?.abort()
    controllersRef.current.replySuggest?.abort()
    controllersRef.current.temperatureCheck?.abort()
  }, [])

  useEffect(() => cancelAll, [cancelAll])

  useEffect(
    () => () => {
      if (temperatureDebounceRef.current) clearTimeout(temperatureDebounceRef.current)
    },
    []
  )

  const isAnyLoading = useMemo(
    () => isCapabilitiesLoading || loading.draft || loading.rewrite || loading.replySuggest || loading.temperatureCheck,
    [isCapabilitiesLoading, loading.draft, loading.replySuggest, loading.rewrite, loading.temperatureCheck]
  )

  return {
    isEnabled,
    isCapabilitiesLoading,
    loading,
    isAnyLoading,
    latestOutput,
    previewDraft,
    lastError,
    lastRequestAt,
    autoTemperatureCheck,
    setAutoTemperatureCheck,
    clearPreviewDraft,
    setPreviewDraftOverride,
    fetchCapabilities,
    generateDraft,
    rewriteDraft,
    suggestReply,
    runTemperatureCheck,
    runDebouncedTemperatureCheck,
    retryLastAction,
    cancelAction,
    cancelAll
  }
}
