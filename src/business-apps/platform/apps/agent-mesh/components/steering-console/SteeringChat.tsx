import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea
} from '@newwork/nw-design-system'
import { History, Plus, Send, Loader2, Brain, Zap, Sparkles, Network } from 'lucide-react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { SubAgentSources } from './SubAgentSources'
import type { CommEvent } from './AgentCommFeed'
import type { ExecutionTrace, AgentRegistryEntry, SessionMessage } from '../../types/agentMesh'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sourceEvents?: CommEvent[]
}

interface SteeringChatProps {
  accessToken: string
  sessionId?: string | null
  initialMessages?: SessionMessage[]
  commEvents?: CommEvent[]
  onResultUpdate?: (result: string) => void
  onTraceUpdate?: (trace: ExecutionTrace | null) => void
  onExecutionStart?: (agentName: string) => void
  onExecutionEnd?: () => void
  onSessionSave?: (messages: Message[], agentId: string, agentName: string, result: string | null) => void
  onOpenHistory?: () => void
  onNewSession?: () => void
}

export const SteeringChat = ({
  accessToken,
  sessionId,
  initialMessages,
  commEvents,
  onResultUpdate,
  onTraceUpdate,
  onExecutionStart,
  onExecutionEnd,
  onSessionSave,
  onOpenHistory,
  onNewSession
}: SteeringChatProps) => {
  const promptClient = usePromptManagerClient(accessToken)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [agents, setAgents] = useState<AgentRegistryEntry[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [llmProvider, setLlmProvider] = useState<string>(() => {
    try {
      return window.localStorage.getItem('agent-mesh-llm-provider') || 'openai'
    } catch {
      return 'openai'
    }
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastResultRef = useRef<string | null>(null)
  const userScrolledUpRef = useRef(false)
  const sendInFlightRef = useRef(false)

  useEffect(() => {
    try {
      window.localStorage.setItem('agent-mesh-llm-provider', llmProvider)
    } catch {
      /* ignore */
    }
  }, [llmProvider])

  const thinkingStatus = useMemo(() => {
    if (!isLoading || !commEvents?.length) return 'Analyzing your request...'
    const latest = [...commEvents].reverse().find(e => e.status === 'running' || e.type === 'thinking')
    if (latest?.type === 'response' && latest.status === 'running' && latest.toAgent) {
      return `Consulting ${latest.toAgent}...`
    }
    if (latest?.type === 'thinking' && latest.fromAgent) {
      return `${latest.fromAgent} is thinking...`
    }
    if (commEvents.some(e => e.status === 'running')) return 'Agents are working...'
    return 'Analyzing your request...'
  }, [isLoading, commEvents])

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledUpRef.current = distanceFromBottom > 80
  }, [])

  useEffect(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const prevMessageCountRef = useRef(messages.length)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      userScrolledUpRef.current = false
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length])

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages.map(m => ({ id: m.id, role: m.role, content: m.content })))
    } else if (!sessionId) {
      setMessages([])
    }
  }, [sessionId, initialMessages])

  useEffect(() => {
    let mounted = true
    Promise.allSettled([promptClient.getAgentRegistry({ agentType: 'everyai' }), promptClient.getMeshLayout()])
      .then(([registryRes, layoutRes]) => {
        if (!mounted) return
        const allAgents = registryRes.status === 'fulfilled' ? registryRes.value : []
        const meshIds = new Set(
          layoutRes.status === 'fulfilled' && layoutRes.value?.positions
            ? layoutRes.value.positions.map((p: { agent_id: string }) => p.agent_id)
            : []
        )
        const meshAgents = meshIds.size > 0 ? allAgents.filter(a => meshIds.has(a.id)) : allAgents
        setAgents(meshAgents)
        if (meshAgents.length > 0 && !selectedAgentId) setSelectedAgentId(meshAgents[0].id)
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingAgents(false)
      })
    return () => {
      mounted = false
    }
  }, [promptClient, selectedAgentId])

  const getTextareaElement = useCallback(() => {
    const el = textareaRef.current
    if (!el) return null
    return el instanceof HTMLTextAreaElement ? el : ((el as HTMLElement).querySelector?.('textarea') ?? null)
  }, [])

  const syncTextareaHeight = useCallback(() => {
    const textarea = getTextareaElement()
    if (!textarea) return
    textarea.style.height = '36px'
    if (textarea.scrollHeight > 36) {
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
    }
  }, [getTextareaElement])

  useEffect(() => {
    syncTextareaHeight()
  }, [inputValue, syncTextareaHeight])

  const handleSend = useCallback(async () => {
    if (sendInFlightRef.current) return
    if (!inputValue.trim() || isLoading || !selectedAgentId) return
    sendInFlightRef.current = true

    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', content: inputValue.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputValue('')

    const textarea = getTextareaElement()
    if (textarea) textarea.style.height = '36px'

    setIsLoading(true)

    const selectedAgent = agents.find(a => a.id === selectedAgentId)
    onExecutionStart?.(selectedAgent?.name || 'Steering Agent')

    try {
      const formData = new FormData()
      formData.append('user_params', JSON.stringify({ input: userMessage.content }))
      if (llmProvider) formData.append('llm_provider', llmProvider)
      if (sessionId) formData.append('session_id', sessionId)

      const response = await promptClient.executePromptById(selectedAgentId, formData)

      const resultContent =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content, null, 2)

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: resultContent || 'No response received.',
        sourceEvents: commEvents ? [...commEvents] : undefined
      }
      const finalMessages = [...updatedMessages, assistantMessage]
      setMessages(finalMessages)
      lastResultRef.current = resultContent

      if (onResultUpdate && resultContent) onResultUpdate(resultContent)
      onSessionSave?.(finalMessages, selectedAgentId, selectedAgent?.name || '', resultContent)

      if (onTraceUpdate) {
        try {
          const executions = await promptClient.getMeshExecutions({ limit: 1 })
          if (executions.length > 0 && executions[0].correlation_id) {
            const trace = await promptClient.getMeshExecutionTrace(executions[0].correlation_id)
            onTraceUpdate(trace)
          }
        } catch {
          /* trace fetch best-effort */
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`
      }
      const finalMessages = [...updatedMessages, errorMessage]
      setMessages(finalMessages)
      onSessionSave?.(finalMessages, selectedAgentId, selectedAgent?.name || '', lastResultRef.current)
    } finally {
      setIsLoading(false)
      sendInFlightRef.current = false
      onExecutionEnd?.()
    }
  }, [
    inputValue,
    isLoading,
    selectedAgentId,
    agents,
    messages,
    commEvents,
    llmProvider,
    promptClient,
    getTextareaElement,
    onResultUpdate,
    onTraceUpdate,
    onExecutionStart,
    onExecutionEnd,
    onSessionSave
  ])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSend()
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="steering-chat">
      {/* Header — Nexus-style: History | Agent selector | New session */}
      <div className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:h-11 gba:flex-shrink-0 gba:border-b gba:border-border">
        <Button
          variant="ghost"
          size="icon"
          className="gba:h-8 gba:w-8 gba:rounded-xl gba:hover:bg-muted gba:flex-shrink-0"
          onClick={onOpenHistory}
          data-testid="steering-chat-history-btn"
        >
          <History className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
        </Button>

        <div className="gba:flex-1 gba:min-w-0 gba:overflow-hidden">
          {loadingAgents ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
              <Spinner size="sm" />
              <span className="gba:text-sm gba:text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId} data-testid="steering-chat-agent-select">
              <SelectTrigger className="gba:h-8 gba:text-sm gba:border-0 gba:bg-transparent gba:shadow-none gba:font-semibold gba:text-foreground gba:gap-1.5">
                <SelectValue placeholder="Select agent..." />
              </SelectTrigger>
              <SelectContent>
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name} {agent.specialty ? `— ${agent.specialty}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="gba:h-8 gba:w-8 gba:rounded-xl gba:hover:bg-muted gba:flex-shrink-0"
          onClick={onNewSession}
          data-testid="steering-chat-new-session-btn"
        >
          <Plus className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
        </Button>
      </div>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="gba:flex-1 gba:overflow-y-auto gba:px-4 gba:py-4 gba:space-y-3"
        data-testid="steering-chat-messages"
      >
        {messages.length === 0 && !isLoading && (
          <div
            className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center gba:space-y-5"
            data-testid="steering-chat-empty"
          >
            <div className="gba:relative">
              <div className="gba:h-14 gba:w-14 gba:rounded-2xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                <Network className="gba:h-7 gba:w-7 gba:text-primary" />
              </div>
              <div className="gba:absolute gba:-bottom-1 gba:-right-1 gba:h-5 gba:w-5 gba:rounded-full gba:bg-primary gba:flex gba:items-center gba:justify-center">
                <Sparkles className="gba:h-2.5 gba:w-2.5 gba:text-primary-foreground" />
              </div>
            </div>
            <div className="gba:space-y-1.5">
              <p className="gba:text-base gba:font-bold gba:tracking-tight gba:text-foreground">Agent Mesh Console</p>
              <p className="gba:text-xs gba:text-muted-foreground gba:max-w-[260px] gba:leading-relaxed">
                {selectedAgentId
                  ? 'Ask a question and watch your agents collaborate to find the answer.'
                  : 'Select an agent above to get started.'}
              </p>
            </div>
          </div>
        )}

        {messages.map(message => (
          <div
            key={message.id}
            className={`gba:flex gba:gap-3 ${message.role === 'user' ? 'gba:justify-end' : 'gba:justify-start'}`}
            data-testid={`steering-chat-message-${message.id}`}
          >
            <div
              className={`gba:max-w-[85%] gba:rounded-2xl gba:px-4 gba:py-3 ${
                message.role === 'user'
                  ? 'gba:bg-primary gba:text-primary-foreground'
                  : 'gba:bg-muted gba:text-foreground'
              }`}
            >
              {message.role === 'assistant' ? (
                <>
                  <MarkdownWithChipsRenderer
                    content={message.content}
                    accessToken={accessToken}
                    variant="chat"
                    data-testid={`steering-chat-message-${message.id}-content`}
                  />
                  {message.sourceEvents && message.sourceEvents.length > 0 && (
                    <SubAgentSources commEvents={message.sourceEvents} accessToken={accessToken} />
                  )}
                </>
              ) : (
                <div className="gba:text-sm">{message.content}</div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div
            className="gba:flex gba:items-center gba:gap-3 gba:bg-muted/50 gba:rounded-2xl gba:px-4 gba:py-3"
            data-testid="steering-chat-thinking"
          >
            <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin gba:text-primary" />
            <span className="gba:text-sm gba:text-muted-foreground">{thinkingStatus}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area — Nexus-style rounded card */}
      <div className="gba:px-3 gba:pb-3 gba:pt-2" data-testid="steering-chat-input-area">
        <div className="gba:bg-card/80 gba:backdrop-blur-sm gba:rounded-2xl gba:border gba:border-border/60 gba:focus-within:border-primary/30 gba:transition-all gba:duration-200">
          <div className="gba:px-4 gba:pt-3 gba:pb-1">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedAgentId ? 'Ask the agent...' : 'Select an agent first...'}
              disabled={isLoading || !selectedAgentId}
              className="gba:h-9 gba:min-h-9 gba:max-h-[160px] gba:resize-none gba:overflow-y-auto gba:w-full gba:border-0 gba:bg-transparent gba:text-sm gba:placeholder:text-muted-foreground/60 gba:px-3 gba:py-2 gba:focus-visible:ring-0 gba:focus-visible:ring-offset-0 gba:block"
              rows={1}
              data-testid="steering-chat-input"
            />
          </div>

          <div className="gba:flex gba:items-center gba:px-3 gba:pb-3 gba:pt-4">
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-1 gba:min-w-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`gba:flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-full gba:text-[11px] gba:font-semibold gba:transition-all gba:duration-200 gba:cursor-pointer gba:outline-none ${
                      llmProvider === 'groq'
                        ? 'gba:bg-warning-secondary gba:text-warning-secondary-foreground'
                        : 'gba:bg-info-secondary gba:text-info-secondary-foreground gba:hover:opacity-90'
                    }`}
                    data-testid="steering-chat-llm-toggle"
                    title={llmProvider === 'groq' ? 'Fast mode (Groq)' : 'Smart mode (OpenAI)'}
                  >
                    {llmProvider === 'groq' ? (
                      <Zap className="gba:h-3.5 gba:w-3.5" />
                    ) : (
                      <Brain className="gba:h-3.5 gba:w-3.5" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => setLlmProvider('openai')}
                    data-testid="steering-chat-llm-option-openai"
                  >
                    <Brain className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-info" />
                    Smart {llmProvider !== 'groq' ? '(active)' : ''}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLlmProvider('groq')} data-testid="steering-chat-llm-option-groq">
                    <Zap className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-warning" />
                    Fast {llmProvider === 'groq' ? '(active)' : ''}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button
              size="icon"
              className={`gba:h-8 gba:w-8 gba:flex-shrink-0 gba:rounded-xl gba:transition-all gba:duration-200 ${
                inputValue.trim() ? 'gba:opacity-100 gba:scale-100' : 'gba:opacity-40 gba:scale-95'
              }`}
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading || !selectedAgentId}
              data-testid="steering-chat-send-button"
            >
              {isLoading ? (
                <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
              ) : (
                <Send className="gba:w-4 gba:h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
