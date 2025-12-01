/**
 * SpeechModeContext - Global state management for EveryAI voice mode
 *
 * Manages speech mode on/off state, voice settings, and coordinates
 * between voice input and voice synthesis across components.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useVoiceInput, VoiceInputState } from '../hooks/useVoiceInput'
import { useVoiceSynthesis, VoiceSynthesisState, OpenAIVoice } from '../hooks/useVoiceSynthesis'

export interface SpeechModeSettings {
  voice: OpenAIVoice
  speed: number
  autoPlayResponses: boolean
  language: string
}

export interface SpeechModeContextValue {
  // Mode state
  isSpeechMode: boolean
  enableSpeechMode: () => void
  disableSpeechMode: () => void
  toggleSpeechMode: () => void

  // Voice input (STT)
  voiceInput: VoiceInputState & {
    startListening: () => Promise<void>
    stopListening: () => void
    cancelListening: () => void
    resetTranscript: () => void
  }

  // Voice synthesis (TTS)
  voiceSynthesis: VoiceSynthesisState & {
    speak: (text: string) => void
    speakNow: (text: string) => Promise<void>
    stop: () => void
    pause: () => void
    resume: () => void
    clearQueue: () => void
  }

  // Settings
  settings: SpeechModeSettings
  updateSettings: (settings: Partial<SpeechModeSettings>) => void

  // Combined state
  isActive: boolean // Either listening or speaking
  canInterrupt: boolean // Can interrupt current speech
}

const defaultSettings: SpeechModeSettings = {
  voice: 'nova',
  speed: 1.0,
  autoPlayResponses: true,
  language: 'en-US'
}

const SpeechModeContext = createContext<SpeechModeContextValue | null>(null)

interface SpeechModeProviderProps {
  children: React.ReactNode
  accessToken: string
}

export function SpeechModeProvider({ children, accessToken }: SpeechModeProviderProps) {
  const [isSpeechMode, setIsSpeechMode] = useState(false)
  const [settings, setSettings] = useState<SpeechModeSettings>(defaultSettings)

  // Initialize voice input hook
  const voiceInput = useVoiceInput({
    language: settings.language,
    continuous: false, // Single utterance mode for cleaner UX
    interimResults: true
  })

  // Initialize voice synthesis hook
  const voiceSynthesis = useVoiceSynthesis({
    voice: settings.voice,
    speed: settings.speed,
    accessToken,
    onStart: () => {
      // Optional: Could pause voice input while speaking
    },
    onEnd: () => {
      // Optional: Could auto-restart listening after speaking
    }
  })

  // Mode control
  const enableSpeechMode = useCallback(() => {
    setIsSpeechMode(true)
    // Clear any pending speech
    voiceSynthesis.clearQueue()
  }, [voiceSynthesis])

  const disableSpeechMode = useCallback(() => {
    setIsSpeechMode(false)
    // Stop all voice activity
    voiceInput.cancelListening()
    voiceSynthesis.stop()
    voiceSynthesis.clearQueue()
  }, [voiceInput, voiceSynthesis])

  const toggleSpeechMode = useCallback(() => {
    if (isSpeechMode) {
      disableSpeechMode()
    } else {
      enableSpeechMode()
    }
  }, [isSpeechMode, enableSpeechMode, disableSpeechMode])

  // Settings update
  const updateSettings = useCallback((newSettings: Partial<SpeechModeSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  // Combined state calculations
  const isActive = voiceInput.isListening || voiceSynthesis.isSpeaking || voiceSynthesis.isLoading
  const canInterrupt = voiceSynthesis.isSpeaking

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceInput.cancelListening()
      voiceSynthesis.stop()
    }
  }, [])

  const value: SpeechModeContextValue = {
    isSpeechMode,
    enableSpeechMode,
    disableSpeechMode,
    toggleSpeechMode,
    voiceInput,
    voiceSynthesis,
    settings,
    updateSettings,
    isActive,
    canInterrupt
  }

  return <SpeechModeContext.Provider value={value}>{children}</SpeechModeContext.Provider>
}

export function useSpeechMode() {
  const context = useContext(SpeechModeContext)
  if (!context) {
    throw new Error('useSpeechMode must be used within a SpeechModeProvider')
  }
  return context
}

export default SpeechModeContext
