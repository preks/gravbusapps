import { useCallback, useEffect, useRef, useState } from 'react'

interface UseSpeakerTestParams {
  isOpen: boolean
  t: (key: string) => string
  selectedAudioOutputId: string | null
}

interface UseSpeakerTestReturn {
  speakerAudioRef: React.RefObject<HTMLAudioElement>
  isTestingSpeaker: boolean
  speakerError: string | null
  runSpeakerTest: () => Promise<void>
  stopSpeakerTest: () => void
}

const getAudioContextCtor = (): (new () => AudioContext) | null => {
  if (typeof window === 'undefined') return null
  return (window.AudioContext || (window as any).webkitAudioContext || null) as (new () => AudioContext) | null
}

export const useSpeakerTest = ({ isOpen, t, selectedAudioOutputId }: UseSpeakerTestParams): UseSpeakerTestReturn => {
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false)
  const [speakerError, setSpeakerError] = useState<string | null>(null)
  const speakerAudioRef = useRef<HTMLAudioElement>(null)
  const cleanupTimerRef = useRef<number | null>(null)

  const stopSpeakerTest = useCallback(() => {
    if (cleanupTimerRef.current) {
      window.clearTimeout(cleanupTimerRef.current)
      cleanupTimerRef.current = null
    }
    if (speakerAudioRef.current) {
      speakerAudioRef.current.pause()
      speakerAudioRef.current.srcObject = null
    }
    setIsTestingSpeaker(false)
  }, [])

  const runSpeakerTest = useCallback(async () => {
    if (isTestingSpeaker) return
    setSpeakerError(null)
    setIsTestingSpeaker(true)

    try {
      const AudioContextCtor = getAudioContextCtor()
      if (!AudioContextCtor) throw new Error('AudioContext missing')

      const ctx = new AudioContextCtor()
      await ctx.resume().catch(() => undefined)

      const destination = ctx.createMediaStreamDestination()
      const gain = ctx.createGain()
      gain.gain.value = 0.14

      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 440

      osc.connect(gain)
      gain.connect(destination)

      const audioEl = speakerAudioRef.current
      if (audioEl) {
        audioEl.srcObject = destination.stream
        audioEl.autoplay = true
        audioEl.muted = false

        const setSinkId = (audioEl as any).setSinkId as ((id: string) => Promise<void>) | undefined
        if (selectedAudioOutputId && typeof setSinkId === 'function') {
          try {
            await setSinkId.call(audioEl, selectedAudioOutputId)
          } catch {
            setSpeakerError(
              t('call-testSpeakerSinkError') ||
                'Could not route audio to the selected speaker. Your browser may not allow speaker selection.'
            )
          }
        }

        await audioEl.play()
      }

      osc.start()
      osc.stop(ctx.currentTime + 0.6)

      cleanupTimerRef.current = window.setTimeout(() => {
        void ctx.close()
        stopSpeakerTest()
      }, 650)
    } catch {
      setSpeakerError(t('call-testSpeakerError') || 'Could not play test sound.')
      stopSpeakerTest()
    }
  }, [isTestingSpeaker, selectedAudioOutputId, stopSpeakerTest, t])

  // Cleanup when closing dialog/unmounting
  useEffect(() => {
    if (isOpen) return
    stopSpeakerTest()
  }, [isOpen, stopSpeakerTest])

  // If selected output changes while open, stop any ongoing test (avoid testing the "old" device).
  useEffect(() => {
    if (!isOpen) return
    stopSpeakerTest()
  }, [isOpen, selectedAudioOutputId, stopSpeakerTest])

  return {
    speakerAudioRef,
    isTestingSpeaker,
    speakerError,
    runSpeakerTest,
    stopSpeakerTest
  }
}
