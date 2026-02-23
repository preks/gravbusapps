import React, { useCallback, useEffect, useRef, useState } from 'react'
import { PreviewTemplate } from '../preview-template'
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
  ScrollArea,
  Badge,
  Separator,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { Bot, Send, MessageSquare, Wrench, BookOpen, Brain, ChevronDown, ChevronRight } from 'lucide-react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { PromptODM, AIModelODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'

export interface AgentPreviewItem {
  id: string
  label: string
  prompt: PromptODM
  paramKeys?: string[]
}

export interface AgentPreviewProps {
  accessToken: string
  /** Multiple preloaded agents with switcher. */
  items?: AgentPreviewItem[]
  /** Single preloaded prompt (no switcher). */
  prompt?: PromptODM | null
  paramKeys?: string[] | null
  /** Fetch a single agent by id (no switcher). */
  agentId?: string
  'data-testid'?: string
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

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

const RESPONSE_STYLE_LABELS: Record<string, string> = {
  formal: 'Formal',
  conversational: 'Conversational',
  technical: 'Technical'
}

const CITATION_MODE_LABELS: Record<string, string> = {
  always: 'Always cite',
  when_needed: 'Cite when needed',
  never: 'No citations'
}

function resolveSchemaType(schema: Record<string, unknown>): string {
  if (schema.type === 'array') {
    const items = schema.items as Record<string, unknown> | undefined
    const itemType = items?.type ?? 'any'
    return `${itemType}[]`
  }
  return (schema.type as string) ?? 'any'
}

function SchemaProperties({ schema }: { schema: Record<string, unknown> }) {
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined
  const required = (schema.required as string[]) ?? []
  if (!properties || Object.keys(properties).length === 0) return null
  return (
    <div className="gba:flex gba:flex-col gba:gap-1">
      {Object.entries(properties).map(([key, prop]) => (
        <div key={key} className="gba:flex gba:items-start gba:gap-2 gba:text-sm">
          <span className="gba:font-mono gba:text-xs gba:text-foreground gba:font-medium gba:shrink-0 gba:pt-0.5">
            {key}
          </span>
          <Badge variant="outline" className="gba:text-xs gba:font-mono gba:shrink-0">
            {resolveSchemaType(prop)}
          </Badge>
          {required.includes(key) && (
            <Badge variant="secondary" className="gba:text-xs gba:shrink-0">
              required
            </Badge>
          )}
          {typeof prop.description === 'string' && prop.description && (
            <span className="gba:text-xs gba:text-muted-foreground gba:leading-relaxed">{prop.description}</span>
          )}
        </div>
      ))}
    </div>
  )
}

const AGENT_TYPE_LABELS: Record<string, string> = {
  everyai: 'EveryAI Expert',
  flow: 'Flow Agent',
  general: 'General Agent'
}

export const AgentPreview: React.FC<AgentPreviewProps> = ({
  accessToken,
  items,
  prompt: promptProp,
  paramKeys: paramKeysProp,
  agentId,
  'data-testid': testId = 'agent-preview'
}) => {
  if (items && items.length > 0) {
    return (
      <PreviewTemplate items={items} data-testid={testId}>
        {selectedId => {
          const active = items.find(i => i.id === selectedId) ?? items[0]
          return (
            <AgentPreviewSingle
              key={active.id}
              accessToken={accessToken}
              prompt={active.prompt}
              paramKeys={active.paramKeys}
              testId={`${testId}-${active.id}`}
            />
          )
        }}
      </PreviewTemplate>
    )
  }
  return (
    <AgentPreviewSingle
      accessToken={accessToken}
      prompt={promptProp}
      paramKeys={paramKeysProp ?? undefined}
      agentId={agentId}
      testId={testId}
    />
  )
}

interface AgentPreviewSingleProps {
  accessToken: string
  prompt?: PromptODM | null
  paramKeys?: string[]
  agentId?: string
  testId: string
}

const AgentPreviewSingle: React.FC<AgentPreviewSingleProps> = ({
  accessToken,
  prompt: promptProp,
  paramKeys: paramKeysProp,
  agentId,
  testId
}) => {
  const client = usePromptManagerClient(accessToken)
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [prompt, setPrompt] = useState<PromptODM | null>(promptProp ?? null)
  const [paramKeys, setParamKeys] = useState<string[]>(paramKeysProp ?? [])
  const [loading, setLoading] = useState(promptProp == null && !!agentId)
  const [error, setError] = useState<string | null>(null)
  const [paramValues, setParamValues] = useState<Record<string, string>>({})
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [availableModels, setAvailableModels] = useState<AIModelODM[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const scrollRef = useRef<HTMLDivElement>(null)

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

  const needsModelSelection = !!promptProp && !agentId && !promptProp.model.id

  useEffect(() => {
    if (!needsModelSelection || !accessToken) return
    client
      .getAiModels({ limit: 50 })
      .then(page => {
        const models = page.data ?? []
        setAvailableModels(models)
        if (models.length > 0 && models[0]._id) {
          setSelectedModelId(models[0]._id)
        }
      })
      .catch(() => {})
  }, [client, needsModelSelection, accessToken])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const effectiveModelId = needsModelSelection ? selectedModelId : (promptProp?.model.id ?? '')
  const effectiveParamKeys = paramKeys.length > 0 ? paramKeys : ['message']
  const isMultiParam = effectiveParamKeys.length > 1
  const hasValidModel = agentId ? true : !!effectiveModelId
  const canSend = !sending && hasValidModel && effectiveParamKeys.every(k => (paramValues[k] ?? '').trim().length > 0)

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

    const fd = new FormData()
    fd.append('user_params', JSON.stringify(userParams))
    fd.append('context', JSON.stringify({ executionMode: 'test' }))

    if (promptProp && !agentId) {
      fd.append('model_id', effectiveModelId)
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
  }, [client, agentId, promptProp, paramValues, effectiveParamKeys, effectiveModelId, canSend])

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

  const toolList = prompt.tools
    ? prompt.tools
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
    : []
  const knowledgeSources = prompt.knowledge_sources ?? []
  const hasTools = toolList.length > 0
  const hasKnowledge = knowledgeSources.length > 0
  const hasSystemContent = !!prompt.system_content?.template
  const hasUserContent = !!prompt.user_content?.template
  const hasResponseSchema = !!prompt.response_schema && Object.keys(prompt.response_schema).length > 0
  const hasBehaviorSection = hasSystemContent || hasUserContent || hasResponseSchema

  return (
    <div className="gba:flex gba:flex-col gba:gap-4 gba:h-full gba:min-h-0" data-testid={testId}>
      {/* Header */}
      <Card className="gba:shrink-0 gba:border-border">
        <CardContent className="gba:pt-4 gba:pb-4">
          <div className="gba:flex gba:items-start gba:gap-4">
            <div className="gba:p-3 gba:rounded-xl gba:bg-primary/10 gba:shrink-0">
              <Bot className="gba:h-7 gba:w-7 gba:text-primary" />
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                <span className="gba:text-lg gba:font-semibold gba:text-foreground">{prompt.name}</span>
                {prompt.agent_type && (
                  <Badge variant="secondary" className="gba:text-xs">
                    {AGENT_TYPE_LABELS[prompt.agent_type] ?? prompt.agent_type}
                  </Badge>
                )}
              </div>
              {prompt.description && (
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{prompt.description}</p>
              )}
              {prompt.specialty && (
                <p className="gba:text-sm gba:font-medium gba:text-foreground gba:mt-1">{prompt.specialty}</p>
              )}
              <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-3">
                {prompt.response_style && (
                  <Badge variant="outline" className="gba:text-xs">
                    {RESPONSE_STYLE_LABELS[prompt.response_style] ?? prompt.response_style}
                  </Badge>
                )}
                {prompt.citation_mode && (
                  <Badge variant="outline" className="gba:text-xs">
                    {CITATION_MODE_LABELS[prompt.citation_mode] ?? prompt.citation_mode}
                  </Badge>
                )}
                {(prompt.tags ?? []).map(tag => (
                  <Badge key={tag} variant="outline" className="gba:text-xs gba:font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details sections */}
      {(hasBehaviorSection || hasTools || hasKnowledge) && (
        <div className="gba:flex gba:flex-col gba:gap-2">
          {hasBehaviorSection && (
            <Card className="gba:border-border gba:overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenSection(prev => (prev === 'behavior' ? null : 'behavior'))}
                className="gba:w-full gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:text-sm gba:font-medium gba:text-foreground hover:gba:bg-muted/50 gba:transition-colors"
              >
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Brain className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  How it works
                </div>
                {openSection === 'behavior' ? (
                  <ChevronDown className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                ) : (
                  <ChevronRight className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                )}
              </button>
              {openSection === 'behavior' && (
                <div className="gba:px-4 gba:pb-4 gba:flex gba:flex-col gba:gap-4 gba:border-t gba:border-border gba:pt-4">
                  {hasSystemContent && (
                    <div>
                      <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2 gba:uppercase gba:tracking-wide">
                        System Instructions
                      </p>
                      <pre className="gba:text-xs gba:bg-muted gba:rounded-md gba:p-3 gba:whitespace-pre-wrap gba:break-words gba:font-mono gba:text-foreground gba:leading-relaxed">
                        {prompt.system_content!.template}
                      </pre>
                    </div>
                  )}
                  {hasSystemContent && hasUserContent && <Separator />}
                  {hasUserContent && (
                    <div>
                      <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2 gba:uppercase gba:tracking-wide">
                        Goal / User Template
                      </p>
                      <pre className="gba:text-xs gba:bg-muted gba:rounded-md gba:p-3 gba:whitespace-pre-wrap gba:break-words gba:font-mono gba:text-foreground gba:leading-relaxed">
                        {prompt.user_content.template}
                      </pre>
                      {effectiveParamKeys.length > 0 && effectiveParamKeys[0] !== 'message' && (
                        <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-2">
                          <span className="gba:text-xs gba:text-muted-foreground">Variables:</span>
                          {effectiveParamKeys.map(k => (
                            <Badge key={k} variant="secondary" className="gba:text-xs gba:font-mono">
                              {`{${k}}`}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {hasResponseSchema && (
                    <>
                      {(hasSystemContent || hasUserContent) && <Separator />}
                      <div>
                        <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2 gba:uppercase gba:tracking-wide">
                          Output Schema
                        </p>
                        <SchemaProperties schema={prompt.response_schema!} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </Card>
          )}

          {hasTools && (
            <Card className="gba:border-border gba:overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenSection(prev => (prev === 'tools' ? null : 'tools'))}
                className="gba:w-full gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:text-sm gba:font-medium gba:text-foreground hover:gba:bg-muted/50 gba:transition-colors"
              >
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Wrench className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  Tools
                  <Badge variant="secondary" className="gba:text-xs">
                    {toolList.length}
                  </Badge>
                </div>
                {openSection === 'tools' ? (
                  <ChevronDown className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                ) : (
                  <ChevronRight className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                )}
              </button>
              {openSection === 'tools' && (
                <div className="gba:px-4 gba:pb-4 gba:flex gba:flex-wrap gba:gap-2 gba:border-t gba:border-border gba:pt-4">
                  {toolList.map(tool => (
                    <Badge key={tool} variant="outline" className="gba:text-xs gba:font-mono">
                      {tool}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          )}

          {hasKnowledge && (
            <Card className="gba:border-border gba:overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenSection(prev => (prev === 'knowledge' ? null : 'knowledge'))}
                className="gba:w-full gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:text-sm gba:font-medium gba:text-foreground hover:gba:bg-muted/50 gba:transition-colors"
              >
                <div className="gba:flex gba:items-center gba:gap-2">
                  <BookOpen className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  Knowledge Sources
                  <Badge variant="secondary" className="gba:text-xs">
                    {knowledgeSources.length}
                  </Badge>
                </div>
                {openSection === 'knowledge' ? (
                  <ChevronDown className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                ) : (
                  <ChevronRight className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                )}
              </button>
              {openSection === 'knowledge' && (
                <div className="gba:px-4 gba:pb-4 gba:flex gba:flex-col gba:gap-2 gba:border-t gba:border-border gba:pt-4">
                  {knowledgeSources.map((src, i) => (
                    <div key={src.id ?? i} className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                      <Badge variant="outline" className="gba:text-xs gba:shrink-0">
                        {src.type}
                      </Badge>
                      <span className="gba:text-foreground gba:truncate">{src.name}</span>
                      {src.description && (
                        <span className="gba:text-muted-foreground gba:text-xs gba:truncate">{src.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Try it out */}
      <Card className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col gba:border-border">
        <CardHeader className="gba:shrink-0 gba:border-b gba:border-border gba:py-3">
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium">
            <MessageSquare className="gba:h-4 gba:w-4" /> Try it out
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col gba:pt-3 gba:gap-3">
          {needsModelSelection && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
              <Label className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:shrink-0">Model</Label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger className="gba:flex-1 gba:h-8 gba:text-xs">
                  <SelectValue placeholder={availableModels.length === 0 ? 'Loading models...' : 'Select model'} />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(m => (
                    <SelectItem key={m._id} value={m._id!} className="gba:text-xs">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <ScrollArea className="gba:flex-1 gba:min-h-[100px] gba:rounded-md gba:border gba:border-border gba:p-3">
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
