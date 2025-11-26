/**
 * useVoiceSynthesis - Text-to-Speech hook using OpenAI TTS API
 *
 * Provides high-quality voice synthesis using OpenAI's Nova voice
 * for the EveryAI premium voice experience.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { env } from '@/common/env/EnvUtils'

export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

export interface VoiceSynthesisState {
  isSpeaking: boolean
  isLoading: boolean
  error: string | null
  currentText: string | null
  progress: number // 0-1 for progress bar
}

interface UseVoiceSynthesisOptions {
  voice?: OpenAIVoice
  speed?: number // 0.25 to 4.0
  accessToken: string
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: string) => void
}

export function useVoiceSynthesis(options: UseVoiceSynthesisOptions) {
  const { voice = 'nova', speed = 1.0, accessToken, onStart, onEnd, onError } = options

  const [state, setState] = useState<VoiceSynthesisState>({
    isSpeaking: false,
    isLoading: false,
    error: null,
    currentText: null,
    progress: 0
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const audioQueueRef = useRef<string[]>([])
  const isProcessingQueueRef = useRef(false)

  // Cleanup audio element
  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
  }, [])

  // Process the audio queue
  const processQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || audioQueueRef.current.length === 0) {
      return
    }

    isProcessingQueueRef.current = true
    const text = audioQueueRef.current.shift()

    if (text) {
      await speakTextInternal(text)
    }

    isProcessingQueueRef.current = false

    // Continue processing if there's more in the queue
    if (audioQueueRef.current.length > 0) {
      processQueue()
    }
  }, [])

  // Internal speak function
  const speakTextInternal = useCallback(
    async (text: string): Promise<void> => {
      if (!text.trim()) return

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        currentText: text
      }))

      // Create abort controller for this request
      abortControllerRef.current = new AbortController()

      try {
        const baseUrl = env('NEXT_PUBLIC_BASE_URL') || 'https://newwork-dev.newwork.com'
        const url = `${baseUrl}/flowbot/api/agent/tts`

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text,
            voice,
            speed
          }),
          signal: abortControllerRef.current.signal
        })

        if (!response.ok) {
          throw new Error(`TTS request failed: ${response.statusText}`)
        }

        // Get audio blob
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)

        // Create and play audio
        return new Promise((resolve, reject) => {
          cleanupAudio()

          const audio = new Audio(audioUrl)
          audioRef.current = audio

          audio.onloadedmetadata = () => {
            setState(prev => ({ ...prev, isLoading: false, isSpeaking: true }))
            onStart?.()
          }

          audio.ontimeupdate = () => {
            if (audio.duration > 0) {
              const progress = audio.currentTime / audio.duration
              setState(prev => ({ ...prev, progress }))
            }
          }

          audio.onended = () => {
            URL.revokeObjectURL(audioUrl)
            setState(prev => ({
              ...prev,
              isSpeaking: false,
              currentText: null,
              progress: 0
            }))
            onEnd?.()
            resolve()
          }

          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl)
            const errorMsg = 'Failed to play audio'
            setState(prev => ({
              ...prev,
              isLoading: false,
              isSpeaking: false,
              error: errorMsg,
              currentText: null,
              progress: 0
            }))
            onError?.(errorMsg)
            reject(new Error(errorMsg))
          }

          audio.play().catch(err => {
            // Auto-play might be blocked - handle gracefully
            console.warn('Auto-play blocked:', err)
            setState(prev => ({
              ...prev,
              isLoading: false,
              isSpeaking: false,
              error: 'Auto-play blocked. Click to enable audio.',
              currentText: null
            }))
            resolve() // Don't reject, just continue
          })
        })
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setState(prev => ({
            ...prev,
            isLoading: false,
            isSpeaking: false,
            currentText: null,
            progress: 0
          }))
          return
        }

        const errorMsg = err instanceof Error ? err.message : 'Unknown TTS error'
        setState(prev => ({
          ...prev,
          isLoading: false,
          isSpeaking: false,
          error: errorMsg,
          currentText: null,
          progress: 0
        }))
        onError?.(errorMsg)
      }
    },
    [accessToken, voice, speed, onStart, onEnd, onError, cleanupAudio]
  )

  // Public speak function (queues text)
  const speak = useCallback(
    (text: string) => {
      audioQueueRef.current.push(text)
      processQueue()
    },
    [processQueue]
  )

  // Speak immediately (clears queue)
  const speakNow = useCallback(
    async (text: string) => {
      // Clear queue and stop current audio
      audioQueueRef.current = []
      stop()

      await speakTextInternal(text)
    },
    [speakTextInternal]
  )

  // Stop current speech
  const stop = useCallback(() => {
    // Abort pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Stop audio
    cleanupAudio()

    setState(prev => ({
      ...prev,
      isLoading: false,
      isSpeaking: false,
      currentText: null,
      progress: 0
    }))
  }, [cleanupAudio])

  // Clear queue
  const clearQueue = useCallback(() => {
    audioQueueRef.current = []
  }, [])

  // Pause/Resume
  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
      setState(prev => ({ ...prev, isSpeaking: false }))
    }
  }, [])

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play()
      setState(prev => ({ ...prev, isSpeaking: true }))
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      cleanupAudio()
    }
  }, [cleanupAudio])

  return {
    ...state,
    speak,
    speakNow,
    stop,
    pause,
    resume,
    clearQueue
  }
}

export default useVoiceSynthesis
