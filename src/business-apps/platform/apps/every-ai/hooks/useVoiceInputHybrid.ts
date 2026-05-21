/**
 * useVoiceInputHybrid - Hybrid Speech-to-Text hook
 *
 * Uses browser SpeechRecognition for unlimited real-time interim display
 * and a single HTTP POST to Flowbot Whisper for high-quality final transcription.
 *
 * Flow:
 *   1. startListening -> browser STT + MediaRecorder start simultaneously
 *   2. Browser STT fires interim results -> displayed in UI
 *   3. Silence detected -> stop recognition, collect full audio blob
 *   4. Single POST to /flowbot/stt/transcribe (one call per utterance)
 *   5. On success: send Flowbot text to chat via onEnd
 *   6. On failure (429/500/timeout): fall back to browser text via onEnd
 *
 * Rate limit: backend allows ~3 calls/min. Adaptive backoff on 429.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'
import type { VoiceInputState } from './useVoiceInput'

interface UseVoiceInputHybridOptions {
  accessToken: string
  language?: string
  silenceDelay?: number
  enabled?: boolean
  onTranscript?: (transcript: string) => void
  onEnd?: (finalTranscript: string) => void
  onSovereigntyBlocked?: () => void
}

const TRANSCRIBE_TIMEOUT_MS = 5_000
const RECORDER_STOP_TIMEOUT_MS = 2_000
const INITIAL_RATE_LIMIT_COOLDOWN_MS = 15_000
const MAX_RATE_LIMIT_COOLDOWN_MS = 60_000

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
  onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null
  onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null
}

function getSupportedMimeType(): string | null {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return null
}

function mimeToEncoding(mimeType: string): string {
  return mimeType.includes('ogg') ? 'ogg-opus' : 'webm-opus'
}

export function useVoiceInputHybrid(options: UseVoiceInputHybridOptions) {
  const {
    accessToken,
    language = 'en-US',
    silenceDelay = 1500,
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

  const onEndRef = useRef(onEnd)
  const onTranscriptRef = useRef(onTranscript)
  useEffect(() => {
    onEndRef.current = onEnd
    onTranscriptRef.current = onTranscript
  }, [onEnd, onTranscript])

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalTranscriptRef = useRef('')
  const interimTranscriptRef = useRef('')
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const mimeTypeRef = useRef('')

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const isTranscribingRef = useRef(false)
  const isCancelledRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const rateLimitCooldownUntilRef = useRef(0)
  const rateLimitBackoffMsRef = useRef(INITIAL_RATE_LIMIT_COOLDOWN_MS)

  useEffect(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    const hasRecorder = typeof MediaRecorder !== 'undefined' && getSupportedMimeType() !== null
    setState(prev => ({ ...prev, isSupported: enabled && !!Ctor && hasRecorder }))
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
      ctx.createMediaStreamSource(stream).connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setState(prev => ({ ...prev, volume: Math.min(avg / 128, 1) }))
        animationFrameRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch (err) {
      console.error('[VoiceInputHybrid] volume analysis failed', err)
    }
  }, [])

  const releaseMediaResources = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }

    stopVolumeAnalysis()
  }, [stopVolumeAnalysis])

  const cleanup = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
    abortControllerRef.current?.abort()
    abortControllerRef.current = null

    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      recognitionRef.current.onerror = null
      recognitionRef.current.onresult = null
      recognitionRef.current.abort()
      recognitionRef.current = null
    }

    releaseMediaResources()
    audioChunksRef.current = []
    isTranscribingRef.current = false
  }, [releaseMediaResources])

  const transcribeViaFlowbot = useCallback(
    async (audioBlob: Blob): Promise<string | null> => {
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const baseUrl = resolveFlowbotBaseUrl()
        const form = new FormData()
        const ext = mimeTypeRef.current.includes('ogg') ? 'ogg' : 'webm'
        form.append('audio', audioBlob, `recording.${ext}`)
        form.append('language', language)
        form.append('encoding', mimeToEncoding(mimeTypeRef.current))

        const res = await fetch(`${baseUrl}/flowbot/stt/transcribe`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form,
          signal: controller.signal
        })

        if (!res.ok) {
          if (res.status === 429) {
            const now = Date.now()
            const cooldownMs = rateLimitBackoffMsRef.current
            rateLimitCooldownUntilRef.current = now + cooldownMs
            rateLimitBackoffMsRef.current = Math.min(cooldownMs * 2, MAX_RATE_LIMIT_COOLDOWN_MS)
            return null
          }

          if (res.status === 403) {
            const body = await res.json().catch(() => ({}))
            if (body.code === 'sovereignty_blocked') {
              onSovereigntyBlocked?.()
              return null
            }
          }
          return null
        }

        const data = await res.json()
        rateLimitCooldownUntilRef.current = 0
        rateLimitBackoffMsRef.current = INITIAL_RATE_LIMIT_COOLDOWN_MS
        return data.text?.trim() || null
      } catch (err) {
        if ((err as Error).name === 'AbortError') return null
        console.error('[VoiceInputHybrid] transcribeViaFlowbot failed', err)
        return null
      } finally {
        abortControllerRef.current = null
      }
    },
    [accessToken, language, onSovereigntyBlocked]
  )

  const collectAudioBlob = useCallback((): Promise<Blob | null> => {
    const recorder = mediaRecorderRef.current

    if (recorder && recorder.state !== 'inactive') {
      return Promise.race([
        new Promise<Blob>(resolve => {
          recorder.onstop = () => {
            resolve(new Blob(audioChunksRef.current, { type: mimeTypeRef.current }))
            audioChunksRef.current = []
          }
          try {
            recorder.requestData()
          } catch {
            /* stream may already be dead */
          }
          recorder.stop()
        }),
        new Promise<Blob>(resolve =>
          setTimeout(() => {
            resolve(new Blob(audioChunksRef.current, { type: mimeTypeRef.current }))
            audioChunksRef.current = []
          }, RECORDER_STOP_TIMEOUT_MS)
        )
      ])
    }

    if (audioChunksRef.current.length > 0) {
      const blob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current })
      audioChunksRef.current = []
      return Promise.resolve(blob)
    }

    return Promise.resolve(null)
  }, [])

  const finalizeAndSend = useCallback(async () => {
    if (isCancelledRef.current || isTranscribingRef.current) return
    isTranscribingRef.current = true

    const browserText = finalTranscriptRef.current.trim() || interimTranscriptRef.current.trim()

    const audioBlob = await collectAudioBlob()
    mediaRecorderRef.current = null
    releaseMediaResources()

    if (isCancelledRef.current) {
      isTranscribingRef.current = false
      return
    }

    if (!browserText) {
      isTranscribingRef.current = false
      setState(prev => ({ ...prev, isListening: false }))
      return
    }

    setState(prev => ({ ...prev, transcript: browserText, interimTranscript: '' }))

    let finalText = browserText

    const canPost = audioBlob && audioBlob.size > 0 && Date.now() >= rateLimitCooldownUntilRef.current
    if (canPost) {
      try {
        const flowbotText = await Promise.race([
          transcribeViaFlowbot(audioBlob!),
          new Promise<null>(resolve => setTimeout(() => resolve(null), TRANSCRIBE_TIMEOUT_MS))
        ])
        if (flowbotText && !isCancelledRef.current) {
          finalText = flowbotText
          setState(prev => ({ ...prev, transcript: finalText }))
        }
      } catch {
        /* Flowbot unavailable — browser text used */
      }
    }

    isTranscribingRef.current = false
    if (isCancelledRef.current) return

    onEndRef.current?.(finalText)
    setState(prev => ({ ...prev, isListening: false }))
  }, [collectAudioBlob, releaseMediaResources, transcribeViaFlowbot])

  const startListening = useCallback(async () => {
    if (!enabled || isTranscribingRef.current) return

    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor) {
      setState(prev => ({ ...prev, error: 'Speech recognition not supported in this browser' }))
      return
    }

    const mimeType = getSupportedMimeType()
    if (!mimeType) {
      setState(prev => ({ ...prev, error: 'Audio recording not supported in this browser' }))
      return
    }

    cleanup()
    isCancelledRef.current = false
    mimeTypeRef.current = mimeType
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
    audioChunksRef.current = []

    setState(prev => ({ ...prev, transcript: '', interimTranscript: '', error: null, isListening: true }))

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow microphone access.'
          : 'Failed to access microphone.'
      setState(prev => ({ ...prev, error: msg, isListening: false }))
      return
    }

    startVolumeAnalysis(stream)

    const recorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = recorder
    recorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data)
    }
    recorder.start(250)

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, error: null }))
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const normalize = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim()
      const prev = finalTranscriptRef.current
      const last = event.results[event.results.length - 1]
      const text = (last?.[0]?.transcript ?? '').trim()
      let final = prev
      let interim = ''

      if (last?.isFinal) {
        const nPrev = normalize(prev)
        const nText = normalize(text)
        if (!prev) final = text
        else if (nText && nText.includes(nPrev)) final = text
        else if (nPrev && nPrev.includes(nText)) final = prev
        else final = `${prev} ${text}`.trim()
      } else {
        interim = text
      }

      finalTranscriptRef.current = final
      interimTranscriptRef.current = interim

      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }

      // In some Web Speech implementations only interim chunks are emitted
      // for short utterances. We still need to stop and finalize that speech.
      if (final || interim) {
        silenceTimeoutRef.current = setTimeout(() => {
          recognitionRef.current?.stop()
        }, silenceDelay)
      }

      setState(s => ({ ...s, transcript: final, interimTranscript: interim }))

      if (final && final !== prev) {
        onTranscriptRef.current?.(final)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') return

      const msgs: Record<string, string> = {
        'not-allowed': 'Microphone access denied. Please allow microphone access.',
        network: 'Network error occurred. Please check your connection.',
        'audio-capture': 'No microphone found. Please connect a microphone.',
        aborted: 'Speech recognition was aborted.'
      }
      setState(prev => ({
        ...prev,
        error: msgs[event.error] || `Speech recognition error: ${event.error}`,
        isListening: false
      }))
      cleanup()
    }

    recognition.onend = () => {
      recognitionRef.current = null
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }
      finalizeAndSend()
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [enabled, language, silenceDelay, cleanup, startVolumeAnalysis, finalizeAndSend])

  const stopListening = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
    recognitionRef.current?.stop()
  }, [])

  const cancelListening = useCallback(() => {
    isCancelledRef.current = true
    abortControllerRef.current?.abort()
    abortControllerRef.current = null

    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      recognitionRef.current.abort()
      recognitionRef.current = null
    }

    releaseMediaResources()
    audioChunksRef.current = []
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
    isTranscribingRef.current = false

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }

    setState(prev => ({ ...prev, isListening: false, transcript: '', interimTranscript: '', error: null }))
  }, [releaseMediaResources])

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
    setState(prev => ({ ...prev, transcript: '', interimTranscript: '', error: null }))
  }, [])

  useEffect(() => {
    return () => {
      isCancelledRef.current = true
      cleanup()
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

  return { ...state, startListening, stopListening, cancelListening, resetTranscript }
}

export default useVoiceInputHybrid
