import { useState, useCallback, useRef } from 'react'
import { TextTransformationRequest, TextTransformationResponse } from '../types'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'

export type TextOperation = 'formalize' | 'translate' | 'shorten'

/** EveryAI skill names for performance evaluation form text transformations. */
const PROMPT_NAMES: Record<TextOperation, string> = {
  formalize: 'EmployeeFeedbackFormalize',
  translate: 'TranslateText',
  shorten: 'ShortenText'
}

interface PromptODM {
  _id?: string
  name: string
}

interface PromptPage {
  data: PromptODM[]
}

async function fetchPromptIdByName(baseUrl: string, accessToken: string, name: string): Promise<string | null> {
  const listUrl = `${baseUrl}/flowbot/prompt-manager/api/v1/prompts/?name=${encodeURIComponent(name)}&limit=3`
  const res = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!res.ok) return null
  const page: PromptPage = await res.json()
  const prompt = page.data?.find(p => p.name === name)
  return prompt?._id ?? null
}

export const useTextTransformation = (accessToken: string) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const promptIdCache = useRef<Partial<Record<TextOperation, string>>>({})

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const transformText = useCallback(
    async (request: TextTransformationRequest): Promise<TextTransformationResponse | null> => {
      if (!accessToken) {
        setError('No access token available')
        return null
      }

      if (!request.text.trim()) {
        setError('The text content is empty.')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const operation = request.transformationType as TextOperation
        const baseUrl = resolveFlowbotBaseUrl()
        let promptId = promptIdCache.current[operation]
        if (!promptId) {
          const name = PROMPT_NAMES[operation]
          promptId = (await fetchPromptIdByName(baseUrl, accessToken, name)) ?? ''
          if (promptId) promptIdCache.current[operation] = promptId
        }
        if (!promptId) {
          throw new Error(`EveryAI skill "${PROMPT_NAMES[operation]}" not found`)
        }
        const executeUrl = `${baseUrl}/flowbot/prompt-manager/api/v1/prompts/${promptId}/execute`

        const userParams = JSON.stringify({ userInput: request.text })
        let systemParams = ''
        if (operation === 'translate') {
          systemParams = JSON.stringify({ language: request.targetLanguage || 'english' })
        } else if (operation === 'shorten') {
          systemParams = JSON.stringify({ numberOfSentences: 2 })
        }

        const requestBody = new URLSearchParams()
        requestBody.append('user_params', userParams)
        if (systemParams) {
          requestBody.append('system_params', systemParams)
        }

        const response = await fetch(executeUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: requestBody
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        const processedText = data?.content ?? data?.data?.content

        if (processedText) {
          const result: TextTransformationResponse = {
            transformedText: processedText,
            originalText: request.text,
            transformationType: request.transformationType,
            targetLanguage: request.targetLanguage
          }

          return result
        } else {
          throw new Error('No text received from the transformation service')
        }
      } catch (err) {
        console.error('Text transformation error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to process text'
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken]
  )

  return {
    transformText,
    isLoading,
    error,
    clearError,
    setError
  }
}
