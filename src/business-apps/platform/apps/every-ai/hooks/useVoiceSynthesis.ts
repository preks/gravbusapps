/**
 * useVoiceSynthesis - Text-to-Speech hook using OpenAI TTS API
 *
 * Provides high-quality voice synthesis using OpenAI's Nova voice
 * for the EveryAI premium voice experience.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'

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
  const suppressAudioErrorRef = useRef(false)

  // Cleanup audio element
  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      suppressAudioErrorRef.current = true
      audioRef.current.oncanplay = null
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.ontimeupdate = null
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current.load()
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

  // Internal speak function with streaming audio playback
  const speakTextInternal = useCallback(
    async (text: string): Promise<void> => {
      if (!text.trim()) return

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        currentText: text
      }))

      abortControllerRef.current = new AbortController()

      try {
        const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        const baseUrl = isLocalDev ? 'http://localhost:8000' : resolveFlowbotBaseUrl()
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

        // Try streaming playback with MediaSource API
        const canStreamMp3 = typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('audio/mpeg')

        if (canStreamMp3 && response.body) {
          await playWithStreaming(response.body)
        } else {
          // Fallback: download full audio then play
          await playWithFullDownload(response)
        }
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
        console.error('[TTS] Error:', errorMsg)
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

  // Stream audio using MediaSource API - starts playing immediately
  const playWithStreaming = useCallback(
    async (body: ReadableStream<Uint8Array>): Promise<void> => {
      return new Promise((resolve, reject) => {
        cleanupAudio()

        const mediaSource = new MediaSource()
        const audio = new Audio()
        suppressAudioErrorRef.current = false
        audioRef.current = audio
        audio.src = URL.createObjectURL(mediaSource)

        mediaSource.addEventListener('sourceopen', async () => {
          try {
            const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg')
            const reader = body.getReader()
            let hasStartedPlaying = false
            let totalBytes = 0

            const appendNextChunk = async () => {
              const { done, value } = await reader.read()

              if (done) {
                // End of stream
                if (mediaSource.readyState === 'open') {
                  mediaSource.endOfStream()
                }
                return
              }

              totalBytes += value.length

              // Wait for buffer to be ready
              if (sourceBuffer.updating) {
                await new Promise<void>(r => {
                  sourceBuffer.addEventListener('updateend', () => r(), { once: true })
                })
              }

              const chunk = new Uint8Array(value.byteLength)
              chunk.set(value)
              sourceBuffer.appendBuffer(chunk.buffer)

              // Start playing after we have some data (8KB minimum for MP3 header + first frames)
              if (!hasStartedPlaying && totalBytes > 8000) {
                hasStartedPlaying = true
                setState(prev => ({ ...prev, isLoading: false, isSpeaking: true }))
                onStart?.()
                audio.play().catch(err => {
                  console.warn('[TTS] Auto-play blocked:', err)
                })
              }

              // Wait for this chunk to be processed
              await new Promise<void>(r => {
                sourceBuffer.addEventListener('updateend', () => r(), { once: true })
              })

              // Continue reading
              await appendNextChunk()
            }

            await appendNextChunk()
          } catch (err) {
            console.error('[TTS] Streaming error:', err)
            reject(err)
          }
        })

        audio.onended = () => {
          if (audioRef.current !== audio) {
            resolve()
            return
          }
          URL.revokeObjectURL(audio.src)
          setState(prev => ({ ...prev, isSpeaking: false, progress: 1 }))
          onEnd?.()
          resolve()
        }

        audio.onerror = () => {
          if (
            audioRef.current !== audio ||
            suppressAudioErrorRef.current ||
            abortControllerRef.current?.signal.aborted
          ) {
            resolve()
            return
          }
          URL.revokeObjectURL(audio.src)
          setState(prev => ({
            ...prev,
            isLoading: false,
            isSpeaking: false,
            error: 'Streaming playback failed',
            currentText: null,
            progress: 0
          }))
          onError?.('Streaming playback failed')
          reject(new Error('Streaming playback failed'))
        }

        audio.ontimeupdate = () => {
          if (audio.duration > 0 && isFinite(audio.duration)) {
            setState(prev => ({ ...prev, progress: audio.currentTime / audio.duration }))
          }
        }
      })
    },
    [cleanupAudio, onStart, onEnd, onError]
  )

  // Fallback: download full audio then play
  const playWithFullDownload = useCallback(
    async (response: Response): Promise<void> => {
      const responseType = response.headers.get('content-type') || ''
      const downloadedBlob = await response.blob()
      const normalizedBlob =
        downloadedBlob.type && downloadedBlob.type !== 'application/octet-stream'
          ? downloadedBlob
          : new Blob([await downloadedBlob.arrayBuffer()], {
              type: responseType.includes('audio/') ? responseType : 'audio/mpeg'
            })
      const audioUrl = URL.createObjectURL(normalizedBlob)

      return new Promise((resolve, reject) => {
        cleanupAudio()

        const audio = new Audio()
        suppressAudioErrorRef.current = false
        audioRef.current = audio
        audio.autoplay = false
        audio.preload = 'auto'
        ;(audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true

        audio.oncanplay = () => {
          if (audioRef.current !== audio) {
            resolve()
            return
          }
          setState(prev => ({ ...prev, isLoading: false, isSpeaking: true }))
          onStart?.()
          audio.play().catch(err => {
            console.warn('[TTS] Auto-play blocked:', err)
            resolve()
          })
        }

        audio.ontimeupdate = () => {
          if (audio.duration > 0) {
            setState(prev => ({ ...prev, progress: audio.currentTime / audio.duration }))
          }
        }

        audio.onended = () => {
          if (audioRef.current !== audio) {
            resolve()
            return
          }
          URL.revokeObjectURL(audioUrl)
          setState(prev => ({ ...prev, isSpeaking: false, progress: 1 }))
          onEnd?.()
          resolve()
        }

        audio.onerror = () => {
          if (
            audioRef.current !== audio ||
            suppressAudioErrorRef.current ||
            abortControllerRef.current?.signal.aborted
          ) {
            resolve()
            return
          }
          console.error('[TTS] audio.onerror in full download', {
            src: audio.src,
            currentSrc: audio.currentSrc,
            responseType,
            blobType: downloadedBlob.type,
            normalizedType: normalizedBlob.type,
            size: normalizedBlob.size
          })
          URL.revokeObjectURL(audioUrl)
          setState(prev => ({
            ...prev,
            isLoading: false,
            isSpeaking: false,
            error: 'Failed to play audio',
            currentText: null,
            progress: 0
          }))
          onError?.('Failed to play audio')
          reject(new Error('Failed to play audio'))
        }

        audio.src = audioUrl
        audio.load()
      })
    },
    [cleanupAudio, onStart, onEnd, onError]
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

  // Stop current speech and clear queue
  const stop = useCallback(() => {
    audioQueueRef.current = []
    isProcessingQueueRef.current = false

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
