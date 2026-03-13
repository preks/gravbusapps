/**
 * useSlideGeneration Hook
 *
 * React hook for managing AI-powered slide generation state and flow.
 * Orchestrates the two-phase generation process (research + generation)
 * with loading states, phase tracking, and error handling.
 */

import { useState, useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import {
  SlideGenerationService,
  parseGenerationError,
  type GenerationOptions,
  type SlideGenerationErrorDetails
} from '../services'
import type { SlideData } from '../components/slideElements'
import translations from '../_i18n'

export type GenerationPhase = 'idle' | 'research' | 'generation' | 'validation' | 'complete'

export interface MatchedTemplateInfo {
  id: string
  name: string
  themeId?: string
}

export interface UseSlideGenerationOptions {
  accessToken: string
  onSuccess?: (slides: SlideData[], title: string, sources?: string[], matchedTemplate?: MatchedTemplateInfo) => void
  onError?: (error: string, details?: SlideGenerationErrorDetails) => void
}

export interface UseSlideGenerationResult {
  /** Whether generation is in progress */
  isGenerating: boolean
  /** Current phase of generation */
  phase: GenerationPhase
  /** Error message if generation failed */
  error: string | null
  /** Structured error details if generation failed */
  errorDetails: SlideGenerationErrorDetails | null
  /** Progress message for user feedback */
  progressMessage: string | null
  /** Sources found during research (if web search was enabled) */
  sources: string[] | null
  /** Matched template info (if template matching found a match) */
  matchedTemplate: MatchedTemplateInfo | null
  /** Start the generation process */
  generate: (options: GenerationOptions) => Promise<void>
  /** Reset state */
  reset: () => void
}

export function useSlideGeneration({
  accessToken,
  onSuccess,
  onError
}: UseSlideGenerationOptions): UseSlideGenerationResult {
  const { t } = useTranslation(translations)
  const [isGenerating, setIsGenerating] = useState(false)
  const [phase, setPhase] = useState<GenerationPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<SlideGenerationErrorDetails | null>(null)
  const [progressMessage, setProgressMessage] = useState<string | null>(null)
  const [sources, setSources] = useState<string[] | null>(null)
  const [matchedTemplate, setMatchedTemplate] = useState<MatchedTemplateInfo | null>(null)

  const generate = useCallback(
    async (options: GenerationOptions) => {
      if (!accessToken) {
        const errMsg = t('progress-auth-required')
        const details: SlideGenerationErrorDetails = {
          statusCode: 401,
          errorType: 'auth',
          userMessage: errMsg,
          technicalMessage: 'No access token provided'
        }
        setError(errMsg)
        setErrorDetails(details)
        onError?.(errMsg, details)
        return
      }

      setIsGenerating(true)
      setError(null)
      setErrorDetails(null)
      setSources(null)
      setMatchedTemplate(null)
      setPhase('idle')
      setProgressMessage(t('progress-preparing'))

      try {
        const onProgress = (
          phaseType: 'research' | 'generation' | 'validation',
          message: string,
          params?: Record<string, string>
        ) => {
          setPhase(phaseType)
          setProgressMessage(params ? t(message, params) : t(message))
        }

        const result = await SlideGenerationService.generateSlides(
          {
            ...options,
            getMessage: (key, params) => (params ? t(key, params) : t(key))
          },
          accessToken,
          onProgress
        )

        if (result.sources && result.sources.length > 0) {
          setSources(result.sources)
        }

        if (result.matchedTemplate) {
          setMatchedTemplate(result.matchedTemplate)
        }

        setPhase('complete')
        setProgressMessage(t('progress-ready'))

        await new Promise(resolve => setTimeout(resolve, 300))

        setProgressMessage(null)
        setIsGenerating(false)

        onSuccess?.(result.slides, result.title, result.sources, result.matchedTemplate)
      } catch (err) {
        console.error('[useSlideGeneration] Generation failed:', err)

        const details = parseGenerationError(err)
        setError(details.userMessage)
        setErrorDetails(details)
        setProgressMessage(null)
        setPhase('idle')
        setIsGenerating(false)

        onError?.(details.userMessage, details)
      }
    },
    [accessToken, onSuccess, onError, t]
  )

  const reset = useCallback(() => {
    setIsGenerating(false)
    setPhase('idle')
    setError(null)
    setErrorDetails(null)
    setProgressMessage(null)
    setSources(null)
    setMatchedTemplate(null)
  }, [])

  return {
    isGenerating,
    phase,
    error,
    errorDetails,
    progressMessage,
    sources,
    matchedTemplate,
    generate,
    reset
  }
}

export default useSlideGeneration
