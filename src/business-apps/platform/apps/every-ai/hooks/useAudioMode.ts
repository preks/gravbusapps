import { useState, useCallback, useRef } from 'react'

export type AudioBackend = 'server' | 'browser' | 'none'

export interface AudioMode {
  stt: AudioBackend
  tts: AudioBackend
  resolved: boolean
}

const STORAGE_KEY = 'everyai_audio_mode'

function readCachedMode(): AudioMode | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.stt === 'string' && typeof parsed.tts === 'string') {
      return { stt: parsed.stt, tts: parsed.tts, resolved: true }
    }
  } catch {
    // Ignore corrupted storage
  }
  return null
}

function persistMode(mode: AudioMode): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ stt: mode.stt, tts: mode.tts }))
  } catch {
    // sessionStorage may be unavailable in private browsing
  }
}

function determineBrowserFallback(type: 'stt' | 'tts'): AudioBackend {
  if (type === 'stt') {
    const hasSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    return hasSpeechRecognition ? 'browser' : 'none'
  }
  const hasSpeechSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window
  return hasSpeechSynthesis ? 'browser' : 'none'
}

export function useAudioMode() {
  const [mode, setMode] = useState<AudioMode>(() => {
    const cached = readCachedMode()
    if (cached) return cached
    return { stt: 'server', tts: 'server', resolved: false }
  })

  const telemetryFiredRef = useRef<{ stt: boolean; tts: boolean }>({ stt: false, tts: false })

  const markSovereigntyBlocked = useCallback((type: 'stt' | 'tts') => {
    setMode(() => {
      const sttFallback = determineBrowserFallback('stt')
      const ttsFallback = determineBrowserFallback('tts')
      const next: AudioMode = { stt: sttFallback, tts: ttsFallback, resolved: true }
      persistMode(next)

      if (!telemetryFiredRef.current[type]) {
        telemetryFiredRef.current[type] = true
        window.dispatchEvent(
          new CustomEvent('audio_fallback_applied', {
            detail: { type, reason: 'sovereignty_blocked', stt: sttFallback, tts: ttsFallback }
          })
        )
      }

      return next
    })
  }, [])

  const markServerAvailable = useCallback((type: 'stt' | 'tts') => {
    setMode(prev => {
      if (prev[type] === 'server' && prev.resolved) return prev
      const next: AudioMode = { ...prev, [type]: 'server', resolved: true }
      persistMode(next)
      return next
    })
  }, [])

  return { mode, markSovereigntyBlocked, markServerAvailable }
}

export default useAudioMode
