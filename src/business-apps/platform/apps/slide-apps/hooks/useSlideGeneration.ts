/**
 * useSlideGeneration Hook
 *
 * React hook for managing AI-powered slide generation state and flow.
 * Orchestrates the two-phase generation process (research + generation)
 * with loading states, phase tracking, and error handling.
 */

import { useState, useCallback } from 'react'
import { SlideGenerationService, type GenerationOptions } from '../services'
import type { SlideData } from '../components/slideElements'

export type GenerationPhase = 'idle' | 'research' | 'generation' | 'validation' | 'complete'

export interface UseSlideGenerationOptions {
  accessToken: string
  onSuccess?: (slides: SlideData[], title: string, sources?: string[]) => void
  onError?: (error: string) => void
}

export interface UseSlideGenerationResult {
  /** Whether generation is in progress */
  isGenerating: boolean
  /** Current phase of generation */
  phase: GenerationPhase
  /** Error message if generation failed */
  error: string | null
  /** Progress message for user feedback */
  progressMessage: string | null
  /** Sources found during research (if web search was enabled) */
  sources: string[] | null
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
  const [isGenerating, setIsGenerating] = useState(false)
  const [phase, setPhase] = useState<GenerationPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [progressMessage, setProgressMessage] = useState<string | null>(null)
  const [sources, setSources] = useState<string[] | null>(null)

  const generate = useCallback(
    async (options: GenerationOptions) => {
      if (!accessToken) {
        const errMsg = 'Authentication required'
        setError(errMsg)
        onError?.(errMsg)
        return
      }

      setIsGenerating(true)
      setError(null)
      setSources(null)
      setPhase('idle')
      setProgressMessage('Preparing your presentation...')

      try {
        // Progress callback from the service
        const onProgress = (phaseType: 'research' | 'generation' | 'validation', message: string) => {
          setPhase(phaseType)
          setProgressMessage(message)
        }

        const result = await SlideGenerationService.generateSlides(options, accessToken, onProgress)

        // Store sources if found
        if (result.sources && result.sources.length > 0) {
          setSources(result.sources)
        }

        setPhase('complete')
        setProgressMessage('Presentation ready!')

        // Brief delay to show completion state
        await new Promise(resolve => setTimeout(resolve, 300))

        setProgressMessage(null)
        setIsGenerating(false)

        onSuccess?.(result.slides, result.title, result.sources)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate slides'
        console.error('[useSlideGeneration] Generation failed:', err)

        setError(errorMessage)
        setProgressMessage(null)
        setPhase('idle')
        setIsGenerating(false)

        onError?.(errorMessage)
      }
    },
    [accessToken, onSuccess, onError]
  )

  const reset = useCallback(() => {
    setIsGenerating(false)
    setPhase('idle')
    setError(null)
    setProgressMessage(null)
    setSources(null)
  }, [])

  return {
    isGenerating,
    phase,
    error,
    progressMessage,
    sources,
    generate,
    reset
  }
}

export default useSlideGeneration
