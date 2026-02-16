import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner
} from '@newwork/nw-design-system'
import { Send, Loader2 } from 'lucide-react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { useAgentMeshClient } from '../../hooks/useAgentMeshClient'
import type { ExecutionTrace, AgentRegistryEntry, SessionMessage } from '../../types/agentMesh'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface SteeringChatProps {
  accessToken: string
  sessionId?: string | null
  initialMessages?: SessionMessage[]
  onResultUpdate?: (result: string) => void
  onTraceUpdate?: (trace: ExecutionTrace | null) => void
  onExecutionStart?: (agentName: string) => void
  onExecutionEnd?: () => void
  onSessionSave?: (messages: Message[], agentId: string, agentName: string, result: string | null) => void
}

export const SteeringChat = ({
  accessToken,
  sessionId,
  initialMessages,
  onResultUpdate,
  onTraceUpdate,
  onExecutionStart,
  onExecutionEnd,
  onSessionSave
}: SteeringChatProps) => {
  const promptClient = usePromptManagerClient(accessToken)
  const meshClient = useAgentMeshClient(accessToken)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [agents, setAgents] = useState<AgentRegistryEntry[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [loadingAgents, setLoadingAgents] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastResultRef = useRef<string | null>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Restore messages when session changes
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages.map(m => ({ id: m.id, role: m.role, content: m.content })))
    } else if (!sessionId) {
      setMessages([])
    }
  }, [sessionId, initialMessages])

  useEffect(() => {
    let mounted = true
    meshClient
      .getAgentRegistry({ agentType: 'everyai' })
      .then(data => {
        if (!mounted) return
        setAgents(data)
        if (data.length > 0 && !selectedAgentId) setSelectedAgentId(data[0].id)
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingAgents(false)
      })
    return () => {
      mounted = false
    }
  }, [meshClient, selectedAgentId])

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading || !selectedAgentId) return

    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', content: inputValue.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputValue('')
    setIsLoading(true)

    const selectedAgent = agents.find(a => a.id === selectedAgentId)
    onExecutionStart?.(selectedAgent?.name || 'Steering Agent')

    try {
      const formData = new FormData()
      formData.append('user_params', JSON.stringify({ input: userMessage.content }))

      const response = await promptClient.executePromptById(selectedAgentId, formData)

      const resultContent =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content, null, 2)

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: resultContent || 'No response received.'
      }
      const finalMessages = [...updatedMessages, assistantMessage]
      setMessages(finalMessages)
      lastResultRef.current = resultContent

      if (onResultUpdate && resultContent) onResultUpdate(resultContent)
      onSessionSave?.(finalMessages, selectedAgentId, selectedAgent?.name || '', resultContent)

      if (onTraceUpdate) {
        try {
          const executions = await meshClient.getExecutions({ limit: 1 })
          if (executions.length > 0 && executions[0].correlation_id) {
            const trace = await meshClient.getExecutionTrace(executions[0].correlation_id)
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
      onExecutionEnd?.()
    }
  }, [
    inputValue,
    isLoading,
    selectedAgentId,
    agents,
    messages,
    promptClient,
    meshClient,
    onResultUpdate,
    onTraceUpdate,
    onExecutionStart,
    onExecutionEnd,
    onSessionSave
  ])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="steering-chat">
      <div className="gba:border-b gba:border-border gba:p-3">
        {loadingAgents ? (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Spinner size="sm" />
            <span className="gba:text-sm gba:text-muted-foreground">Loading agents...</span>
          </div>
        ) : (
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId} data-testid="steering-chat-agent-select">
            <SelectTrigger className="gba:w-full">
              <SelectValue placeholder="Select an agent..." />
            </SelectTrigger>
            <SelectContent>
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name} {agent.specialty ? `- ${agent.specialty}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto gba:p-4 gba:space-y-3">
        {messages.length === 0 && (
          <div
            className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground"
            data-testid="steering-chat-empty"
          >
            <p className="gba:text-sm gba:text-center">
              {selectedAgentId ? 'Ask a question to see agents work together' : 'Select an agent above to begin'}
            </p>
          </div>
        )}

        {messages.map(message => (
          <div
            key={message.id}
            className={`gba:flex gba:gap-3 ${message.role === 'user' ? 'gba:justify-end' : 'gba:justify-start'}`}
            data-testid={`steering-chat-message-${message.id}`}
          >
            <div
              className={`gba:max-w-[85%] gba:rounded-lg gba:p-3 ${
                message.role === 'user'
                  ? 'gba:bg-primary gba:text-primary-foreground'
                  : 'gba:bg-muted gba:text-foreground'
              }`}
            >
              {message.role === 'assistant' ? (
                <MarkdownWithChipsRenderer
                  content={message.content}
                  accessToken={accessToken}
                  variant="chat"
                  data-testid={`steering-chat-message-${message.id}-content`}
                />
              ) : (
                <div className="gba:text-sm">{message.content}</div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div
            className="gba:flex gba:items-center gba:gap-3 gba:bg-muted/50 gba:rounded-lg gba:p-3"
            data-testid="steering-chat-thinking"
          >
            <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin gba:text-primary" />
            <span className="gba:text-sm gba:text-muted-foreground">Agents are working...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="gba:border-t gba:border-border gba:p-4">
        <div className="gba:flex gba:gap-2">
          <Input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedAgentId ? 'Ask the agent...' : 'Select an agent first...'}
            disabled={isLoading || !selectedAgentId}
            className="gba:flex-1"
            data-testid="steering-chat-input"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading || !selectedAgentId}
            size="icon"
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
  )
}
