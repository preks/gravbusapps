import { useCallback, useRef, useState } from 'react'
import { env } from '@/common/env/EnvUtils'
import type { MessageEntityReference } from '../types'

const DEFAULT_FLOWBOT_BASE_URL = 'https://newwork-dev.newwork.com'
const LLM_MODEL = 'gpt-4.1'

function resolveFlowbotBaseUrl(): string {
  return env('NEXT_PUBLIC_FLOWBOT_ENDPOINT') || env('NEXT_PUBLIC_BASE_URL') || DEFAULT_FLOWBOT_BASE_URL
}

// Participant details for AI context
export interface ParticipantInfo {
  id: string
  odId?: string // Open Directory ID (user ID for calendar/meetings)
  name: string
  email?: string
  employeeId?: string
}

// Meeting data returned when AI schedules a meeting
export interface ScheduledMeeting {
  id: string
  title: string
  startTime: string
  endTime: string
  participants: string[]
  meetingLink?: string
  description?: string
}

interface EveryAIResponse {
  text: string
  error?: boolean
  sessionId?: string // The session ID to store in message metadata for sharing across users
  scheduledMeeting?: ScheduledMeeting // If AI scheduled a meeting
}

// Conversation context with full participant details
export interface ConversationContext {
  conversationId: string
  conversationName?: string
  participants?: ParticipantInfo[] // Full participant details
  existingSessionId?: string // Session ID from previous AI messages for shared context
  currentUserId?: string // The user who is sending the message
  currentUserName?: string
  lastScheduledMeeting?: ScheduledMeeting // Last meeting scheduled in this conversation
  mentionedUsers?: ParticipantInfo[] // Users mentioned via @ in the message (not necessarily in chat)
}

interface UseEveryAIChatOptions {
  accessToken: string
  onAIResponse?: (response: EveryAIResponse) => void
  onStreamingUpdate?: (partialText: string) => void
}

/**
 * Hook to handle @Every AI mentions in group chats
 * Sends messages to FlowBot and returns AI responses
 * Supports meeting scheduling for chat participants
 */
