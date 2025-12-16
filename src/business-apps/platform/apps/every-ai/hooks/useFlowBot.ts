import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { ConversationTurn, OutputItem, FileMeta, CurrentPageContext } from '../types/models'
import { getCurrentPageContext } from '../utils/pageContext'
import { usePageAnalytics } from '@/page-analitics/hooks/usePageAnalytics'
import { prepareCurrentPageContext } from '@/page-analitics/send/page-analytics'
import { env } from '@/common/env/EnvUtils'

const STORAGE_KEY = 'newwork_every_ai'
const LLM_MODEL = 'gpt-4.1'
const SUBMITTING_FORM_MESSAGE = 'Submitting form data...'
const DEFAULT_FLOWBOT_BASE_URL = 'https://newwork-dev.newwork.com'

function resolveFlowbotBaseUrl(): string {
  return env('NEXT_PUBLIC_FLOWBOT_ENDPOINT') || env('NEXT_PUBLIC_BASE_URL') || DEFAULT_FLOWBOT_BASE_URL
}

const FLOWBOT_BASE_URL = resolveFlowbotBaseUrl()

type ConversationState = {
  conversation: ConversationTurn[]
  sessionId: string | null
}

function appendOutputToConversation(conversation: ConversationTurn[], output: OutputItem) {
  const lastTurn = conversation[conversation.length - 1]
  if (lastTurn && lastTurn.side === 'agent') {
    lastTurn.outputs.push(output)
  } else {
    conversation.push({ side: 'agent', outputs: [output] })
  }
}

// Handle SSE frames for streaming response
function processSSEFrame(
  frame: string,
  appendOutputItemToLastAgentTurn: (output: OutputItem) => void,
  updateSessionId: (sid: string) => void,
  setState: (updater: (prev: ConversationState) => ConversationState) => void
) {
  let event = 'message'
  let data = ''
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data += line.slice(5)
  }

  if (event === 'output-item') {
    try {
      const newOutput = JSON.parse(data) as OutputItem
      appendOutputItemToLastAgentTurn(newOutput)
      setState(prevState => ({ ...prevState }))
    } catch (err) {
      console.error('Failed to parse output item:', err)
    }
  } else if (event === 'session-id') {
    updateSessionId(JSON.parse(data) as string)
  } else {
    console.warn('Received unknown event type:', event)
  }
}

function saveState(state: ConversationState) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId: state.sessionId }))
  }
}

function loadState(): ConversationState {
  if (typeof window === 'undefined') return { conversation: [], sessionId: null }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { conversation: [], sessionId: null }
    }
    const sessionId = JSON.parse(raw).sessionId

    return { conversation: [], sessionId }
  } catch {
    return { conversation: [], sessionId: null }
  }
}

async function loadHistory(accessToken: string, sessionId: string | null): Promise<ConversationState> {
  if (!sessionId) return { conversation: [], sessionId: null }

  try {
    const res = await fetch(`${FLOWBOT_BASE_URL}/flowbot/api/agent/session/${sessionId}/history`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    })

    if (!res.ok) throw new Error(res.statusText)

    const payload = await res.json()

    const backendConversation: any[] = Array.isArray(payload?.conversation) ? payload.conversation : []

    const historyState: ConversationState = {
      conversation: [],
      sessionId
    }

    // Process conversation history
    const submissions: Record<string, any> = Object.create(null)
    type TypedItem = { kind: 'user'; turn: ConversationTurn } | { kind: 'frame'; frame: string }
    const items: TypedItem[] = []

    for (let i = backendConversation.length - 1; i >= 0; i--) {
      const item: any = backendConversation[i]
      if (!item || typeof item !== 'object') continue

      if (item.type === 'user_input') {
        let text = typeof item.text === 'string' ? item.text : ''
        try {
          const parsed = JSON.parse(text)
          if (parsed && parsed.action === 'form_submission' && typeof parsed.uuid === 'string') {
            text = SUBMITTING_FORM_MESSAGE
            submissions[parsed.uuid] = parsed.data ?? {}
          }
        } catch {}

        const rawFiles = Array.isArray(item.files) ? item.files : []
        const files: FileMeta[] = rawFiles.map((f: any) => ({
          id: typeof f?.id === 'string' ? f.id : uuidv4(),
          name: typeof f?.name === 'string' ? f.name : 'file',
          size: typeof f?.size === 'number' ? f.size : 0,
          type: typeof f?.type === 'string' ? f.type : ''
        }))

        items.unshift({
          kind: 'user',
          turn: {
            side: 'user',
            text,
            files
          }
        })
        continue
      }

      let obj = item
      if (obj.type === 'flow_proposal' && typeof obj.uuid === 'string' && submissions[obj.uuid]) {
        const currentArgs = obj.arguments ?? {}
        const submitted = submissions[obj.uuid]
        obj = {
          ...obj,
          arguments: {
            ...currentArgs,
            flow: { ...(currentArgs.flow ?? {}), ...(submitted.flow ?? {}) },
            task: { ...(currentArgs.task ?? {}), ...(submitted.task ?? {}) }
          }
        }
      }

      const frame = `event: output-item\ndata: ${JSON.stringify(obj)}\n\n`
      items.unshift({ kind: 'frame', frame })
    }

    items.forEach(p => {
      if (p.kind === 'user') {
        historyState.conversation.push(p.turn)
      } else {
        processSSEFrame(
          p.frame,
          output => {
            appendOutputToConversation(historyState.conversation, output)
          },
          sid => {
            historyState.sessionId = sid
          },
          (() => {}) as unknown as (updater: (prev: ConversationState) => ConversationState) => void
        )
      }
    })

    // Cleanup: prune ephemeral tool outputs from history so reasoning steps are hidden
    try {
      historyState.conversation = historyState.conversation.map(turn => {
        if (turn.side !== 'agent') return turn
        const outputs = Array.isArray((turn as any).outputs) ? (turn as any).outputs : []
        const hasNonTool = outputs.some((o: any) => o && o.type && o.type !== 'tool')
        if (!hasNonTool) return turn
        return {
          ...turn,
          outputs: outputs.filter((o: any) => o?.type !== 'tool')
        }
      })
    } catch {}

    return historyState
  } catch (error) {
    console.error('Failed to load FlowBot history:', error)
    return { conversation: [], sessionId }
  }
}

