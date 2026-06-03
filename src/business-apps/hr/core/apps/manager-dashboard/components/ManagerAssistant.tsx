'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, Button, Input } from '@newwork/nw-design-system'
import {
  PiPaperPlaneRight,
  PiX,
  PiStar as PiSparkle, // Using PiStar as replacement for PiSparkle
  PiUser,
  PiRobot
} from 'react-icons/pi'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { UserInfo } from '../types/employee.types'

// AI suggestions - keeping existing predefined prompts
const aiSuggestions = [
  'Help me prepare for 1:1s',
  'Flag risks on my team',
  'Show team time off calendar',
  'Analyze team workload',
  'Identify skill gaps'
]

// Types for conversation following the Every message pattern
interface ConversationTurn {
  side: 'user' | 'agent'
  text?: string
  outputs?: OutputItem[]
  timestamp: Date
}

interface OutputItem {
  type: 'answer' | 'loading' | 'error'
  displayData?: DisplayData[]
  text?: string
}

interface DisplayData {
  type: 'textBlock'
  text: string
}

interface ManagerAssistantProps {
  className?: string
  accessToken?: string
  userInfo?: UserInfo
}

/**
 * Manager Assistant Component
 * AI-powered assistant for managers to get insights and help with team management
 * Now with conversation history following Every message pattern
 */