export function useEveryAIChat({ accessToken, onAIResponse, onStreamingUpdate }: UseEveryAIChatOptions) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [streamingText, setStreamingText] = useState<string>('')
  const inFlightRef = useRef(false)
  const conversationContextRef = useRef<ConversationContext | null>(null)

  /**
   * Check if message contains an @Every mention
   */
  const hasEveryMention = useCallback((entityReferences?: MessageEntityReference[]): boolean => {
    return entityReferences?.some(ref => ref.type === 'ai_assistant' && ref.id === 'every-ai-assistant') ?? false
  }, [])

  /**
   * Extract the question/prompt from a message containing @Every mention
   * Removes the @Every mention from the text to get the actual question
   */
  const extractPromptFromMessage = useCallback((content: string): string => {
    // Remove @Every mention and clean up the text
    return content
      .replace(/@Every\s*/gi, '')
      .replace(/@AI\s*/gi, '')
      .replace(/@Assistant\s*/gi, '')
      .trim()
  }, [])

  /**
   * Build an enhanced prompt with full participant context
   */
  const buildEnhancedPrompt = useCallback((prompt: string, context?: ConversationContext): string => {
    const parts: string[] = []

    // Get user's timezone for meeting scheduling
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const timezoneOffset = new Date().getTimezoneOffset()
    const offsetHours = Math.abs(Math.floor(timezoneOffset / 60))
    const offsetMinutes = Math.abs(timezoneOffset % 60)
    const offsetSign = timezoneOffset <= 0 ? '+' : '-'
    const timezoneOffsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`

    // Add group chat name
    if (context?.conversationName) {
      parts.push(`[Group chat: ${context.conversationName}]`)
    }

    // Add participant information with both id and odId (Open Directory ID)
    // odId is the correct ID format for calendar/meetings API
    if (context?.participants && context.participants.length > 0) {
      const participantList = context.participants
        .map(p => {
          const details = [p.name]
          if (p.email) details.push(`<${p.email}>`)
          // Include both id and odId - odId is the Open Directory ID needed for calendar API
          if (p.odId) {
            details.push(`(odId: ${p.odId})`)
          } else if (p.id) {
            details.push(`(id: ${p.id})`)
          }
          return details.join(' ')
        })
        .join(', ')
      parts.push(`[Chat participants: ${participantList}]`)

      // Also provide participant mapping in structured format for direct use
      const participantMapping = context.participants
        .map(p => {
          const odId = p.odId || p.id
          return `"${p.name}": "${odId}"`
        })
        .join(', ')
      parts.push(
        `[PARTICIPANT_ID_MAPPING: Use these exact participant IDs when scheduling meetings: {${participantMapping}}]`
      )
    }

    // Add mentioned users (people referenced via @ who may not be in the chat)
    // Include odId which is the correct ID format for calendar API
    if (context?.mentionedUsers && context.mentionedUsers.length > 0) {
      const mentionedList = context.mentionedUsers
        .map(p => {
          if (p.odId) {
            return `${p.name} (odId: ${p.odId})`
          }
          return `${p.name} (id: ${p.id})`
        })
        .join(', ')
      parts.push(`[Mentioned users in this message: ${mentionedList}]`)

      // Also provide mentioned users mapping in structured format
      const mentionedMapping = context.mentionedUsers
        .map(p => {
          const odId = p.odId || p.id
          return `"${p.name}": "${odId}"`
        })
        .join(', ')
      parts.push(
        `[MENTIONED_USER_ID_MAPPING: Use these exact participant IDs when scheduling meetings: {${mentionedMapping}}]`
      )
    }

    // Add current user context
    if (context?.currentUserName) {
      parts.push(`[You are speaking to: ${context.currentUserName}]`)
    }

    // Add timezone information for meeting scheduling
    parts.push(
      `[TIMEZONE: User's timezone is ${userTimezone} (UTC${timezoneOffsetString}). When scheduling meetings, interpret all times in this timezone. For example, if user says "2pm", that means 2pm ${userTimezone} (UTC${timezoneOffsetString}), not UTC.]`
    )

    // Add last scheduled meeting info so AI can update it
    if (context?.lastScheduledMeeting) {
      const m = context.lastScheduledMeeting
      const meetingDate = new Date(m.startTime)
      parts.push(
        `[Last scheduled meeting in this chat: "${m.title}" (id: ${m.id}) on ${meetingDate.toLocaleDateString()} at ${meetingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with ${m.participants.join(', ')}]`
      )
    }

    // Add meeting capabilities hint - FlowBot has tools for this
    parts.push(
      `[MEETING CAPABILITIES: You have access to tools for scheduling and updating meetings:
        - schedule_meeting: Create a new meeting with title, date, time, duration, timezone, and participant IDs
        - find_meeting_slot: Find available meeting slots by checking participant calendars
        - update_meeting: Update an existing meeting
        - cancel_meeting: Cancel an existing meeting
        
        CONTEXT PROVIDED:
        - User's timezone: ${userTimezone} (UTC${timezoneOffsetString})
        - Current date/time: ${new Date().toLocaleString('en-US', { timeZone: userTimezone })}
        - Participant IDs available in PARTICIPANT_ID_MAPPING above
        
        When scheduling meetings:
        1. Use timezone="${userTimezone}" 
        2. Include ALL participant odIds from PARTICIPANT_ID_MAPPING
        3. Interpret times in ${userTimezone} timezone
        4. Use participantIds parameter (array of odId strings), not participants with names]`
    )

    parts.push(prompt)

    return parts.join(' ')
  }, [])

  /**
   * Send a message to FlowBot and get the AI response
   * @param existingSessionId - Session ID from previous AI messages in this conversation (for shared context)
   */
  const sendToEveryAI = useCallback(
    async (content: string, conversationContext?: ConversationContext): Promise<EveryAIResponse> => {
      if (inFlightRef.current) {
        return { text: '', error: true }
      }

      // Store context for meeting scheduling
      if (conversationContext) {
        conversationContextRef.current = conversationContext
      }

      try {
        inFlightRef.current = true
        setIsProcessing(true)

        const prompt = extractPromptFromMessage(content)
        if (!prompt) {
          return { text: "I'm here to help! What would you like to know?", error: false }
        }

        // When running locally, connect to DEV environment FlowBot
        const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        const baseUrl = isLocalhost ? 'https://newwork-dev.newwork.com' : resolveFlowbotBaseUrl()

        const url = `${baseUrl}/flowbot/api/agent/v2/chat`

        if (isLocalhost) {
          console.log('🤖 [EveryAI] Local development - connecting to DEV FlowBot:', url)
        }

        // Use existing session ID from previous AI messages in this conversation
        // This allows all users to share the same AI context
        const sharedSessionId = conversationContext?.existingSessionId ?? ''

        const form = new FormData()
        form.append('session_id', sharedSessionId)
        form.append('llm_model', LLM_MODEL)
        form.append('use_web_search_tool', 'false')

        // Build context in the format FlowBot expects
        const currentPageUrl = typeof window !== 'undefined' ? window.location.href : ''
        const currentPageRoute = typeof window !== 'undefined' ? window.location.pathname : ''

        // Build enhanced prompt with full participant context
        const enhancedPrompt = buildEnhancedPrompt(prompt, conversationContext)
        form.append('user_input_text', enhancedPrompt)

        // Use 'unknown' type since we're in a chat context, not an entity page
        // Format matches prepareCurrentPageContext output: flat object with type at root
        const contextPayload = {
          type: 'unknown' as const,
          url: currentPageUrl,
          route: currentPageRoute
        }
        form.append('current_page_context', JSON.stringify(contextPayload))

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'text/event-stream'
          },
          body: form
        })

        if (!res.ok) {
          throw new Error(`FlowBot request failed: ${res.statusText}`)
        }

        if (!res.body) {
          throw new Error('No body in FlowBot response')
        }

        // Parse SSE response to extract the answer
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
        let responseText = ''
        let responseSessionId = sharedSessionId // Start with existing, will be updated if new one received
        let buf = ''

        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buf += value
          const parts = buf.split('\n\n')
          buf = parts.pop() ?? ''

          for (const part of parts) {
            let event = 'message'
            let data = ''
            for (const rawLine of part.split('\n')) {
              const line = rawLine.replace(/\r$/, '')
              if (line.startsWith('event:')) event = line.slice(6).trim()
              else if (line.startsWith('data:')) data += line.slice(5).trimStart()
            }

            if (event === 'session-id') {
              try {
                const newSessionId = JSON.parse(data.trim())
                if (newSessionId) {
                  responseSessionId = newSessionId
                }
              } catch {
                // Ignore parse errors
              }
            } else if (event === 'output-item') {
              try {
                const output = JSON.parse(data)
                if (output.type === 'answer') {
                  let extractedText = ''

                  // Check for text directly on the output
                  if (output.text) {
                    extractedText = output.text
                  }
                  // Also check displayData array for textBlock items
                  else if (output.displayData && Array.isArray(output.displayData)) {
                    const textBlocks = output.displayData
                      .filter((item: any) => item.type === 'textBlock' && item.text)
                      .map((item: any) => item.text)
                    if (textBlocks.length > 0) {
                      extractedText = textBlocks.join('\n\n')
                    }
                  }

                  if (extractedText) {
                    responseText = extractedText
                    // Update streaming state for live updates
                    setStreamingText(extractedText)
                    if (onStreamingUpdate) {
                      onStreamingUpdate(extractedText)
                    }
                  }
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        // Meeting scheduling is now handled by FlowBot backend tools
        // The AI will call schedule_meeting, update_meeting, or cancel_meeting tools directly
        // and include the results in its response

        const response: EveryAIResponse = {
          text: responseText || "I'm sorry, I couldn't generate a response. Please try again.",
          error: !responseText,
          sessionId: responseSessionId || undefined
        }

        if (onAIResponse) {
          onAIResponse(response)
        }

        return response
      } catch (error) {
        console.error('Error sending message to Every AI:', error)
        const errorResponse: EveryAIResponse = {
          text: "I'm sorry, I encountered an error. Please try again.",
          error: true
        }
        if (onAIResponse) {
          onAIResponse(errorResponse)
        }
        return errorResponse
      } finally {
        inFlightRef.current = false
        setIsProcessing(false)
      }
    },
    [accessToken, extractPromptFromMessage, onAIResponse, onStreamingUpdate, buildEnhancedPrompt]
  )

  /**
   * Process a chat message that may contain @Every mention
   * Returns the AI response if @Every was mentioned, null otherwise
   * @param conversationContext - Full context including participants and session ID
   */
  const processMessage = useCallback(
    async (
      content: string,
      entityReferences?: MessageEntityReference[],
      conversationContext?: ConversationContext
    ): Promise<EveryAIResponse | null> => {
      if (!hasEveryMention(entityReferences)) {
        return null
      }

      return sendToEveryAI(content, conversationContext)
    },
    [hasEveryMention, sendToEveryAI]
  )

  // Clear streaming text when processing ends
  const clearStreamingText = useCallback(() => {
    setStreamingText('')
  }, [])

  return {
    isProcessing,
    streamingText,
    hasEveryMention,
    processMessage,
    sendToEveryAI,
    clearStreamingText
  }
}