/**
 * Upload files to FlowBot using the async /add_files endpoint.
 * Returns the (possibly new) sessionId that should be used for subsequent chat calls.
 * This is used both for "upload early" flows and as a fallback inside sendMessage.
 */
async function uploadFilesToFlowbotSession(
  files: File[],
  sessionId: string | null,
  accessToken: string
): Promise<string> {
  if (!files.length) return sessionId ?? ''

  const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  const baseUrl = isLocalDev ? 'http://localhost:8000' : FLOWBOT_BASE_URL
  const url = `${baseUrl}/flowbot/api/agent/add_files`

  const form = new FormData()
  files.forEach(file => form.append('files', file))
  form.append('session_id', sessionId ?? '')

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: form
  })

  if (!res.ok) {
    throw new Error(`add_files failed: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  return (data?.sessionId as string | undefined) ?? sessionId ?? ''
}

type AnalyticsEntityInput = {
  type: string
  id: string
  name?: string
}

const ANALYTICS_ENTITY_MAP: Record<string, string> = {
  // IRM entities
  investment: 'investment',
  investment_account: 'investment_account',
  investment_contact: 'investment_contact',
  investment_lead: 'investment_lead',
  investment_opportunity: 'investment_opportunity',
  // CRM entities
  account: 'account',
  contact: 'contact',
  lead: 'lead',
  opportunity: 'opportunity'
}

function resolveAnalyticsEntity(context: CurrentPageContext): AnalyticsEntityInput | null {
  if (context.type !== 'entity' || !context.id) {
    return null
  }

  const mappedType = ANALYTICS_ENTITY_MAP[context.entity_name ?? ''] || context.entity_name || 'unknown'

  if (!mappedType || mappedType === 'unknown') {
    return null
  }

  return {
    type: mappedType,
    id: context.id,
    name: context.entity_name
  }
}

export function useFlowBot(accessToken: string) {
  const rawPageContext = getCurrentPageContext()
  const currentPageContext = useMemo(() => rawPageContext, [JSON.stringify(rawPageContext)])

  const [state, setState] = useState<ConversationState>(loadState)
  const [isLoading, setIsLoading] = useState(false)
  const lastFetchedSessionIdRef = useRef<string | null>(null)
  const [prechatSuggestions, setPrechatSuggestions] = useState<string[]>([])
  const [isPrechatLoading, setIsPrechatLoading] = useState(false)
  const isPrechatLoadingRef = useRef(false)
  const inFlightRef = useRef(false)

  const analyticsEntity = useMemo(() => resolveAnalyticsEntity(currentPageContext), [currentPageContext])
  const analyticsHookEntity = useMemo<AnalyticsEntityInput>(
    () => analyticsEntity ?? { type: 'unknown', id: '' },
    [analyticsEntity]
  )

  const { getPageAnalyticsContext, resetAnalytics, collectAnalytics } = usePageAnalytics({
    entity: analyticsHookEntity,
    accessToken,
    sessionId: state.sessionId ?? undefined
  })

  useEffect(() => saveState(state), [state])

  useEffect(() => {
    if (!accessToken) return
    if (!analyticsEntity?.id || analyticsEntity.type === 'unknown') return

    collectAnalytics().catch(error => {
      console.error('Failed to prefetch page analytics:', error)
    })
  }, [accessToken, analyticsEntity, collectAnalytics])

  const nextStepProposals = useMemo(() => {
    if (state.conversation.length === 0) {
      return prechatSuggestions
    }
    // Find last agent turn (reverse find)
    for (let i = state.conversation.length - 1; i >= 0; i--) {
      const turn = state.conversation[i]
      if (turn.side === 'agent') {
        const answerOutput = turn.outputs.find((output: OutputItem) => output.type === 'answer')
        if (answerOutput && answerOutput.type === 'answer') {
          return answerOutput.nextStepProposals ?? []
        }
      }
    }
    return []
  }, [state.conversation, prechatSuggestions])

  const pushTurn = useCallback((turn: ConversationTurn) => {
    setState(prev => ({ ...prev, conversation: [...prev.conversation, turn] }))
  }, [])

  const updateSessionId = useCallback(
    (newSessionId: string) => {
      setState(prev => ({ ...prev, sessionId: newSessionId }))
      resetAnalytics(newSessionId)
    },
    [resetAnalytics]
  )

  const buildCurrentPageContextPayload = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const route = typeof window !== 'undefined' ? window.location.pathname : ''

    const baseCurrentPage = {
      url,
      route,
      view: undefined as string | undefined,
      type: currentPageContext.type,
      entity_name:
        currentPageContext.type === 'entity' || currentPageContext.type === 'overview'
          ? currentPageContext.entity_name
          : undefined,
      id: currentPageContext.type === 'entity' ? currentPageContext.id : undefined
    }

    if (analyticsEntity?.id && analyticsEntity.type !== 'unknown') {
      try {
        // Add timeout to prevent blocking (2 seconds max)
        const analyticsPromise = getPageAnalyticsContext(baseCurrentPage)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Analytics timeout')), 2000)
        )

        return await Promise.race([analyticsPromise, timeoutPromise])
      } catch (error) {
        console.warn('⚠️ [EveryAI] Analytics enrichment failed or timed out, using basic context:', error)
        // Fall through to basic context
      }
    }

    return prepareCurrentPageContext({
      currentPage: baseCurrentPage
    })
  }, [analyticsEntity, currentPageContext, getPageAnalyticsContext])

  const appendOutputItemToLastAgentTurn = useCallback((outputItem: OutputItem) => {
    setState(prevState => {
      const newConversation = JSON.parse(JSON.stringify(prevState.conversation))

      const lastAgentTurnIndex = newConversation.length - 1

      if (lastAgentTurnIndex < 0 || newConversation[lastAgentTurnIndex].side !== 'agent') {
        const outputs = outputItem.type === 'loading' ? [outputItem] : [outputItem]
        newConversation.push({ side: 'agent', outputs })
      } else {
        const existingOutputs = [...(newConversation[lastAgentTurnIndex].outputs || [])]

        if (existingOutputs.length > 0 && existingOutputs[existingOutputs.length - 1]?.type === 'loading') {
          existingOutputs.pop()
        }

        newConversation[lastAgentTurnIndex] = {
          ...newConversation[lastAgentTurnIndex],
          outputs: [...existingOutputs, outputItem]
        }
      }

      const newState = {
        ...prevState,
        conversation: newConversation
      }

      saveState(newState)

      return newState
    })
  }, [])

  const pruneEphemeralOutputsFromLastAgentTurn = useCallback(() => {
    setState(prevState => {
      const newConversation = JSON.parse(JSON.stringify(prevState.conversation))
      for (let i = newConversation.length - 1; i >= 0; i--) {
        if (newConversation[i]?.side === 'agent') {
          const outputs = newConversation[i]?.outputs || []
          newConversation[i] = {
            ...newConversation[i],
            outputs: outputs.filter((o: OutputItem) => o?.type !== 'tool')
          }
          break
        }
      }

      const newState = { ...prevState, conversation: newConversation }
      saveState(newState)
      return newState
    })
  }, [])

  useEffect(() => {
    if (!accessToken) return
    if (state.conversation.length > 0) return

    const sessionToFetch = state.sessionId ?? null
    if (lastFetchedSessionIdRef.current === sessionToFetch) return

    let isCancelled = false

    const fetchHistory = async () => {
      setIsLoading(true)
      try {
        const history = await loadHistory(accessToken, sessionToFetch)
        if (isCancelled) return

        setState(history)
        lastFetchedSessionIdRef.current = history.sessionId ?? null
      } catch (error) {
        if (!isCancelled) {
          console.error('Unexpected error while fetching FlowBot history:', error)
        }
      } finally {
        if (!isCancelled) setIsLoading(false)
      }
    }

    fetchHistory()

    return () => {
      isCancelled = true
      setIsLoading(false)
    }
  }, [accessToken, state.sessionId, state.conversation.length])

  const sendMessage = useCallback(
    async (
      userInputText: string,
      files: File[],
      isThinking: boolean = false,
      isSearching: boolean = false,
      mentions?: Array<{ id: string; typeKey: string; display: string; raw?: any; start?: number; end?: number }>
    ) => {
      if (!userInputText.trim() && files.length === 0) return
      if (inFlightRef.current) return

      try {
        inFlightRef.current = true
        setIsLoading(true)

        let displayMessage = userInputText
        try {
          const parsedMessage = JSON.parse(userInputText)
          if (parsedMessage && parsedMessage.action === 'form_submission') {
            displayMessage = SUBMITTING_FORM_MESSAGE
          }
        } catch {
          // Not JSON, use original message
        }

        const fileMetas: FileMeta[] = files.map(f => ({ id: uuidv4(), name: f.name, size: f.size, type: f.type }))
        const normalizedMentions = (mentions || []).map(m => ({
          id: m.id,
          type: m.typeKey,
          display: m.display,
          offsets:
            typeof m.start === 'number' && typeof m.end === 'number' ? { start: m.start, end: m.end } : undefined,
          data: m.raw
        }))

        pushTurn({ side: 'user', text: displayMessage, files: fileMetas, mentions: normalizedMentions })

        pushTurn({ side: 'agent', outputs: [{ type: 'loading' }] })

        // Prefer using /add_files when there is no active session yet.
        // This enables async parsing for the very first message in a new chat.
        let effectiveSessionId = state.sessionId ?? ''
        if (!effectiveSessionId && files.length > 0) {
          try {
            effectiveSessionId = await uploadFilesToFlowbotSession(files, effectiveSessionId, accessToken)
          } catch (error) {
            console.error('⚠️ [FlowBot] add_files failed, falling back to direct file upload:', error)
            // If add_files fails we keep effectiveSessionId empty and will send files directly with the chat request.
          }
        }

        const form = new FormData()
        form.append('session_id', effectiveSessionId)
        form.append('user_input_text', userInputText)
        form.append('llm_model', isThinking ? 'o4-mini' : LLM_MODEL)
        form.append('use_web_search_tool', (isSearching ?? false).toString())

        const currentPagePayload = await buildCurrentPageContextPayload()
        form.append('current_page_context', JSON.stringify(currentPagePayload))

        if (mentions && mentions.length > 0) {
          const enriched = mentions.map(m => ({
            id: m.id,
            type: m.typeKey,
            display: m.display,
            data: m.raw,
            offsets:
              typeof m.start === 'number' && typeof m.end === 'number' ? { start: m.start, end: m.end } : undefined
          }))
          form.append('mentions', JSON.stringify(enriched))
        }

        files.forEach(file => form.append('files', file))

        // Use local FlowBot in development
        const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        const baseUrl = isLocalDev ? 'http://localhost:8000' : FLOWBOT_BASE_URL
        const url = `${baseUrl}/flowbot/api/agent/v2/chat`

        // Debug log only in development
        if (isLocalDev) {
          console.log('📤 [FlowBot] Sending to local:', userInputText.substring(0, 50))
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'text/event-stream'
          },
          body: form
        })

        if (!res.ok) throw new Error(res.statusText)
        if (!res.body) throw new Error('No body in streaming response')

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()

        let buf = ''

        const flushFrame = (frame: string) => {
          let event = 'message'
          let data = ''
          for (const rawLine of frame.split('\n')) {
            const line = rawLine.replace(/\r$/, '')
            if (line.startsWith('event:')) event = line.slice(6).trim()
            else if (line.startsWith('data:')) data += line.slice(5).trimStart()
          }

          if (event === 'output-item') {
            try {
              const newOutput = JSON.parse(data) as OutputItem
              appendOutputItemToLastAgentTurn(newOutput)
              if (newOutput.type !== 'tool') {
                pruneEphemeralOutputsFromLastAgentTurn()
              }
            } catch (err) {
              console.error('Failed to parse output item:', err)
            }
          } else if (event === 'session-id') {
            const cleaned = data.trim()
            updateSessionId(JSON.parse(cleaned) as string)
          } else {
            console.warn('Received unknown event type:', event)
          }
        }

        while (true) {
          const { value, done } = await reader.read()
          if (done) {
            break
          }

          buf += value

          const parts = buf.split('\n\n')
          buf = parts.pop() ?? ''

          parts.forEach(part => {
            flushFrame(part)
          })
        }
        pruneEphemeralOutputsFromLastAgentTurn()
      } catch (error) {
        console.error('Error sending message:', error)

        appendOutputItemToLastAgentTurn({ type: 'error' })
      } finally {
        pruneEphemeralOutputsFromLastAgentTurn()
        inFlightRef.current = false
        setIsLoading(false)
      }
    },
    [
      accessToken,
      pushTurn,
      state.sessionId,
      appendOutputItemToLastAgentTurn,
      pruneEphemeralOutputsFromLastAgentTurn,
      updateSessionId,
      buildCurrentPageContextPayload
    ]
  )

  const fetchPrechatSuggestions = useCallback(async () => {
    if (state.conversation.length > 0 || isPrechatLoadingRef.current) return

    try {
      isPrechatLoadingRef.current = true
      setPrechatSuggestions([])
      setIsPrechatLoading(true)

      const form = new FormData()
      // For prechat suggestions we only need lightweight page context without analytics
      const url = typeof window !== 'undefined' ? window.location.href : ''
      const route = typeof window !== 'undefined' ? window.location.pathname : ''
      const baseCurrentPage = {
        url,
        route,
        view: undefined as string | undefined,
        type: currentPageContext.type,
        entity_name:
          currentPageContext.type === 'entity' || currentPageContext.type === 'overview'
            ? currentPageContext.entity_name
            : undefined,
        id: currentPageContext.type === 'entity' ? currentPageContext.id : undefined
      }
      const prechatContext = prepareCurrentPageContext({
        currentPage: baseCurrentPage
      })
      form.append('current_page_context', JSON.stringify(prechatContext))

      // Add timeout to prevent long waits
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

      const res = await fetch(`${FLOWBOT_BASE_URL}/flowbot/api/agent/prechat-suggestions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: form,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        throw new Error(`Failed to fetch prechat suggestions: ${res.statusText}`)
      }

      const data = await res.json()
      const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : []

      setPrechatSuggestions(suggestions.slice(0, 4))
    } catch (error) {
      console.error('Failed to fetch prechat suggestions:', error)
      // Silently fail - no suggestions is better than showing loading forever
      setPrechatSuggestions([])
    } finally {
      setIsPrechatLoading(false)
      isPrechatLoadingRef.current = false
    }
  }, [accessToken, currentPageContext, state.conversation.length])

  const clearConversation = useCallback(() => {
    setState({ conversation: [], sessionId: null })
    resetAnalytics()
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY)
    setPrechatSuggestions([])
    isPrechatLoadingRef.current = false
    setTimeout(() => {
      fetchPrechatSuggestions()
    }, 100)
  }, [fetchPrechatSuggestions, resetAnalytics])

  useEffect(() => {
    if (state.conversation.length === 0 && accessToken) {
      fetchPrechatSuggestions()
    } else if (state.conversation.length > 0) {
      setPrechatSuggestions([])
    }
  }, [state.conversation.length, accessToken, currentPageContext, fetchPrechatSuggestions])

  /**
   * Pre-upload files for the current EveryAI session using /add_files.
   * This is called as soon as the user attaches files in the UI (before pressing Send).
   * If a new sessionId is created by the backend, we persist it via updateSessionId.
   */
  const attachFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return
      try {
        const newSessionId = await uploadFilesToFlowbotSession(files, state.sessionId, accessToken)
        if (newSessionId && newSessionId !== state.sessionId) {
          updateSessionId(newSessionId)
        }
      } catch (error) {
        // Do not block the UI if pre-upload fails; sendMessage will still work via fallback.
        console.error('⚠️ [FlowBot] Failed to pre-upload files via add_files:', error)
      }
    },
    [accessToken, state.sessionId, updateSessionId]
  )

  return {
    conversation: state.conversation,
    isLoading,
    sendMessage,
    attachFiles,
    clearConversation,
    nextStepProposals,
    isPrechatLoading
  }
}
