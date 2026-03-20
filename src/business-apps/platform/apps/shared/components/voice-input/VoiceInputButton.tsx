// Voice input button with smooth animations and clear state feedback.

import React from 'react'
import { Button, Tooltip, TooltipContent, TooltipTrigger, cn } from '@newwork/nw-design-system'
import { Mic, MicOff, Square } from 'lucide-react'

export interface VoiceInputButtonProps {
  isListening: boolean
  isSupported: boolean
  volume: number
  error: string | null
  onStartListening: () => void
  onStopListening: () => void
  disabled?: boolean
  className?: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'prominent'
  label?: string
  listeningLabel?: string
  'data-testid'?: string
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  isListening,
  isSupported,
  volume,
  error,
  onStartListening,
  onStopListening,
  disabled = false,
  className,
  size = 'default',
  variant = 'default',
  label,
  listeningLabel,
  'data-testid': testId = 'voice-input-button'
}) => {
  const handleClick = () => {
    if (isListening) {
      onStopListening()
    } else {
      onStartListening()
    }
  }

  let iconSize: string
  if (size === 'sm') iconSize = 'gba:w-4 gba:h-4'
  else if (size === 'lg') iconSize = 'gba:w-6 gba:h-6'
  else iconSize = 'gba:w-5 gba:h-5'

  if (!isSupported) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size={size}
            disabled
            className={cn('gba:gap-2 gba:opacity-50', className)}
            data-testid={testId}
          >
            <MicOff className={iconSize} />
            {(label || variant === 'prominent') && <span>{label ?? 'Voice unavailable'}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Voice input is not supported in this browser. Try Chrome or Edge.</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  if (error) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant === 'prominent' ? 'default' : 'outline'}
            size={size}
            onClick={handleClick}
            disabled={disabled}
            className={cn(
              'gba:gap-2 gba:relative',
              variant === 'prominent' && 'gba:bg-primary hover:gba:bg-primary/90',
              className
            )}
            data-testid={testId}
          >
            <Mic className={iconSize} />
            {(label || variant === 'prominent') && <span>{label ?? 'Voice Input'}</span>}
            <span className="gba:absolute gba:-top-1 gba:-right-1 gba:w-3 gba:h-3 gba:bg-warning gba:rounded-full gba:border-2 gba:border-background" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="gba:max-w-xs">
          <p className="gba:text-warning-foreground gba:font-medium">Voice input unavailable</p>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{error}</p>
          <p className="gba:text-xs gba:text-muted-foreground">Click to try again</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  if (isListening) {
    return (
      <Button
        variant="destructive"
        size={size}
        onClick={handleClick}
        disabled={disabled}
        className={cn('gba:gap-2 gba:relative gba:overflow-hidden gba:min-w-[100px]', className)}
        data-testid={testId}
      >
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:relative">
            <Square className={cn(iconSize, 'gba:fill-current')} />
            <PulseRing />
          </div>
          <LiveWaveform volume={volume} />
          {(listeningLabel || label || variant === 'prominent') && (
            <span className="gba:text-sm gba:font-medium">{listeningLabel ?? label ?? 'Stop'}</span>
          )}
        </div>
      </Button>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant === 'prominent' ? 'default' : 'outline'}
          size={size}
          onClick={handleClick}
          disabled={disabled}
          className={cn(
            'gba:gap-2 gba:transition-all gba:duration-200',
            variant === 'prominent' && 'gba:bg-primary hover:gba:bg-primary/90 gba:shadow-md',
            className
          )}
          data-testid={testId}
        >
          <Mic className={iconSize} />
          {(label || variant === 'prominent') && <span>{label ?? 'Voice Input'}</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Click to start voice input</p>
        <p className="gba:text-xs gba:text-muted-foreground">Speak clearly into your microphone</p>
      </TooltipContent>
    </Tooltip>
  )
}

const PulseRing: React.FC = () => (
  <span className="gba:absolute gba:inset-0 gba:animate-ping gba:rounded-sm gba:bg-white/30" />
)

interface LiveWaveformProps {
  volume: number
}

const BAR_COUNT = 4
const LIVE_WAVEFORM_BAR_IDS = Array.from({ length: BAR_COUNT }, (_, i) => `voice-waveform-bar-${i}`)

const LiveWaveform: React.FC<LiveWaveformProps> = ({ volume }) => {
  const minHeight = 3
  const maxHeight = 16

  return (
    <div className="gba:flex gba:items-center gba:gap-[2px] gba:h-4">
      {LIVE_WAVEFORM_BAR_IDS.map((barId, i) => {
        const phase = (i / BAR_COUNT) * Math.PI
        const wave = Math.sin(Date.now() / 150 + phase) * 0.3 + 0.7
        const heightMultiplier = Math.max(0.2, Math.min(1, volume * 1.5 + 0.2)) * wave
        const barHeight = minHeight + (maxHeight - minHeight) * heightMultiplier

        return (
          <div
            key={barId}
            className="gba:w-[3px] gba:bg-destructive-foreground gba:rounded-full gba:transition-all gba:duration-75"
            style={{ height: `${barHeight}px` }}
          />
        )
      })}
    </div>
  )
}

export default VoiceInputButton
