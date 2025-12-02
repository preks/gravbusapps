/**
 * VoiceModeButton - Voice mode toggle matching ChatInput button style
 *
 * Matches the style of other buttons in ChatInput:
 * - Same size (h-10 w-10)
 * - Same border radius (rounded-xl)
 * - Same hover effects
 * - Color changes based on state
 */

import React from 'react'
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
  onToggle,
  onStopSpeaking,
  disabled = false,
  size = 'md',
  className = ''
}) => {
  // Handle click based on state
  const handleClick = () => {
    if (isSpeaking && onStopSpeaking) {
      onStopSpeaking()
    } else {
      onToggle()
    }
  }

  // Size classes
  const sizeClasses = {
    sm: 'gba:h-8 gba:w-8 gba:rounded-lg',
    md: 'gba:h-10 gba:w-10 gba:rounded-xl',
    lg: 'gba:h-12 gba:w-12 gba:rounded-xl'
  }

  const iconSizeClasses = {
    sm: 'gba:h-4 gba:w-4',
    md: 'gba:h-5 gba:w-5',
    lg: 'gba:h-6 gba:w-6'
  }

  // Determine button styling based on state
  const getButtonClasses = () => {
    const base = `${sizeClasses[size]} gba:transition-all gba:shadow-sm`

    if (isLoading) {
      return `${base} gba:bg-muted gba:animate-pulse`
    }
    if (isListening) {
      return `${base} gba:bg-success gba:text-success-foreground hover:gba:bg-success/90`
    }
    if (isSpeaking) {
      return `${base} gba:bg-info gba:text-info-foreground hover:gba:bg-info/90`
    }
    if (isActive) {
      return `${base} gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90`
    }
    // Idle state - matches other buttons
    return `${base} gba:bg-muted hover:gba:bg-primary hover:gba:text-primary-foreground`
  }

  const iconSize = iconSizeClasses[size]

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`${getButtonClasses()} ${className}`}
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
      title={
        isListening
          ? 'Listening... (click to stop)'
          : isSpeaking
            ? 'Speaking... (click to stop)'
            : isActive
              ? 'Exit voice mode'
              : 'Enter voice mode'
      }
      data-testid="voice-mode-button"
    >
      {/* Icon states */}
      {isLoading ? (
        // Loading spinner
        <svg className={`${iconSize} gba:animate-spin`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle className="gba:opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="gba:opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : isListening ? (
        // Sound wave visualization when listening
        <div className="gba:flex gba:items-center gba:justify-center gba:gap-0.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="gba:w-0.5 gba:bg-current gba:rounded-full gba:animate-pulse"
              style={{
                height: `${size === 'sm' ? 6 + i * 3 : 8 + i * 4}px`,
                animationDelay: `${i * 0.1}s`
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
              className="gba:w-0.5 gba:bg-current gba:rounded-full gba:animate-pulse"
              style={{
                height: `${size === 'sm' ? 5 + i * 2 : 6 + i * 3}px`,
                animationDelay: `${i * 0.15}s`
              }}
            />
          ))}
        </div>
      ) : (
        // Microphone icon
        <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      )}
    </Button>
  )
}

export default VoiceModeButton
