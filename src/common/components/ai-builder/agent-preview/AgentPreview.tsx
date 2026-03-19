import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PreviewTemplate } from '../preview-template'
import {
  Card,
  CardContent,
  Alert,
  AlertDescription,
  Button,
  Textarea,
  Input,
  Label,
  Badge,
  Separator,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  TabsContent
} from '@newwork/nw-design-system'
import { Bot, Send, MessageSquare, Wrench, BookOpen, Brain, ChevronDown, ChevronRight, Cpu } from 'lucide-react'
import { PreviewHeaderCard } from '../preview-header'
import { friendlyLabel, getSchemaTypeLabel, PreviewTabs, PreviewLoading, PreviewError, PreviewEmpty } from '../shared'
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
    const itemType = typeof items?.type === 'string' ? items.type : 'any'
    return `${itemType}[]`
  }
  return (schema.type as string) ?? 'any'
}

function SchemaProperties({ schema }: Readonly<{ schema: Record<string, unknown> }>) {
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

const markdownComponents: Record<
  string,
  React.ComponentType<{ children?: React.ReactNode; [key: string]: unknown }>
> = {
  h1: ({ children, ...props }) => (
    <h1 className="gba:text-base gba:font-semibold gba:mb-2 gba:mt-2 gba:text-foreground first:gba:mt-0" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="gba:text-sm gba:font-semibold gba:mb-1.5 gba:mt-2 gba:text-foreground first:gba:mt-0" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="gba:text-sm gba:font-semibold gba:mb-1 gba:mt-2 gba:text-foreground first:gba:mt-0" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="gba:text-xs gba:font-semibold gba:mb-1 gba:mt-1.5 gba:text-foreground first:gba:mt-0" {...props}>
      {children}
    </h4>
  ),
  ul: ({ children, ...props }) => (
    <ul className="gba:list-disc gba:ml-4 gba:mb-2 gba:space-y-0.5" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="gba:list-decimal gba:ml-4 gba:mb-2 gba:space-y-0.5" {...props}>
      {children}
    </ol>
  ),
  p: ({ children, ...props }) => (
    <p className="gba:mb-2 gba:last:mb-0" {...props}>
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <strong className="gba:font-semibold" {...props}>
      {children}
    </strong>
  ),
  code: ({ children, ...props }) => (
    <code className="gba:bg-background/50 gba:px-1 gba:py-0.5 gba:rounded gba:text-xs gba:font-mono" {...props}>
      {children}
    </code>
  )
}

function buildRequestFormData(
  userParams: Record<string, string>,
  promptProp: PromptODM | null | undefined,
  agentId: string | undefined,
  effectiveModelId: string
): FormData {
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
  return fd
}

const AGENT_TYPE_LABELS: Record<string, string> = {
  everyai: 'EveryAI Expert',
  flow: 'Flow Agent',
  general: 'General Agent'
}

interface AgentPromptLoaderSetters {
  setPrompt: (p: PromptODM | null) => void
  setParamKeys: (k: string[]) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
}

function extractParametersFromTemplate(content: string): string[] {
  if (!content) return []
  const params = new Set<string>()
  const pattern = /\{(\w+)\}/g
  let match
  while ((match = pattern.exec(content)) !== null) {
    params.add(match[1])
  }
  return Array.from(params).sort((a, b) => a.localeCompare(b))
}

function useAgentPromptLoader(
  client: ReturnType<typeof usePromptManagerClient>,
  promptProp: PromptODM | null | undefined,
  paramKeysProp: string[] | undefined,
  agentId: string | undefined,
  accessToken: string,
  setters: AgentPromptLoaderSetters
): void {
  const { setPrompt, setParamKeys, setLoading, setError } = setters
  useEffect(() => {
    if (promptProp != null) {
      setPrompt(promptProp)

      // If paramKeys not provided, extract from template
      let effectiveKeys = paramKeysProp ?? []
      if (effectiveKeys.length === 0 && promptProp.user_content?.template) {
        const userParams = extractParametersFromTemplate(promptProp.user_content.template)
        const systemParams = promptProp.system_content?.template
          ? extractParametersFromTemplate(promptProp.system_content.template)
          : []
        effectiveKeys = [...new Set([...userParams, ...systemParams])]
      }

      setParamKeys(effectiveKeys)
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
  }, [client, agentId, accessToken, promptProp, paramKeysProp, setPrompt, setParamKeys, setLoading, setError])
}

async function executeAgentRequest(
  client: ReturnType<typeof usePromptManagerClient>,
  promptProp: PromptODM | null | undefined,
  agentId: string | undefined,
  fd: FormData
): Promise<string> {
  const res = promptProp && !agentId ? await client.executePrompt(fd) : await client.executePromptById(agentId!, fd)
  return extractResponseContent(res.content)
}

interface SendMessageDeps {
  client: ReturnType<typeof usePromptManagerClient>
  promptProp: PromptODM | null | undefined
  agentId: string | undefined
  effectiveModelId: string
  effectiveParamKeys: string[]
  paramValues: Record<string, string>
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  setSending: (v: boolean) => void
  setSendError: (e: string | null) => void
}

async function sendAgentMessage(deps: SendMessageDeps): Promise<void> {
  const {
    client,
    promptProp,
    agentId,
    effectiveModelId,
    effectiveParamKeys,
    paramValues,
    setMessages,
    setSending,
    setSendError
  } = deps
  const userParams: Record<string, string> = {}
  for (const k of effectiveParamKeys) {
    userParams[k] = (paramValues[k] ?? '').trim()
  }
  const userMessageText = formatUserMessage(userParams, effectiveParamKeys)
  setMessages(prev => [...prev, { role: 'user', content: userMessageText }])
  setSendError(null)
  setSending(true)

  if (!promptProp && !agentId) {
    setSending(false)
    return
  }

  const fd = buildRequestFormData(userParams, promptProp, agentId, effectiveModelId)
  try {
    const content = await executeAgentRequest(client, promptProp, agentId, fd)
    setMessages(prev => [...prev, { role: 'assistant', content: content || '(No response)' }])
  } catch (e) {
    setSendError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, the request failed. Please try again.' }])
  } finally {
    setSending(false)
  }
}

function useAgentModelLoader(
  client: ReturnType<typeof usePromptManagerClient>,
  needsModelSelection: boolean,
  accessToken: string,
  setAvailableModels: (m: AIModelODM[]) => void,
  setSelectedModelId: (id: string) => void
): void {
  useEffect(() => {
    if (!needsModelSelection || !accessToken) return
    client
      .getAiModels({ limit: 50 })
      .then(page => {
        const models = page.data ?? []
        setAvailableModels(models)
        if (models.length > 0 && models[0]._id) setSelectedModelId(models[0]._id)
      })
      .catch(() => {})
  }, [client, needsModelSelection, accessToken, setAvailableModels, setSelectedModelId])
}

function extractResponseContent(content: unknown): string {
  if (content == null) return ''
  if (typeof content === 'string') return content
  return JSON.stringify(content)
}

interface AgentOverviewTabProps {
  prompt: PromptODM
  effectiveParamKeys: string[]
  responseKeys: string[]
  responseProperties: Record<string, Record<string, unknown>>
  toolList: string[]
  knowledgeSources: Array<{ name?: string; type?: string }>
  openTechnicalDetails: boolean
  setOpenTechnicalDetails: React.Dispatch<React.SetStateAction<boolean>>
  testId: string
}

function AgentOverviewTab({
  prompt,
  effectiveParamKeys,
  responseKeys,
  responseProperties,
  toolList,
  knowledgeSources,
  openTechnicalDetails,
  setOpenTechnicalDetails,
  testId
}: AgentOverviewTabProps) {
  const hasSystemContent = !!prompt.system_content?.template
  const hasUserContent = !!prompt.user_content?.template
  const hasResponseSchema = !!prompt.response_schema && Object.keys(prompt.response_schema).length > 0
  const hasTechnicalDetails = hasSystemContent || hasUserContent || hasResponseSchema
  const whatYouProvide =
    effectiveParamKeys.length === 0 ? 'No inputs required.' : effectiveParamKeys.map(k => friendlyLabel(k)).join(', ')
  const whatYouGetBack =
    responseKeys.length === 0
      ? 'Text or structured response.'
      : responseKeys
          .map(k => {
            const prop = responseProperties[k] ?? {}
            return `${friendlyLabel(k)} (${getSchemaTypeLabel(prop)})`
          })
          .join(', ')
  const knowledgeSummary =
    knowledgeSources.length === 0 ? null : knowledgeSources.map(s => `${s.name} (${s.type})`).join(', ')

  return (
    <>
      <Card className="gba:border-border gba:overflow-hidden">
        <CardContent className="gba:p-0">
          <div className="gba:divide-y gba:divide-border">
            <div
              className="gba:flex gba:gap-3 gba:px-3 gba:py-2 gba:items-start"
              data-testid={`${testId}-overview-does`}
            >
              <span className="gba:text-xs gba:font-medium gba:text-foreground gba:shrink-0 gba:w-32">
                What this expert does
              </span>
              <span className="gba:text-xs gba:text-muted-foreground gba:min-w-0">
                {prompt.description || prompt.specialty || 'Helps you get answers and complete tasks using AI.'}
              </span>
            </div>
            <div
              className="gba:flex gba:gap-3 gba:px-3 gba:py-2 gba:items-start"
              data-testid={`${testId}-overview-provide`}
            >
              <span className="gba:text-xs gba:font-medium gba:text-foreground gba:shrink-0 gba:w-32">
                What you provide
              </span>
              <span className="gba:text-xs gba:text-muted-foreground gba:min-w-0">{whatYouProvide}</span>
            </div>
            <div
              className="gba:flex gba:gap-3 gba:px-3 gba:py-2 gba:items-start"
              data-testid={`${testId}-overview-get-back`}
            >
              <span className="gba:text-xs gba:font-medium gba:text-foreground gba:shrink-0 gba:w-32">
                What you get back
              </span>
              <span className="gba:text-xs gba:text-muted-foreground gba:min-w-0">{whatYouGetBack}</span>
            </div>
            {toolList.length > 0 && (
              <div
                className="gba:flex gba:gap-3 gba:px-3 gba:py-2 gba:items-center"
                data-testid={`${testId}-overview-tools`}
              >
                <span className="gba:text-xs gba:font-medium gba:text-foreground gba:shrink-0 gba:w-32 gba:flex gba:items-center gba:gap-1">
                  <Wrench className="gba:h-3 gba:w-3" /> Tools
                </span>
                <div className="gba:flex gba:flex-wrap gba:gap-1.5 gba:min-w-0">
                  {toolList.map(tool => (
                    <Badge key={tool} variant="outline" className="gba:text-xs gba:font-mono">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {knowledgeSources.length > 0 && (
              <div
                className="gba:flex gba:gap-3 gba:px-3 gba:py-2 gba:items-start"
                data-testid={`${testId}-overview-knowledge`}
              >
                <span className="gba:text-xs gba:font-medium gba:text-foreground gba:shrink-0 gba:w-32 gba:flex gba:items-center gba:gap-1">
                  <BookOpen className="gba:h-3 gba:w-3" /> Knowledge
                </span>
                <span className="gba:text-xs gba:text-muted-foreground gba:min-w-0">{knowledgeSummary}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {hasTechnicalDetails && (
        <Card className="gba:border-border gba:overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenTechnicalDetails(prev => !prev)}
            className="gba:w-full gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:text-xs gba:font-medium gba:text-foreground hover:gba:bg-muted/50 gba:transition-colors"
            data-testid={`${testId}-technical-details-toggle`}
          >
            <div className="gba:flex gba:items-center gba:gap-2">
              <Brain className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              Technical details
            </div>
            {openTechnicalDetails ? (
              <ChevronDown className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            ) : (
              <ChevronRight className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            )}
          </button>
          {openTechnicalDetails && (
            <div className="gba:px-3 gba:pb-3 gba:flex gba:flex-col gba:gap-3 gba:border-t gba:border-border gba:pt-3">
              {hasSystemContent && (
                <div>
                  <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2 gba:uppercase gba:tracking-wide">
                    System instructions
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
                    Goal / User template
                  </p>
                  <pre className="gba:text-xs gba:bg-muted gba:rounded-md gba:p-3 gba:whitespace-pre-wrap gba:break-words gba:font-mono gba:text-foreground gba:leading-relaxed">
                    {prompt.user_content.template}
                  </pre>
                  {effectiveParamKeys.length > 0 && effectiveParamKeys[0] !== 'message' && (
                    <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-2">
                      <span className="gba:text-xs gba:text-muted-foreground">Variables:</span>
                      {effectiveParamKeys.map(k => (
                        <Badge key={k} variant="secondary" className="gba:text-xs gba:font-mono">{`{${k}}`}</Badge>
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
                      Output schema
                    </p>
                    <SchemaProperties schema={prompt.response_schema!} />
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      )}
    </>
  )
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
  const [openTechnicalDetails, setOpenTechnicalDetails] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'try-it'>('overview')
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

  useAgentPromptLoader(client, promptProp, paramKeysProp, agentId, accessToken, {
    setPrompt,
    setParamKeys,
    setLoading,
    setError
  })

  const needsModelSelection = !!promptProp && !agentId && !promptProp.model.id

  useAgentModelLoader(client, needsModelSelection, accessToken, setAvailableModels, setSelectedModelId)

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
    await sendAgentMessage({
      client,
      promptProp,
      agentId,
      effectiveModelId,
      effectiveParamKeys,
      paramValues,
      setMessages,
      setSending,
      setSendError
    })
  }, [client, agentId, promptProp, paramValues, effectiveParamKeys, effectiveModelId, canSend])

  if (loading) return <PreviewLoading testId={testId} />
  if (error) return <PreviewError testId={testId} message={error} />
  if (!prompt) return <PreviewEmpty testId={testId} message="No expert data." />

  const toolList = prompt.tools
    ? prompt.tools
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
    : []
  const knowledgeSources = prompt.knowledge_sources ?? []

  const responseSchema = prompt.response_schema as Record<string, unknown> | undefined
  const responseProperties = (responseSchema?.properties as Record<string, Record<string, unknown>>) ?? {}
  const responseKeys = Object.keys(responseProperties)

  return (
    <div className="gba:flex gba:flex-col gba:gap-4 gba:h-full gba:min-h-0" data-testid={testId}>
      <PreviewHeaderCard
        icon={Bot}
        title={prompt.name}
        titleSuffix={
          prompt.agent_type ? (
            <Badge variant="secondary" className="gba:text-xs gba:shrink-0">
              {AGENT_TYPE_LABELS[prompt.agent_type] ?? prompt.agent_type}
            </Badge>
          ) : undefined
        }
        description={prompt.description || prompt.specialty || undefined}
        badges={
          prompt.response_style || prompt.citation_mode || (prompt.tags && prompt.tags.length > 0) ? (
            <>
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
            </>
          ) : undefined
        }
        data-testid={`${testId}-header`}
      />

      <PreviewTabs
        value={activeTab}
        onValueChange={setActiveTab}
        testId={testId}
        className="gba:flex gba:flex-col gba:gap-3 gba:min-h-0 gba:flex-1"
      >
        <TabsContent
          value="overview"
          className="gba:mt-0 gba:flex-1 gba:min-h-0 gba:space-y-3 gba:overflow-y-auto"
          data-testid={`${testId}-overview`}
        >
          <AgentOverviewTab
            prompt={prompt}
            effectiveParamKeys={effectiveParamKeys}
            responseKeys={responseKeys}
            responseProperties={responseProperties}
            toolList={toolList}
            knowledgeSources={knowledgeSources}
            openTechnicalDetails={openTechnicalDetails}
            setOpenTechnicalDetails={setOpenTechnicalDetails}
            testId={testId}
          />
        </TabsContent>

        <TabsContent
          value="try-it"
          className="gba:mt-0 gba:flex-1 gba:min-h-0 gba:flex gba:flex-col gba:gap-3"
          data-testid={`${testId}-try-it`}
        >
          <p
            className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:shrink-0 gba:flex gba:items-center gba:gap-1.5"
            data-testid={`${testId}-try-it-label`}
          >
            <MessageSquare className="gba:h-3.5 gba:w-3.5" /> Try it out
          </p>

          {/* Chat input: one rounded box, darker border, floating buttons inside */}
          <div className="gba:shrink-0 gba:rounded-xl gba:border gba:border-foreground/50 gba:bg-background gba:overflow-hidden gba:relative focus-within:gba:ring-2 focus-within:gba:ring-ring focus-within:gba:border-primary/50">
            {isMultiParam ? (
              <>
                <div className="gba:grid gba:grid-cols-2 gba:gap-3 gba:p-4">
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
                        className="gba:rounded-lg gba:border-border"
                        data-testid={`${testId}-input-${key}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:px-4 gba:pb-4">
                  {needsModelSelection && (
                    <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                      <SelectTrigger
                        className="gba:h-8 gba:w-auto gba:min-w-[140px] gba:text-xs gba:rounded-lg gba:border-border gba:bg-background"
                        data-testid={`${testId}-model-select`}
                      >
                        <Cpu className="gba:h-3 gba:w-3 gba:mr-1.5 gba:text-muted-foreground gba:shrink-0" />
                        <SelectValue placeholder={availableModels.length === 0 ? 'Loading...' : 'Model'} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map(m => (
                          <SelectItem key={m._id} value={m._id!} className="gba:text-xs">
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={sendMessage}
                    disabled={!canSend}
                    className="gba:h-8 gba:rounded-lg"
                    data-testid={`${testId}-send`}
                  >
                    <Send className="gba:h-3.5 gba:w-3.5 gba:mr-1.5" />
                    Run
                  </Button>
                </div>
              </>
            ) : (
              <>
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
                  rows={4}
                  className="gba:resize-none gba:border-0 gba:rounded-none gba:focus-visible:ring-0 gba:focus-visible:ring-offset-0 gba:min-h-[120px] gba:py-4 gba:pl-4 gba:pr-4 gba:pb-12 gba:text-sm"
                  disabled={sending}
                  data-testid={`${testId}-chat-input`}
                />
                <div className="gba:absolute gba:bottom-2 gba:left-2 gba:right-2 gba:flex gba:items-center gba:justify-between gba:gap-2 gba:pointer-events-none">
                  <div className="gba:pointer-events-auto">
                    {needsModelSelection && (
                      <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                        <SelectTrigger
                          className="gba:h-8 gba:w-auto gba:min-w-[120px] gba:text-xs gba:rounded-lg gba:border-border gba:bg-background"
                          data-testid={`${testId}-model-select`}
                        >
                          <Cpu className="gba:h-3 gba:w-3 gba:mr-1.5 gba:text-muted-foreground gba:shrink-0" />
                          <SelectValue placeholder={availableModels.length === 0 ? 'Loading...' : 'Model'} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map(m => (
                            <SelectItem key={m._id} value={m._id!} className="gba:text-xs">
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={sendMessage}
                    disabled={!canSend}
                    className="gba:h-8 gba:w-8 gba:rounded-lg gba:shrink-0 gba:pointer-events-auto"
                    data-testid={`${testId}-send`}
                  >
                    <Send className="gba:h-3.5 gba:w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>

          {sendError && (
            <Alert variant="destructive" className="gba:shrink-0">
              <AlertDescription>{sendError}</AlertDescription>
            </Alert>
          )}

          <div
            className={`gba:flex-1 gba:min-h-0 gba:rounded-xl gba:border gba:border-border gba:p-3 gba:bg-muted/20 gba:overflow-y-auto gba:max-h-[400px] ${messages.length === 0 ? 'gba:min-h-[56px]' : ''}`}
            data-testid={`${testId}-results`}
          >
            <div className="gba:space-y-3">
              {messages.length === 0 ? (
                <p className="gba:text-xs gba:text-muted-foreground">
                  Results will appear here after you run the agent.
                </p>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={`${m.role}-${i}`}
                    className={`gba:flex ${m.role === 'user' ? 'gba:justify-end' : 'gba:justify-start'}`}
                    data-testid={`${testId}-msg-${i}`}
                  >
                    <div
                      className={`gba:rounded-lg gba:px-3 gba:py-2 gba:text-sm gba:break-words ${m.role === 'user' ? 'gba:max-w-[85%] gba:bg-primary gba:text-primary-foreground gba:whitespace-pre-wrap' : 'gba:max-w-full gba:min-w-0 gba:bg-muted gba:text-foreground gba:prose gba:prose-sm gba:max-w-none'}`}
                    >
                      {m.role === 'assistant' ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {m.content}
                        </ReactMarkdown>
                      ) : (
                        m.content
                      )}
                    </div>
                  </div>
                ))
              )}
              {sending && (
                <div className="gba:flex gba:justify-start">
                  <span className="gba:text-xs gba:text-muted-foreground">Thinking...</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </div>
        </TabsContent>
      </PreviewTabs>
    </div>
  )
}
