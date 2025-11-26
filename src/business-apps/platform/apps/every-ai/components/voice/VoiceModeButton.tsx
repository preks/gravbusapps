/**
 * VoiceModeButton - Premium voice mode toggle with stunning animations
 *
 * A beautiful, modern voice button with:
 * - Pulsing glow effects when active
 * - Sound wave visualizations
 * - Smooth state transitions
 * - Haptic-like visual feedback
 */

import React, { useMemo } from 'react'
import { Button } from '@newwork/nw-design-system'

interface VoiceModeButtonProps {
  isActive: boolean
  isListening: boolean
  isSpeaking: boolean
  isLoading: boolean
  volume: number // 0-1 for visualizations
  onToggle: () => void
  onStopSpeaking?: () => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const VoiceModeButton: React.FC<VoiceModeButtonProps> = ({
  isActive,
  isListening,
  isSpeaking,
  isLoading,
  volume,
  onToggle,
  onStopSpeaking,
  disabled = false,
  size = 'md',
  className = ''
}) => {
  // Size configurations
  const sizeConfig = useMemo(() => {
    const configs = {
      sm: { button: 'gba:h-10 gba:w-10', icon: 'gba:h-5 gba:w-5', bars: 3, barHeight: 12 },
      md: { button: 'gba:h-12 gba:w-12', icon: 'gba:h-6 gba:w-6', bars: 5, barHeight: 16 },
      lg: { button: 'gba:h-14 gba:w-14', icon: 'gba:h-7 gba:w-7', bars: 7, barHeight: 20 }
    }
    return configs[size]
  }, [size])

  // Generate sound wave bars based on volume
  const soundBars = useMemo(() => {
    return Array.from({ length: sizeConfig.bars }, (_, i) => {
      const centerIndex = Math.floor(sizeConfig.bars / 2)
      const distanceFromCenter = Math.abs(i - centerIndex)
      const baseHeight = 0.3 + (1 - distanceFromCenter / centerIndex) * 0.4
      const animatedHeight = baseHeight + volume * (1 - baseHeight) * (1 - distanceFromCenter / centerIndex)
      return Math.max(0.2, Math.min(1, animatedHeight))
    })
  }, [volume, sizeConfig.bars])

  // Handle click based on state
  const handleClick = () => {
    if (isSpeaking && onStopSpeaking) {
      onStopSpeaking()
    } else {
      onToggle()
    }
  }

  // Determine button state and styling
  const getButtonState = () => {
    if (isLoading) return 'loading'
    if (isListening) return 'listening'
    if (isSpeaking) return 'speaking'
    if (isActive) return 'active'
    return 'idle'
  }

  const buttonState = getButtonState()

  return (
    <div className={`gba:relative gba:inline-flex gba:items-center gba:justify-center ${className}`}>
      {/* Outer glow ring - pulses when active */}
      {(isListening || isSpeaking) && (
        <>
          <div
            className={`
              gba:absolute gba:inset-0 gba:rounded-full gba:blur-xl gba:opacity-40
              ${isListening ? 'gba:bg-success gba:animate-pulse' : ''}
              ${isSpeaking ? 'gba:bg-info gba:animate-pulse' : ''}
            `}
            style={{ transform: 'scale(1.5)' }}
          />
          <div
            className={`
              gba:absolute gba:inset-0 gba:rounded-full gba:blur-md gba:opacity-60
              ${isListening ? 'gba:bg-success' : ''}
              ${isSpeaking ? 'gba:bg-info' : ''}
            `}
            style={{
              transform: `scale(${1.2 + volume * 0.3})`,
              transition: 'transform 0.1s ease-out'
            }}
          />
        </>
      )}

      {/* Main button */}
      <Button
        variant="ghost"
        size="icon"
        className={`
          gba:relative gba:rounded-full gba:transition-all gba:duration-300 gba:z-10
          ${sizeConfig.button}
          ${buttonState === 'idle' ? 'gba:bg-muted hover:gba:bg-primary hover:gba:text-primary-foreground' : ''}
          ${buttonState === 'active' ? 'gba:bg-primary gba:text-primary-foreground' : ''}
          ${buttonState === 'listening' ? 'gba:bg-success gba:text-success-foreground gba:shadow-lg' : ''}
          ${buttonState === 'speaking' ? 'gba:bg-info gba:text-info-foreground gba:shadow-lg' : ''}
          ${buttonState === 'loading' ? 'gba:bg-muted gba:animate-pulse' : ''}
        `}
        onClick={handleClick}
        disabled={disabled || isLoading}
        aria-label={
          isListening
            ? 'Stop listening'
            : isSpeaking
              ? 'Stop speaking'
              : isActive
                ? 'Exit voice mode'
                : 'Enter voice mode'
        }
        data-testid="voice-mode-button"
      >
        {/* Icon states */}
        {isLoading ? (
          // Loading spinner
          <div className="gba:animate-spin">
            <svg className={sizeConfig.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="gba:opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="gba:opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : isListening ? (
          // Sound wave visualization when listening
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-0.5">
            {soundBars.map((height, i) => (
              <div
                key={i}
                className="gba:w-1 gba:bg-current gba:rounded-full gba:transition-all gba:duration-75"
                style={{
                  height: `${height * sizeConfig.barHeight}px`,
                  opacity: 0.8 + height * 0.2
                }}
              />
            ))}
          </div>
        ) : isSpeaking ? (
          // Speaking indicator - animated waves
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-0.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="gba:w-1 gba:bg-current gba:rounded-full gba:animate-pulse"
                style={{
                  height: `${8 + Math.sin(Date.now() / 200 + i * 1.5) * 6}px`,
                  animationDelay: `${i * 0.15}s`
                }}
              />
            ))}
          </div>
        ) : (
          // Microphone icon
          <svg className={sizeConfig.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        )}
      </Button>

      {/* State label (optional, for larger sizes) */}
      {size === 'lg' && (isListening || isSpeaking) && (
        <div
          className={`
            gba:absolute gba:-bottom-6 gba:left-1/2 gba:-translate-x-1/2 
            gba:text-xs gba:font-medium gba:whitespace-nowrap
            ${isListening ? 'gba:text-success' : 'gba:text-info'}
          `}
        >
          {isListening ? 'Listening...' : 'Speaking...'}
        </div>
      )}
    </div>
  )
}

export default VoiceModeButton
