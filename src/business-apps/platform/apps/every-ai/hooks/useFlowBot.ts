import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type {
  AgentPlanOutput,
  AgentPlanUpdateOutput,
  AnswerOutput,
  ConversationTurn,
  CurrentPageContext,
  FileMeta,
  NarrationAttachOutput,
  OutputItem,
  ReasoningStepOutput,
  ReasoningStepUpdateOutput,
  TextDeltaOutput
} from '../types/models'
import { getCurrentPageContext } from '../utils/pageContext'
import { getDefaultSkillsForPage } from '../utils/pageSkills'
import * as flowbotStreamManager from '../streaming/flowbotStreamManager'
import type { RunSubscriberHandlers } from '../streaming/flowbotStreamManager'
import { useStreamStore } from '../streaming/streamStore'
import { usePageAnalytics } from '@/page-analitics/hooks/usePageAnalytics'
import { prepareCurrentPageContext } from '@/page-analitics/send/page-analytics'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'
import { env } from '@/common/env/EnvUtils'
import { decodeAccessTokenSub } from '@/common/utils/decodeJwtSub'
import {
  isNonRestorableUserDisplayMessage,
  isStructuredChatAction,
  resolveUserMessageDisplayText
} from '../utils/userMessageDisplay'

export type WebSearchMode = 'off' | 'on'

const STORAGE_KEY = 'newwork_every_ai'
const FLOWBOT_MODEL_KIND_DEFAULT = 'default'
const PRECHAT_CACHE_PREFIX = 'everyai_prechat_cache'
const PRECHAT_CACHE_TTL_MS = 10 * 60 * 1000
const PRECHAT_MIN_REFETCH_MS = 3000
const PRECHAT_MODEL_KIND = FLOWBOT_MODEL_KIND_DEFAULT
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
  const realm = getCurrentRealm()
  const prefix = realm ? `${PRECHAT_CACHE_PREFIX}:${realm}` : PRECHAT_CACHE_PREFIX
  return `${prefix}:${cacheKey}`
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
  /** Oldest message id currently loaded into `conversation` (cursor for Load more). */
  oldestMessageId: number | null
  /** Whether the server reports more (older) messages exist beyond the loaded window. */
  hasMoreHistory: boolean
}

/**
 * Default number of messages loaded per page when restoring a session or
 * paginating older history. Matches the backend's
 * `DEFAULT_SESSION_HISTORY_LIMIT` (~10 user + 10 assistant messages).
 */
export const SESSION_HISTORY_PAGE_SIZE = 20

type UseFlowBotOptions = {
  isActive?: boolean
}

type RealtimeDocumentContext = {
  type?: string
  entity_name?: string
  id?: string
}

type DocumentStreamCompleteOutputItem = Extract<OutputItem, { type: 'document_stream_complete' }>
type StreamingAnswerOutput = AnswerOutput & {
  __streaming?: boolean
  __runId?: string | null
}

const HIDDEN_DOCUMENT_STREAM_OUTPUT_TYPES = new Set<OutputItem['type']>([
  'document_stream_start',
  'document_stream_chunk',
  'document_stream_complete'
])

const FLOWBOT_DOCUMENT_STREAM_UPDATE_EVENT = 'flowbot:document-stream-update'
const documentStreamHtmlByDocumentId = new Map<string, string>()

function shouldHideDocumentStreamOutput(output: OutputItem): boolean {
  return HIDDEN_DOCUMENT_STREAM_OUTPUT_TYPES.has(output.type)
}

