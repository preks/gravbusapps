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

interface FormFieldSummary {
  name: string
  value: string
}

interface ActiveFormSummary {
  flowName: string
  fields: FormFieldSummary[]
}

interface VoiceOverlayProps {
  isVisible: boolean
  isListening: boolean
  isSpeaking: boolean
  isLoading: boolean
  volume: number
  transcript: string
  interimTranscript: string
  currentSpeechText: string | null
  activeForm?: ActiveFormSummary | null
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
  activeForm,
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
      className="gba:absolute gba:inset-0 gba:z-50 gba:flex gba:flex-col gba:items-center gba:justify-center gba:bg-background/95 gba:backdrop-blur-xl"
      data-testid="voice-overlay"
    >
      {/* Close button - More prominent for sidepanel */}
      <Button
        variant="destructive"
        size="sm"
        className="gba:absolute gba:top-4 gba:right-4 gba:h-10 gba:px-4 gba:rounded-full gba:shadow-lg gba:z-10 gba:flex gba:items-center gba:gap-2"
        onClick={onClose}
        aria-label="Exit voice mode"
        data-testid="voice-overlay-close"
      >
        <svg className="gba:h-4 gba:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span className="gba:text-sm gba:font-medium">Exit</span>
      </Button>

      {/* Header */}
      <div className="gba:absolute gba:top-4 gba:left-4 gba:flex gba:items-center gba:gap-3">
        <div className="gba:h-9 gba:w-9 gba:rounded-full gba:bg-gradient-to-br gba:from-ai gba:to-ai-secondary gba:flex gba:items-center gba:justify-center gba:shadow-md">
          <svg className="gba:h-4 gba:w-4 gba:text-ai-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h2 className="gba:text-base gba:font-bold gba:text-foreground">Voice Mode</h2>
          <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
            {isListening && (
              <>
                <span className="gba:inline-block gba:h-2 gba:w-2 gba:rounded-full gba:bg-success gba:animate-pulse" />
                Listening to you...
              </>
            )}
            {isSpeaking && (
              <>
                <span className="gba:inline-block gba:h-2 gba:w-2 gba:rounded-full gba:bg-info gba:animate-pulse" />
                Speaking...
              </>
            )}
            {isLoading && !isSpeaking && (
              <>
                <span className="gba:inline-block gba:h-2 gba:w-2 gba:rounded-full gba:bg-ai gba:animate-pulse" />
                Thinking...
              </>
            )}
            {!isListening && !isSpeaking && !isLoading && 'Ready — speak anytime'}
          </p>
        </div>
      </div>

