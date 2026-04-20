import { useState, useCallback } from 'react'
import { TextTransformationRequest, TextTransformationResponse } from '../types'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'

export type TextOperation = 'formalize' | 'translate' | 'shorten'

const TEXT_OPERATION_QUERY_IDS: Record<TextOperation, string> = {
  formalize: '6799beda3544ce9d4dfaa322',
  translate: '6799c32a3544ce9d4dfaa323',
  shorten: '6799c5dd3544ce9d4dfaa328'
}

export const useTextTransformation = (accessToken: string) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const promptManagerClient = usePromptManagerClient(accessToken)

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

        const formData = new FormData()
        let systemParams = ''
        if (operation === 'translate') {
          systemParams = JSON.stringify({ language: request.targetLanguage || 'english' })
        } else if (operation === 'shorten') {
          systemParams = JSON.stringify({ numberOfSentences: 2 })
        }
        formData.append('system_params', systemParams)
        formData.append('user_params', JSON.stringify({ userInput: request.text }))

        const response = await promptManagerClient.executePromptById(TEXT_OPERATION_QUERY_IDS[operation], formData)

        // Extract the processed text from the response
        const responseContent = response.content
        const processedText =
          typeof responseContent === 'string'
            ? responseContent
            : responseContent && typeof responseContent === 'object' && 'content' in responseContent
              ? String((responseContent as { content?: unknown }).content ?? '')
              : null

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
    [accessToken, promptManagerClient]
  )

  return {
    transformText,
    isLoading,
    error,
    clearError,
    setError
  }
}
