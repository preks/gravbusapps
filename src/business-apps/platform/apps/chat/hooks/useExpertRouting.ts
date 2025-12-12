/**
 * Expert Routing Hook
 *
 * Extends useEveryAIChat to route messages to specific experts
 * Executes expert prompts with their knowledge sources
 */

import { useCallback } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { ActiveExpert } from './useConversationExperts'

export interface ExpertRoutingOptions {
  accessToken: string
}

export interface ExpertResponse {
  text: string
  error?: boolean
  citations?: Array<{
    source: string
    sourceType: 'document' | 'url' | 'knowledge_base'
    snippet: string
    page?: number
    url?: string
  }>
  confidence?: number
}

export const useExpertRouting = ({ accessToken }: ExpertRoutingOptions) => {
  const client = usePromptManagerClient(accessToken)

  /**
   * Send message to a specific expert
   */
  const sendToExpert = useCallback(
    async (prompt: string, expert: ActiveExpert): Promise<ExpertResponse> => {
      try {
        // First, get the expert's prompt to see what parameters it expects
        const expertPrompt = await client.getPrompt(expert.expertId)

        // Extract parameter names from user_content template
        const userParams: Record<string, any> = {}
        const systemParams: Record<string, any> = {}

        // Get parameters from the prompt
        const userParameters = expertPrompt.user_content?.parameters || []
        const systemParameters = expertPrompt.system_content?.parameters || []

        // Check if this is a Document Reviewer expert - inject document context
        const expertName = expert.expertName?.toLowerCase() || ''
        const isDocumentReviewer = expertName.includes('document') || expertName.includes('review')
        const docContext = (globalThis as any).__currentDocumentContext

        // For Document Reviewer, build a comprehensive prompt with document content
        let effectivePrompt = prompt
        if (isDocumentReviewer && docContext?.documentContent) {
          console.log('[ExpertRouting] Document Reviewer detected, injecting document context:', {
            documentId: docContext.documentId,
            documentTitle: docContext.documentTitle,
            contentLength: docContext.documentContent?.length || 0
          })

          // Build a comprehensive prompt that includes all the document details
          effectivePrompt = `${prompt}

=== DOCUMENT TO REVIEW ===
Title: ${docContext.documentTitle || 'Untitled'}
Document ID: ${docContext.documentId || 'unknown'}
Content Type: ${docContext.contentType || 'knowledge_article'}

--- DOCUMENT CONTENT START ---
${docContext.documentContent}
--- DOCUMENT CONTENT END ---

Please analyze the document above and return your findings as structured JSON with annotations.`
        }

        // Only send parameters if the template expects them
        if (userParameters.length > 0) {
          // Map to the actual parameter names defined in the template
          userParameters.forEach(param => {
            // For Document Reviewer, map to specific params if template expects them
            if (isDocumentReviewer && docContext) {
              if (param === 'content' || param === 'documentContent' || param === 'document_content') {
                userParams[param] = docContext.documentContent || ''
              } else if (param === 'title' || param === 'documentTitle' || param === 'document_title') {
                userParams[param] = docContext.documentTitle || 'Untitled'
              } else if (param === 'document_id' || param === 'documentId') {
                userParams[param] = docContext.documentId || ''
              } else if (param === 'content_type' || param === 'contentType') {
                userParams[param] = docContext.contentType || 'knowledge_article'
              } else if (param === 'review_type' || param === 'reviewType') {
                userParams[param] = 'all'
              } else if (param === 'custom_instructions' || param === 'customInstructions') {
                userParams[param] = ''
              } else if (
                param === 'user_message' ||
                param === 'userMessage' ||
                param === 'question' ||
                param === 'query' ||
                param === 'request'
              ) {
                userParams[param] = effectivePrompt
              } else {
                userParams[param] = effectivePrompt
              }
            } else {
              userParams[param] = effectivePrompt
            }
          })
        }

        if (systemParameters.length > 0) {
          // Map system parameters if needed
          systemParameters.forEach(param => {
            // For now, leave empty - could add context here
            systemParams[param] = ''
          })
        }

        // Prepare FormData for prompt execution
        const formData = new FormData()

        // Only append params if there are any expected
        if (Object.keys(userParams).length > 0) {
          formData.append('user_params', JSON.stringify(userParams))
        }
        if (Object.keys(systemParams).length > 0) {
          formData.append('system_params', JSON.stringify(systemParams))
        }

        // Execute the expert's prompt
        const response = await client.executePromptById(expert.expertId, formData)

        // Parse response
        let responseText = ''
        let citations = undefined
        let confidence = undefined

        if (typeof response.content === 'string') {
          responseText = response.content
        } else if (response.content && typeof response.content === 'object') {
          // If response is structured JSON
          const data = response.content as any
          responseText = data.answer || data.response || data.text || JSON.stringify(data)
          citations = data.citations
          confidence = data.confidence
        }

        return {
          text: responseText || "I couldn't generate a response.",
          error: !responseText,
          citations,
          confidence
        }
      } catch (error) {
        console.error('Error sending to expert:', error)
        return {
          text: "I'm sorry, I encountered an error. Please try again.",
          error: true
        }
      }
    },
    [client]
  )

  return {
    sendToExpert
  }
}
