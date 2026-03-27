import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { ConversationTurn, OutputItem, FileMeta, CurrentPageContext } from '../types/models'
import { getCurrentPageContext } from '../utils/pageContext'
import { usePageAnalytics } from '@/page-analitics/hooks/usePageAnalytics'
import { prepareCurrentPageContext } from '@/page-analitics/send/page-analytics'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'

const STORAGE_KEY = 'newwork_every_ai'
const LLM_MODEL = 'gpt-4.1'
const SUBMITTING_FORM_MESSAGE = 'Submitting form data...'
const PRECHAT_CACHE_PREFIX = 'everyai_prechat_cache'
const PRECHAT_CACHE_TTL_MS = 10 * 60 * 1000
const PRECHAT_MIN_REFETCH_MS = 3000
const PRECHAT_LLM_MODEL = LLM_MODEL
const DOCUMENT_REALTIME_EDIT_INTENT_PATTERN =
  /\b(edit|rewrite|revise|improve|fix|update|rephrase|shorten|expand|draft|polish|refine)\b/i
const DOCUMENT_UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

type PrechatCacheEntry = {
  suggestions: string[]
  createdAt: number
}

const prechatMemoryCache = new Map<string, PrechatCacheEntry>()

function buildPrechatContextKey(context: CurrentPageContext): string {
  if (context.type === 'entity') {
    return `entity:${context.entity_name}:${context.id}`
  }
  if (context.type === 'overview') {
    return `overview:${context.entity_name}`
  }
  const url = context.url ?? ''
  try {
    const parsed = new URL(url)
    return `unknown:${parsed.pathname}${parsed.search}`
  } catch {
    return `unknown:${url}`
  }
}

function getPrechatStorageKey(cacheKey: string): string {
  return `${PRECHAT_CACHE_PREFIX}:${cacheKey}`
}

function readPrechatCache(cacheKey: string): PrechatCacheEntry | null {
  const memoryEntry = prechatMemoryCache.get(cacheKey)
  if (memoryEntry) {
    return memoryEntry
  }
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(getPrechatStorageKey(cacheKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PrechatCacheEntry
    if (!Array.isArray(parsed?.suggestions) || typeof parsed?.createdAt !== 'number') {
      return null
    }
    prechatMemoryCache.set(cacheKey, parsed)
    return parsed
  } catch {
    return null
  }
}

function writePrechatCache(cacheKey: string, entry: PrechatCacheEntry) {
  prechatMemoryCache.set(cacheKey, entry)
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(getPrechatStorageKey(cacheKey), JSON.stringify(entry))
  } catch {}
}

function isPrechatCacheFresh(entry: PrechatCacheEntry): boolean {
  return Date.now() - entry.createdAt < PRECHAT_CACHE_TTL_MS
}

type ConversationState = {
  conversation: ConversationTurn[]
  sessionId: string | null
}

type UseFlowBotOptions = {
  isActive?: boolean
}

type RealtimeDocumentContext = {
  type?: string
  entity_name?: string
  id?: string
}

type DocumentStreamCompleteOutputItem = Extract<OutputItem, { type: 'document_stream_complete' }>

const HIDDEN_DOCUMENT_STREAM_OUTPUT_TYPES = new Set<OutputItem['type']>([
  'document_stream_start',
  'document_stream_chunk',
  'document_stream_complete'
])

function shouldHideDocumentStreamOutput(output: OutputItem): boolean {
  return HIDDEN_DOCUMENT_STREAM_OUTPUT_TYPES.has(output.type)
}

function buildRealtimeDocumentProgressOutput(documentId: string): OutputItem {
  return {
    type: 'answer',
    displayData: [
      {
        type: 'textBlock',
        text: `I started updating document ${documentId} in real time. Keep the document tab open to see live changes.`
      }
    ],
    nextStepProposals: []
  }
}

function buildRealtimeDocumentCompleteOutput(output: DocumentStreamCompleteOutputItem): OutputItem {
  const summary = output.change_summary?.trim()
  const baseMessage = output.changed
    ? 'Document update is complete and applied successfully.'
    : 'Document update finished. No content changes were required.'

  return {
    type: 'answer',
    displayData: [
      {
        type: 'textBlock',
        text: summary ? `${baseMessage}\n\n${summary}` : baseMessage
      }
    ],
    nextStepProposals: []
  }
}

