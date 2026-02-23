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
  Input,
  Label,
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

const MOCK_MODEL_ID = 'mock'

function friendlyLabel(key: string): string {
  const lower = key.toLowerCase().replace(/_/g, ' ')
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function formatUserMessage(paramValues: Record<string, string>, paramKeys: string[]): string {
  if (paramKeys.length <= 1) {
    return paramValues[paramKeys[0]] ?? paramValues['message'] ?? ''
  }
  return paramKeys.map(k => `${friendlyLabel(k)}: ${paramValues[k] ?? ''}`).join('\n')
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
  const [paramValues, setParamValues] = useState<Record<string, string>>({})
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isMock = !!promptProp && promptProp.model.id === MOCK_MODEL_ID

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

  const effectiveParamKeys = paramKeys.length > 0 ? paramKeys : ['message']
  const isMultiParam = effectiveParamKeys.length > 1

  const canSend = !sending && effectiveParamKeys.every(k => (paramValues[k] ?? '').trim().length > 0)

  const setParamValue = useCallback((key: string, value: string) => {
    setParamValues(prev => ({ ...prev, [key]: value }))
  }, [])

  const sendMessage = useCallback(async () => {
    if (!canSend) return
    const userParams: Record<string, string> = {}
    effectiveParamKeys.forEach(k => {
      userParams[k] = (paramValues[k] ?? '').trim()
    })

    const userMessageText = formatUserMessage(userParams, effectiveParamKeys)
    setMessages(prev => [...prev, { role: 'user', content: userMessageText }])
    setSendError(null)
    setSending(true)

    if (isMock) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Demo mode: chat is not executed.' }])
        setSending(false)
      }, 400)
      return
    }

    const fd = new FormData()
    fd.append('user_params', JSON.stringify(userParams))
    fd.append('context', JSON.stringify({ executionMode: 'test' }))

    if (promptProp && !agentId) {
      fd.append('model_id', promptProp.model.id)
      fd.append('user_content', promptProp.user_content.template ?? '')
      if (promptProp.system_content?.template) fd.append('system_content', promptProp.system_content.template)
      if (promptProp.tools) fd.append('tools', promptProp.tools)
      if (promptProp.model_settings && Object.keys(promptProp.model_settings).length > 0) {
        fd.append('model_settings', JSON.stringify(promptProp.model_settings))
      }
    }

    if (!promptProp && !agentId) {
      setSending(false)
      return
    }

    try {
      const res = promptProp && !agentId ? await client.executePrompt(fd) : await client.executePromptById(agentId!, fd)
      const content =
        typeof res.content === 'string' ? res.content : res.content != null ? JSON.stringify(res.content) : ''
      setMessages(prev => [...prev, { role: 'assistant', content: content || '(No response)' }])
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, the request failed. Please try again.' }])
    } finally {
      setSending(false)
    }
  }, [client, agentId, promptProp, paramValues, effectiveParamKeys, canSend, isMock])

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

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0" data-testid={testId}>
      <Card className="gba:shrink-0 gba:border-border">
        <CardHeader className="gba:border-b gba:border-border">
          <div className="gba:flex gba:items-start gba:gap-4">
            <div className="gba:p-3 gba:rounded-xl gba:bg-primary/10">
              <Bot className="gba:h-8 gba:w-8 gba:text-primary" />
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <CardTitle className="gba:text-lg">{prompt.name}</CardTitle>
              {prompt.description && (
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{prompt.description}</p>
              )}
              {prompt.specialty && (
                <p className="gba:text-sm gba:text-foreground gba:mt-2 gba:font-medium">{prompt.specialty}</p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col gba:border-border gba:mt-4">
        <CardHeader className="gba:shrink-0 gba:border-b gba:border-border">
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
            <MessageSquare className="gba:h-4 gba:w-4" /> Try it out
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col gba:pt-4 gba:gap-4">
          <ScrollArea className="gba:flex-1 gba:min-h-[120px] gba:rounded-md gba:border gba:border-border gba:p-3">
            <div className="gba:space-y-3">
              {messages.length === 0 ? (
                <p className="gba:text-sm gba:text-muted-foreground">
                  Fill in the fields below and run the agent to see the response.
                </p>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    className={`gba:flex ${m.role === 'user' ? 'gba:justify-end' : 'gba:justify-start'}`}
                    data-testid={`${testId}-msg-${i}`}
                  >
                    <div
                      className={`gba:max-w-[85%] gba:rounded-lg gba:px-3 gba:py-2 gba:text-sm gba:whitespace-pre-wrap ${m.role === 'user' ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-muted gba:text-foreground'}`}
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
            <Alert variant="destructive">
              <AlertDescription>{sendError}</AlertDescription>
            </Alert>
          )}

          <div className="gba:shrink-0 gba:flex gba:flex-col gba:gap-3">
            {isMultiParam ? (
              <>
                <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                  {effectiveParamKeys.map(key => (
                    <div key={key} className="gba:flex gba:flex-col gba:gap-1">
                      <Label className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                        {friendlyLabel(key)}
                      </Label>
                      <Input
                        value={paramValues[key] ?? ''}
                        onChange={e => setParamValue(key, e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage()
                          }
                        }}
                        placeholder={friendlyLabel(key)}
                        disabled={sending}
                        data-testid={`${testId}-input-${key}`}
                      />
                    </div>
                  ))}
                </div>
                <Button
                  variant="default"
                  onClick={sendMessage}
                  disabled={!canSend}
                  className="gba:self-end"
                  data-testid={`${testId}-send`}
                >
                  <Send className="gba:h-4 gba:w-4 gba:mr-2" />
                  Run
                </Button>
              </>
            ) : (
              <div className="gba:flex gba:gap-2">
                <div className="gba:flex gba:flex-col gba:gap-1 gba:flex-1">
                  {effectiveParamKeys[0] !== 'message' && (
                    <Label className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                      {friendlyLabel(effectiveParamKeys[0])}
                    </Label>
                  )}
                  <Textarea
                    value={paramValues[effectiveParamKeys[0]] ?? ''}
                    onChange={e => setParamValue(effectiveParamKeys[0], e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder="Type your message..."
                    rows={2}
                    className="gba:resize-none"
                    disabled={sending}
                    data-testid={`${testId}-chat-input`}
                  />
                </div>
                <Button
                  variant="default"
                  size="icon"
                  onClick={sendMessage}
                  disabled={!canSend}
                  className="gba:self-end"
                  data-testid={`${testId}-send`}
                >
                  <Send className="gba:h-4 gba:w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
