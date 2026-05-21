/**
 * useVoiceInputServer - Speech-to-Text hook using Flowbot WebSocket endpoint
 *
 * Connects to /flowbot/stt via Socket.IO, captures audio with MediaRecorder,
 * and sends binary webm/opus chunks for server-side transcription.
 *
 * Flow: silence detected → stop recorder + emit stt:stop → wait for is_final → onEnd
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'
import type { VoiceInputState } from './useVoiceInput'

interface UseVoiceInputServerOptions {
  accessToken: string
  language?: string
  silenceDelay?: number
  enabled?: boolean
  onTranscript?: (transcript: string) => void
  onEnd?: (finalTranscript: string) => void
  onSovereigntyBlocked?: () => void
}

const FINAL_WAIT_TIMEOUT_MS = 5000
const NO_RESPONSE_TIMEOUT_MS = 10000

function getSupportedMimeType(): string | null {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return null
}

function mergeFinalTranscript(previous: string, next: string): string {
  const prev = previous.trim()
  const incoming = next.trim()

  if (!incoming) return prev
  if (!prev) return incoming
  if (incoming === prev) return prev

  if (incoming.startsWith(prev) || incoming.includes(prev)) {
    return incoming
  }
  if (prev.startsWith(incoming) || prev.includes(incoming)) {
    return prev
  }

  return `${prev} ${incoming}`.trim()
}

export function useVoiceInputServer(options: UseVoiceInputServerOptions) {
  const {
    accessToken,
    language = 'en-US',
    silenceDelay = 2500,
    enabled = true,
    onTranscript,
    onEnd,
    onSovereigntyBlocked
  } = options

  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    volume: 0
  })

  const socketRef = useRef<Socket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const chunkIndexRef = useRef<number>(0)
  const sessionIdRef = useRef<string>('')
  const finalTranscriptRef = useRef<string>('')
  const interimTranscriptRef = useRef<string>('')
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finalWaitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noResponseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasReceivedTranscriptRef = useRef(false)
  const consecutiveFailuresRef = useRef(0)
  const isWaitingForFinalRef = useRef(false)
  const isSessionFinalizedRef = useRef(false)
  const isCleaningUpRef = useRef(false)
  const onEndRef = useRef(onEnd)
  const onTranscriptRef = useRef(onTranscript)

  useEffect(() => {
    onEndRef.current = onEnd
    onTranscriptRef.current = onTranscript
  }, [onEnd, onTranscript])

  useEffect(() => {
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined'
    const hasMimeSupport = hasMediaRecorder && getSupportedMimeType() !== null
    setState(prev => ({ ...prev, isSupported: enabled && hasMimeSupport }))
  }, [enabled])

  const stopVolumeAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    setState(prev => ({ ...prev, volume: 0 }))
  }, [])

  const startVolumeAnalysis = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext()
      audioContextRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser

      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateVolume = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        const normalizedVolume = Math.min(average / 128, 1)
        setState(prev => ({ ...prev, volume: normalizedVolume }))
        animationFrameRef.current = requestAnimationFrame(updateVolume)
      }
      updateVolume()
    } catch (err) {
      console.error('[VoiceInputServer] volume analysis failed', err)
    }
  }, [])

  const cleanup = useCallback(() => {
    if (isCleaningUpRef.current) return
    isCleaningUpRef.current = true

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
    if (finalWaitTimeoutRef.current) {
      clearTimeout(finalWaitTimeoutRef.current)
      finalWaitTimeoutRef.current = null
    }
    if (noResponseTimeoutRef.current) {
      clearTimeout(noResponseTimeoutRef.current)
      noResponseTimeoutRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    stopVolumeAnalysis()

    const socket = socketRef.current
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }

    isCleaningUpRef.current = false
  }, [stopVolumeAnalysis])

  const resetTranscriptState = useCallback(() => {
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: ''
    }))
  }, [])

  const finalizeSession = useCallback(
    (opts: { allowSend?: boolean } = {}) => {
      if (isSessionFinalizedRef.current) return
      isSessionFinalizedRef.current = true

      const allowSend = opts.allowSend ?? true
      const finalText = finalTranscriptRef.current.trim()
      const interimText = interimTranscriptRef.current.trim()
      const textToSend = finalText || interimText

      if (textToSend) {
        consecutiveFailuresRef.current = 0
        if (allowSend) {
          onEndRef.current?.(textToSend)
        }
      } else {
        consecutiveFailuresRef.current += 1
      }

      const reachedFailureLimit = consecutiveFailuresRef.current >= 3

      resetTranscriptState()
      cleanup()

      if (reachedFailureLimit) {
        setState(prev => ({
          ...prev,
          isListening: false,
          error: 'Speech service busy. Please wait a moment and try again.'
        }))
      } else {
        setState(prev => (prev.isListening ? { ...prev, isListening: false } : prev))
      }
    },
    [resetTranscriptState, cleanup]
  )

  /**
   * Called when silence timer fires.
   * Stops recording and emits stt:stop, then waits for backend final transcript.
   */
  const initiateGracefulStop = useCallback(() => {
    if (isWaitingForFinalRef.current || isSessionFinalizedRef.current) return

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }

    isWaitingForFinalRef.current = true

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null

    const socket = socketRef.current
    if (socket?.connected) {
      socket.emit('stt:stop', { session_id: sessionIdRef.current })
    }

    finalWaitTimeoutRef.current = setTimeout(() => {
      if (!isSessionFinalizedRef.current) {
        finalizeSession({ allowSend: true })
      }
    }, FINAL_WAIT_TIMEOUT_MS)
  }, [finalizeSession])

  const startListening = useCallback(async () => {
    if (!enabled) return

    if (consecutiveFailuresRef.current >= 3) {
      setState(prev => ({
        ...prev,
        error: 'Speech service busy. Please wait a moment and try again.',
        isListening: false
      }))
      return
    }

    const mimeType = getSupportedMimeType()
    if (!mimeType) {
      setState(prev => ({ ...prev, error: 'Audio recording not supported in this browser' }))
      return
    }

    cleanup()
    isSessionFinalizedRef.current = false
    isWaitingForFinalRef.current = false

    chunkIndexRef.current = 0
    sessionIdRef.current = `stt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''

    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      error: null,
      isListening: true
    }))

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow microphone access.'
          : 'Failed to access microphone.'
      setState(prev => ({ ...prev, error: message, isListening: false }))
      return
    }

    startVolumeAnalysis(stream)

    const baseUrl = resolveFlowbotBaseUrl()
    let origin: string
    try {
      origin = new URL(baseUrl).origin
    } catch {
      origin = baseUrl
    }

    const socket = io(`${origin}/flowbot/stt`, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token: accessToken },
      reconnection: false,
      forceNew: true
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('stt:start', {
        session_id: sessionIdRef.current,
        sample_rate: 48000,
        interim_results: true,
        language,
        encoding: 'webm-opus'
      })
    })

    socket.on('connect_error', err => {
      console.error('[VoiceInputServer] connect_error', err.message)
      setState(prev => ({ ...prev, error: 'Failed to connect to speech service', isListening: false }))
      finalizeSession({ allowSend: true })
    })

    socket.on('stt:ready', () => {
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = async event => {
        if (event.data.size > 0 && socketRef.current?.connected) {
          const buffer = await event.data.arrayBuffer()
          socketRef.current.emit('stt:audio', {
            session_id: sessionIdRef.current,
            chunk_index: chunkIndexRef.current++,
            chunk: buffer
          })
        }
      }

      recorder.onerror = () => {
        setState(prev => ({ ...prev, error: 'Audio recording error', isListening: false }))
        finalizeSession({ allowSend: true })
      }

      recorder.start(250)

      hasReceivedTranscriptRef.current = false
      noResponseTimeoutRef.current = setTimeout(() => {
        if (!hasReceivedTranscriptRef.current && !isSessionFinalizedRef.current) {
          initiateGracefulStop()
        }
      }, NO_RESPONSE_TIMEOUT_MS)
    })

    socket.on('stt:transcript', (data: { text: string; is_final: boolean; confidence?: number }) => {
      const text = data.text.trim()

      if (!hasReceivedTranscriptRef.current && text) {
        hasReceivedTranscriptRef.current = true
        if (noResponseTimeoutRef.current) {
          clearTimeout(noResponseTimeoutRef.current)
          noResponseTimeoutRef.current = null
        }
      }

      if (data.is_final) {
        if (!text) {
          if (isWaitingForFinalRef.current && !isSessionFinalizedRef.current) {
            finalizeSession({ allowSend: true })
          }
          return
        }

        const merged = mergeFinalTranscript(finalTranscriptRef.current, text)
        finalTranscriptRef.current = merged
        interimTranscriptRef.current = ''

        setState(prevState => ({
          ...prevState,
          transcript: finalTranscriptRef.current,
          interimTranscript: ''
        }))

        onTranscriptRef.current?.(finalTranscriptRef.current)

        if (isWaitingForFinalRef.current && !isSessionFinalizedRef.current) {
          finalizeSession({ allowSend: true })
        }
        return
      }

      if (!text) return
      interimTranscriptRef.current = text
      setState(prevState => ({
        ...prevState,
        interimTranscript: text
      }))

      if (!isWaitingForFinalRef.current) {
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current)
        }
        silenceTimeoutRef.current = setTimeout(() => {
          initiateGracefulStop()
        }, silenceDelay)
      }
    })

    socket.on('stt:error', (data: { code: string; message: string }) => {
      if (data.code === 'sovereignty_blocked') {
        onSovereigntyBlocked?.()
        setState(prev => ({ ...prev, isListening: false, error: null }))
        cleanup()
        return
      }

      if (data.code === 'no_speech') {
        finalizeSession({ allowSend: true })
        return
      }

      console.error('[VoiceInputServer] stt:error', data)
      setState(prev => ({ ...prev, error: data.message || 'Speech recognition error', isListening: false }))
      finalizeSession({ allowSend: true })
    })

    socket.on('disconnect', () => {
      if (!isSessionFinalizedRef.current) {
        finalizeSession({ allowSend: true })
      }
    })
  }, [
    enabled,
    accessToken,
    language,
    silenceDelay,
    onSovereigntyBlocked,
    cleanup,
    finalizeSession,
    initiateGracefulStop,
    startVolumeAnalysis
  ])

  const stopListening = useCallback(() => {
    initiateGracefulStop()
  }, [initiateGracefulStop])

  const cancelListening = useCallback(() => {
    isSessionFinalizedRef.current = true
    isWaitingForFinalRef.current = false

    const socket = socketRef.current
    if (socket?.connected) {
      socket.emit('stt:cancel', { session_id: sessionIdRef.current })
    }

    resetTranscriptState()
    cleanup()
    setState(prev => ({
      ...prev,
      isListening: false,
      error: null
    }))
  }, [resetTranscriptState, cleanup])

  const resetTranscript = useCallback(() => {
    consecutiveFailuresRef.current = 0
    resetTranscriptState()
    setState(prev => (prev.error ? { ...prev, error: null } : prev))
  }, [resetTranscriptState])

  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current)
      if (finalWaitTimeoutRef.current) clearTimeout(finalWaitTimeoutRef.current)
      if (noResponseTimeoutRef.current) clearTimeout(noResponseTimeoutRef.current)
      cleanup()
      finalTranscriptRef.current = ''
      interimTranscriptRef.current = ''
      isSessionFinalizedRef.current = true
    }
  }, [cleanup])

  if (!enabled) {
    return {
      isListening: false,
      isSupported: false,
      transcript: '',
      interimTranscript: '',
      error: null,
      volume: 0,
      startListening: async () => {},
      stopListening: () => {},
      cancelListening: () => {},
      resetTranscript: () => {}
    }
  }

  return {
    ...state,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript
  }
}

export default useVoiceInputServer