function extractDocumentIdFromText(userInputText: string): string | null {
  if (!userInputText) return null

  const uriMatch = /document:\/\/([0-9a-f-]{36})/i.exec(userInputText)
  if (uriMatch?.[1] && DOCUMENT_UUID_PATTERN.test(uriMatch[1])) {
    return uriMatch[1]
  }

  const docPrefixMatch = /\bdoc(?:ument)?\s+([0-9a-f-]{36})/i.exec(userInputText)
  if (docPrefixMatch?.[1] && DOCUMENT_UUID_PATTERN.test(docPrefixMatch[1])) {
    return docPrefixMatch[1]
  }

  const genericMatch = DOCUMENT_UUID_PATTERN.exec(userInputText)
  return genericMatch?.[0] || null
}

function resolveRealtimeDocumentId(params: {
  userInputText: string
  currentPagePayload: RealtimeDocumentContext
  hasFiles: boolean
  isThinking: boolean
  isSearching: boolean
}): string | null {
  const { userInputText, currentPagePayload, hasFiles, isThinking, isSearching } = params
  if (hasFiles || isThinking || isSearching) return null
  if (!DOCUMENT_REALTIME_EDIT_INTENT_PATTERN.test(userInputText || '')) return null
  if (
    currentPagePayload?.type === 'entity' &&
    currentPagePayload?.entity_name === 'document' &&
    typeof currentPagePayload?.id === 'string' &&
    currentPagePayload.id.trim().length > 0
  ) {
    return currentPagePayload.id
  }

  return extractDocumentIdFromText(userInputText)
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
      if (shouldHideDocumentStreamOutput(newOutput)) return
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId: state.sessionId }))
      if (state.sessionId) {
        console.log('[FlowBot] Saved session to localStorage:', state.sessionId)
      }
    } catch (error) {
      console.warn('[FlowBot] Failed to save session state to localStorage:', error)
    }
  }
}

function isValidSessionId(sessionId: string | null): boolean {
  return sessionId !== null && sessionId.trim().length > 0
}

function clearInvalidSession(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY)
      console.log('Cleared invalid session from localStorage')
    } catch (error) {
      console.warn('Failed to clear invalid session from localStorage:', error)
    }
  }
}

function getInitialSessionId(): string | null {
  if (typeof window === 'undefined') return null

  // Check environment variable first (for development/testing)
  // This allows overriding session ID via window.__FLOWBOT_SESSION_ID__
  if ((window as any).__FLOWBOT_SESSION_ID__) {
    const envSessionId = (window as any).__FLOWBOT_SESSION_ID__
    if (isValidSessionId(envSessionId)) {
      console.log('[FlowBot] Using session ID from environment:', envSessionId)
      return envSessionId
    }
  }

  // Fall back to localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      console.log('[FlowBot] No session found in localStorage, starting fresh')
      return null
    }
    const parsed = JSON.parse(raw)
    const sessionId = parsed.sessionId || null
    if (isValidSessionId(sessionId)) {
      console.log('[FlowBot] Restored session from localStorage:', sessionId)
      return sessionId
    } else {
      console.log('[FlowBot] Invalid session in localStorage, starting fresh')
      return null
    }
  } catch (error) {
    console.warn('[FlowBot] Failed to load session state from localStorage:', error)
    return null
  }
}

function loadState(): ConversationState {
  const sessionId = getInitialSessionId()
  return { conversation: [], sessionId }
}

async function loadHistory(accessToken: string, sessionId: string | null): Promise<ConversationState> {
  if (!isValidSessionId(sessionId)) {
    return { conversation: [], sessionId: null }
  }

  try {
    const baseUrl = resolveFlowbotBaseUrl()
    const res = await fetch(`${baseUrl}/flowbot/api/agent/session/${sessionId}/history`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    })

    // If session not found, clear invalid session from storage
    if (!res.ok) {
      if (res.status === 404) {
        console.warn('Session not found on server, clearing invalid session:', sessionId)
        clearInvalidSession()
        return { conversation: [], sessionId: null }
      }
      if (res.status === 401 || res.status === 403) {
        console.warn('Session unauthorized, clearing invalid session:', sessionId)
        clearInvalidSession()
        return { conversation: [], sessionId: null }
      }
      throw new Error(`${res.status} ${res.statusText}`)
    }

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

/** Response shape from GET /flowbot/chat/user/chats */
export interface FlowBotSession {
  id: string
  createdAt: string
  updatedAt: string
  lastMessageAt?: string
  messageCount: number
  title?: string
  shortInfo?: string
}

const CHAT_LIST_LIMIT = 50

/**
 * Fetch chat list from FlowBot: GET /flowbot/chat/user/chats?limit=...
 */
async function fetchChatListFromApi(accessToken: string, limit: number = CHAT_LIST_LIMIT): Promise<FlowBotSession[]> {
  try {
    const baseUrl = resolveFlowbotBaseUrl()
    const url = `${baseUrl}/flowbot/chat/user/chats?limit=${limit}`

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    })

    if (!res.ok) {
      console.warn('[FlowBot] Failed to fetch chat list:', res.status, res.statusText)
      return []
    }

    const payload = await res.json()
    const raw = Array.isArray(payload) ? payload : (payload?.chats ?? payload?.items ?? [])
    return raw
      .map((item: any) => ({
        id: item.session_id ?? item.sessionId ?? item.id ?? '',
        createdAt: item.created_at ?? item.createdAt ?? new Date().toISOString(),
        updatedAt: item.created_at ?? item.createdAt ?? new Date().toISOString(),
        lastMessageAt: item.updated_at ?? item.updatedAt ?? item.created_at ?? item.createdAt,
        messageCount: typeof item.message_count === 'number' ? item.message_count : 0,
        title: item.title ?? item.short_info ?? item.shortInfo,
        shortInfo: item.short_info ?? item.shortInfo ?? item.title
      }))
      .filter((s: FlowBotSession) => s.id)
  } catch (error) {
    console.warn('[FlowBot] Error fetching chat list:', error)
    return []
  }
}

