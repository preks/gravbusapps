import { useCallback, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

const RELATIONSHIP_CONGRATULATIONS_PROMPT_NAME = 'relationship_change_congratulations'

interface GenerateRelationshipCongratulationsMessageParams {
  companyName: string
  personName: string
  relationshipType: string
}

function getActiveLanguage(): string {
  const locale = getCurrentActiveUserLocale() || 'en-US'

  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(locale.split('-')[0]) ?? locale
  } catch {
    return locale
  }
}

function parseMessageResponse(content: unknown): string {
  if (typeof content !== 'string') {
    const message = (content as { message?: unknown } | null)?.message
    return typeof message === 'string' ? message.trim() : ''
  }

  const trimmed = content.trim()
  if (!trimmed) return ''

  try {
    const parsed = JSON.parse(trimmed)
    const message = (parsed as { message?: unknown }).message
    return typeof message === 'string' ? message.trim() : trimmed
  } catch {
    return trimmed
  }
}

export function useRelationshipCongratulationsMessage(accessToken: string) {
  const client = usePromptManagerClient(accessToken)
  const [message, setMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clear = useCallback(() => {
    setMessage('')
    setError(null)
    setIsGenerating(false)
  }, [])

  const generateMessage = useCallback(
    async ({
      companyName,
      personName,
      relationshipType
    }: GenerateRelationshipCongratulationsMessageParams): Promise<void> => {
      if (!accessToken) return

      setMessage('')
      setError(null)
      setIsGenerating(true)

      try {
        const promptsPage = await client.getPrompts({
          promptName: RELATIONSHIP_CONGRATULATIONS_PROMPT_NAME,
          limit: 1
        })
        const taskExpertId = promptsPage?.data?.[0]?._id

        if (!taskExpertId) {
          throw new Error(`Prompt not found: ${RELATIONSHIP_CONGRATULATIONS_PROMPT_NAME}`)
        }

        const response = await client.executePromptWithOptions(taskExpertId, {
          userParams: {
            birthDate: '',
            companyName,
            language: getActiveLanguage(),
            personName,
            relationshipType
          }
        })

        setMessage(parseMessageResponse(response.content))
      } catch (err: unknown) {
        const fallbackMessage = err instanceof Error ? err.message : 'Failed to generate relationship message'
        setError(fallbackMessage)
        console.error('Relationship congratulations message error:', err)
      } finally {
        setIsGenerating(false)
      }
    },
    [accessToken, client]
  )

  return { message, isGenerating, error, generateMessage, clear }
}
