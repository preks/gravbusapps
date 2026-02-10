/**
 * useVoiceInput - Speech-to-Text hook using Web Speech API
 *
 * Provides real-time voice transcription with visual feedback
 * for the EveryAI premium voice experience.
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

interface UseVoiceInputOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  silenceDelay?: number // ms to wait after speech ends before triggering onEnd
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
  }
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const {
    language = 'en-US',
    continuous = true,
    interimResults = true,
    silenceDelay = 1500, // Default 1.5 seconds to wait before sending
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

  // Check for browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setState(prev => ({ ...prev, isSupported: !!SpeechRecognition }))
  }, [])

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
      console.error('Failed to start volume analysis:', err)
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

    if (!SpeechRecognition) {
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

    // Create new recognition instance
    const recognition = new SpeechRecognition()
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.lang = language

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, error: null }))
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const previousFinal = finalTranscriptRef.current
      let interim = ''
      const finalParts: string[] = []

      // Rebuild transcripts from the full results list to avoid duplication
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0]?.transcript ?? ''
        if (result.isFinal) {
          const trimmed = text.trim()
          if (trimmed) {
            finalParts.push(trimmed)
          }
        } else {
          interim = text
        }
      }

      const final = finalParts.join(' ').trim()
      const cleanedInterim = interim.trim()
      finalTranscriptRef.current = final

      // Track when we last received speech
      lastSpeechTimeRef.current = Date.now()

      // Clear any existing silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
        silenceTimeoutRef.current = null
      }

      // Set up new silence timeout - if no new speech for silenceDelay, trigger send
      if (final && onEnd) {
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
  }, [language, continuous, interimResults, silenceDelay, onTranscript, onEnd, startVolumeAnalysis, stopVolumeAnalysis])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    stopVolumeAnalysis()
    setState(prev => ({ ...prev, isListening: false }))
  }, [stopVolumeAnalysis])

  const cancelListening = useCallback(() => {
    // Clear any pending send timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
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
  }, [stopVolumeAnalysis])

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
      stopVolumeAnalysis()
    }
  }, [stopVolumeAnalysis])

  return {
    ...state,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript
  }
}

export default useVoiceInput