export const ManagerAssistant: React.FC<ManagerAssistantProps> = ({ className, accessToken, userInfo }) => {
  const [aiPrompt, setAiPrompt] = useState('')
  const [conversation, setConversation] = useState<ConversationTurn[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [isChatMode, setIsChatMode] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const MAX_CHAT_HEIGHT = 400 // Maximum height for chat mode

  // Auto-scroll to bottom when conversation grows
  useEffect(() => {
    if (scrollRef.current && isChatMode) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversation.length, isChatMode])

  // Handle AI prompt submission with conversation history
  const handleAiPromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!aiPrompt.trim() || isLoading) return

    const userMessage = aiPrompt.trim()
    setAiPrompt('')
    setIsLoading(true)
    setIsChatMode(true)

    // Add user message to conversation
    const userTurn: ConversationTurn = {
      side: 'user',
      text: userMessage,
      timestamp: new Date()
    }

    setConversation(prev => [...prev, userTurn])

    try {
      // Create FormData as expected by the flowbot API
      const form = new FormData()
      form.append('session_id', sessionId) // use existing session or empty for new
      form.append('user_input_text', userMessage)
      form.append('llm_model', 'gpt-4o') // Use the correct model version
      form.append('use_web_search_tool', 'false')

      // Add current page context - use correct structure for manager dashboard
      const pageContext = {
        type: 'overview',
        url: window.location.href,
        entity_name: 'employee'
      }
      form.append('current_page_context', JSON.stringify(pageContext))

      const response = await fetch('/flowbot/api/agent/v2/chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'text/event-stream'
        },
        body: form
      })

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }

      // Handle streaming response with Every message pattern
      if (!response.body) {
        throw new Error('No response body received')
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let accumulatedResponse = ''
      let frames = ''
      let newSessionId = sessionId

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          frames += value
          const frameList = frames.split('\n\n')
          frames = frameList.pop() || ''

          for (const frame of frameList) {
            const lines = frame.split('\n')
            let eventType = ''
            let data = ''

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7)
              } else if (line.startsWith('data: ')) {
                data = line.slice(6)
              }
            }

            if (eventType === 'session-id' && data && !newSessionId) {
              newSessionId = data.replace(/"/g, '')
            } else if (eventType === 'output-item' && data) {
              try {
                const parsed = JSON.parse(data)
                if (parsed.type === 'answer' && parsed.displayData) {
                  for (const displayItem of parsed.displayData) {
                    if (displayItem.type === 'textBlock' && displayItem.text) {
                      accumulatedResponse += displayItem.text
                    }
                  }
                }
              } catch (parseError) {
                console.warn('Failed to parse output item:', parseError)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      // Update session ID for future requests
      if (newSessionId && newSessionId !== sessionId) {
        setSessionId(newSessionId)
      }

      // Add agent response to conversation
      const responseText =
        accumulatedResponse || "I received your message but couldn't generate a response. Please try again."
      const agentTurn: ConversationTurn = {
        side: 'agent',
        outputs: [
          {
            type: 'answer',
            displayData: [{ type: 'textBlock', text: responseText }]
          }
        ],
        timestamp: new Date()
      }

      setConversation(prev => [...prev, agentTurn])
    } catch (error) {
      console.error('Error calling AI agent:', error)

      // Add error message to conversation
      const errorTurn: ConversationTurn = {
        side: 'agent',
        outputs: [
          {
            type: 'error',
            text: "I apologize, but I'm having trouble connecting to the AI service at the moment. Please try again later."
          }
        ],
        timestamp: new Date()
      }

      setConversation(prev => [...prev, errorTurn])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setAiPrompt(suggestion)
    // Auto-submit after a short delay
    setTimeout(() => {
      handleAiPromptSubmit({ preventDefault: () => {} } as React.FormEvent)
    }, 300)
  }

  const clearConversation = () => {
    setConversation([])
    setIsChatMode(false)
    setSessionId('')
  }

  // Render user message following Every message pattern
  const renderUserMessage = (turn: ConversationTurn, index: number) => (
    <div key={`user-${index}`} className="gba:flex gba:justify-end gba:mb-4">
      <div className="gba:max-w-[80%] gba:bg-primary-50 gba:rounded-[18px] gba:px-4 gba:py-2">
        <p className="gba:text-sm gba:text-neutral-800">{turn.text}</p>
      </div>
    </div>
  )

  // Render agent message following Every message pattern
  const renderAgentMessage = (turn: ConversationTurn, index: number) => (
    <div key={`agent-${index}`} className="gba:flex gba:justify-start gba:mb-4">
      <div className="gba:flex gba:items-start gba:max-w-[85%]">
        <div className="gba:mr-2 gba:mt-1">
          <div className="gba:h-6 gba:w-6 gba:bg-primary-100 gba:rounded-full gba:flex gba:items-center gba:justify-center">
            <PiSparkle className="gba:h-3 gba:w-3 gba:text-primary-600" />
          </div>
        </div>
        <div className="gba:bg-neutral-50 gba:rounded-lg gba:p-3 gba:border gba:border-neutral-200">
          {turn.outputs?.map((output, outputIndex) => {
            if (output.type === 'answer' && output.displayData) {
              return output.displayData.map((data, dataIndex) => (
                <p key={`data-${dataIndex}`} className="gba:text-sm gba:text-neutral-700 gba:whitespace-pre-line">
                  {data.text}
                </p>
              ))
            } else if (output.type === 'error') {
              return (
                <p key={`error-${outputIndex}`} className="gba:text-sm gba:text-red-600">
                  {output.text}
                </p>
              )
            }
            return null
          })}
        </div>
      </div>
    </div>
  )

  // Render loading message
  const renderLoadingMessage = () => (
    <div className="gba:flex gba:justify-start gba:mb-4">
      <div className="gba:flex gba:items-start">
        <div className="gba:mr-2 gba:mt-1">
          <div className="gba:h-6 gba:w-6 gba:bg-primary-100 gba:rounded-full gba:flex gba:items-center gba:justify-center">
            <PiSparkle className="gba:h-3 gba:w-3 gba:text-primary-600" />
          </div>
        </div>
        <div className="gba:bg-neutral-50 gba:rounded-lg gba:p-3 gba:border gba:border-neutral-200">
          <div className="gba:flex gba:items-center gba:space-x-2">
            <div className="gba:animate-spin gba:rounded-full gba:h-3 gba:w-3 gba:border-b-2 gba:border-primary-600"></div>
            <p className="gba:text-sm gba:text-neutral-600">Thinking...</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Card className={`${className || ''} gba:mb-4`} data-testid="manager-dashboard-ai-card">
      <CardContent className="gba:p-3">
        {/* Header with clear conversation option */}
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
          <div className="gba:flex gba:items-center">
            <div className="gba:h-6 gba:w-6 gba:bg-primary-100 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:mr-2">
              <PiSparkle className="gba:h-3 gba:w-3 gba:text-primary-600" />
            </div>
            <div>
              <h3 className="gba:text-sm gba:font-medium gba:text-neutral-900">Manager Assistant</h3>
              <p className="gba:text-xs gba:text-neutral-500">Ask me anything about your team</p>
            </div>
          </div>
          {isChatMode && conversation.length > 0 && (
            <button
              className="gba:text-neutral-400 gba:hover:text-neutral-600 gba:text-xs"
              onClick={clearConversation}
              data-testid="manager-dashboard-ai-clear-button"
            >
              <PiX size={14} />
            </button>
          )}
        </div>

        {/* Conversation History */}
        {isChatMode && conversation.length > 0 && (
          <div
            ref={scrollRef}
            className="gba:mb-3 gba:overflow-y-auto gba:border gba:border-neutral-200 gba:rounded-lg gba:p-2"
            style={{ maxHeight: `${MAX_CHAT_HEIGHT}px` }}
            data-testid="manager-dashboard-ai-conversation"
          >
            {conversation.map((turn, index) =>
              turn.side === 'user' ? renderUserMessage(turn, index) : renderAgentMessage(turn, index)
            )}
            {isLoading && renderLoadingMessage()}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleAiPromptSubmit} className="gba:flex gba:space-x-2 gba:mb-3">
          <Input
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            placeholder={isChatMode ? 'Ask a follow-up question...' : 'How can I help you manage your team today?'}
            className="gba:flex-1 gba:text-sm gba:h-8"
            disabled={isLoading}
            data-testid="manager-dashboard-ai-input"
          />
          <Button
            type="submit"
            variant="default"
            size="sm"
            className="gba:h-8 gba:px-3"
            disabled={isLoading}
            data-testid="manager-dashboard-ai-submit-button"
          >
            {isLoading ? '...' : <PiPaperPlaneRight size={14} />}
          </Button>
        </form>

        {/* Predefined Suggestions - only show when not in chat mode or when conversation is empty */}
        {(!isChatMode || conversation.length === 0) && (
          <div className="gba:flex gba:flex-wrap gba:gap-1">
            {aiSuggestions.map((suggestion, index) => (
              <button
                key={index}
                className="gba:text-xs gba:bg-neutral-100 gba:hover:bg-neutral-200 gba:text-neutral-700 gba:px-2 gba:py-1 gba:rounded-full gba:transition-colors"
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isLoading}
                data-testid={`manager-dashboard-ai-suggestion-${index}`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ManagerAssistant
