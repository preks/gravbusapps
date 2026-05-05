import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CustomDataSuggestionApplyResult,
  CustomDataSuggestionConversationMessage,
  CustomDataSuggestionRequest,
  CustomDataSuggestionStage,
  CustomDataSuggestionStreamEvent,
  EntitySchemaProposal
} from '../types'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  proposal?: EntitySchemaProposal
  result?: CustomDataSuggestionApplyResult
  thinkingContent?: string
  progressSteps?: ChatProgressStep[]
  isLoading?: boolean
  isError?: boolean
}

export interface ChatProgressStep {
  id: string
  title: string
  detail?: string
  status: 'running' | 'complete' | 'failed'
}

interface UseCustomDataChatResult {
  messages: ChatMessage[]
  inputValue: string
  setInputValue: (value: string) => void
  isProcessing: boolean
  pendingProposal: EntitySchemaProposal | null
  sendMessage: () => void
  applyProposal: () => void
  clearChat: () => void
}

let messageCounter = 0
function nextId(): string {
  messageCounter += 1
  return `msg-${messageCounter}-${Date.now()}`
}

export function useCustomDataChat(
  onGenerate: (
    request: CustomDataSuggestionRequest,
    options: {
      onEvent: (event: CustomDataSuggestionStreamEvent) => void
      signal?: AbortSignal
    }
  ) => Promise<void>,
  onCreate: (proposal: EntitySchemaProposal) => Promise<CustomDataSuggestionApplyResult>,
  onSuccess: () => void
): UseCustomDataChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [pendingProposal, setPendingProposal] = useState<EntitySchemaProposal | null>(null)
  const activeRequestControllerRef = useRef<AbortController | null>(null)
  const sessionIdRef = useRef(`custom-data-${Date.now()}`)

  const buildConversationHistory = useCallback(
    (chatMessages: ChatMessage[]): CustomDataSuggestionConversationMessage[] =>
      chatMessages
        .filter(message => !message.isLoading && !message.isError)
        .map(message => ({
          role: message.role,
          content: message.content,
          ...(message.proposal ? { proposal: message.proposal } : {})
        })),
    []
  )

  const getStageTitle = useCallback((stage?: CustomDataSuggestionStage): string => {
    switch (stage) {
      case 'planning':
        return 'Planning'
      case 'repairing':
        return 'Repairing'
      case 'preflight_failed':
        return 'Validation'
      case 'proposal_ready':
        return 'Proposal'
      default:
        return 'Progress'
    }
  }, [])

  const upsertProgressStep = useCallback(
    (
      currentSteps: ChatProgressStep[] | undefined,
      step: {
        id: string
        title: string
        detail?: string
        status: ChatProgressStep['status']
      }
    ): ChatProgressStep[] => {
      const nextSteps = [...(currentSteps || [])]
      const existingIndex = nextSteps.findIndex(existingStep => existingStep.id === step.id)
      if (existingIndex >= 0) {
        nextSteps[existingIndex] = {
          ...nextSteps[existingIndex],
          ...step
        }
        return nextSteps
      }

      return [...nextSteps, step]
    },
    []
  )

  const applyStreamEventToMessage = useCallback(
    (message: ChatMessage, event: CustomDataSuggestionStreamEvent): ChatMessage => {
      if (event.type === 'thinking') {
        return {
          ...message,
          thinkingContent: `${message.thinkingContent || ''}${event.content || ''}`.trim(),
          progressSteps: upsertProgressStep(message.progressSteps, {
            id: 'thinking',
            title: 'Thinking',
            detail: `${message.thinkingContent || ''}${event.content || ''}`.trim(),
            status: 'running'
          })
        }
      }

      if (event.type === 'response') {
        return {
          ...message,
          content: `${message.content}${event.content || ''}`
        }
      }

      if (event.type === 'stage') {
        const status = (event.stageStatus || 'running') as ChatProgressStep['status']
        const proposal = event.proposal || message.proposal
        const nextContent =
          event.stage === 'proposal_ready' && event.content && !message.content.trim() ? event.content : message.content

        return {
          ...message,
          content: nextContent,
          proposal,
          progressSteps: upsertProgressStep(message.progressSteps, {
            id: event.stage || 'stage',
            title: getStageTitle(event.stage),
            detail: event.content,
            status
          }),
          isLoading: event.stageStatus === 'complete' && event.stage === 'proposal_ready' ? false : message.isLoading
        }
      }

      if (event.type === 'error') {
        return {
          ...message,
          content: event.content || message.content || 'Failed to generate schema',
          isLoading: false,
          isError: true
        }
      }

      if (event.type === 'done') {
        return {
          ...message,
          isLoading: false
        }
      }

      return message
    },
    [getStageTitle, upsertProgressStep]
  )

  const sendMessage = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || isProcessing) return

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: text }
    const loadingMsg: ChatMessage = {
      id: nextId(),
      role: 'assistant',
      content: '',
      thinkingContent: '',
      progressSteps: [],
      isLoading: true
    }
    const conversationHistory = buildConversationHistory(messages)
    const requestController = new AbortController()

    activeRequestControllerRef.current?.abort()
    activeRequestControllerRef.current = requestController

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInputValue('')
    setIsProcessing(true)

    try {
      await onGenerate(
        {
          description: text,
          sessionId: sessionIdRef.current,
          conversationHistory
        },
        {
          signal: requestController.signal,
          onEvent: event => {
            if (event.proposal) {
              setPendingProposal(event.proposal)
            }

            setMessages(prev =>
              prev.map(message => (message.id === loadingMsg.id ? applyStreamEventToMessage(message, event) : message))
            )
          }
        }
      )
    } catch (err: any) {
      if (requestController.signal.aborted) {
        return
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, content: err.message || 'Failed to generate schema', isLoading: false, isError: true }
            : m
        )
      )
    } finally {
      if (activeRequestControllerRef.current === requestController) {
        activeRequestControllerRef.current = null
      }
      setIsProcessing(false)
    }
  }, [applyStreamEventToMessage, buildConversationHistory, inputValue, isProcessing, messages, onGenerate])

  const applyProposal = useCallback(async () => {
    if (!pendingProposal || isProcessing) return

    const loadingMsg: ChatMessage = {
      id: nextId(),
      role: 'assistant',
      content: 'Creating entities...',
      isLoading: true
    }
    setMessages(prev => [...prev, loadingMsg])
    setIsProcessing(true)

    try {
      const result = await onCreate(pendingProposal)
      const summaryParts = [
        `${result.createdEntityKeys.length} created`,
        `${result.updatedEntityKeys.length} updated`,
        `${result.deletedEntityKeys.length} deleted`
      ]
      if (result.downgradedEntityKeys.length > 0) {
        summaryParts.push(`${result.downgradedEntityKeys.length} downgraded to draft`)
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? {
                ...m,
                content: `Applied model: ${summaryParts.join(', ')}.`,
                isLoading: false,
                result
              }
            : m
        )
      )
      setPendingProposal(null)
      onSuccess()
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, content: err.message || 'Failed to create entities', isLoading: false, isError: true }
            : m
        )
      )
    } finally {
      setIsProcessing(false)
    }
  }, [pendingProposal, isProcessing, onCreate, onSuccess])

  const clearChat = useCallback(() => {
    setMessages([])
    setPendingProposal(null)
    setInputValue('')
    activeRequestControllerRef.current?.abort()
    activeRequestControllerRef.current = null
    sessionIdRef.current = `custom-data-${Date.now()}`
  }, [])

  useEffect(() => {
    return () => {
      activeRequestControllerRef.current?.abort()
    }
  }, [])

  return {
    messages,
    inputValue,
    setInputValue,
    isProcessing,
    pendingProposal,
    sendMessage,
    applyProposal,
    clearChat
  }
}
