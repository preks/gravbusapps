import { useCallback, useEffect, useRef, useState } from 'react'
import { getAudioConstraints } from '../config/audioConstraints'

interface UseMicrophoneTestParams {
  isOpen: boolean
  t: (key: string) => string
  selectedAudioInputId: string | null
}

interface UseMicrophoneTestReturn {
  isTestingMic: boolean
  micError: string | null
  micLevel: number
  runMicTest: () => Promise<void>
  stopMicTest: () => void
}

const getAudioContextCtor = (): (new () => AudioContext) | null => {
  if (typeof window === 'undefined') return null
  return (window.AudioContext || (window as any).webkitAudioContext || null) as (new () => AudioContext) | null
}

export const useMicrophoneTest = ({
  isOpen,
  t,
  selectedAudioInputId
}: UseMicrophoneTestParams): UseMicrophoneTestReturn => {
  const [isTestingMic, setIsTestingMic] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [micLevel, setMicLevel] = useState(0)

  const micStreamRef = useRef<MediaStream | null>(null)
  const micAudioContextRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)

  const stopMicTest = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    micStreamRef.current?.getTracks?.().forEach(track => track.stop())
    micStreamRef.current = null
    void micAudioContextRef.current?.close?.()
    micAudioContextRef.current = null
    setIsTestingMic(false)
    setMicLevel(0)
  }, [])

  const runMicTest = useCallback(async () => {
    if (isTestingMic) return
    setMicError(null)
    setIsTestingMic(true)

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('getUserMedia missing')

      const audioConstraints: MediaTrackConstraints = getAudioConstraints()
      if (selectedAudioInputId) {
        audioConstraints.deviceId = { exact: selectedAudioInputId }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false })
      micStreamRef.current = stream

      const AudioContextCtor = getAudioContextCtor()
      if (!AudioContextCtor) throw new Error('AudioContext missing')

      const ctx = new AudioContextCtor()
      micAudioContextRef.current = ctx
      await ctx.resume().catch(() => undefined)

      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)

      const data = new Uint8Array(analyser.fftSize)

      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i += 1) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / data.length)
        const nextLevel = Math.max(0, Math.min(100, Math.round(rms * 140)))
        setMicLevel(nextLevel)
        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    } catch {
      setMicError(t('call-testMicrophoneError') || 'Could not access microphone.')
      stopMicTest()
    }
  }, [isTestingMic, selectedAudioInputId, stopMicTest, t])

  // Cleanup when closing dialog/unmounting
  useEffect(() => {
    if (isOpen) return
    stopMicTest()
  }, [isOpen, stopMicTest])

  // If selected input changes while open, stop any ongoing test (avoid testing the "old" device).
  useEffect(() => {
    if (!isOpen) return
    stopMicTest()
  }, [isOpen, selectedAudioInputId, stopMicTest])

  return {
    isTestingMic,
    micError,
    micLevel,
    runMicTest,
    stopMicTest
  }
}
