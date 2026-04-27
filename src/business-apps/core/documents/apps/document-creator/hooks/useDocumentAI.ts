import { useState, useCallback, useRef } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import translations from '../_i18n'

interface UseDocumentAIOptions {
  accessToken: string
}

interface UseDocumentAIResult {
  generateContent: (prompt: string, templateType: string, existingContent: string) => Promise<string | null>
  isLoading: boolean
  error: string | null
}

/**
 * Hook for AI-powered document content generation
 */
export const useDocumentAI = ({ accessToken }: UseDocumentAIOptions): UseDocumentAIResult => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const client = usePromptManagerClient(accessToken)
  const { t } = useTranslation(translations)
  const agentIdRef = useRef<string | null>(null)

  // Look up the DocumentGenerator agent
  const lookupAgent = useCallback(async () => {
    if (agentIdRef.current) return agentIdRef.current

    try {
      const prompts = await client.getPrompts({ promptName: 'DocumentGenerator', limit: 1 })
      if (prompts.results && prompts.results.length > 0) {
        agentIdRef.current = prompts.results[0]._id
        return agentIdRef.current
      }

      // Fallback: try to find any document-related expert
      const fallbackPrompts = await client.getPrompts({ limit: 100 })
      const docAgent = fallbackPrompts.results?.find(
        p => p.name?.toLowerCase().includes('document') || p.name?.toLowerCase().includes('contract')
      )
      if (docAgent) {
        agentIdRef.current = docAgent._id
        return agentIdRef.current
      }
    } catch (err) {
      console.error('[useDocumentAI] Failed to lookup agent:', err)
    }
    return null
  }, [client])

  const generateContent = useCallback(
    async (prompt: string, templateType: string, existingContent: string): Promise<string | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const agentId = await lookupAgent()

        if (!agentId) {
          // No AI agent configured - return a helpful message
          setError(t('error-document-generator-not-configured'))
          return null
        }

        // Build the full prompt with context
        const fullPrompt = `
You are a professional document writer. Generate legal/business document content based on the user's request.

Current document type: ${templateType}
Existing content length: ${existingContent.length} characters

User request: ${prompt}

Generate appropriate document content in HTML format. Only output the HTML content, no explanations.
Use proper headings (<h2>, <h3>), paragraphs (<p>), and lists (<ul>, <li>) where appropriate.
Make the content professional and legally sound.
`

        const formData = new FormData()
        formData.append('user_params', JSON.stringify({ query: fullPrompt }))

        const response = await client.executePromptById(agentId, formData)

        if (response.content) {
          const content =
            typeof response.content === 'string'
              ? response.content
              : (response.content as any).answer ||
                (response.content as any).response ||
                JSON.stringify(response.content)

          // Clean up the response - extract HTML content
          let cleanContent = content

          // Remove markdown code blocks if present
          cleanContent = cleanContent.replace(/```html?\n?/g, '').replace(/```\n?/g, '')

          return cleanContent.trim()
        }

        return null
      } catch (err) {
        console.error('[useDocumentAI] Generation failed:', err)
        setError('Failed to generate content. Please try again.')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [client, lookupAgent]
  )

  return {
    generateContent,
    isLoading,
    error
  }
}
