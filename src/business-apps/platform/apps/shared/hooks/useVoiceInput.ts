/**
 * useVoiceInput - Speech-to-Text hook using Web Speech API
 *
 * Provides real-time voice transcription with visual feedback
 * for office applications (documents, slides, EveryAI).
 */

import { useState, useCallback, useRef, useEffect } from 'react'

export interface VoiceInputState {
  isListening: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  volume: number // 0-1 for visualizations
}

export interface UseVoiceInputOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  silenceDelay?: number // ms to wait after speech ends before triggering onEnd
  /** If false, do not auto-stop after silence; only stop on explicit Stop (Word-like). Default true. */
  autoStopOnSilence?: boolean
  onTranscript?: (transcript: string) => void
  onEnd?: (finalTranscript: string) => void
}

// Extend Window interface for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface NativeSpeechToTextDetail {
  text?: string
  isFinal?: boolean
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

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
    NWMobileSpeech?: {
      start: (options?: { language?: string; continuous?: boolean; interimResults?: boolean }) => boolean | void
      stop: () => boolean | void
    }
    webkit?: {
      messageHandlers?: {
        'com.newwork.NWMobileSpeechStart'?: { postMessage: (payload: unknown) => void }
        'com.newwork.NWMobileSpeechStop'?: { postMessage: (payload: unknown) => void }
      }
    }
  }
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const {
    language = 'en-US',
    continuous = true,
    interimResults = true,
    silenceDelay = 1500, // Default 1.5 seconds to wait before sending
    autoStopOnSilence = true,
    onTranscript,
    onEnd
  } = options

  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    volume: 0
  })

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const finalTranscriptRef = useRef<string>('')
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSpeechTimeRef = useRef<number>(Date.now())
  const nativeBridgeModeRef = useRef<'none' | 'nwMobileSpeech' | 'webkitMessageHandlers'>('none')

  const getNativeBridgeMode = useCallback((): 'none' | 'nwMobileSpeech' | 'webkitMessageHandlers' => {
    if (
      window.NWMobileSpeech &&
      typeof window.NWMobileSpeech.start === 'function' &&
      typeof window.NWMobileSpeech.stop === 'function'
    ) {
      return 'nwMobileSpeech'
    }
    if (
      window.webkit?.messageHandlers?.['com.newwork.NWMobileSpeechStart'] &&
      typeof window.webkit.messageHandlers['com.newwork.NWMobileSpeechStart'].postMessage === 'function' &&
      window.webkit?.messageHandlers?.['com.newwork.NWMobileSpeechStop'] &&
      typeof window.webkit.messageHandlers['com.newwork.NWMobileSpeechStop'].postMessage === 'function'
    ) {
      return 'webkitMessageHandlers'
    }
    return 'none'
  }, [])

  const stopNativeBridge = useCallback(() => {
    const mode = nativeBridgeModeRef.current
    if (mode === 'nwMobileSpeech') {
      window.NWMobileSpeech?.stop()
      return
    }
    if (mode === 'webkitMessageHandlers') {
      window.webkit?.messageHandlers?.['com.newwork.NWMobileSpeechStop']?.postMessage({})
    }
  }, [])

  // Check for browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const nativeMode = getNativeBridgeMode()
    nativeBridgeModeRef.current = nativeMode
    setState(prev => ({ ...prev, isSupported: nativeMode !== 'none' || !!SpeechRecognition }))
  }, [getNativeBridgeMode])

  // Volume analysis for visualizations
  const startVolumeAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256

      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

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
      console.error('[VoiceInput] startVolumeAnalysis: failed', err)
    }
  }, [])

  const stopVolumeAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    setState(prev => ({ ...prev, volume: 0 }))
  }, [])

  const startListening = useCallback(async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const nativeMode = getNativeBridgeMode()
    nativeBridgeModeRef.current = nativeMode

    if (!SpeechRecognition && nativeMode === 'none') {
      setState(prev => ({ ...prev, error: 'Speech recognition not supported in this browser' }))
      return
    }

    // Clear any pending send timeout (user started speaking again)
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }

    // Reset state
    finalTranscriptRef.current = ''
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      error: null,
      isListening: true
    }))

    // Start volume analysis for visualizations
    await startVolumeAnalysis()

    if (nativeMode !== 'none') {
      let started: boolean | void = false
      if (nativeMode === 'nwMobileSpeech') {
        started = window.NWMobileSpeech?.start({
          language,
          continuous,
          interimResults
        })
      } else if (nativeMode === 'webkitMessageHandlers') {
        window.webkit?.messageHandlers?.['com.newwork.NWMobileSpeechStart']?.postMessage({
          language,
          continuous,
          interimResults
        })
        started = true
      }
      if (started === false) {
        setState(prev => ({ ...prev, error: 'Native speech recognition is unavailable', isListening: false }))
        stopVolumeAnalysis()
      }
      return
    }

    // Create new recognition instance
    const recognition = new SpeechRecognition()
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.lang = language

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, error: null }))
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const normalizeTranscript = (value: string) =>
        value
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      const previousFinal = finalTranscriptRef.current
      const lastResult = event.results[event.results.length - 1]
      const lastText = lastResult?.[0]?.transcript ?? ''
      const lastTrimmed = lastText.trim()
      let final = previousFinal
      let cleanedInterim = ''

      if (lastResult?.isFinal) {
        const normalizedPrev = normalizeTranscript(previousFinal)
        const normalizedLast = normalizeTranscript(lastTrimmed)

        if (!previousFinal) {
          final = lastTrimmed
        } else if (normalizedLast && normalizedLast.includes(normalizedPrev)) {
          // Some WebViews return cumulative results; replace instead of append.
          final = lastTrimmed
        } else if (normalizedPrev && normalizedPrev.includes(normalizedLast)) {
          // Ignore regressions (shorter text than what we already had).
          final = previousFinal
        } else {
          // Standard SpeechRecognition behavior: append new final segment.
          final = `${previousFinal} ${lastTrimmed}`.trim()
        }
        cleanedInterim = ''
      } else {
        cleanedInterim = lastTrimmed
      }

      finalTranscriptRef.current = final

      // Track when we last received speech
      lastSpeechTimeRef.current = Date.now()

      // Clear any existing silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }

      // Set up new silence timeout only when enabled (Word-like dictate uses autoStopOnSilence: false)
      if (autoStopOnSilence && silenceDelay > 0 && final && onEnd) {
        silenceTimeoutRef.current = setTimeout(() => {
          const textToSend = finalTranscriptRef.current.trim()
          if (textToSend) {
            // Stop recognition and send
            if (recognitionRef.current) {
              recognitionRef.current.stop()
            }
          }
        }, silenceDelay)
      }

      setState(prev => ({
        ...prev,
        transcript: final,
        interimTranscript: cleanedInterim
      }))

      if (final && onTranscript && final !== previousFinal) {
        onTranscript(final)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[VoiceInput] onerror', { error: event.error, message: event.message })
      // Don't treat 'no-speech' as an error - just means silence
      if (event.error === 'no-speech') return

      const errorMessages: Record<string, string> = {
        'not-allowed': 'Microphone access denied. Please allow microphone access.',
        network: 'Network error occurred. Please check your connection.',
        'audio-capture': 'No microphone found. Please connect a microphone.',
        aborted: 'Speech recognition was aborted.'
      }

      const message = errorMessages[event.error] || `Speech recognition error: ${event.error}`
      setState(prev => ({ ...prev, error: message, isListening: false }))
      stopVolumeAnalysis()
    }

    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }))
      stopVolumeAnalysis()

      // Clear any pending silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }

      const finalText = finalTranscriptRef.current.trim()
      if (finalText && onEnd) {
        onEnd(finalText)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [
    language,
    continuous,
    interimResults,
    silenceDelay,
    autoStopOnSilence,
    onTranscript,
    onEnd,
    startVolumeAnalysis,
    stopVolumeAnalysis,
    getNativeBridgeMode
  ])

  const stopListening = useCallback(() => {
    stopNativeBridge()
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    stopVolumeAnalysis()
    setState(prev => ({ ...prev, isListening: false }))
  }, [stopVolumeAnalysis, stopNativeBridge])

  const cancelListening = useCallback(() => {
    // Clear any pending send timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
    stopNativeBridge()
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }
    stopVolumeAnalysis()
    finalTranscriptRef.current = ''
    setState(prev => ({
      ...prev,
      isListening: false,
      transcript: '',
      interimTranscript: ''
    }))
  }, [stopVolumeAnalysis, stopNativeBridge])

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = ''
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: ''
    }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      stopNativeBridge()
      stopVolumeAnalysis()
    }
  }, [stopVolumeAnalysis, stopNativeBridge])

  useEffect(() => {
    const handleNativeStart = () => {
      void startVolumeAnalysis()
      setState(prev => ({ ...prev, isListening: true, error: null }))
    }
    const handleNativeStop = () => {
      stopVolumeAnalysis()
      setState(prev => ({ ...prev, isListening: false }))
    }
    window.addEventListener('com.newwork.NWMobileSpeechStart', handleNativeStart)
    window.addEventListener('com.newwork.NWMobileSpeechStop', handleNativeStop)
    return () => {
      window.removeEventListener('com.newwork.NWMobileSpeechStart', handleNativeStart)
      window.removeEventListener('com.newwork.NWMobileSpeechStop', handleNativeStop)
    }
  }, [startVolumeAnalysis, stopVolumeAnalysis])

  useEffect(() => {
    const handleNativeSpeechToText = (event: Event) => {
      const customEvent = event as CustomEvent<NativeSpeechToTextDetail | string>
      const detail = customEvent.detail
      const text = typeof detail === 'string' ? detail : detail?.text
      const isFinal = typeof detail === 'string' ? true : detail?.isFinal !== false
      if (!text || typeof text !== 'string') {
        return
      }
      const normalizedText = text.trim()
      if (!normalizedText) {
        return
      }

      if (isFinal) {
        finalTranscriptRef.current = normalizedText
        setState(prev => ({
          ...prev,
          transcript: normalizedText,
          interimTranscript: '',
          isListening: false
        }))
        if (onTranscript) {
          onTranscript(normalizedText)
        }
      } else {
        setState(prev => ({
          ...prev,
          interimTranscript: normalizedText,
          isListening: true
        }))
      }
    }

    window.addEventListener('com.newwork.nativeSpeechToText', handleNativeSpeechToText)
    return () => {
      window.removeEventListener('com.newwork.nativeSpeechToText', handleNativeSpeechToText)
    }
  }, [onTranscript])

  return {
    ...state,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript
  }
}

export type UseVoiceInputReturn = ReturnType<typeof useVoiceInput>

export default useVoiceInput
