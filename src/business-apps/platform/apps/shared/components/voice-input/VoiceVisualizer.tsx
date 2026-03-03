// Voice visualizer with smooth waveform animation. Uses minimal inline styles for dynamic volume/position values.

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@newwork/nw-design-system'
import { Mic } from 'lucide-react'

export interface VoiceVisualizerProps {
  volume: number
  isListening: boolean
  interimText?: string
  className?: string
  'data-testid'?: string
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  volume,
  isListening,
  interimText,
  className,
  'data-testid': testId = 'voice-visualizer'
}) => {
  if (!isListening) {
    return null
  }

  return (
    <div
      className={cn(
        'gba:relative gba:rounded-xl gba:overflow-hidden',
        'gba:bg-gradient-to-r gba:from-primary/5 gba:via-primary/10 gba:to-primary/5',
        'gba:border gba:border-primary/20',
        className
      )}
      data-testid={testId}
    >
      <div
        className="gba:absolute gba:inset-0 gba:bg-primary/5 gba:transition-opacity gba:duration-150"
        style={{ opacity: Math.min(1, volume * 2) }}
      />

      <div className="gba:relative gba:flex gba:items-center gba:gap-4 gba:p-4">
        <div className="gba:relative gba:flex-shrink-0">
          <div
            className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center"
            style={{
              transform: `scale(${1 + volume * 0.15})`,
              transition: 'transform 100ms ease-out'
            }}
          >
            <Mic className="gba:w-5 gba:h-5 gba:text-primary" />
          </div>
          <PulseRings volume={volume} />
        </div>

        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-3">
            <WaveformBars volume={volume} />
            <span className="gba:text-sm gba:font-medium gba:text-primary gba:animate-pulse">Listening...</span>
          </div>

          {interimText && (
            <div className="gba:mt-2 gba:text-sm gba:text-muted-foreground gba:truncate">
              <span className="gba:text-primary/70 gba:italic">&quot;{interimText}&quot;</span>
            </div>
          )}
        </div>

        <div className="gba:flex-shrink-0 gba:w-16">
          <VolumeBar volume={volume} />
        </div>
      </div>
    </div>
  )
}

interface PulseRingsProps {
  volume: number
}

const PulseRings: React.FC<PulseRingsProps> = ({ volume }) => {
  const ringCount = 2
  const baseOpacity = Math.min(0.4, volume * 0.8)
  const ringKeys = React.useMemo(
    () => Array.from({ length: ringCount }, (_, i) => `voice-visualizer-ring-${i}`),
    [ringCount]
  )

  return (
    <>
      {ringKeys.map((ringId, i) => (
        <div
          key={ringId}
          className="gba:absolute gba:inset-0 gba:rounded-full gba:border-2 gba:border-primary/30 gba:animate-ping"
          style={{
            animationDelay: `${i * 400}ms`,
            animationDuration: '1.5s',
            opacity: baseOpacity * (1 - i * 0.3)
          }}
        />
      ))}
    </>
  )
}

interface WaveformBarsProps {
  volume: number
}

const WAVEFORM_BAR_COUNT = 12
const WAVEFORM_BAR_IDS = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => `voice-visualizer-bar-${i}`)

const WaveformBars: React.FC<WaveformBarsProps> = ({ volume }) => {
  const minHeight = 4
  const maxHeight = 20
  const animationRef = useRef<number>(0)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- setter used to force re-render for animation; value intentionally unused (Sonar S3735)
  const [_animationTick, setAnimationTick] = useState({})

  useEffect(() => {
    let running = true
    const animate = () => {
      if (!running) return
      setAnimationTick({})
      animationRef.current = requestAnimationFrame(animate)
    }
    animate()
    return () => {
      running = false
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  return (
    <div className="gba:flex gba:items-center gba:gap-[2px] gba:h-5">
      {WAVEFORM_BAR_IDS.map((barId, i) => {
        const time = Date.now() / 100
        const phase = (i / WAVEFORM_BAR_COUNT) * Math.PI * 2
        const wave = Math.sin(time + phase) * 0.5 + 0.5
        const volumeBoost = Math.max(0.15, volume)
        const heightMultiplier = wave * volumeBoost

        return (
          <div
            key={barId}
            className="gba:w-[3px] gba:bg-primary gba:rounded-full gba:transition-[height] gba:duration-75"
            style={{
              height: `${minHeight + (maxHeight - minHeight) * heightMultiplier}px`,
              opacity: 0.4 + heightMultiplier * 0.6
            }}
          />
        )
      })}
    </div>
  )
}

interface VolumeBarProps {
  volume: number
}

const VolumeBar: React.FC<VolumeBarProps> = ({ volume }) => {
  const percentage = Math.round(volume * 100)

  return (
    <div className="gba:space-y-1">
      <div className="gba:h-1.5 gba:bg-primary/20 gba:rounded-full gba:overflow-hidden">
        <div
          className="gba:h-full gba:bg-primary gba:rounded-full gba:transition-all gba:duration-75"
          style={{ width: `${Math.max(5, percentage)}%` }}
        />
      </div>
      <div className="gba:text-[10px] gba:text-muted-foreground gba:text-center gba:font-mono">{percentage}%</div>
    </div>
  )
}

export default VoiceVisualizer