/**
 * Get all FlowBot sessions for the current user (uses flowbot chat list API).
 */
async function getAllFlowBotSessions(accessToken: string): Promise<FlowBotSession[]> {
  return fetchChatListFromApi(accessToken, CHAT_LIST_LIMIT)
}

/**
 * Delete a chat session on the server: DELETE /flowbot/chat/sessions/:sessionId
 */
async function deleteChatSession(sessionId: string, accessToken: string): Promise<void> {
  try {
    const baseUrl = resolveFlowbotBaseUrl()
    const url = `${baseUrl}/flowbot/chat/sessions/${sessionId}`

    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: '*/*'
      }
    })

    if (!res.ok) {
      console.warn('[FlowBot] Failed to delete chat session:', res.status, res.statusText)
    }
  } catch (error) {
    console.error('[FlowBot] Error deleting chat session:', error)
  }
}

/**
 * Save user message to the server for persistence using the existing /chat/messages endpoint.
 * Content is stored as structured JSON so history restores with full fidelity.
 */
async function saveUserMessage(
  sessionId: string,
  userInputText: string,
  files: File[],
  mentions:
    | Array<{ id: string; typeKey: string; display: string; raw?: any; start?: number; end?: number }>
    | undefined,
  accessToken: string
): Promise<void> {
  try {
    const baseUrl = resolveFlowbotBaseUrl()
    const url = `${baseUrl}/flowbot/chat/messages`

    const fileMetas = files.map(f => ({
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      name: f.name,
      size: f.size,
      type: f.type
    }))

    const content: Record<string, any> = {
      type: 'user_input',
      text: userInputText,
      files: fileMetas
    }

    if (mentions && mentions.length > 0) {
      content.mentions = mentions
    }

    const requestBody = {
      session_id: sessionId,
      role: 'user',
      content,
      short_info: ''
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!res.ok) {
      console.warn('[FlowBot] Failed to save user message:', res.status, res.statusText)
    } else {
      console.log('[FlowBot] User message saved successfully')
    }
  } catch (error) {
    console.error('[FlowBot] Error saving user message:', error)
  }
}

/**
 * Save agent response to the server for persistence using the existing /chat/messages endpoint.
 * Stores the full OutputItem[] as JSONB so rich content (scatter plots, tables, entities)
 * is preserved and can be faithfully restored from chat history.
 */