function resolveDocumentStreamDocumentId(documentId: string | null | undefined): string | null {
  if (typeof documentId !== 'string') return null
  const trimmed = documentId.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Push streamed HTML to the open document editor (bypasses API/Yjs websocket). */
function relayDocumentStreamOutputToEditor(output: OutputItem): void {
  if (typeof window === 'undefined') return

  if (output.type === 'document_stream_start') {
    const documentId = resolveDocumentStreamDocumentId(output.document_id)
    if (documentId) {
      documentStreamHtmlByDocumentId.set(documentId, '')
    }
    return
  }

  if (output.type === 'document_stream_chunk') {
    const documentId = resolveDocumentStreamDocumentId(output.document_id)
    if (!documentId || !output.chunk) return
    const accumulatedHtml = `${documentStreamHtmlByDocumentId.get(documentId) ?? ''}${output.chunk}`
    documentStreamHtmlByDocumentId.set(documentId, accumulatedHtml)
    window.dispatchEvent(
      new CustomEvent(FLOWBOT_DOCUMENT_STREAM_UPDATE_EVENT, {
        detail: {
          documentId,
          html: accumulatedHtml,
          isFinal: Boolean(output.is_final)
        }
      })
    )
    return
  }

  if (output.type === 'document_stream_complete') {
    const documentId = resolveDocumentStreamDocumentId(output.document_id)
    if (!documentId) return
    const accumulatedHtml = documentStreamHtmlByDocumentId.get(documentId) ?? ''
    documentStreamHtmlByDocumentId.delete(documentId)
    window.dispatchEvent(
      new CustomEvent('flowbot:document-stream-complete', {
        detail: {
          documentId,
          mode: output.mode,
          changed: output.changed,
          changeSummary: output.change_summary,
          html: accumulatedHtml.length > 0 ? accumulatedHtml : undefined
        }
      })
    )
  }
}

function buildRealtimeDocumentProgressOutput(documentId: string): OutputItem {
  return {
    type: 'answer',
    displayData: [
      {
        type: 'textBlock',
        text: `I started updating document ${documentId}. Changes are saved to the document when the edit finishes — reopen or refresh the document to view them.`
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
  webSearchMode: WebSearchMode
}): string | null {
  const { userInputText, currentPagePayload, hasFiles, isThinking, webSearchMode } = params
  if (hasFiles || isThinking || webSearchMode === 'on') return null
  // Form/clarification JSON can contain "UPDATE" and UUIDs that falsely match
  // document-edit heuristics; always route those through /v2/chat.
  if (isStructuredChatAction(userInputText)) return null
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

function isStreamingAnswerOutput(
  output: OutputItem | null | undefined,
  runId: string | null = null
): output is StreamingAnswerOutput {
  return (
    output?.type === 'answer' &&
    (output as StreamingAnswerOutput).__streaming === true &&
    (runId === null || (output as StreamingAnswerOutput).__runId === runId)
  )
}

function findStreamingAnswerIndex(outputs: OutputItem[], runId: string | null = null): number {
  for (let i = outputs.length - 1; i >= 0; i--) {
    if (isStreamingAnswerOutput(outputs[i], runId)) {
      return i
    }
  }
  return -1
}

const DEFAULT_STREAM_RUN_KEY = '__default__'

function getStreamRunKey(runId: string | null | undefined): string {
  return typeof runId === 'string' && runId.trim().length > 0 ? runId : DEFAULT_STREAM_RUN_KEY
}

function isStructuredStreamingText(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false

  const lowered = trimmed.toLowerCase()
  const markers = [
    '"tools"',
    '"tool_calls"',
    '"tool"',
    '"arguments"',
    '"argument"',
    '"payload"',
    '"displaydata"',
    '"nextstepproposals"',
    '"name"'
  ]

  if (markers.some(marker => lowered.includes(marker))) {
    return true
  }

  return trimmed === '{' || trimmed === '[' || trimmed === '{"' || trimmed === '[{' || /[{\[:,]$/.test(trimmed)
}

function shouldDisplayBufferedStreamText(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed || isStructuredStreamingText(trimmed)) {
    return false
  }

  return /[A-Za-z0-9]/.test(trimmed)
}

function mergeReasoningStep(
  existing: ReasoningStepOutput,
  patch: Partial<ReasoningStepOutput> | ReasoningStepUpdateOutput
): ReasoningStepOutput {
  const merged: ReasoningStepOutput = { ...existing }
  ;(Object.keys(patch) as Array<keyof typeof patch>).forEach(key => {
    if (key === 'type' || key === 'id') return
    const value = patch[key]
    if (value !== undefined && value !== null) {
      ;(merged as Record<string, unknown>)[key as string] = value
    }
  })
  return merged
}

function mergeReasoningStepUpdatePatch(
  existing: ReasoningStepUpdateOutput | undefined,
  patch: ReasoningStepUpdateOutput
): ReasoningStepUpdateOutput {
  const merged: ReasoningStepUpdateOutput = existing ? { ...existing } : { type: 'reasoning_step_update', id: patch.id }
  ;(Object.keys(patch) as Array<keyof ReasoningStepUpdateOutput>).forEach(key => {
    if (key === 'type' || key === 'id') return
    const value = patch[key]
    if (value !== undefined && value !== null) {
      ;(merged as Record<string, unknown>)[key as string] = value
    }
  })
  return merged
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
      if (shouldHideDocumentStreamOutput(newOutput)) {
        relayDocumentStreamOutputToEditor(newOutput)
        return
      }
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

function getCurrentRealm(): string | undefined {
  try {
    return env('NEXT_PUBLIC_OIDC_REALM') || undefined
  } catch {
    return undefined
  }
}

/**
 * Per-session conversation snapshot — written under a dedicated key so a
 * remount of <EveryAI/> (e.g. when the user resizes the window across a
 * responsive breakpoint and the layout container re-creates the subtree)
 * can hydrate the visible transcript instantly instead of flashing the
 * blue empty-state hero while the history fetch is in flight. The race
 * also fixed the loss of the user message when the SSE manager
 * re-attached to a live run with an empty React state: frames would land
 * before /chat/messages came back and ``appendOutputItemToLastAgentTurn``
 * would push a lonely agent turn, then ``setState(history)`` would
 * either overwrite it or never run.
 */
const CONVERSATION_STORAGE_PREFIX = 'newwork_every_ai:conversation:'

/**
 * StreamStore (per-run pointers) localStorage key — duplicated here as a
 * string literal so the cross-user sweep in :func:`clearAllEveryAiStorage`
 * can wipe it on user switch without creating an import cycle with the
 * streaming module. Keep this in sync with ``streamStore.ts``.
 */
const ACTIVE_RUNS_STORAGE_KEY = 'newwork_every_ai_active_runs'

/**
 * Hard cap on the per-session snapshot size. localStorage quotas are
 * ~5MB origin-wide; a long agentic conversation with embedded tables /
 * scatter plots can balloon, so we drop the snapshot for that session
 * rather than throw and rather than nuke unrelated storage.
 */
const CONVERSATION_SNAPSHOT_MAX_BYTES = 1_500_000

/**
 * Sweep every localStorage artifact owned by this hook (the session
 * pointer, every per-session conversation snapshot, and the
 * streamStore active-runs envelope). Called when we detect that the
 * cached state belongs to a different user than the one currently
 * authenticated — see ``loadState`` / ``useEffect`` user-change guard
 * below — and also exposed via the ``__clearAllEveryAiStorage`` window
 * hook so the auth layer's ``logout()`` can do a thorough clean even
 * when it doesn't itself know every per-session key we wrote.
 *
 * We intentionally do a prefix sweep instead of removing known keys
 * one-by-one so any future per-session key we add automatically gets
 * cleaned up. The sweep is scoped to the ``newwork_every_ai`` namespace
 * to keep unrelated app storage intact.
 */
function clearAllEveryAiStorage(): void {
  if (typeof window === 'undefined') return
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (
        key &&
        (key === STORAGE_KEY || key.startsWith(CONVERSATION_STORAGE_PREFIX) || key === ACTIVE_RUNS_STORAGE_KEY)
      ) {
        keysToRemove.push(key)
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key)
    }
  } catch {
    /* noop — storage may be unavailable */
  }
}

// Expose the sweep to the auth layer (useBusinessAuth.logout) without
// creating an import cycle. Safe no-op outside the browser.
if (typeof window !== 'undefined') {
  ;(window as unknown as { __clearAllEveryAiStorage?: () => void }).__clearAllEveryAiStorage = clearAllEveryAiStorage
}

function conversationStorageKey(sessionId: string | null): string | null {
  if (!sessionId || !isValidSessionId(sessionId)) return null
  return `${CONVERSATION_STORAGE_PREFIX}${sessionId}`
}

function persistConversationSnapshot(state: ConversationState, sub: string | undefined): void {
  if (typeof window === 'undefined') return
  const key = conversationStorageKey(state.sessionId)
  if (!key) return
  try {
    const payload = JSON.stringify({
      conversation: state.conversation,
      oldestMessageId: state.oldestMessageId,
      hasMoreHistory: state.hasMoreHistory,
      sub: sub ?? null,
      savedAt: Date.now()
    })
    if (payload.length > CONVERSATION_SNAPSHOT_MAX_BYTES) {
      // Too big to round-trip safely — drop the snapshot so we don't
      // half-write a corrupt one and so we don't blow the quota.
      try {
        localStorage.removeItem(key)
      } catch {
        /* noop */
      }
      return
    }
    localStorage.setItem(key, payload)
  } catch {
    // Quota / serialization issues are non-fatal; the next mount just
    // falls back to the loadHistory fetch.
  }
}

function readConversationSnapshot(
  sessionId: string | null,
  expectedSub: string | undefined
): {
  conversation: ConversationState['conversation']
  oldestMessageId: ConversationState['oldestMessageId']
  hasMoreHistory: ConversationState['hasMoreHistory']
} | null {
  if (typeof window === 'undefined') return null
  const key = conversationStorageKey(sessionId)
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      conversation?: ConversationState['conversation']
      oldestMessageId?: ConversationState['oldestMessageId']
      hasMoreHistory?: ConversationState['hasMoreHistory']
      sub?: string | null
    }
    if (!Array.isArray(parsed.conversation)) return null
    // Reject snapshots that belong to a different user. The pointer key
    // (``newwork_every_ai``) is also gated by sub, but we double-check
    // here so a stray snapshot left over from a previous user can
    // never rehydrate this session — even if the pointer was somehow
    // forged or the sweep on logout failed.
    if (expectedSub && parsed.sub && parsed.sub !== expectedSub) {
      try {
        localStorage.removeItem(key)
      } catch {
        /* noop */
      }
      return null
    }
    return {
      conversation: parsed.conversation,
      oldestMessageId: parsed.oldestMessageId ?? null,
      hasMoreHistory: parsed.hasMoreHistory ?? false
    }
  } catch {
    return null
  }
}

function clearConversationSnapshot(sessionId: string | null): void {
  if (typeof window === 'undefined') return
  const key = conversationStorageKey(sessionId)
  if (!key) return
  try {
    localStorage.removeItem(key)
  } catch {
    /* noop */
  }
}

function saveState(state: ConversationState, sub: string | undefined) {
  if (typeof window !== 'undefined') {
    try {
      const realm = getCurrentRealm()
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId: state.sessionId, realm, sub: sub ?? null }))
      if (state.sessionId) {
        console.log('[FlowBot] Saved session to localStorage:', state.sessionId)
      }
    } catch (error) {
      console.warn('[FlowBot] Failed to save session state to localStorage:', error)
    }
    // Always mirror the visible transcript to a per-session snapshot
    // alongside the sessionId pointer. The snapshot is keyed by
    // sessionId so we never confuse two concurrent sessions, and the
    // payload carries the writer's sub so a different user can never
    // rehydrate from it.
    persistConversationSnapshot(state, sub)
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

function getInitialSessionId(currentSub: string | undefined): string | null {
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
    const parsed = JSON.parse(raw) as {
      sessionId?: string | null
      realm?: string | null
      sub?: string | null
    }

    const currentRealm = getCurrentRealm()
    if (currentRealm && parsed.realm && parsed.realm !== currentRealm) {
      console.log('[FlowBot] Stored session belongs to different tenant, discarding')
      clearAllEveryAiStorage()
      return null
    }

    // Reject sessions that belong to a different user. This is the
    // primary defence against a logout/login cycle (or a Keycloak SSO
    // silent re-auth) that lands a different user on the same origin
    // without our explicit ``logout()`` path having fired — without it
    // the previous user's session pointer + conversation snapshot
    // would hydrate this user's view, even though the backend would
    // 403 on any subsequent request (the symptom reported in the bug
    // where opening EveryAI shows the previous user's transcript and
    // it sticks across navigations until the user picks a new
    // session that overwrites the pointer).
    if (currentSub && parsed.sub && parsed.sub !== currentSub) {
      console.log('[FlowBot] Stored session belongs to different user, discarding')
      clearAllEveryAiStorage()
      return null
    }

    // Snapshots saved before the user-binding rollout have no ``sub``.
    // Don't restore them once we know who's logged in — we can't prove
    // ownership and the cost of a fresh history fetch is minimal.
    if (currentSub && !parsed.sub) {
      console.log('[FlowBot] Stored session has no user binding, discarding')
      clearAllEveryAiStorage()
      return null
    }

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

function loadState(currentSub: string | undefined): ConversationState {
  const sessionId = getInitialSessionId(currentSub)
  // If we have a persisted snapshot for this session (written by
  // ``saveState`` on every mutation), hydrate from it synchronously so
  // a resize-induced remount doesn't flash the empty-state hero or
  // lose the user turn that the live SSE manager is about to append
  // to. The async history fetch will still run as a fallback when
  // there's no snapshot (e.g. fresh tab on a different machine).
  const snapshot = readConversationSnapshot(sessionId, currentSub)
  if (snapshot) {
    return {
      conversation: snapshot.conversation,
      sessionId,
      oldestMessageId: snapshot.oldestMessageId,
      hasMoreHistory: snapshot.hasMoreHistory
    }
  }
  return { conversation: [], sessionId, oldestMessageId: null, hasMoreHistory: false }
}

type LoadHistoryOptions = {
  /** Maximum messages to return. Defaults to `SESSION_HISTORY_PAGE_SIZE`. */
  limit?: number
  /** Cursor — return messages with id strictly less than `beforeId` (older page). */
  beforeId?: number | null
}

/**
 * Fetch a paginated window of conversation history from Flowbot.
 *
 * The first call for a session returns the most recent `limit` messages
 * along with `hasMoreHistory` / `oldestMessageId` metadata. Subsequent calls
 * can pass `beforeId` = the previous `oldestMessageId` to load older pages.
 */
async function loadHistory(
  accessToken: string,
  sessionId: string | null,
  options: LoadHistoryOptions = {}
): Promise<ConversationState> {
  if (!isValidSessionId(sessionId)) {
    return { conversation: [], sessionId: null, oldestMessageId: null, hasMoreHistory: false }
  }

  const limit = options.limit ?? SESSION_HISTORY_PAGE_SIZE
  const beforeId = options.beforeId ?? null

  try {
    const baseUrl = resolveFlowbotBaseUrl()
    const params = new URLSearchParams({ limit: String(limit) })
    if (beforeId !== null && Number.isFinite(beforeId)) {
      params.set('before_id', String(beforeId))
    }
    const res = await fetch(`${baseUrl}/flowbot/api/agent/session/${sessionId}/history?${params.toString()}`, {
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
        return { conversation: [], sessionId: null, oldestMessageId: null, hasMoreHistory: false }
      }
      if (res.status === 401 || res.status === 403) {
        console.warn('Session unauthorized, clearing invalid session:', sessionId)
        clearInvalidSession()
        return { conversation: [], sessionId: null, oldestMessageId: null, hasMoreHistory: false }
      }
      throw new Error(`${res.status} ${res.statusText}`)
    }

    const payload = await res.json()

    const backendConversation: any[] = Array.isArray(payload?.conversation) ? payload.conversation : []
    const hasMoreHistory = Boolean(payload?.hasMore)
    const payloadOldestId = typeof payload?.oldestMessageId === 'number' ? payload.oldestMessageId : null

    const historyState: ConversationState = {
      conversation: [],
      sessionId,
      oldestMessageId: payloadOldestId,
      hasMoreHistory
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
            submissions[parsed.uuid] = parsed.data ?? {}
          }
        } catch {}
        text = resolveUserMessageDisplayText(text)

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
    return { conversation: [], sessionId, oldestMessageId: null, hasMoreHistory: false }
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

const CHAT_LIST_LIMIT = 15

/**
 * Fetch chat list from FlowBot: GET /flowbot/chat/user/chats?limit=...&offset=...
 */
export async function fetchChatListFromApi(
  accessToken: string,
  limit: number = CHAT_LIST_LIMIT,
  offset: number = 0
): Promise<FlowBotSession[]> {
  try {
    const baseUrl = resolveFlowbotBaseUrl()
    const url = `${baseUrl}/flowbot/chat/user/chats?limit=${limit}&offset=${offset}`

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
export async function deleteChatSession(sessionId: string, accessToken: string): Promise<void> {
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

// User and assistant message persistence is now handled server-side by
// the resumable-streaming pipeline:
//   * The user message is written to chat_db at the *start* of
//     `POST /v2/chat` (see `_persist_user_message`), so it's durable
//     even if the agent run is interrupted.
//   * The final assistant outputs are written on the run's terminal
//     `__end__` event by the background recorder.
// The previous `saveUserMessage` / `saveAgentMessage` helpers (which
// fired client-side `POST /flowbot/chat/messages` calls *after* the
// stream ended) have been removed to avoid duplicate writes.

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
  // The sidepanel that hosts EveryAI lives outside the routed area, so this hook
  // does not naturally re-render when the host SPA navigates. Subscribing to
  // `popstate` (which `navigateTo` already dispatches synthetically via
  // `dispatchPopStateAfterHistoryUpdate`, see common/utils/navigationUtils.ts)
  // and `hashchange` keeps `currentPageContext` aligned with the visible URL —
  // otherwise we ship a stale `entity_name` / `id` to Flowbot's prompt builder
  // and the model wrongly believes the user is still on a previously-opened
  // entity page (the regression caught in AIML-921 follow-up).
  const [currentPageContext, setCurrentPageContext] = useState<CurrentPageContext>(() => getCurrentPageContext())
  useEffect(() => {
    if (typeof globalThis.window === 'undefined') {
      return undefined
    }
    const refresh = () => {
      const next = getCurrentPageContext()
      setCurrentPageContext(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    }
    refresh()
    globalThis.window.addEventListener('popstate', refresh)
    globalThis.window.addEventListener('hashchange', refresh)
    return () => {
      globalThis.window.removeEventListener('popstate', refresh)
      globalThis.window.removeEventListener('hashchange', refresh)
    }
  }, [])
  const prechatContextKey = useMemo(() => buildPrechatContextKey(currentPageContext), [currentPageContext])
  const isActive = options.isActive ?? true

  // Bind every persisted artifact (session pointer + per-session
  // conversation snapshots) to the authenticated user's ``sub`` so a
  // logout/login that lands a different user on the same origin can
  // never hydrate user B's chat from user A's leftovers. The decoded
  // sub is also tracked in a ref so all the ``saveState`` callbacks
  // below can stamp it without taking on a fresh dependency.
  const userSub = useMemo(() => decodeAccessTokenSub(accessToken), [accessToken])
  const userSubRef = useRef<string | undefined>(userSub)
  useEffect(() => {
    userSubRef.current = userSub
  }, [userSub])

  const [state, setState] = useState<ConversationState>(() => loadState(userSub))
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const sessionIdRef = useRef<string | null>(null)
  const lastFetchedSessionIdRef = useRef<string | null>(null)
  const isLoadingMoreHistoryRef = useRef(false)
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
  /**
   * Server-assigned run id for the currently-in-flight or most recently
   * observed agent run on this hook instance. Populated from the SSE
   * `run-id` envelope event (or from the resume bootstrap). Used by
   * `cancelGeneration` to address the right run in the manager.
   *
   * Note: there is intentionally no `abortControllerRef` any more —
   * the global :mod:`flowbotStreamManager` owns each run's
   * AbortController so unmounting this hook does NOT close the
   * underlying connection.
   */
  const currentRunIdRef = useRef<string | null>(null)
  /**
   * Bumped every time the user navigates away from the current view
   * (``clearConversation`` for "New chat", ``loadSession`` for a
   * sidebar click, ``deleteSession`` for an active deletion). Stream
   * handlers capture the epoch they were built under; when the value
   * has advanced they treat themselves as stale and stop mutating the
   * hook's visible state. The underlying background run is unaffected.
   *
   * This guards the brief window after a new-chat click but before
   * the previous run's ``session-id`` envelope arrives, where a naive
   * "current session vs. request session" comparison would treat
   * both-empty as a match and snap the user's fresh chat back to the
   * old run.
   */
  const navigationEpochRef = useRef(0)
  const [cancelledMessageText, setCancelledMessageText] = useState<string | null>(null)
  const currentAgentOutputsRef = useRef<OutputItem[]>([])
  const pendingTextDeltaBuffersRef = useRef<Record<string, string>>({})
  const pendingReasoningStepUpdatesRef = useRef<Record<string, ReasoningStepUpdateOutput>>({})

  const activePageSkills = useMemo(() => getDefaultSkillsForPage(currentPageContext), [currentPageContext])
  const [pageSkillsEnabled, setPageSkillsEnabled] = useState(false)

  const togglePageSkills = useCallback((enabled: boolean) => {
    setPageSkillsEnabled(enabled)
  }, [])

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

  useEffect(() => saveState(state, userSubRef.current), [state])

  // Detect a user switch after this hook is already mounted (e.g. a
  // Keycloak silent refresh that hands us a different ``sub`` without
  // tearing the React tree down, or a multi-tab login). When the token
  // owner changes we sweep every per-session artifact we wrote on
  // behalf of the previous user and reset to a blank conversation —
  // otherwise the previous user's transcript would remain visible
  // until the new user explicitly clicks "New chat" or picks another
  // session from the sidebar.
  const lastSeenUserSubRef = useRef<string | undefined>(userSub)
  useEffect(() => {
    if (!userSub) return
    if (lastSeenUserSubRef.current && lastSeenUserSubRef.current !== userSub) {
      console.log('[FlowBot] Detected user switch, clearing cached chat state')
      clearAllEveryAiStorage()
      navigationEpochRef.current += 1
      currentRunIdRef.current = null
      inFlightRef.current = false
      sessionIdRef.current = null
      lastFetchedSessionIdRef.current = null
      setState({ conversation: [], sessionId: null, oldestMessageId: null, hasMoreHistory: false })
      setIsLoading(false)
      setIsGenerating(false)
      setPrechatSuggestions([])
    }
    lastSeenUserSubRef.current = userSub
  }, [userSub])

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
      const oldSessionId = sessionIdRef.current
      console.log(
        '[FlowBot][updateSessionId] Updating session ID:',
        'from:',
        oldSessionId || '(none)',
        'to:',
        newSessionId
      )
      sessionIdRef.current = newSessionId
      setState(prev => ({ ...prev, sessionId: newSessionId }))
      resetAnalytics(newSessionId)
    },
    [resetAnalytics]
  )

  const buildCurrentPageContextPayload = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const route = typeof window !== 'undefined' ? window.location.pathname : ''

    // Always re-parse the live URL at send-time. `currentPageContext` is kept
    // in React state for prechat caching / skills / analytics resolution, but
    // the request payload itself must reflect the URL the user is on right
    // *now* so Flowbot's prompt does not announce a stale "user is currently
    // looking at <entity X>" — which would otherwise hijack the model's
    // recommendations and trigger an unwanted main-window redirect.
    const livePageContext = getCurrentPageContext()

    const baseCurrentPage = {
      url,
      route,
      view: undefined as string | undefined,
      type: livePageContext.type,
      entity_name:
        livePageContext.type === 'entity' || livePageContext.type === 'overview'
          ? livePageContext.entity_name
          : undefined,
      id: livePageContext.type === 'entity' ? livePageContext.id : undefined
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

      saveState(newState, userSubRef.current)

      return newState
    })
  }, [])

  const pruneEphemeralOutputsFromLastAgentTurn = useCallback(() => {
    setState(prevState => {
      const newConversation = JSON.parse(JSON.stringify(prevState.conversation))
      for (let i = newConversation.length - 1; i >= 0; i--) {
        if (newConversation[i]?.side === 'agent') {
          const outputs = newConversation[i]?.outputs || []
          // Prune only the truly ephemeral legacy `tool` chips. Reasoning
          // steps are Cursor-style persistent artifacts — users keep them
          // visible (collapsed) after the turn completes so they can expand
          // any step later on to inspect what the agent actually did.
          newConversation[i] = {
            ...newConversation[i],
            outputs: outputs.filter((o: OutputItem) => o?.type !== 'tool')
          }
          break
        }
      }

      const newState = { ...prevState, conversation: newConversation }
      saveState(newState, userSubRef.current)
      return newState
    })
  }, [])

  /**
   * Handle a `reasoning_step` (open) or `reasoning_step_update` (patch) by
   * shallow-merging into the matching entry on the current agent turn.
   *
   * * `open` events for a brand-new id append a new step output.
   * * `open` events for an id that already exists (e.g. a reconnect replay)
   *   overwrite the prior snapshot — the newer one is authoritative.
   * * `update` events merge any non-undefined fields onto the existing step.
   *   Unknown ids are buffered until the matching open arrives so short
   *   stream-order races do not drop narration / status patches.
   */
  const applyReasoningStepEvent = useCallback((event: ReasoningStepOutput | ReasoningStepUpdateOutput) => {
    let stepEvent = event
    if (event.type === 'reasoning_step') {
      const pendingPatch = pendingReasoningStepUpdatesRef.current[event.id]
      if (pendingPatch) {
        stepEvent = mergeReasoningStep(event, pendingPatch)
        delete pendingReasoningStepUpdatesRef.current[event.id]
      }
    }

    // Keep the persistence ref in sync with the merged view, not the raw
    // event stream: a reopen replaces its prior snapshot, and an update
    // patches the existing entry. Without this, reloads would stack a
    // pile of half-filled step snapshots on top of the final merged one.
    const ref = currentAgentOutputsRef.current
    const existingRefIdx = ref.findIndex(
      o => o?.type === 'reasoning_step' && (o as ReasoningStepOutput).id === stepEvent.id
    )
    if (stepEvent.type === 'reasoning_step') {
      if (existingRefIdx >= 0) {
        ref[existingRefIdx] = stepEvent
      } else {
        ref.push(stepEvent)
      }
    } else if (existingRefIdx >= 0) {
      const existing = ref[existingRefIdx] as ReasoningStepOutput
      ref[existingRefIdx] = mergeReasoningStep(existing, stepEvent)
    } else {
      pendingReasoningStepUpdatesRef.current[stepEvent.id] = mergeReasoningStepUpdatePatch(
        pendingReasoningStepUpdatesRef.current[stepEvent.id],
        stepEvent
      )
    }

    setState(prevState => {
      const newConversation: ConversationTurn[] = JSON.parse(JSON.stringify(prevState.conversation))

      let lastAgentIdx = newConversation.length - 1
      if (lastAgentIdx < 0 || newConversation[lastAgentIdx].side !== 'agent') {
        // No active agent turn — synthesize one so the first event (even
        // a reasoning step) displaces the "waiting…" UI immediately.
        newConversation.push({ side: 'agent', outputs: [] })
        lastAgentIdx = newConversation.length - 1
      }

      const turn = newConversation[lastAgentIdx]
      if (turn.side !== 'agent') {
        return prevState
      }

      const outputs = [...(turn.outputs || [])]

      // Any event displaces a trailing "thinking…" placeholder — keeps the
      // UI from sitting on the generic loader once real work starts.
      if (outputs.length > 0 && outputs[outputs.length - 1]?.type === 'loading') {
        outputs.pop()
      }

      const existingIdx = outputs.findIndex(
        o => o?.type === 'reasoning_step' && (o as ReasoningStepOutput).id === stepEvent.id
      )

      if (stepEvent.type === 'reasoning_step') {
        if (existingIdx >= 0) {
          outputs[existingIdx] = stepEvent
        } else {
          outputs.push(stepEvent)
        }
      } else {
        // `reasoning_step_update` — shallow merge patches.
        if (existingIdx < 0) {
          return prevState
        }
        const existing = outputs[existingIdx] as ReasoningStepOutput
        outputs[existingIdx] = mergeReasoningStep(existing, stepEvent)
      }

      newConversation[lastAgentIdx] = { ...turn, outputs }
      const newState = { ...prevState, conversation: newConversation }
      saveState(newState, userSubRef.current)
      return newState
    })
  }, [])

  /**
   * Merge an `agent_plan` (initial snapshot) or `agent_plan_update` (full
   * snapshot) into the current agent turn.
   *
   * The deepagents supervisor emits one `agent_plan` per turn followed by
   * any number of `agent_plan_update` events as items move from `pending`
   * to `in_progress` to `completed`. We deduplicate by `id` so the
   * frontend only ever stores a single, latest snapshot per plan and the
   * `AgentPlanPanel` re-renders in place.
   */
  const applyAgentPlanEvent = useCallback((event: AgentPlanOutput | AgentPlanUpdateOutput) => {
    const replaceInOutputs = (outputs: OutputItem[]): OutputItem[] => {
      const next = [...outputs]
      const existingIdx = next.findIndex(
        o =>
          o &&
          (o.type === 'agent_plan' || o.type === 'agent_plan_update') &&
          (o as AgentPlanOutput | AgentPlanUpdateOutput).id === event.id
      )
      if (existingIdx >= 0) {
        next[existingIdx] = event
      } else {
        next.push(event)
      }
      return next
    }

    // Keep the persistence ref in sync.
    currentAgentOutputsRef.current = replaceInOutputs(currentAgentOutputsRef.current)

    setState(prevState => {
      const newConversation: ConversationTurn[] = JSON.parse(JSON.stringify(prevState.conversation))

      let lastAgentIdx = newConversation.length - 1
      if (lastAgentIdx < 0 || newConversation[lastAgentIdx].side !== 'agent') {
        newConversation.push({ side: 'agent', outputs: [] })
        lastAgentIdx = newConversation.length - 1
      }

      const turn = newConversation[lastAgentIdx]
      if (turn.side !== 'agent') {
        return prevState
      }

      const outputs = [...(turn.outputs || [])]

      if (outputs.length > 0 && outputs[outputs.length - 1]?.type === 'loading') {
        outputs.pop()
      }

      newConversation[lastAgentIdx] = { ...turn, outputs: replaceInOutputs(outputs) }
      const newState = { ...prevState, conversation: newConversation }
      saveState(newState, userSubRef.current)
      return newState
    })
  }, [])

  /**
   * Accumulate an incoming assistant token delta into a single, in-place
   * `AnswerOutput` bubble on the current agent turn.
   *
   * We tag the sentinel bubble with a private `__streaming` flag and the
   * originating `run_id` so a subsequent canonical `answer` event can locate
   * and replace it cleanly, even when reasoning steps were appended in
   * between token arrivals. Older backends that never emit `text_delta`
   * still work the same — they go straight to the canonical `answer` path.
   */
  const applyTextDelta = useCallback((event: TextDeltaOutput) => {
    if (!event.delta) return

    const runId = event.run_id ?? null
    const runKey = getStreamRunKey(runId)
    const bufferedText = `${pendingTextDeltaBuffersRef.current[runKey] ?? ''}${event.delta}`
    const refOutputs = currentAgentOutputsRef.current
    const refIdx = findStreamingAnswerIndex(refOutputs, runId)
    if (refIdx >= 0) {
      const existing = refOutputs[refIdx] as StreamingAnswerOutput
      const existingText = existing.displayData?.[0]?.type === 'textBlock' ? existing.displayData[0].text : ''
      refOutputs[refIdx] = {
        type: 'answer',
        displayData: [{ type: 'textBlock', text: existingText + event.delta }],
        nextStepProposals: [],
        __streaming: true,
        __runId: runId
      } as StreamingAnswerOutput
    } else {
      if (!shouldDisplayBufferedStreamText(bufferedText)) {
        pendingTextDeltaBuffersRef.current[runKey] = bufferedText
      } else {
        delete pendingTextDeltaBuffersRef.current[runKey]
        refOutputs.push({
          type: 'answer',
          displayData: [{ type: 'textBlock', text: bufferedText }],
          nextStepProposals: [],
          __streaming: true,
          __runId: runId
        } as StreamingAnswerOutput)
      }
    }

    setState(prevState => {
      const newConversation: ConversationTurn[] = JSON.parse(JSON.stringify(prevState.conversation))

      let lastAgentIdx = newConversation.length - 1
      if (lastAgentIdx < 0 || newConversation[lastAgentIdx].side !== 'agent') {
        newConversation.push({ side: 'agent', outputs: [] })
        lastAgentIdx = newConversation.length - 1
      }

      const turn = newConversation[lastAgentIdx]
      if (turn.side !== 'agent') {
        return prevState
      }

      const outputs = [...(turn.outputs || [])]
      const streamingIdx = findStreamingAnswerIndex(outputs, runId)

      if (streamingIdx >= 0) {
        if (outputs.length > 0 && outputs[outputs.length - 1]?.type === 'loading') {
          outputs.pop()
        }

        const existing = outputs[streamingIdx] as StreamingAnswerOutput
        const existingText = existing.displayData?.[0]?.type === 'textBlock' ? existing.displayData[0].text : ''
        const nextText = existingText + event.delta
        const nextBubble: StreamingAnswerOutput = {
          type: 'answer',
          displayData: [{ type: 'textBlock', text: nextText }],
          nextStepProposals: [],
          __streaming: true,
          __runId: runId
        }
        outputs[streamingIdx] = nextBubble
      } else {
        if (!shouldDisplayBufferedStreamText(bufferedText)) {
          pendingTextDeltaBuffersRef.current[runKey] = bufferedText
          return prevState
        }

        delete pendingTextDeltaBuffersRef.current[runKey]
        if (outputs.length > 0 && outputs[outputs.length - 1]?.type === 'loading') {
          outputs.pop()
        }

        const nextBubble: StreamingAnswerOutput = {
          type: 'answer',
          displayData: [{ type: 'textBlock', text: bufferedText }],
          nextStepProposals: [],
          __streaming: true,
          __runId: runId
        }
        outputs.push(nextBubble)
      }

      newConversation[lastAgentIdx] = { ...turn, outputs }
      const newState = { ...prevState, conversation: newConversation }
      saveState(newState, userSubRef.current)
      return newState
    })
  }, [])

  /**
   * Replace any `__streaming` sentinel with the canonical, fully
   * structured `AnswerOutput` once the backend sends it. If no streaming
   * sentinel exists (old backend, or the turn didn't stream tokens), just
   * append the answer the normal way.
   */
  const commitFinalAnswer = useCallback((answer: AnswerOutput) => {
    pendingTextDeltaBuffersRef.current = {}
    const refOutputs = currentAgentOutputsRef.current
    const refIdx = findStreamingAnswerIndex(refOutputs)
    if (refIdx >= 0) {
      refOutputs[refIdx] = answer
    } else {
      refOutputs.push(answer)
    }

    setState(prevState => {
      const newConversation: ConversationTurn[] = JSON.parse(JSON.stringify(prevState.conversation))
      const lastAgentIdx = newConversation.length - 1
      if (lastAgentIdx < 0 || newConversation[lastAgentIdx].side !== 'agent') {
        newConversation.push({ side: 'agent', outputs: [answer] })
        const s = { ...prevState, conversation: newConversation }
        saveState(s, userSubRef.current)
        return s
      }

      const turn = newConversation[lastAgentIdx]
      if (turn.side !== 'agent') return prevState

      const outputs = [...(turn.outputs || [])]
      if (outputs.length > 0 && outputs[outputs.length - 1]?.type === 'loading') {
        outputs.pop()
      }

      // Search backwards through all outputs for any streaming answer bubble.
      // This handles the case where reasoning steps arrive between text_delta
      // and the final answer, pushing the streaming bubble away from the tail.
      const streamingIdx = findStreamingAnswerIndex(outputs)

      if (streamingIdx >= 0) {
        outputs[streamingIdx] = answer
      } else {
        outputs.push(answer)
      }

      newConversation[lastAgentIdx] = { ...turn, outputs }
      const newState = { ...prevState, conversation: newConversation }
      saveState(newState, userSubRef.current)
      return newState
    })
  }, [])

  /**
   * Reclassify a streaming `answer` bubble as narration of a reasoning
   * step. Triggered by `narration_attach` events the backend emits when
   * the model started talking before deciding to call a tool — that text
   * is "thinking out loud", not the final answer.
   *
   * - Locate the streaming bubble whose `__runId` matches `text_item_id`.
   * - Move its accumulated text into the matching reasoning step's
   *   `narration` field (appending if narration already had content from
   *   an earlier attach for the same step).
   * - Remove the bubble from the chat flow so only the LAST surviving
   *   bubble (the one with no follow-up tool call) ends up visible as
   *   the answer.
   */
  const applyNarrationAttach = useCallback((event: NarrationAttachOutput) => {
    const { text_item_id, step_id } = event
    const runKey = getStreamRunKey(text_item_id)

    // Keep the persistence ref in sync — we want saved transcripts to
    // include the narration on the step, not as a stray answer bubble.
    const ref = currentAgentOutputsRef.current
    const refBubbleIdx = findStreamingAnswerIndex(ref, text_item_id)
    const refBubble = refBubbleIdx >= 0 ? (ref[refBubbleIdx] as AnswerOutput) : null
    const refBufferedText = pendingTextDeltaBuffersRef.current[runKey] ?? ''
    delete pendingTextDeltaBuffersRef.current[runKey]
    const refBubbleText =
      refBubble?.displayData?.[0]?.type === 'textBlock' ? refBubble.displayData[0].text : refBufferedText
    if (refBubbleIdx >= 0) {
      ref.splice(refBubbleIdx, 1)
    }
    const refStepIdx = ref.findIndex(o => o?.type === 'reasoning_step' && (o as ReasoningStepOutput).id === step_id)
    if (refStepIdx >= 0 && refBubbleText) {
      const existingStep = ref[refStepIdx] as ReasoningStepOutput
      const existingNarration = existingStep.narration ?? ''
      ref[refStepIdx] = {
        ...existingStep,
        narration: existingNarration ? `${existingNarration}\n\n${refBubbleText}` : refBubbleText
      }
    }

    setState(prevState => {
      const newConversation: ConversationTurn[] = JSON.parse(JSON.stringify(prevState.conversation))

      const lastAgentIdx = newConversation.length - 1
      if (lastAgentIdx < 0 || newConversation[lastAgentIdx].side !== 'agent') {
        return prevState
      }
      const turn = newConversation[lastAgentIdx]
      if (turn.side !== 'agent') return prevState

      const outputs = [...(turn.outputs || [])]

      const bubbleIdx = findStreamingAnswerIndex(outputs, text_item_id)
      const bubble = bubbleIdx >= 0 ? (outputs[bubbleIdx] as AnswerOutput) : null
      const bubbleText = bubble?.displayData?.[0]?.type === 'textBlock' ? bubble.displayData[0].text : refBufferedText

      if (bubbleIdx >= 0) {
        outputs.splice(bubbleIdx, 1)
      }

      const stepIdx = outputs.findIndex(o => o?.type === 'reasoning_step' && (o as ReasoningStepOutput).id === step_id)
      if (stepIdx >= 0 && bubbleText) {
        const existingStep = outputs[stepIdx] as ReasoningStepOutput
        const existingNarration = existingStep.narration ?? ''
        outputs[stepIdx] = {
          ...existingStep,
          narration: existingNarration ? `${existingNarration}\n\n${bubbleText}` : bubbleText
        }
      } else if (stepIdx < 0 && bubbleText) {
        // Step not yet present — extremely unlikely (backend always emits
        // the step BEFORE the narration_attach), but leaving the bubble
        // visible is a saner fallback than silently dropping the text.
        console.warn('[FlowBot] narration_attach received before reasoning_step', step_id, 'restoring bubble')
        if (bubble) outputs.push(bubble)
      }

      newConversation[lastAgentIdx] = { ...turn, outputs }
      const newState = { ...prevState, conversation: newConversation }
      saveState(newState, userSubRef.current)
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
            setState({ conversation: [], sessionId: null, oldestMessageId: null, hasMoreHistory: false })
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

  /**
   * Build the SSE subscriber callbacks that route a run's frames into
   * this hook's local conversation state. Same handler set is used by
   * both `sendMessage` (new run) and the mount-time attach effect
   * (resume of a background run). `requestSessionId` is captured at
   * call time so frames stop rendering into this view if the user
   * navigates away — but the underlying run keeps streaming on the
   * backend either way.
   */
  const buildStreamHandlers = useCallback(
    (requestSessionId: string): RunSubscriberHandlers => {
      let liveRequestSessionId = requestSessionId
      // Capture the navigation epoch at the moment these handlers are
      // built. If the user later clicks "New chat" or switches to a
      // different session in the sidebar, the epoch advances and these
      // handlers will no longer mutate state — even before the run's
      // ``session-id`` envelope arrives (the early window where a
      // naive session-id comparison would falsely match both-empty).
      const handlerEpoch = navigationEpochRef.current
      const isStale = () => navigationEpochRef.current !== handlerEpoch
      return {
        onFrame: frame => {
          // First-line guard: hook has navigated away since attach.
          if (isStale()) return

          // Session-scoped guard: if the user navigated to a different
          // chat (or opened a brand-new empty one) after we attached,
          // drop frames so they don't pollute the other session's
          // transcript. The underlying run is unaffected — it keeps
          // streaming into the global store and a later attach will
          // resume rendering.
          //
          // We intentionally DO render frames when ``liveRequestSessionId``
          // is still empty: that's the brief window right after send,
          // before the server's ``session-id`` envelope arrives, where
          // the new-chat view IS the rightful target.
          const currentSessionId = sessionIdRef.current ?? state.sessionId ?? ''
          if (liveRequestSessionId && currentSessionId !== liveRequestSessionId) {
            return
          }

          if (frame.event !== 'output-item') return
          try {
            const newOutput = JSON.parse(frame.data) as OutputItem
            const isHiddenDocumentStreamOutput = shouldHideDocumentStreamOutput(newOutput)
            if (isHiddenDocumentStreamOutput) {
              relayDocumentStreamOutputToEditor(newOutput)
              if (newOutput.type === 'document_stream_complete') {
                appendOutputItemToLastAgentTurn(buildRealtimeDocumentCompleteOutput(newOutput))
                pruneEphemeralOutputsFromLastAgentTurn()
              }
              return
            }
            // Cursor-style merge events go through their dedicated paths
            // so deltas update the existing UI in place rather than
            // appending a new row per chunk.
            if (newOutput.type === 'reasoning_step' || newOutput.type === 'reasoning_step_update') {
              applyReasoningStepEvent(newOutput)
            } else if (newOutput.type === 'agent_plan' || newOutput.type === 'agent_plan_update') {
              applyAgentPlanEvent(newOutput)
            } else if (newOutput.type === 'text_delta') {
              applyTextDelta(newOutput)
            } else if (newOutput.type === 'narration_attach') {
              applyNarrationAttach(newOutput)
            } else if (newOutput.type === 'answer') {
              commitFinalAnswer(newOutput)
              pruneEphemeralOutputsFromLastAgentTurn()
            } else {
              appendOutputItemToLastAgentTurn(newOutput)
              if (newOutput.type !== 'tool') {
                pruneEphemeralOutputsFromLastAgentTurn()
              }
            }
          } catch (err) {
            console.error('Failed to parse output item:', err)
          }
        },
        onSessionId: newSessionId => {
          if (!isValidSessionId(newSessionId)) return
          // Always learn the run's session id in this closure so we
          // can keep dropping its later frames if the user has moved
          // on. We just must NOT touch the hook's visible state when
          // stale.
          if (!liveRequestSessionId) {
            liveRequestSessionId = newSessionId
          }
          if (isStale()) return

          // Only adopt the server-assigned session id into the hook's
          // visible state when the user is still looking at the
          // new-chat view that produced this run. If they've already
          // navigated away (clicked "New chat" again, opened another
          // session from the sidebar, etc.) we must NOT yank their
          // view back — the run continues in the background and a
          // later attach will reconnect it.
          const currentSessionId = sessionIdRef.current ?? state.sessionId ?? ''
          const viewingOriginalRequest =
            currentSessionId === requestSessionId || (requestSessionId === '' && currentSessionId === '')
          if (viewingOriginalRequest) {
            requestSessionId = newSessionId
            updateSessionId(newSessionId)
          }
        },
        onRunId: rid => {
          if (isStale()) return
          currentRunIdRef.current = rid
        },
        onTerminate: reason => {
          // A stale handler never touches the visible state — the
          // background run is allowed to finish on its own and the
          // hook has already moved on.
          if (isStale()) return

          // Only finalize the loading state if this run is still bound
          // to the currently-rendered session — otherwise the UI for
          // the currently-viewed session is unaffected by the
          // terminating background run.
          const currentSessionId = sessionIdRef.current ?? state.sessionId ?? ''
          if (!liveRequestSessionId || currentSessionId === liveRequestSessionId) {
            pruneEphemeralOutputsFromLastAgentTurn()
            if (currentRunIdRef.current && reason !== 'disconnected') {
              currentRunIdRef.current = null
            }
            inFlightRef.current = false
            setIsLoading(false)
            setIsGenerating(false)
          }
        },
        onUnrecoverable: error => {
          console.error('[FlowBot] Run unrecoverable; surfacing error', error)
          if (isStale()) return

          const currentSessionId = sessionIdRef.current ?? state.sessionId ?? ''
          if (!liveRequestSessionId || currentSessionId === liveRequestSessionId) {
            appendOutputItemToLastAgentTurn({
              type: 'error',
              text: 'Lost connection to the agent. Please try again.',
              session_id: liveRequestSessionId || undefined,
              error_message: error instanceof Error ? error.message : String(error)
            })
            inFlightRef.current = false
            setIsLoading(false)
            setIsGenerating(false)
          }
        }
      }
    },
    [
      state.sessionId,
      appendOutputItemToLastAgentTurn,
      pruneEphemeralOutputsFromLastAgentTurn,
      applyReasoningStepEvent,
      applyAgentPlanEvent,
      applyTextDelta,
      applyNarrationAttach,
      commitFinalAnswer,
      updateSessionId
    ]
  )

  // Mount-time + session-change resume. When this hook lands on a
  // session that already has an in-flight agent run (because the user
  // refreshed mid-stream, switched away and back, etc.), attach the
  // current handlers to that run so the transcript renders live. The
  // attach helper is idempotent and does not close the connection on
  // unmount — only on explicit cancel.
  useEffect(() => {
    if (!accessToken) return
    const sid = state.sessionId
    if (!sid) return

    let detach: (() => void) | null = null
    let cancelled = false

    const runAttach = async () => {
      // Make sure the manager has tried to pick up background runs at
      // least once. After hard refresh this is the call that recovers
      // background subscriptions; otherwise it's a cheap no-op.
      try {
        await flowbotStreamManager.bootstrap(accessToken)
      } catch {
        /* swallow — fall back to per-session lookup below */
      }
      if (cancelled) return

      // Prefer the store's active pointer (set by bootstrap or by an
      // earlier sendMessage on this session). If absent, fall back to
      // the per-session lookup endpoint so even sessions that weren't
      // in the bootstrap response can be recovered.
      let runId = useStreamStore.getState().activeRunBySession[sid] ?? null
      if (!runId) {
        try {
          const baseUrl = resolveFlowbotBaseUrl()
          const res = await fetch(`${baseUrl}/flowbot/api/agent/session/${sid}/active-run`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json'
            }
          })
          if (res.ok) {
            const payload = (await res.json()) as { run_id?: string; status?: string } | null
            if (payload && typeof payload.run_id === 'string' && payload.status === 'running') {
              runId = payload.run_id
              useStreamStore.getState().registerRun({
                runId,
                sessionId: sid,
                status: 'streaming'
              })
            }
          }
        } catch (err) {
          console.warn('[FlowBot] active-run lookup failed for', sid, err)
        }
      }
      if (cancelled || !runId) return

      currentRunIdRef.current = runId
      setIsGenerating(true)
      const handlers = buildStreamHandlers(sid)
      detach = flowbotStreamManager.attach(runId, handlers, accessToken)
    }

    void runAttach()

    return () => {
      cancelled = true
      if (detach) {
        detach()
        detach = null
      }
    }
  }, [accessToken, state.sessionId, buildStreamHandlers])

  const sendMessage = useCallback(
    async (
      userInputText: string,
      files: File[],
      isThinking: boolean = false,
      webSearchMode: WebSearchMode = 'off',
      additionInfo?: string,
      skills?: string[],
      mentions?: Array<{ id: string; type: string; display: string }>,
      handsFreeMode: boolean = false
    ) => {
      if (!userInputText.trim() && files.length === 0) return
      if (inFlightRef.current) return

      // Capture the session ID at the START of this request
      // This ensures we can validate that stream events belong to this session
      // Using 'let' because backend may assign a new session ID for new chats
      const requestSessionId = sessionIdRef.current ?? state.sessionId ?? ''
      console.log('[FlowBot][sendMessage] Starting request for session:', requestSessionId || '(new session)')
      let flowbotEndpoint: string | undefined

      try {
        inFlightRef.current = true
        setIsLoading(true)
        setIsGenerating(true)

        // Reset agent outputs tracking for this new message
        currentAgentOutputsRef.current = []
        pendingTextDeltaBuffersRef.current = {}
        pendingReasoningStepUpdatesRef.current = {}

        const displayMessage = resolveUserMessageDisplayText(userInputText)

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
        form.append('model_kind', FLOWBOT_MODEL_KIND_DEFAULT)
        form.append('web_search_mode', webSearchMode)
        form.append('hands_free_mode', handsFreeMode.toString())
        // Append when explicitly provided (including empty string) so callers can
        // force inclusion of the multipart field for document-edit flows.
        if (additionInfo !== undefined) {
          form.append('addition_info', additionInfo)
        }
        const effectiveSkills =
          skills ?? (pageSkillsEnabled && activePageSkills.length > 0 ? activePageSkills : undefined)
        if (effectiveSkills !== undefined) {
          effectiveSkills.forEach(skill => {
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
          currentPagePayload: currentPagePayload as RealtimeDocumentContext,
          hasFiles: files.length > 0,
          isThinking,
          webSearchMode
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
        flowbotEndpoint = url

        // Build the SSE handler set once, then hand it to the global
        // stream manager. The manager owns the actual fetch / reader /
        // reconnect loop — this hook only cares about rendering frames
        // into the local conversation state.
        const handlers = buildStreamHandlers(requestSessionId)

        let runStartResult: {
          runId: string | null
          complete: Promise<'completed' | 'errored' | 'cancelled' | 'disconnected'>
        }
        try {
          runStartResult = await flowbotStreamManager.startRun({
            url,
            formData: form,
            accessToken,
            provisionalSessionId: effectiveSessionId || requestSessionId || null,
            handlers
          })
        } catch (error) {
          const status = (error as { status?: number }).status
          if (status === 404 || status === 401 || status === 403) {
            console.warn('Session invalid during message send, clearing session')
            clearInvalidSession()
            setState(prev => ({ ...prev, sessionId: null }))
            sessionIdRef.current = null
          }
          throw error
        }

        currentRunIdRef.current = runStartResult.runId

        // Wait for the stream to reach a terminal state so legacy
        // call-sites that `await sendMessage(...)` still work as before.
        // The agent and SSE log are durable on the backend, so even if
        // this await is interrupted (component unmount, tab close) the
        // run continues to completion and a later /resume picks up the
        // tail.
        const terminalReason = await runStartResult.complete

        if (terminalReason === 'errored' || terminalReason === 'disconnected') {
          // We don't show an error bubble for `disconnected` because the
          // manager keeps trying to reconnect — only when reconnect is
          // permanently exhausted do subscribers receive `onUnrecoverable`.
          if (terminalReason === 'errored') {
            appendOutputItemToLastAgentTurn({
              type: 'error',
              text: 'Something went wrong while processing your request. You can report this so we can investigate.',
              session_id: requestSessionId || sessionIdRef.current || state.sessionId || undefined,
              flowbot_endpoint: flowbotEndpoint
            })
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Manual cancel; the manager already wrote a terminal entry
          // and the persistence is owned server-side now.
          console.log('[FlowBot][sendMessage] Request was aborted for session:', requestSessionId || '(new)')
          return
        }
        console.error('[FlowBot][sendMessage] Error sending message for session:', requestSessionId, error)

        appendOutputItemToLastAgentTurn({
          type: 'error',
          text: 'Something went wrong while processing your request. You can report this so we can investigate.',
          session_id: requestSessionId || sessionIdRef.current || state.sessionId || undefined,
          flowbot_endpoint: flowbotEndpoint,
          error_message: error instanceof Error ? error.message : String(error)
        })
      } finally {
        console.log('[FlowBot][sendMessage] Request completed for session:', requestSessionId || '(new)')
        pruneEphemeralOutputsFromLastAgentTurn()
        inFlightRef.current = false
        setIsLoading(false)
        setIsGenerating(false)
        currentAgentOutputsRef.current = []
        pendingTextDeltaBuffersRef.current = {}
        pendingReasoningStepUpdatesRef.current = {}
      }
    },
    [
      accessToken,
      pushTurn,
      state.sessionId,
      sessionIdRef,
      appendOutputItemToLastAgentTurn,
      pruneEphemeralOutputsFromLastAgentTurn,
      applyReasoningStepEvent,
      applyAgentPlanEvent,
      applyTextDelta,
      applyNarrationAttach,
      commitFinalAnswer,
      updateSessionId,
      buildCurrentPageContextPayload,
      pageSkillsEnabled,
      activePageSkills
    ]
  )

  const cancelGeneration = useCallback(async () => {
    let cancelApiMessageText: string | null = null // Fallback for when cancel API fails
    let cancelOutput: OutputItem | null = null // Cancel API response

    // Cancel via the global stream manager. This both:
    //   1) sets the Redis cancel flag on the backend so the background
    //      recorder breaks the agent loop and writes a terminal entry,
    //   2) aborts our local SSE fetch so the reader closes promptly.
    // The manager handles the absence of a known runId gracefully.
    if (state.sessionId && accessToken) {
      try {
        const baseUrl = resolveFlowbotBaseUrl()
        const runId = currentRunIdRef.current ?? useStreamStore.getState().activeRunBySession[state.sessionId] ?? null

        if (runId) {
          // `skipNetwork: true` because we POST /chat/cancel ourselves
          // below to capture the `message` OutputItem; the manager
          // just aborts the local SSE reader and clears bookkeeping.
          await flowbotStreamManager.cancel({
            runId,
            sessionId: state.sessionId,
            accessToken,
            skipNetwork: true
          })
        }

        // The legacy /chat/cancel response still carries a `message`
        // OutputItem describing any side-effects that were committed
        // during the cancelled turn. Surface it as the assistant turn.
        const form = new FormData()
        form.append('session_id', state.sessionId)
        if (runId) form.append('run_id', runId)

        const res = await fetch(`${baseUrl}/flowbot/api/agent/chat/cancel`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form
        })

        if (res.ok) {
          const payload: any = await res.json().catch(() => null)
          cancelOutput = (payload?.message ?? null) as OutputItem | null
        } else if (res.status !== 404) {
          const text = await res.text().catch(() => '')
          cancelApiMessageText = text ? `Cancel failed (${res.status}): ${text}` : `Cancel failed (${res.status})`
        }

        currentRunIdRef.current = null
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
    if (userMessageText && !isNonRestorableUserDisplayMessage(userMessageText)) {
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
      saveState(newState, userSubRef.current)
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

    const cacheKey = `${PRECHAT_MODEL_KIND}:${prechatContextKey}`
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
      // For prechat suggestions we only need lightweight page context without analytics.
      // Re-parse the live URL here too — see the same rationale in
      // `buildCurrentPageContextPayload` above. Prechat fires when the
      // sidepanel is reopened or the route changes; if React state is even
      // briefly stale, we'd cache and surface suggestions for the wrong page.
      const url = typeof window !== 'undefined' ? window.location.href : ''
      const route = typeof window !== 'undefined' ? window.location.pathname : ''
      const livePageContext = getCurrentPageContext()
      const baseCurrentPage = {
        url,
        route,
        view: undefined as string | undefined,
        type: livePageContext.type,
        entity_name:
          livePageContext.type === 'entity' || livePageContext.type === 'overview'
            ? livePageContext.entity_name
            : undefined,
        id: livePageContext.type === 'entity' ? livePageContext.id : undefined
      }
      const prechatContext = prepareCurrentPageContext({
        currentPage: baseCurrentPage
      })
      form.append('current_page_context', JSON.stringify(prechatContext))
      form.append('model_kind', PRECHAT_MODEL_KIND)

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
    console.log('[FlowBot][clearConversation] Starting new chat (background runs preserved)')

    // "New chat" is a pure frontend view change, NOT a cancellation.
    // Per the resumable-streaming design, any in-flight run on the
    // previous session must keep streaming in the background so the
    // user can come back to it via the sidebar (where it shows a
    // "Running" badge). The explicit Stop button — wired to
    // `cancelGeneration` — is the only thing that should cancel a run.
    //
    // We intentionally do NOT:
    //   - call `flowbotStreamManager.cancel(...)`
    //   - clear the previous session's conversation snapshot
    //   - touch `currentRunIdRef` for the previous session (no-op here
    //     since this hook is about to point at a brand-new session)
    //
    // We DO reset the local "is sending / is generating" flags so the
    // brand-new chat's input is immediately usable. Previously these
    // were cleared by the cancel path's ``onTerminate`` callback, but
    // since we no longer cancel on "New chat" we must clear them here
    // explicitly — otherwise the input stays disabled forever.
    //
    // Bumping the navigation epoch invalidates any handlers attached
    // to the previous run so their late-arriving frames can't leak
    // into this brand-new chat (e.g., the previous run's ``session-id``
    // event arriving after the new-chat click would otherwise yank
    // the user back to the old session).
    navigationEpochRef.current += 1
    currentRunIdRef.current = null
    inFlightRef.current = false
    setIsLoading(false)
    setIsGenerating(false)

    setState({ conversation: [], sessionId: null, oldestMessageId: null, hasMoreHistory: false })
    sessionIdRef.current = null
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
        saveState(newState, userSubRef.current)
        return newState
      })

      // Wait for state update to complete before sending new message
      await new Promise(resolve => setTimeout(resolve, 0))

      // Add new message (resend)
      await sendMessage(newText, [], false, 'off')
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
      console.log('[FlowBot][loadSession] Loading session:', sessionId)

      // Per the resumable-streaming plan, switching sessions never
      // aborts any background run — it's a pure frontend view change.
      // The mount-effect above will attach to the new session's
      // in-flight run (if any) and frames will resume rendering.
      //
      // Bumping the navigation epoch detaches the hook from any
      // previously-attached run's handlers so their late frames can't
      // mutate the new view.
      navigationEpochRef.current += 1
      currentRunIdRef.current = null
      inFlightRef.current = false
      setIsGenerating(false)

      saveState({ conversation: [], sessionId, oldestMessageId: null, hasMoreHistory: false }, userSubRef.current)
      sessionIdRef.current = sessionId
      lastFetchedSessionIdRef.current = sessionId
      setIsLoading(true)
      try {
        const history = await loadHistory(accessToken, sessionId)
        setState(history)
        lastFetchedSessionIdRef.current = history.sessionId ?? null
        console.log('[FlowBot][loadSession] Successfully loaded session with', history.conversation.length, 'turns')
      } catch (error) {
        console.error('[FlowBot][loadSession] Failed to load session:', error)
        setState({ conversation: [], sessionId, oldestMessageId: null, hasMoreHistory: false })
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken]
  )

  /**
   * Load the previous (older) page of messages for the current session and
   * prepend them to the conversation. Used by the "Load more" affordance at
   * the top of the chat transcript.
   *
   * Returns the number of turns that were prepended so callers can preserve
   * scroll position across the layout shift.
   */
  const loadMoreHistory = useCallback(async (): Promise<number> => {
    if (isLoadingMoreHistoryRef.current) return 0
    const activeSessionId = sessionIdRef.current ?? state.sessionId
    if (!isValidSessionId(activeSessionId)) return 0
    if (!state.hasMoreHistory) return 0
    if (state.oldestMessageId === null || state.oldestMessageId === undefined) return 0

    isLoadingMoreHistoryRef.current = true
    setIsLoadingMoreHistory(true)
    try {
      const older = await loadHistory(accessToken, activeSessionId, {
        beforeId: state.oldestMessageId
      })
      const prependedCount = older.conversation.length
      if (prependedCount === 0 && !older.hasMoreHistory) {
        setState(prev => ({ ...prev, hasMoreHistory: false }))
        return 0
      }

      setState(prev => ({
        ...prev,
        conversation: [...older.conversation, ...prev.conversation],
        oldestMessageId: older.oldestMessageId ?? prev.oldestMessageId,
        hasMoreHistory: older.hasMoreHistory
      }))
      return prependedCount
    } catch (error) {
      console.error('[FlowBot] Failed to load older history:', error)
      return 0
    } finally {
      isLoadingMoreHistoryRef.current = false
      setIsLoadingMoreHistory(false)
    }
  }, [accessToken, state.sessionId, state.hasMoreHistory, state.oldestMessageId])

  const getAllSessions = useCallback(async () => {
    return getAllFlowBotSessions(accessToken)
  }, [accessToken])

  const deleteSession = useCallback(
    async (sessionIdToDelete: string) => {
      await deleteChatSession(sessionIdToDelete, accessToken)
      // Drop the per-session conversation snapshot so a future tab
      // load with this sessionId pointer can't resurrect a deleted
      // transcript from localStorage.
      clearConversationSnapshot(sessionIdToDelete)
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
    loadSession,
    loadMoreHistory,
    hasMoreHistory: state.hasMoreHistory,
    isLoadingMoreHistory,
    pageSkillsEnabled,
    togglePageSkills,
    activePageSkills
  }
}
