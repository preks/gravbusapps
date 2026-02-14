/**
 * MicLevelIndicator Component
 *
 * Real-time microphone level visualization with animated bars.
 * Monitors audio input level using Web Audio API and displays
 * a horizontal bar chart showing current microphone volume.
 */

import React, { useEffect, useState, useRef } from 'react'
import { MicrophoneIcon } from '@phosphor-icons/react'

export interface MicLevelIndicatorProps {
  /** Device ID of the microphone to monitor */
  deviceId: string | null
  /** Additional CSS classes */
  className?: string
  /** Number of bars to display (default: 16) */
  barCount?: number
  /** Data test ID prefix */
  prefixDataTestId?: string
}

export const MicLevelIndicator: React.FC<MicLevelIndicatorProps> = ({
  deviceId,
  className = '',
  barCount = 16,
  prefixDataTestId = 'mic-level-indicator'
}) => {
  const [level, setLevel] = useState(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!deviceId) {
      setLevel(0)
      return
    }

    let mounted = true

    const initMicMonitor = async () => {
      try {
        // Request microphone access with specific device
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } }
        })

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop())
          return
        }

        streamRef.current = stream

        // Create audio context and analyser
        const audioContext = new AudioContext()
        audioContextRef.current = audioContext

        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.8
        analyserRef.current = analyser

        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        // Animation loop to update level
        const updateLevel = () => {
          if (!mounted || !analyserRef.current) return

          analyser.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          // Amplify for better visibility (normalize to 0-100)
          const normalizedLevel = Math.min(100, (average / 255) * 100 * 1.5)
          setLevel(normalizedLevel)

          animationFrameRef.current = requestAnimationFrame(updateLevel)
        }

        updateLevel()
      } catch (error) {
        console.error('[MicLevelIndicator] Failed to access microphone:', error)
        setLevel(0)
      }
    }

    initMicMonitor()

    return () => {
      mounted = false

      // Cleanup animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
        audioContextRef.current = null
      }

      analyserRef.current = null
    }
  }, [deviceId])

  const activeBars = Math.round((level / 100) * barCount)

  return (
    <div className={`gba:flex gba:items-center gba:gap-3 ${className}`} data-testid={prefixDataTestId}>
      <MicrophoneIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0" weight="fill" />
      <div className="gba:flex gba:items-center gba:gap-0.5 gba:flex-1">
        {Array.from({ length: barCount }).map((_, i) => (
          <div
            key={i}
            className={`gba:h-5 gba:flex-1 gba:rounded-sm gba:transition-colors gba:duration-75 ${
              i < activeBars ? 'gba:bg-primary' : 'gba:bg-muted'
            }`}
            data-testid={`${prefixDataTestId}-bar-${i}`}
          />
        ))}
      </div>
    </div>
  )
}
