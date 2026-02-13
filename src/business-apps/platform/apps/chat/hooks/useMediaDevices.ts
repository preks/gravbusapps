import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type MediaDeviceKind = 'audioinput' | 'audiooutput' | 'videoinput'

export interface MediaDeviceInfo {
  deviceId: string
  label: string
  kind: MediaDeviceKind
}

export interface RefreshDevicesOptions {
  requestAudio?: boolean
  requestVideo?: boolean
}

export interface UseMediaDevicesOptions {
  /**
   * CRITICAL GATING:
   * Only enable this hook inside PreCall/Invite/Rejoin modals or inside active call UI.
   * When disabled, we do not attach devicechange listeners and refreshDevices is a no-op.
   */
  enabled: boolean
}

export interface UseMediaDevicesReturn {
  audioInputDevices: MediaDeviceInfo[]
  audioOutputDevices: MediaDeviceInfo[]
  videoInputDevices: MediaDeviceInfo[]
  selectedAudioInputId: string | null
  selectedAudioOutputId: string | null
  selectedVideoInputId: string | null
  setSelectedAudioInputId: (deviceId: string) => void
  setSelectedAudioOutputId: (deviceId: string) => void
  setSelectedVideoInputId: (deviceId: string) => void
  refreshDevices: (options?: RefreshDevicesOptions) => Promise<void>
  isEnumerating: boolean
  canSelectAudioOutput: boolean
}

const STORAGE_KEYS = {
  audioInput: 'chat-preferred-audio-input',
  audioOutput: 'chat-preferred-audio-output',
  videoInput: 'chat-preferred-video-input'
} as const

const isBrowser = (): boolean => typeof globalThis.window !== 'undefined'

