/**
 * VoiceOverlay - Full-screen voice mode experience
 *
 * A stunning, immersive overlay for voice conversations with:
 * - Animated orb visualization
 * - Real-time transcript display
 * - Smooth transitions between states
 * - Touch-friendly large hit areas
 */

import React, { useEffect, useRef } from 'react'
import { Button } from '@newwork/nw-design-system'

interface VoiceOverlayProps {
  isVisible: boolean
  isListening: boolean
  isSpeaking: boolean
  isLoading: boolean
  volume: number
  transcript: string
  interimTranscript: string
  currentSpeechText: string | null
  onClose: () => void
  onStartListening: () => void
  onStopListening: () => void
  onStopSpeaking: () => void
  onSendTranscript: (text: string) => void
}

export const VoiceOverlay: React.FC<VoiceOverlayProps> = ({
  isVisible,
  isListening,
  isSpeaking,
  isLoading,
  volume,
  transcript,
  interimTranscript,
  currentSpeechText,
  onClose,
  onStartListening,
  onStopListening,
  onStopSpeaking,
  onSendTranscript
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  // Animated orb visualization
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isVisible) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    let phase = 0

    const draw = () => {
      const width = canvas.offsetWidth
      const height = canvas.offsetHeight
      const centerX = width / 2
      const centerY = height / 2
      const baseRadius = Math.min(width, height) * 0.15

      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Draw multiple orb layers
      const layers = 4
      for (let layer = layers - 1; layer >= 0; layer--) {
        const layerVolume = volume * (1 - layer * 0.15)
        const radius = baseRadius * (1 + layerVolume * 0.5) * (1 + layer * 0.3)
        const alpha = (1 - layer / layers) * 0.6

        // Create gradient
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)

        if (isListening) {
          // Green gradient for listening
          gradient.addColorStop(0, `rgba(34, 197, 94, ${alpha})`)
          gradient.addColorStop(0.5, `rgba(22, 163, 74, ${alpha * 0.7})`)
          gradient.addColorStop(1, `rgba(21, 128, 61, 0)`)
        } else if (isSpeaking) {
          // Blue gradient for speaking
          gradient.addColorStop(0, `rgba(59, 130, 246, ${alpha})`)
          gradient.addColorStop(0.5, `rgba(37, 99, 235, ${alpha * 0.7})`)
          gradient.addColorStop(1, `rgba(29, 78, 216, 0)`)
        } else {
          // Purple gradient for idle
          gradient.addColorStop(0, `rgba(139, 92, 246, ${alpha})`)
          gradient.addColorStop(0.5, `rgba(124, 58, 237, ${alpha * 0.7})`)
          gradient.addColorStop(1, `rgba(109, 40, 217, 0)`)
        }

        // Draw organic blob shape
        ctx.beginPath()
        const points = 64
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2
          const noise =
            Math.sin(angle * 3 + phase + layer) * 0.1 * layerVolume +
            Math.sin(angle * 5 - phase * 1.3 + layer) * 0.05 * layerVolume +
            Math.sin(angle * 7 + phase * 0.7 + layer) * 0.03 * layerVolume
          const r = radius * (1 + noise)
          const x = centerX + Math.cos(angle) * r
          const y = centerY + Math.sin(angle) * r
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.closePath()
        ctx.fillStyle = gradient
        ctx.fill()
      }

      // Inner glow core
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * 0.5)
      coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
      coreGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)')
      coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

      ctx.beginPath()
      ctx.arc(centerX, centerY, baseRadius * 0.5, 0, Math.PI * 2)
      ctx.fillStyle = coreGradient
      ctx.fill()

      phase += 0.03
      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isVisible, isListening, isSpeaking, volume])

  // Auto-send transcript when user stops speaking
  const lastTranscriptRef = useRef('')
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isListening) return

    const fullTranscript = (transcript + ' ' + interimTranscript).trim()

    if (fullTranscript && fullTranscript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = fullTranscript

      // Clear existing timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }

      // Set new timer - send after 1.5s of silence
      silenceTimerRef.current = setTimeout(() => {
        if (transcript.trim()) {
          onStopListening()
          onSendTranscript(transcript.trim())
        }
      }, 1500)
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
    }
  }, [transcript, interimTranscript, isListening, onStopListening, onSendTranscript])

  if (!isVisible) return null

  return (
    <div
      className="gba:fixed gba:inset-0 gba:z-50 gba:flex gba:flex-col gba:items-center gba:justify-center gba:bg-background/95 gba:backdrop-blur-xl"
      data-testid="voice-overlay"
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="gba:absolute gba:top-6 gba:right-6 gba:h-12 gba:w-12 gba:rounded-full gba:bg-muted/50 hover:gba:bg-muted gba:z-10"
        onClick={onClose}
        aria-label="Exit voice mode"
        data-testid="voice-overlay-close"
      >
        <svg className="gba:h-6 gba:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </Button>

      {/* Header */}
      <div className="gba:absolute gba:top-6 gba:left-6 gba:flex gba:items-center gba:gap-3">
        <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-gradient-to-br gba:from-primary gba:to-info gba:flex gba:items-center gba:justify-center">
          <svg
            className="gba:h-5 gba:w-5 gba:text-primary-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h2 className="gba:text-lg gba:font-bold gba:text-foreground">EveryAI Voice</h2>
          <p className="gba:text-sm gba:text-muted-foreground">
            {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : isLoading ? 'Processing...' : 'Ready'}
          </p>
        </div>
      </div>

      {/* Animated Orb Canvas */}
      <canvas
        ref={canvasRef}
        className="gba:w-full gba:h-full gba:max-w-lg gba:max-h-lg gba:absolute gba:inset-0 gba:m-auto"
        style={{ width: '400px', height: '400px' }}
      />

      {/* Transcript Display */}
      <div className="gba:absolute gba:bottom-32 gba:left-0 gba:right-0 gba:px-8 gba:text-center">
        {(transcript || interimTranscript) && isListening && (
          <div className="gba:max-w-2xl gba:mx-auto gba:p-6 gba:rounded-2xl gba:bg-card/80 gba:backdrop-blur-md gba:border gba:border-border gba:shadow-lg">
            <p className="gba:text-lg gba:text-foreground gba:leading-relaxed">
              {transcript}
              {interimTranscript && (
                <span className="gba:text-muted-foreground gba:opacity-70"> {interimTranscript}</span>
              )}
            </p>
          </div>
        )}

        {currentSpeechText && isSpeaking && (
          <div className="gba:max-w-2xl gba:mx-auto gba:p-6 gba:rounded-2xl gba:bg-info/10 gba:backdrop-blur-md gba:border gba:border-info/30 gba:shadow-lg">
            <p className="gba:text-lg gba:text-foreground gba:leading-relaxed gba:line-clamp-3">{currentSpeechText}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="gba:absolute gba:bottom-8 gba:left-0 gba:right-0 gba:flex gba:justify-center gba:gap-4">
        {isListening ? (
          <Button
            size="lg"
            className="gba:h-16 gba:px-8 gba:rounded-full gba:bg-success hover:gba:bg-success/90 gba:text-success-foreground gba:shadow-lg gba:text-lg gba:font-semibold"
            onClick={onStopListening}
            data-testid="voice-stop-listening"
          >
            <svg className="gba:h-6 gba:w-6 gba:mr-2" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            Done Speaking
          </Button>
        ) : isSpeaking ? (
          <Button
            size="lg"
            className="gba:h-16 gba:px-8 gba:rounded-full gba:bg-info hover:gba:bg-info/90 gba:text-info-foreground gba:shadow-lg gba:text-lg gba:font-semibold"
            onClick={onStopSpeaking}
            data-testid="voice-stop-speaking"
          >
            <svg className="gba:h-6 gba:w-6 gba:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
              />
            </svg>
            Stop
          </Button>
        ) : (
          <Button
            size="lg"
            className="gba:h-16 gba:px-8 gba:rounded-full gba:bg-gradient-to-r gba:from-primary gba:to-info gba:text-primary-foreground gba:shadow-lg gba:text-lg gba:font-semibold hover:gba:shadow-xl gba:transition-all"
            onClick={onStartListening}
            disabled={isLoading}
            data-testid="voice-start-listening"
          >
            <svg className="gba:h-6 gba:w-6 gba:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            {isLoading ? 'Processing...' : 'Tap to Speak'}
          </Button>
        )}
      </div>

      {/* Keyboard hint */}
      <div className="gba:absolute gba:bottom-2 gba:left-0 gba:right-0 gba:text-center">
        <p className="gba:text-xs gba:text-muted-foreground gba:opacity-50">
          Press <kbd className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:font-mono">Esc</kbd> to exit voice
          mode
        </p>
      </div>
    </div>
  )
}

export default VoiceOverlay
