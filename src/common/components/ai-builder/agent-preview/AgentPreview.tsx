import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Alert,
  AlertDescription,
  Button,
  Textarea,
  ScrollArea
} from '@newwork/nw-design-system'
import { Bot, Send, MessageSquare } from 'lucide-react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'

export interface AgentPreviewProps {
  accessToken: string
  /** When provided, template/prompt is used and agentId is ignored. */
  prompt?: PromptODM | null
  paramKeys?: string[] | null
  /** When prompt is not provided, fetch by this id. */
  agentId?: string
  'data-testid'?: string
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const DEMO_MOCK_REPLY = 'Demo mode: chat is not executed.'

function friendlyLabel(key: string): string {
  const lower = key.toLowerCase().replace(/_/g, ' ')
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export const AgentPreview: React.FC<AgentPreviewProps> = ({
  accessToken,
  prompt: promptProp,
  paramKeys: paramKeysProp,
  agentId,
  'data-testid': testId = 'agent-preview'
}) => {
  const client = usePromptManagerClient(accessToken)
  const [prompt, setPrompt] = useState<PromptODM | null>(promptProp ?? null)
  const [paramKeys, setParamKeys] = useState<string[]>(paramKeysProp ?? [])
  const [loading, setLoading] = useState(promptProp == null && !!agentId)
  const [error, setError] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isMock = !!promptProp

  useEffect(() => {
    if (promptProp != null) {
      setPrompt(promptProp)
      setParamKeys(paramKeysProp ?? [])
      setLoading(false)
      setError(null)
      return
    }
    if (!agentId || !accessToken) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      client.getPrompt(agentId),
      client.getPromptParameters(agentId).catch(() => ({ system_parameters: [], user_parameters: [] }))
    ])
      .then(([p, params]) => {
        if (cancelled) return
        setPrompt(p)
        const keys = [...(params.user_parameters || []), ...(params.system_parameters || [])].filter(Boolean)
        setParamKeys(keys)
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load expert')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [client, agentId, accessToken, promptProp, paramKeysProp])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = chatInput.trim()
    if (!text) return
    setChatInput('')
    setSendError(null)
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setSending(true)
    if (isMock) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: DEMO_MOCK_REPLY }])
        setSending(false)
      }, 400)
      return
    }
    if (!agentId || !accessToken) {
      setSending(false)
      return
    }
    try {
      const fd = new FormData()
      const params: Record<string, string> = {}
      if (paramKeys.length > 0) {
        params[paramKeys[0]] = text
        paramKeys.forEach(k => {
          if (k !== paramKeys[0] && !(k in params)) params[k] = ''
        })
      } else {
        params['message'] = text
      }
      if (Object.keys(params).length > 0) fd.append('user_params', JSON.stringify(params))
      fd.append('context', JSON.stringify({ executionMode: 'test' }))
      const res = await client.executePromptById(agentId, fd)
      const content =
        typeof res.content === 'string' ? res.content : res.content != null ? JSON.stringify(res.content) : ''
      setMessages(prev => [...prev, { role: 'assistant', content: content || '(No response)' }])
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, the request failed. Please try again.' }])
    } finally {
      setSending(false)
    }
  }, [client, agentId, accessToken, paramKeys, chatInput, isMock])

  if (loading)
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid={`${testId}-loading`}>
        <Spinner size="lg" />
      </div>
    )
  if (error)
    return (
      <Alert variant="destructive" data-testid={`${testId}-error`}>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  if (!prompt)
    return (
      <div className="gba:text-muted-foreground gba:py-4" data-testid={`${testId}-empty`}>
        No expert data.
      </div>
    )

  const inputDescription =
    paramKeys.length === 0
      ? 'You can send a message or question in your own words.'
      : paramKeys.length === 1
        ? `You provide: ${friendlyLabel(paramKeys[0])}.`
        : `You provide: ${paramKeys.map(k => friendlyLabel(k)).join(', ')}.`

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0" data-testid={testId}>
      <Card className="gba:shrink-0 gba:border-border">
        <CardHeader className="gba:border-b gba:border-border">
          <div className="gba:flex gba:items-start gba:gap-4">
            <div className="gba:p-3 gba:rounded-xl gba:bg-primary/10">
              <Bot className="gba:h-8 gba:w-8 gba:text-primary" />
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <CardTitle className="gba:text-lg">Meet {prompt.name}</CardTitle>
              {prompt.description && (
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{prompt.description}</p>
              )}
              {prompt.specialty && (
                <p className="gba:text-sm gba:text-foreground gba:mt-2 gba:font-medium">{prompt.specialty}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="gba:pt-4">
          <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-1">Input</p>
          <p className="gba:text-sm gba:text-foreground">{inputDescription}</p>
          <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mt-3 gba:mb-1">Output</p>
          <p className="gba:text-sm gba:text-foreground">The expert returns a text answer based on your message.</p>
        </CardContent>
      </Card>
      <Card className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col gba:border-border gba:mt-4">
        <CardHeader className="gba:shrink-0">
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
            <MessageSquare className="gba:h-4 gba:w-4" /> Chat with {prompt.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col gba:pt-0">
          <ScrollArea className="gba:flex-1 gba:min-h-[200px] gba:rounded-md gba:border gba:border-border gba:p-3">
            <div className="gba:space-y-3">
              {messages.length === 0 ? (
                <p className="gba:text-sm gba:text-muted-foreground">Send a message below to start the conversation.</p>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    className={`gba:flex ${m.role === 'user' ? 'gba:justify-end' : 'gba:justify-start'}`}
                    data-testid={`${testId}-msg-${i}`}
                  >
                    <div
                      className={`gba:max-w-[85%] gba:rounded-lg gba:px-3 gba:py-2 gba:text-sm ${m.role === 'user' ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-muted gba:text-foreground'}`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              {sending && (
                <div className="gba:flex gba:justify-start">
                  <span className="gba:text-sm gba:text-muted-foreground">Thinking...</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
          {sendError && (
            <Alert variant="destructive" className="gba:mt-2">
              <AlertDescription>{sendError}</AlertDescription>
            </Alert>
          )}
          <div className="gba:flex gba:gap-2 gba:mt-3">
            <Textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Type your message..."
              rows={2}
              className="gba:resize-none gba:flex-1"
              disabled={sending}
              data-testid={`${testId}-chat-input`}
            />
            <Button
              variant="default"
              size="icon"
              onClick={sendMessage}
              disabled={sending || !chatInput.trim()}
              data-testid={`${testId}-send`}
            >
              <Send className="gba:h-4 gba:w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
