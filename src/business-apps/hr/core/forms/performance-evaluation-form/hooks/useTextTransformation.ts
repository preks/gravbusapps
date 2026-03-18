import { useState, useCallback } from 'react'
import { TextTransformationRequest, TextTransformationResponse } from '../types'
import { env } from '@/common/env/EnvUtils'

export type TextOperation = 'formalize' | 'translate' | 'shorten'

const TEXT_OPERATION_QUERY_IDS: Record<TextOperation, string> = {
  formalize: '6799beda3544ce9d4dfaa322',
  translate: '6799c32a3544ce9d4dfaa323',
  shorten: '6799c5dd3544ce9d4dfaa328'
}

export const useTextTransformation = (accessToken: string) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        const executeUrl = `${env('NEXT_PUBLIC_BASE_URL')}/prompt-manager/api/v1/prompts/${TEXT_OPERATION_QUERY_IDS[operation]}/execute`

        // Create payload with proper structure
        const userParams = JSON.stringify({ userInput: request.text })

        // Set system parameters based on operation type
        let systemParams = ''
        if (operation === 'translate') {
          systemParams = JSON.stringify({ language: request.targetLanguage || 'english' })
        } else if (operation === 'shorten') {
          systemParams = JSON.stringify({ numberOfSentences: 2 })
        }

        // Use URLSearchParams for proper encoding
        const requestBody = new URLSearchParams()
        requestBody.append('system_params', systemParams)
        requestBody.append('user_params', userParams)

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

        // Extract the processed text from the response
        // Check for different possible response structures
        const processedText = data?.data?.content || data?.content

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
