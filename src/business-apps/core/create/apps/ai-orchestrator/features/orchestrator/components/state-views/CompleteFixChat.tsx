import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { Bot, Loader2, Send, X } from 'lucide-react'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import { useDebounce } from '@/common/hooks/useDebounce'

type MessageRole = 'user' | 'assistant'

interface Message {
  role: MessageRole
  content: string
  messageId?: string
  createdAt?: string
}

export interface CompleteFixChatProps {
  accessToken: string
  sessionId: string
  repoId: string
  onPreviewRefresh?: () => void
  onWorkingChange?: (isWorking: boolean) => void
}

const CUSTOM_SYSTEM_PROMPT = `You are a concise UI fix assistant for CREATE preview iterations.

Rules:
- Apply the requested visual/behavior fix directly in code.
- Keep your final response short (2-4 lines max).
- Do not include tool logs, stack traces, or long explanations.
- Mention only what changed and any quick follow-up if needed.
`

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const CompleteFixChat: React.FC<CompleteFixChatProps> = ({
  accessToken,
  sessionId,
  repoId,
  onPreviewRefresh,
  onWorkingChange
}) => {
  const builderClient = useBuilderClient(accessToken)
  const [open, setOpen] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number } | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const debouncedMessages = useDebounce(messages, 700)
  const messagesRef = useRef<Message[]>([])
  const lastChangeCountRef = useRef(0)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    onWorkingChange?.(loading)
  }, [loading, onWorkingChange])

  const createMessageId = useCallback((): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }, [])

  const getChangeCount = useCallback(async (): Promise<number> => {
    try {
      const data = await builderClient.getChanges(repoId, sessionId)
      return data.summary?.files?.length ?? data.changes?.length ?? 0
    } catch {
      return 0
    }
  }, [builderClient, repoId, sessionId])

  useEffect(() => {
    let mounted = true
    const loadHistory = async () => {
      const history = await builderClient.loadChatHistory(repoId, sessionId)
      if (!mounted || !history.length) return
      const normalized: Message[] = history
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role,
          content: msg.content,
          messageId: msg.messageId ?? createMessageId(),
          createdAt: msg.createdAt ?? new Date().toISOString()
        }))
      setMessages(normalized.slice(-8))
    }
    loadHistory()
    return () => {
      mounted = false
    }
  }, [builderClient, createMessageId, repoId, sessionId])

  useEffect(() => {
    if (!debouncedMessages.length) return
    void builderClient.saveChatHistory(repoId, sessionId, debouncedMessages)
  }, [builderClient, debouncedMessages, repoId, sessionId])

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const dragStart = dragStartRef.current
    if (!dragStart) return
    setDragOffset({
      x: dragStart.startX + (event.clientX - dragStart.pointerX),
      y: dragStart.startY + (event.clientY - dragStart.pointerY)
    })
  }, [])

  const handlePointerUp = useCallback(() => {
    dragStartRef.current = null
    setDragging(false)
    globalThis.removeEventListener('pointermove', handlePointerMove)
    globalThis.removeEventListener('pointerup', handlePointerUp)
  }, [handlePointerMove])

  const handleDragStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!open) return
      dragStartRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        startX: dragOffset.x,
        startY: dragOffset.y
      }
      setDragging(true)
      globalThis.addEventListener('pointermove', handlePointerMove)
      globalThis.addEventListener('pointerup', handlePointerUp)
    },
    [dragOffset.x, dragOffset.y, handlePointerMove, handlePointerUp, open]
  )

  const handleSend = useCallback(async () => {
    const prompt = input.trim()
    if (!prompt || loading) return

    if (!repoId || !UUID_REGEX.test(repoId)) {
      setErrorMessage(`Invalid repoId: "${repoId}"`)
      return
    }
    if (!sessionId?.trim()) {
      setErrorMessage('Missing sessionId for fix chat.')
      return
    }

    setErrorMessage(null)
    setLoading(true)
    setInput('')

    const userMessage: Message = {
      role: 'user',
      content: prompt,
      messageId: createMessageId(),
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage].slice(-12))

    const baselineCount = await getChangeCount()
    lastChangeCountRef.current = baselineCount

    try {
      const history = messagesRef.current.slice(-20).map(m => ({
        role: m.role,
        content: m.content,
        messageId: m.messageId,
        createdAt: m.createdAt
      }))

      const stream = await builderClient.queryCode(
        repoId,
        prompt,
        history,
        true,
        true,
        sessionId,
        'claude',
        CUSTOM_SYSTEM_PROMPT
      )

      const assistantMessageId = createMessageId()
      setMessages(prev =>
        [
          ...prev,
          {
            role: 'assistant' as const,
            content: '',
            messageId: assistantMessageId,
            createdAt: new Date().toISOString()
          }
        ].slice(-12)
      )

      const reader = stream.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let hasScreenBuildSuccess = false
      let hasMutationToolCall = false
      let hasAssistantResponseChunk = false

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (!payload || payload === '[DONE]') continue

          let eventData: Record<string, unknown> | null = null
          try {
            eventData = JSON.parse(payload) as Record<string, unknown>
          } catch {
            eventData = null
          }
          if (!eventData) continue

          const eventType = String(eventData.type ?? '')
          if (eventType === 'tool_call') {
            const toolName = String(eventData.toolName ?? '')
            if (['write_file', 'delete_file', 'screen_build', 'run_command'].includes(toolName)) {
              hasMutationToolCall = true
            }
          }
          if (eventType === 'response' || eventType === 'token') {
            const chunk = String(eventData.content ?? '')
            if (chunk.trim().length > 0) {
              hasAssistantResponseChunk = true
            }
            setMessages(prev =>
              prev.map(message =>
                message.messageId === assistantMessageId
                  ? { ...message, content: `${message.content}${chunk}` }
                  : message
              )
            )
          }

          if (eventType === 'tool_result' && String(eventData.toolName ?? '') === 'screen_build') {
            const result = JSON.stringify(eventData.toolResult ?? '')
            if (result.includes('"success":true') || result.includes('"success": true')) {
              hasScreenBuildSuccess = true
            }
          }

          if (eventType === 'error') {
            throw new Error(String(eventData.content ?? 'Fix request failed'))
          }
        }
      }

      const finalMessage = messagesRef.current.find(message => message.messageId === assistantMessageId)
      if (!finalMessage?.content?.trim()) {
        setMessages(prev =>
          prev.map(message =>
            message.messageId === assistantMessageId
              ? { ...message, content: 'Applied. Please review the preview and let me know the next tweak.' }
              : message
          )
        )
      }

      const changeCountAfter = await getChangeCount()
      const hasCountDelta = changeCountAfter !== lastChangeCountRef.current
      const shouldRefresh = hasCountDelta || hasScreenBuildSuccess || hasMutationToolCall || hasAssistantResponseChunk
      if (shouldRefresh) {
        onPreviewRefresh?.()
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Fix request failed'
      setErrorMessage(msg)
      setMessages(prev =>
        [
          ...prev,
          {
            role: 'assistant' as const,
            content: `I could not apply this fix: ${msg}`,
            messageId: createMessageId(),
            createdAt: new Date().toISOString()
          }
        ].slice(-12)
      )
    } finally {
      setLoading(false)
    }
  }, [builderClient, createMessageId, getChangeCount, input, loading, onPreviewRefresh, repoId, sessionId])

  const shortHistory = useMemo(() => messages.slice(-4), [messages])

  return (
    <div
      className={`gba:absolute gba:z-20 gba:top-[18px] gba:right-[18px] gba:select-none ${dragging ? 'gba:cursor-grabbing' : ''}`}
      style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
    >
      {open ? (
        <div className="gba:w-[320px] gba:max-w-[80vw] gba:rounded-t-xl gba:rounded-b-lg gba:border gba:bg-background/98 gba:shadow-xl gba:backdrop-blur">
          <div
            className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-b gba:cursor-grab active:gba:cursor-grabbing"
            onPointerDown={handleDragStart}
          >
            <div className="gba:flex gba:items-center gba:gap-2">
              <Bot className="gba:w-4 gba:h-4 gba:text-primary" />
              <span className="gba:text-xs gba:font-semibold">AI Fix</span>
              {loading ? <Loader2 className="gba:w-3.5 gba:h-3.5 gba:animate-spin" /> : null}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="gba:h-7 gba:w-7 gba:p-0">
              <X className="gba:w-4 gba:h-4" />
            </Button>
          </div>

          <div className="gba:px-3 gba:pt-2 gba:pb-1 gba:max-h-40 gba:overflow-y-auto gba:space-y-2">
            {shortHistory.length === 0 ? (
              <p className="gba:text-[11px] gba:text-muted-foreground">
                Quick fixes only. Example: "Make Save button blue and fix click action."
              </p>
            ) : (
              shortHistory.map(message => (
                <div
                  key={message.messageId}
                  className={`gba:text-[11px] gba:leading-relaxed ${
                    message.role === 'user' ? 'gba:text-foreground' : 'gba:text-muted-foreground'
                  }`}
                >
                  <span className="gba:font-semibold">{message.role === 'user' ? 'You: ' : 'AI: '}</span>
                  <span>{message.content || (loading && message.role === 'assistant' ? '...' : '')}</span>
                </div>
              ))
            )}
          </div>

          {errorMessage ? (
            <p className="gba:px-3 gba:pb-1 gba:text-[11px] gba:text-destructive">{errorMessage}</p>
          ) : null}

          <div className="gba:p-3 gba:pt-2">
            <Textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder="Describe a quick fix..."
              rows={2}
              className="gba:text-xs"
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void handleSend()
                }
              }}
            />
            <div className="gba:flex gba:justify-end gba:mt-2">
              <Button
                size="sm"
                onClick={() => void handleSend()}
                disabled={loading || !input.trim()}
                className="gba:h-7"
              >
                {loading ? (
                  <Loader2 className="gba:w-3.5 gba:h-3.5 gba:animate-spin" />
                ) : (
                  <Send className="gba:w-3.5 gba:h-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2.5 gba:rounded-xl gba:bg-background/95 gba:border gba:border-blue-200/70 dark:gba:border-blue-500/35 gba:shadow-sm hover:gba:shadow-md hover:gba:border-blue-300/80 dark:hover:gba:border-blue-400/50"
        >
          <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-blue-500 gba:shrink-0" />
          <Bot className="gba:w-4.5 gba:h-4.5 gba:text-primary" />
          <span className="gba:text-sm gba:font-medium">AI Fix</span>
        </button>
      )}
    </div>
  )
}

export default CompleteFixChat