      {/* Active Form Summary Card */}
      {activeForm && (
        <div
          className="gba:absolute gba:top-20 gba:left-4 gba:right-4 gba:max-w-md gba:mx-auto gba:z-20"
          data-testid="voice-form-summary"
        >
          <div className="gba:p-4 gba:rounded-2xl gba:bg-gradient-to-br gba:from-card gba:to-card/80 gba:backdrop-blur-lg gba:border-2 gba:border-ai/30 gba:shadow-2xl">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
              <div className="gba:h-8 gba:w-8 gba:rounded-lg gba:bg-gradient-to-br gba:from-ai gba:to-ai-secondary gba:flex gba:items-center gba:justify-center">
                <svg
                  className="gba:h-4 gba:w-4 gba:text-ai-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="gba:text-sm gba:font-bold gba:text-foreground">{activeForm.flowName}</h3>
                <p className="gba:text-xs gba:text-muted-foreground">Ready to submit</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="gba:space-y-2 gba:mb-3">
              {activeForm.fields.slice(0, 5).map((field, idx) => (
                <div
                  key={idx}
                  className="gba:flex gba:justify-between gba:items-center gba:text-sm gba:py-1 gba:px-2 gba:rounded gba:bg-muted/50"
                >
                  <span className="gba:text-muted-foreground gba:font-medium">{field.name}</span>
                  <span className="gba:text-foreground gba:truncate gba:max-w-[150px]" title={field.value}>
                    {field.value || <span className="gba:text-muted-foreground/50 gba:italic">empty</span>}
                  </span>
                </div>
              ))}
              {activeForm.fields.length > 5 && (
                <p className="gba:text-xs gba:text-muted-foreground gba:text-center">
                  +{activeForm.fields.length - 5} more fields
                </p>
              )}
            </div>

            {/* Voice Commands Hint */}
            <div className="gba:flex gba:flex-wrap gba:gap-2 gba:justify-center">
              <span className="gba:px-2 gba:py-1 gba:rounded-full gba:bg-success/20 gba:text-success gba:text-xs gba:font-semibold">
                "Submit"
              </span>
              <span className="gba:px-2 gba:py-1 gba:rounded-full gba:bg-destructive/20 gba:text-destructive gba:text-xs gba:font-semibold">
                "Cancel"
              </span>
              <span className="gba:px-2 gba:py-1 gba:rounded-full gba:bg-info/20 gba:text-info gba:text-xs gba:font-semibold">
                "Change X to Y"
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Animated Orb Canvas */}
      <canvas
        ref={canvasRef}
        className="gba:w-full gba:h-full gba:max-w-lg gba:max-h-lg gba:absolute gba:inset-0 gba:m-auto"
        style={{ width: '400px', height: '400px' }}
      />

      {/* Transcript Display - Shows what user said or what AI is saying */}
      <div className="gba:absolute gba:bottom-32 gba:left-0 gba:right-0 gba:px-8 gba:text-center">
        {/* User's speech transcript */}
        {(transcript || interimTranscript) && isListening && (
          <div className="gba:max-w-2xl gba:mx-auto gba:p-6 gba:rounded-2xl gba:bg-card/80 gba:backdrop-blur-md gba:border gba:border-border gba:shadow-lg gba:animate-in gba:fade-in gba:duration-200">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <div className="gba:h-2 gba:w-2 gba:rounded-full gba:bg-success gba:animate-pulse" />
              <span className="gba:text-xs gba:text-muted-foreground gba:font-medium">You're saying...</span>
            </div>
            <p className="gba:text-lg gba:text-foreground gba:leading-relaxed">
              {transcript}
              {interimTranscript && (
                <span className="gba:text-muted-foreground gba:opacity-70"> {interimTranscript}</span>
              )}
            </p>
          </div>
        )}

        {/* AI preparing response - show loading indicator */}
        {isLoading && !isSpeaking && !isListening && (
          <div className="gba:max-w-md gba:mx-auto gba:p-4 gba:rounded-xl gba:bg-info/10 gba:backdrop-blur-sm gba:border gba:border-info/30">
            <div className="gba:flex gba:items-center gba:justify-center gba:gap-3">
              <div className="gba:flex gba:items-center gba:gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-info gba:animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="gba:text-sm gba:text-info gba:font-medium">Preparing response...</span>
            </div>
          </div>
        )}

        {/* AI's speech response - Only show when actually speaking or finished */}
        {currentSpeechText && (isSpeaking || (!isLoading && !isListening)) && (
          <div className="gba:max-w-2xl gba:mx-auto gba:p-6 gba:rounded-2xl gba:bg-gradient-to-br gba:from-ai-secondary/15 gba:to-ai/10 gba:backdrop-blur-md gba:border gba:border-ai/40 gba:shadow-xl gba:animate-in gba:fade-in gba:duration-200">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
              <div
                className={`gba:h-2 gba:w-2 gba:rounded-full gba:bg-info ${isSpeaking ? 'gba:animate-pulse' : ''}`}
              />
              <span className="gba:text-xs gba:text-info gba:font-semibold">
                {isSpeaking ? 'EveryAI' : 'EveryAI said:'}
              </span>
            </div>
            <p className="gba:text-lg gba:text-foreground gba:leading-relaxed">{currentSpeechText}</p>
          </div>
        )}

        {/* Idle state - Ready to listen (only show if no AI text visible) */}
        {!isListening && !isSpeaking && !isLoading && !transcript && !currentSpeechText && (
          <div className="gba:max-w-md gba:mx-auto gba:p-4 gba:rounded-xl gba:bg-muted/30 gba:backdrop-blur-sm gba:animate-pulse">
            <p className="gba:text-sm gba:text-muted-foreground gba:text-center">
              🎤 <span className="gba:font-semibold">Listening...</span> — speak anytime
            </p>
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
            Send Now
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
            Interrupt
          </Button>
        ) : isLoading ? (
          <Button
            size="lg"
            className="gba:h-16 gba:px-8 gba:rounded-full gba:bg-muted gba:text-muted-foreground gba:shadow-lg gba:text-lg gba:font-semibold"
            disabled
            data-testid="voice-loading"
          >
            <svg
              className="gba:h-6 gba:w-6 gba:mr-2 gba:animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Thinking...
          </Button>
        ) : (
          <Button
            size="lg"
            className="gba:h-16 gba:px-8 gba:rounded-full gba:bg-gradient-to-r gba:from-ai gba:to-ai-secondary gba:text-ai-foreground gba:shadow-lg gba:text-lg gba:font-semibold hover:gba:shadow-xl gba:transition-all gba:animate-pulse"
            onClick={onStartListening}
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
            Start Speaking
          </Button>
        )}
      </div>

      {/* Keyboard hint */}
      <div className="gba:absolute gba:bottom-2 gba:left-0 gba:right-0 gba:text-center">
        <p className="gba:text-xs gba:text-muted-foreground gba:opacity-60">
          <kbd className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:font-mono gba:text-xs">Esc</kbd> or{' '}
          <span className="gba:text-destructive gba:font-medium">Exit</span> button to close
        </p>
      </div>
    </div>
  )
}

export default VoiceOverlay