async function saveAgentMessage(sessionId: string, outputs: OutputItem[], accessToken: string): Promise<void> {
  try {
    const baseUrl = resolveFlowbotBaseUrl()
    const url = `${baseUrl}/flowbot/chat/messages`

    const persistableOutputs = outputs.filter(o => o.type !== 'tool' && o.type !== 'loading')

    const requestBody = {
      session_id: sessionId,
      role: 'assistant',
      content: persistableOutputs,
      short_info: ''
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!res.ok) {
      console.warn('[FlowBot] Failed to save agent message:', res.status, res.statusText)
    } else {
      console.log('[FlowBot] Agent message saved successfully')
    }
  } catch (error) {
    console.error('[FlowBot] Error saving agent message:', error)
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

  const baseUrl = resolveFlowbotBaseUrl()
  const url = `${baseUrl}/flowbot/api/agent/add_files`

  const form = new FormData()
  files.forEach(file => form.append('files', file))
  // Always send session_id as string (empty if null) to match terminal client behavior
  form.append('session_id', sessionId || '')

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
  const returnedSessionId = data?.sessionId as string | undefined
  return isValidSessionId(returnedSessionId || null) ? returnedSessionId || '' : sessionId || ''
}

export type FlowProposalFileUploadHints = {
  endpoint?: string
  flowProposalIdParam?: string
  fieldKeyParam?: string
  sessionIdParam?: string
  fileParam?: string
}

export type FlowProposalFileBinding = {
  flowProposalId: string
  fieldKey: string
  hints?: FlowProposalFileUploadHints
}

async function uploadFilesToFlowbotWithBinding(params: {
  files: File[]
  sessionId: string | null
  accessToken: string
  binding: FlowProposalFileBinding
}): Promise<string> {
  const { files, sessionId, accessToken, binding } = params
  if (!files.length) return sessionId ?? ''

  const baseUrl = resolveFlowbotBaseUrl()

  const endpoint = binding.hints?.endpoint || '/flowbot/api/agent/add_files'
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  const sessionIdParam = binding.hints?.sessionIdParam || 'session_id'
  const fileParam = binding.hints?.fileParam || 'files'
  const flowProposalIdParam = binding.hints?.flowProposalIdParam || 'flow_proposal_id'
  const fieldKeyParam = binding.hints?.fieldKeyParam || 'field_key'

  const form = new FormData()
  files.forEach(file => form.append(fileParam, file))
  form.append(sessionIdParam, sessionId ?? '')
  form.append(flowProposalIdParam, binding.flowProposalId)
  form.append(fieldKeyParam, binding.fieldKey)

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

  const data = await res.json().catch(() => null)
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

export function useFlowBot(accessToken: string, options: UseFlowBotOptions = {}) {
  const rawPageContext = getCurrentPageContext()
  const currentPageContext = useMemo(() => rawPageContext, [JSON.stringify(rawPageContext)])
  const prechatContextKey = useMemo(() => buildPrechatContextKey(currentPageContext), [currentPageContext])
  const isActive = options.isActive ?? true

  const [state, setState] = useState<ConversationState>(loadState)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const sessionIdRef = useRef<string | null>(null)
  const lastFetchedSessionIdRef = useRef<string | null>(null)
  const [prechatSuggestions, setPrechatSuggestions] = useState<string[]>([])
  const [isPrechatLoading, setIsPrechatLoading] = useState(false)
  const isPrechatLoadingRef = useRef(false)
  const prechatAbortControllerRef = useRef<AbortController | null>(null)
  const prechatRequestRef = useRef<{
    cacheKey: string
    startedAt: number
    status: 'pending' | 'success' | 'error' | 'aborted'
  } | null>(null)
  const prechatDiagnosticsRef = useRef<{
    cacheKey: string
    startedAt: number
    durationMs?: number
    status?: 'success' | 'error' | 'aborted'
  } | null>(null)
  const isActiveRef = useRef(isActive)
  const inFlightRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [cancelledMessageText, setCancelledMessageText] = useState<string | null>(null)
  const currentAgentOutputsRef = useRef<OutputItem[]>([])

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
    sessionIdRef.current = state.sessionId
  }, [state.sessionId])

  useEffect(() => {
    isActiveRef.current = isActive
    if (!isActive && prechatAbortControllerRef.current) {
      prechatAbortControllerRef.current.abort()
      prechatAbortControllerRef.current = null
      isPrechatLoadingRef.current = false
      setIsPrechatLoading(false)
    }
  }, [isActive])

  useEffect(() => {
    if (state.conversation.length > 0 && prechatAbortControllerRef.current) {
      prechatAbortControllerRef.current.abort()
      prechatAbortControllerRef.current = null
      isPrechatLoadingRef.current = false
      setIsPrechatLoading(false)
    }
  }, [state.conversation.length])

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
      sessionIdRef.current = newSessionId
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
    // Track outputs in ref for persistence (skip loading indicators)
    if (outputItem.type !== 'loading') {
      currentAgentOutputsRef.current.push(outputItem)
    }

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
          // If there's a persistent error with this session, clear it
          if (
            error instanceof Error &&
            (error.message.includes('404') || error.message.includes('401') || error.message.includes('403'))
          ) {
            console.warn('Clearing problematic session due to persistent error')
            clearInvalidSession()
            setState({ conversation: [], sessionId: null })
          }
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
      additionInfo?: string,
      skills?: string[],
      mentions?: Array<{ id: string; type: string; display: string }>
    ) => {
      if (!userInputText.trim() && files.length === 0) return
      if (inFlightRef.current) return

      try {
        inFlightRef.current = true
        setIsLoading(true)
        setIsGenerating(true)

        // Reset agent outputs tracking for this new message
        currentAgentOutputsRef.current = []

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
        pushTurn({ side: 'user', text: displayMessage, files: fileMetas })

        pushTurn({ side: 'agent', outputs: [{ type: 'loading' }] })

        // Prefer using /add_files when there is no active session yet.
        // This enables async parsing for the very first message in a new chat.
        let effectiveSessionId = sessionIdRef.current ?? state.sessionId ?? ''
        if (!effectiveSessionId && files.length > 0) {
          try {
            effectiveSessionId = await uploadFilesToFlowbotSession(files, effectiveSessionId, accessToken)
          } catch (error) {
            console.error('⚠️ [FlowBot] add_files failed, falling back to direct file upload:', error)
            // If add_files fails we keep effectiveSessionId empty and will send files directly with the chat request.
          }
        }

        const form = new FormData()
        // Always send session_id as string (empty if null) to match terminal client behavior
        form.append('session_id', effectiveSessionId || '')
        form.append('user_input_text', userInputText)
        form.append('llm_model', isThinking ? 'o4-mini' : LLM_MODEL)
        form.append('use_web_search_tool', (isSearching ?? false).toString())
        // Append when explicitly provided (including empty string) so callers can
        // force inclusion of the multipart field for document-edit flows.
        if (additionInfo !== undefined) {
          form.append('addition_info', additionInfo)
        }
        if (skills !== undefined) {
          skills.forEach(skill => {
            form.append('skills', skill)
          })
        }
        if (mentions && mentions.length > 0) {
          form.append('mentions', JSON.stringify(mentions))
        }

        const currentPagePayload = await buildCurrentPageContextPayload()
        form.append('current_page_context', JSON.stringify(currentPagePayload))

        files.forEach(file => form.append('files', file))

        const baseUrl = resolveFlowbotBaseUrl()
        const realtimeDocumentId = resolveRealtimeDocumentId({
          userInputText,
          currentPagePayload,
          hasFiles: files.length > 0,
          isThinking,
          isSearching
        })
        const useRealtimeDocumentEdit = typeof realtimeDocumentId === 'string' && realtimeDocumentId.length > 0
        if (useRealtimeDocumentEdit) {
          form.append('document_id', realtimeDocumentId)
          form.append('mode', 'document')
          appendOutputItemToLastAgentTurn(buildRealtimeDocumentProgressOutput(realtimeDocumentId))
        }
        const url = useRealtimeDocumentEdit
          ? `${baseUrl}/flowbot/api/agent/v2/document/live-edit`
          : `${baseUrl}/flowbot/api/agent/v2/chat`

        // Create abort controller for this request
        abortControllerRef.current = new AbortController()

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'text/event-stream'
          },
          body: form,
          signal: abortControllerRef.current.signal
        })

        if (!res.ok) {
          // Handle session-related errors
          if (res.status === 404 || res.status === 401 || res.status === 403) {
            console.warn('Session invalid during message send, clearing session')
            clearInvalidSession()
            setState(prev => ({ ...prev, sessionId: null }))
            sessionIdRef.current = null
          }
          throw new Error(`${res.status} ${res.statusText}`)
        }
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
              const isHiddenDocumentStreamOutput = shouldHideDocumentStreamOutput(newOutput)
              if (
                newOutput.type === 'document_stream_complete' &&
                typeof window !== 'undefined' &&
                typeof newOutput.document_id === 'string' &&
                newOutput.document_id
              ) {
                window.dispatchEvent(
                  new CustomEvent('flowbot:document-stream-complete', {
                    detail: {
                      documentId: newOutput.document_id,
                      mode: newOutput.mode,
                      changed: newOutput.changed,
                      changeSummary: newOutput.change_summary
                    }
                  })
                )
                appendOutputItemToLastAgentTurn(buildRealtimeDocumentCompleteOutput(newOutput))
                pruneEphemeralOutputsFromLastAgentTurn()
              }
              if (!isHiddenDocumentStreamOutput) {
                appendOutputItemToLastAgentTurn(newOutput)
                if (newOutput.type !== 'tool') {
                  pruneEphemeralOutputsFromLastAgentTurn()
                }
              }
            } catch (err) {
              console.error('Failed to parse output item:', err)
            }
          } else if (event === 'session-id') {
            try {
              const cleaned = data.trim()
              const newSessionId = JSON.parse(cleaned) as string
              if (isValidSessionId(newSessionId)) {
                console.log('[FlowBot] Received new session ID from server:', newSessionId)
                updateSessionId(newSessionId)
              } else {
                console.warn('[FlowBot] Received invalid session ID from server:', newSessionId)
              }
            } catch (error) {
              console.error('Failed to parse session-id event:', error)
            }
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

        // After streaming is complete, save both user and agent messages for persistence
        const currentSessionId = sessionIdRef.current
        if (currentSessionId) {
          try {
            // Save user message
            await saveUserMessage(currentSessionId, userInputText, files, undefined, accessToken)

            // Save agent message using tracked outputs
            const agentOutputs = currentAgentOutputsRef.current
            if (agentOutputs.length > 0) {
              await saveAgentMessage(currentSessionId, agentOutputs, accessToken)
            }
          } catch (persistenceError) {
            console.error('Error during message persistence:', persistenceError)
            // Don't throw - persistence failure shouldn't break the chat experience
          }
        }
      } catch (error) {
        // Don't show error if request was aborted (user cancelled)
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Request was cancelled by user')
          return
        }
        console.error('Error sending message:', error)

        appendOutputItemToLastAgentTurn({ type: 'error' })
      } finally {
        pruneEphemeralOutputsFromLastAgentTurn()
        inFlightRef.current = false
        setIsLoading(false)
        setIsGenerating(false)
        abortControllerRef.current = null
        // Reset agent outputs tracking
        currentAgentOutputsRef.current = []
      }
    },
    [
      accessToken,
      pushTurn,
      state.sessionId,
      sessionIdRef,
      appendOutputItemToLastAgentTurn,
      pruneEphemeralOutputsFromLastAgentTurn,
      updateSessionId,
      buildCurrentPageContextPayload
    ]
  )

  const cancelGeneration = useCallback(async () => {
    // Abort the ongoing fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    let cancelApiMessageText: string | null = null // Fallback for when cancel API fails
    let cancelOutput: OutputItem | null = null // Cancel API response

    // Call the cancel API endpoint if we have a session
    if (state.sessionId && accessToken) {
      try {
        const baseUrl = resolveFlowbotBaseUrl()

        const form = new FormData()
        form.append('session_id', state.sessionId)

        const res = await fetch(`${baseUrl}/flowbot/api/agent/chat/cancel`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          body: form
        })

        if (res.ok) {
          const payload: any = await res.json().catch(() => null)
          // Backend contract: if message is non-null, it's always an OutputItem.
          cancelOutput = (payload?.message ?? null) as OutputItem | null
        } else if (res.status !== 404) {
          const text = await res.text().catch(() => '')
          cancelApiMessageText = text ? `Cancel failed (${res.status}): ${text}` : `Cancel failed (${res.status})`
        }
      } catch (error) {
        console.error('Failed to call cancel API:', error)
        cancelApiMessageText = 'Cancel request failed (network error)'
      }
    }

    // Read the user message text BEFORE updating state (since setState is async)
    const currentConversation = state.conversation
    let userMessageText: string | null = null

    // Find the last user turn (typically second to last if last is agent loading)
    for (let i = currentConversation.length - 1; i >= 0; i--) {
      const turn = currentConversation[i]
      if (turn.side === 'user') {
        userMessageText = turn.text || null
        break
      }
    }

    // Restore last user message to input so it can be edited
    if (userMessageText && userMessageText !== SUBMITTING_FORM_MESSAGE) {
      setCancelledMessageText(userMessageText)
    }

    // Update lastFetchedSessionIdRef to prevent history reload after cancel
    // This ensures that if conversation becomes empty, we don't reload the cancelled message
    if (state.sessionId) {
      lastFetchedSessionIdRef.current = state.sessionId
    }

    // Now update the conversation state to remove the turns
    setState(prevState => {
      const newConversation = [...prevState.conversation]

      // Remove the last agent turn (with loading/streaming response)
      if (newConversation.length > 0 && newConversation[newConversation.length - 1]?.side === 'agent') {
        newConversation.pop()
      }

      // Remove the last user turn
      if (newConversation.length > 0 && newConversation[newConversation.length - 1]?.side === 'user') {
        newConversation.pop()
      }

      // Show cancel response returned by the API as a new agent turn
      if (cancelOutput) {
        newConversation.push({ side: 'agent', outputs: [cancelOutput] })
      } else if (cancelApiMessageText) {
        // Fallback for when cancel API fails, show it as a tool output
        newConversation.push({
          side: 'agent',
          outputs: [{ type: 'tool', name: 'cancel', reason: cancelApiMessageText }]
        })
      }

      const newState = { ...prevState, conversation: newConversation }
      saveState(newState)
      return newState
    })

    // Reset loading state
    inFlightRef.current = false
    setIsLoading(false)
    setIsGenerating(false)

    return userMessageText
  }, [accessToken, state.sessionId, state.conversation])

  const clearCancelledMessage = useCallback(() => {
    setCancelledMessageText(null)
  }, [])

  const waitForIdle = useCallback(() => {
    if (typeof window === 'undefined') return Promise.resolve()
    return new Promise<void>(resolve => {
      const requestIdleCallback = (
        window as Window & {
          requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
        }
      ).requestIdleCallback
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => resolve(), { timeout: 1500 })
      } else {
        setTimeout(() => resolve(), 200)
      }
    })
  }, [])

  const fetchPrechatSuggestions = useCallback(async () => {
    if (!accessToken) {
      console.error('Access token missing')
      return
    }
    if (!isActiveRef.current) return
    if (state.conversation.length > 0 || isPrechatLoadingRef.current) return

    const cacheKey = `${PRECHAT_LLM_MODEL}:${prechatContextKey}`
    const cachedEntry = readPrechatCache(cacheKey)
    if (cachedEntry?.suggestions?.length) {
      setPrechatSuggestions(cachedEntry.suggestions.slice(0, 4))
    }

    const isCacheFresh = cachedEntry ? isPrechatCacheFresh(cachedEntry) : false
    if (isCacheFresh) {
      setIsPrechatLoading(false)
      return
    }

    const guardNow = Date.now()
    const previousRequest = prechatRequestRef.current
    if (previousRequest?.cacheKey === cacheKey) {
      const elapsed = guardNow - previousRequest.startedAt
      if (previousRequest.status === 'pending' || elapsed < PRECHAT_MIN_REFETCH_MS) {
        return
      }
    }

    isPrechatLoadingRef.current = true
    if (!cachedEntry?.suggestions?.length) {
      setPrechatSuggestions([])
      setIsPrechatLoading(true)
    } else {
      setIsPrechatLoading(false)
    }

    await waitForIdle()
    if (!isActiveRef.current || state.conversation.length > 0) {
      isPrechatLoadingRef.current = false
      setIsPrechatLoading(false)
      return
    }

    if (prechatAbortControllerRef.current) {
      prechatAbortControllerRef.current.abort()
    }
    const controller = new AbortController()
    prechatAbortControllerRef.current = controller
    const timeoutId = setTimeout(() => controller.abort(), 7000)
    const requestStart = Date.now()
    const startPerf = typeof performance !== 'undefined' ? performance.now() : Date.now()
    prechatDiagnosticsRef.current = { cacheKey, startedAt: startPerf }
    prechatRequestRef.current = { cacheKey, startedAt: requestStart, status: 'pending' }

    try {
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
      form.append('llm_model', PRECHAT_LLM_MODEL)

      const baseUrl = resolveFlowbotBaseUrl()
      const res = await fetch(`${baseUrl}/flowbot/api/agent/prechat-suggestions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: form,
        signal: controller.signal
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch prechat suggestions: ${res.statusText}`)
      }

      const data = await res.json()
      const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : []
      const normalizedSuggestions = suggestions.slice(0, 4)

      setPrechatSuggestions(normalizedSuggestions)
      if (normalizedSuggestions.length > 0) {
        writePrechatCache(cacheKey, { suggestions: normalizedSuggestions, createdAt: Date.now() })
      }
      prechatRequestRef.current = { cacheKey, startedAt: requestStart, status: 'success' }
      if (prechatDiagnosticsRef.current?.cacheKey === cacheKey) {
        const endPerf = typeof performance !== 'undefined' ? performance.now() : Date.now()
        prechatDiagnosticsRef.current = {
          ...prechatDiagnosticsRef.current,
          durationMs: endPerf - prechatDiagnosticsRef.current.startedAt,
          status: 'success'
        }
      }
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError'
      if (!isAbort) {
        console.error('Failed to fetch prechat suggestions:', error)
        if (!cachedEntry?.suggestions?.length) {
          setPrechatSuggestions([])
        }
      }
      prechatRequestRef.current = { cacheKey, startedAt: requestStart, status: isAbort ? 'aborted' : 'error' }
      if (prechatDiagnosticsRef.current?.cacheKey === cacheKey) {
        const endPerf = typeof performance !== 'undefined' ? performance.now() : Date.now()
        prechatDiagnosticsRef.current = {
          ...prechatDiagnosticsRef.current,
          durationMs: endPerf - prechatDiagnosticsRef.current.startedAt,
          status: isAbort ? 'aborted' : 'error'
        }
      }
    } finally {
      clearTimeout(timeoutId)
      prechatAbortControllerRef.current = null
      setIsPrechatLoading(false)
      isPrechatLoadingRef.current = false
    }
  }, [accessToken, currentPageContext, prechatContextKey, state.conversation.length, waitForIdle])

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
    if (state.conversation.length === 0 && accessToken && isActive) {
      fetchPrechatSuggestions()
    } else if (state.conversation.length > 0) {
      setPrechatSuggestions([])
    }
  }, [state.conversation.length, accessToken, currentPageContext, fetchPrechatSuggestions, isActive])

  const editMessage = useCallback(
    async (turnIndex: number, newText: string) => {
      if (turnIndex < 0 || turnIndex >= state.conversation.length) return
      if (!newText.trim()) return

      // Delete old message and all messages after it
      setState(prev => {
        const newState = {
          ...prev,
          conversation: prev.conversation.slice(0, turnIndex)
        }
        saveState(newState)
        return newState
      })

      // Wait for state update to complete before sending new message
      await new Promise(resolve => setTimeout(resolve, 0))

      // Add new message (resend)
      await sendMessage(newText, [], false, false)
    },
    [state.conversation.length, sendMessage]
  )

  /**
   * Pre-upload files for the current EveryAI session using /add_files.
   * This is called as soon as the user attaches files in the UI (before pressing Send).
   * If a new sessionId is created by the backend, we persist it via updateSessionId.
   */
  const attachFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return
      try {
        const newSessionId = await uploadFilesToFlowbotSession(files, sessionIdRef.current, accessToken)
        if (newSessionId && newSessionId !== state.sessionId) {
          updateSessionId(newSessionId)
        }
      } catch (error) {
        // Do not block the UI if pre-upload fails; sendMessage will still work via fallback.
        console.error('⚠️ [FlowBot] Failed to pre-upload files via add_files:', error)
      }
    },
    [accessToken, state.sessionId, updateSessionId, sessionIdRef]
  )

  /**
   * Upload files for a specific CFLOW FlowProposal FILE field.
   * Backend uses (flow_proposal_id, field_key) to bind uploaded files to the correct field.
   */
  const attachFilesForFlowProposalField = useCallback(
    async (files: File[], binding: FlowProposalFileBinding) => {
      if (!files.length) return
      if (!binding?.flowProposalId || !binding?.fieldKey) {
        throw new Error('Missing flowProposalId or fieldKey for flow proposal file upload')
      }

      const effectiveSessionId = sessionIdRef.current ?? state.sessionId
      const newSessionId = await uploadFilesToFlowbotWithBinding({
        files,
        sessionId: effectiveSessionId,
        accessToken,
        binding
      })

      if (newSessionId && newSessionId !== state.sessionId) {
        updateSessionId(newSessionId)
      }
    },
    [accessToken, state.sessionId, updateSessionId, sessionIdRef]
  )

  /** Load a chat session by id: persist sessionId and fetch conversation from flowbot */
  const loadSession = useCallback(
    async (sessionId: string) => {
      saveState({ conversation: [], sessionId })
      sessionIdRef.current = sessionId
      lastFetchedSessionIdRef.current = sessionId
      setIsLoading(true)
      try {
        const history = await loadHistory(accessToken, sessionId)
        setState(history)
        lastFetchedSessionIdRef.current = history.sessionId ?? null
      } catch (error) {
        console.error('[FlowBot] Failed to load session:', error)
        setState({ conversation: [], sessionId })
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken]
  )

  const getAllSessions = useCallback(async () => {
    return getAllFlowBotSessions(accessToken)
  }, [accessToken])

  const deleteSession = useCallback(
    async (sessionIdToDelete: string) => {
      await deleteChatSession(sessionIdToDelete, accessToken)
    },
    [accessToken]
  )

  return {
    conversation: state.conversation,
    isLoading,
    isGenerating,
    sendMessage,
    editMessage,
    attachFiles,
    attachFilesForFlowProposalField,
    clearConversation,
    nextStepProposals,
    isPrechatLoading,
    sessionId: state.sessionId,
    cancelGeneration,
    cancelledMessageText,
    clearCancelledMessage,
    getAllSessions,
    deleteSession,
    loadSession
  }
}