const safeGetStorageItem = (key: string): string | null => {
  if (!isBrowser()) return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const safeSetStorageItem = (key: string, value: string): void => {
  if (!isBrowser()) return
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

const buildLabel = (kind: MediaDeviceKind, label: string, deviceId: string): string => {
  if (label) return label
  const suffix = deviceId ? deviceId.slice(0, 5) : '?????'
  if (kind === 'audioinput') return `Microphone ${suffix}`
  if (kind === 'audiooutput') return `Speaker ${suffix}`
  return `Camera ${suffix}`
}

/**
 * Hook to manage media device enumeration + selection.
 *
 * IMPORTANT:
 * - Does NOT enumerate on mount.
 * - Call refreshDevices() ONLY from allowed surfaces (PreCall/Invite/Rejoin/Call UI).
 * - Uses getUserMedia only to unlock device labels, and only for requested kinds.
 */
export const useMediaDevices = ({ enabled }: UseMediaDevicesOptions): UseMediaDevicesReturn => {
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([])
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([])
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([])
  const [isEnumerating, setIsEnumerating] = useState(false)
  const enumerateRetryTimerRef = useRef<number | null>(null)

  const [selectedAudioInputId, setSelectedAudioInputIdState] = useState<string | null>(() =>
    safeGetStorageItem(STORAGE_KEYS.audioInput)
  )
  const [selectedAudioOutputId, setSelectedAudioOutputIdState] = useState<string | null>(() =>
    safeGetStorageItem(STORAGE_KEYS.audioOutput)
  )
  const [selectedVideoInputId, setSelectedVideoInputIdState] = useState<string | null>(() =>
    safeGetStorageItem(STORAGE_KEYS.videoInput)
  )

  const setSelectedAudioInputId = useCallback((deviceId: string) => {
    safeSetStorageItem(STORAGE_KEYS.audioInput, deviceId)
    setSelectedAudioInputIdState(deviceId)
  }, [])

  const setSelectedAudioOutputId = useCallback((deviceId: string) => {
    safeSetStorageItem(STORAGE_KEYS.audioOutput, deviceId)
    setSelectedAudioOutputIdState(deviceId)
  }, [])

  const setSelectedVideoInputId = useCallback((deviceId: string) => {
    safeSetStorageItem(STORAGE_KEYS.videoInput, deviceId)
    setSelectedVideoInputIdState(deviceId)
  }, [])

  const canSelectAudioOutput = useMemo(() => {
    return isBrowser() && typeof (HTMLMediaElement.prototype as any).setSinkId === 'function'
  }, [])

  const refreshDevices = useCallback(
    async (options?: RefreshDevicesOptions) => {
      if (!enabled) return
      if (!navigator.mediaDevices?.enumerateDevices) return

      const requestAudio = options?.requestAudio !== false
      const requestVideo = options?.requestVideo === true

      setIsEnumerating(true)
      try {
        // Cancel any pending retry from a previous refresh call
        if (enumerateRetryTimerRef.current) {
          globalThis.window.clearTimeout(enumerateRetryTimerRef.current)
          enumerateRetryTimerRef.current = null
        }

        // Request permission to unlock labels (only for requested kinds).
        // Avoid camera permission unless explicitly requested.
        let tempStream: MediaStream | null = null
        if (navigator.mediaDevices?.getUserMedia && (requestAudio || requestVideo)) {
          try {
            tempStream = await navigator.mediaDevices.getUserMedia({
              audio: requestAudio,
              video: requestVideo
            })
          } catch (err) {
            // We can still enumerate without labels; don’t crash.
            console.warn('[useMediaDevices] getUserMedia for labels failed', err)
          }
        }

        try {
          const runEnumerate = async () => {
            const devices = await navigator.mediaDevices.enumerateDevices()

            const audioInputs: MediaDeviceInfo[] = devices
              .filter(d => d.kind === 'audioinput' && d.deviceId !== 'default')
              .map(d => ({
                deviceId: d.deviceId,
                label: buildLabel('audioinput', d.label, d.deviceId),
                kind: 'audioinput'
              }))

            const audioOutputs: MediaDeviceInfo[] = devices
              .filter(d => d.kind === 'audiooutput' && d.deviceId !== 'default')
              .map(d => ({
                deviceId: d.deviceId,
                label: buildLabel('audiooutput', d.label, d.deviceId),
                kind: 'audiooutput'
              }))

            const videoInputs: MediaDeviceInfo[] = devices
              .filter(d => d.kind === 'videoinput' && d.deviceId !== 'default')
              .map(d => ({
                deviceId: d.deviceId,
                label: buildLabel('videoinput', d.label, d.deviceId),
                kind: 'videoinput'
              }))

            setAudioInputDevices(audioInputs)
            setAudioOutputDevices(audioOutputs)
            setVideoInputDevices(videoInputs)

            // Defaults if selected device disappeared
            if (!selectedAudioInputId || !audioInputs.some(d => d.deviceId === selectedAudioInputId)) {
              if (audioInputs[0]?.deviceId) setSelectedAudioInputId(audioInputs[0].deviceId)
            }
            if (!selectedVideoInputId || !videoInputs.some(d => d.deviceId === selectedVideoInputId)) {
              if (videoInputs[0]?.deviceId) setSelectedVideoInputId(videoInputs[0].deviceId)
            }
            if (!selectedAudioOutputId || !audioOutputs.some(d => d.deviceId === selectedAudioOutputId)) {
              if (audioOutputs[0]?.deviceId) setSelectedAudioOutputId(audioOutputs[0].deviceId)
            }

            // Quirk workaround: some environments don’t expose all cameras immediately after permissions.
            // If video was requested and we only see 0–1 cameras, retry enumeration once shortly after.
            if (requestVideo && videoInputs.length <= 1) {
              enumerateRetryTimerRef.current = globalThis.window.setTimeout(() => {
                if (!enabled) return
                void runEnumerate()
              }, 650)
            }
          }

          await runEnumerate()
        } finally {
          tempStream?.getTracks?.().forEach(t => t.stop())
        }
      } catch (error) {
        console.error('[useMediaDevices] Failed to enumerate devices:', error)
      } finally {
        setIsEnumerating(false)
      }
    },
    [
      enabled,
      selectedAudioInputId,
      selectedAudioOutputId,
      selectedVideoInputId,
      setSelectedAudioInputId,
      setSelectedAudioOutputId,
      setSelectedVideoInputId
    ]
  )

  // Listen for device changes only while enabled (strict gating).
  useEffect(() => {
    if (!enabled) return
    if (!navigator.mediaDevices?.addEventListener) return

    const handleDeviceChange = () => {
      // Do not auto-request camera permission on devicechange.
      refreshDevices({ requestAudio: true, requestVideo: false })
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [enabled, refreshDevices])

  // Cleanup any pending retry when the hook disables/unmounts
  useEffect(() => {
    if (enabled) return
    if (enumerateRetryTimerRef.current) {
      globalThis.window.clearTimeout(enumerateRetryTimerRef.current)
      enumerateRetryTimerRef.current = null
    }
  }, [enabled])

  return {
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectedVideoInputId,
    setSelectedAudioInputId,
    setSelectedAudioOutputId,
    setSelectedVideoInputId,
    refreshDevices,
    isEnumerating,
    canSelectAudioOutput
  }
}
