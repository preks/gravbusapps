import { useCallback, useRef, useState } from 'react'
import { env } from '@/common/env/EnvUtils'
import type { MessageEntityReference } from '../types'

const DEFAULT_FLOWBOT_BASE_URL = 'https://newwork-dev.newwork.com'
const LLM_MODEL = 'gpt-4.1'

function resolveFlowbotBaseUrl(): string {
  return env('NEXT_PUBLIC_FLOWBOT_ENDPOINT') || env('NEXT_PUBLIC_BASE_URL') || DEFAULT_FLOWBOT_BASE_URL
}

interface EveryAIResponse {
  text: string
  error?: boolean
}

interface UseEveryAIChatOptions {
  accessToken: string
  onAIResponse?: (response: EveryAIResponse) => void
  onStreamingUpdate?: (partialText: string) => void
}

/**
 * Hook to handle @Every AI mentions in group chats
 * Sends messages to FlowBot and returns AI responses
 */
export function useEveryAIChat({ accessToken, onAIResponse, onStreamingUpdate }: UseEveryAIChatOptions) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [streamingText, setStreamingText] = useState<string>('')
  const inFlightRef = useRef(false)
  const sessionIdRef = useRef<string | null>(null)

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
   * Send a message to FlowBot and get the AI response
   */
  const sendToEveryAI = useCallback(
    async (
      content: string,
      conversationContext?: { conversationId: string; conversationName?: string; participantNames?: string[] }
    ): Promise<EveryAIResponse> => {
      if (inFlightRef.current) {
        return { text: '', error: true }
      }

      try {
        inFlightRef.current = true
        setIsProcessing(true)

        const prompt = extractPromptFromMessage(content)
        if (!prompt) {
          return { text: "I'm here to help! What would you like to know?", error: false }
        }

        const baseUrl =
          typeof window !== 'undefined' && window.location.hostname === 'localhost'
            ? 'http://localhost:8000'
            : resolveFlowbotBaseUrl()

        const url = `${baseUrl}/flowbot/api/agent/v2/chat`

        const form = new FormData()
        form.append('session_id', sessionIdRef.current ?? '')
        form.append('user_input_text', prompt)
        form.append('llm_model', LLM_MODEL)
        form.append('use_web_search_tool', 'false')

        // Build context in the format FlowBot expects
        // The API expects a FLAT object with type at the root level (not nested in currentPage)
        const currentPageUrl = typeof window !== 'undefined' ? window.location.href : ''
        const currentPageRoute = typeof window !== 'undefined' ? window.location.pathname : ''

        // Include group chat context in the prompt itself for better AI understanding
        let enhancedPrompt = prompt
        if (conversationContext?.conversationName) {
          enhancedPrompt = `[Group chat: ${conversationContext.conversationName}] ${prompt}`
        }

        // Update the user_input_text with enhanced prompt
        form.set('user_input_text', enhancedPrompt)

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
                sessionIdRef.current = JSON.parse(data.trim())
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

        const response: EveryAIResponse = {
          text: responseText || "I'm sorry, I couldn't generate a response. Please try again.",
          error: !responseText
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
    [accessToken, extractPromptFromMessage, onAIResponse]
  )

  /**
   * Process a chat message that may contain @Every mention
   * Returns the AI response if @Every was mentioned, null otherwise
   */
  const processMessage = useCallback(
    async (
      content: string,
      entityReferences?: MessageEntityReference[],
      conversationContext?: { conversationId: string; conversationName?: string; participantNames?: string[] }
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
