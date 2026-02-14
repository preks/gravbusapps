/**
 * Video element refs, sinkId, and focused/expanded screen-share state for GroupCallModalRtk.
 */

import { useRef, useState, useCallback } from 'react'
import { isMobileDevice } from '../../utils/groupCallModalUtils'
import { rtkDebug } from '../../utils/rtkDebug'
import type { GroupCallModalRtkProps } from '../../components/call/groupCallModalTypes'

export function useGroupCallModalVideoRefs(props: Pick<GroupCallModalRtkProps, 'callState'>) {
  const { callState } = props

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const screenShareVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const speakerVolumeRef = useRef(100)
  const selectedAudioOutputIdRef = useRef<string | null>(null)

  const applySinkIdToElement = useCallback(async (el: HTMLMediaElement | null, deviceId: string | null) => {
    if (!el || !deviceId) return
    if (isMobileDevice()) return
    const setSinkId = (el as any).setSinkId as ((id: string) => Promise<void>) | undefined
    if (typeof setSinkId !== 'function') return
    try {
      await setSinkId.call(el, deviceId)
    } catch (err) {
      console.debug('[RTK Modal] Failed to set sinkId', err)
    }
  }, [])

  const [videoElementsVersion, setVideoElementsVersion] = useState(0)

  const setLocalVideoRef = useCallback((el: HTMLVideoElement | null) => {
    ;(localVideoRef as any).current = el
    if (el) {
      setVideoElementsVersion(v => v + 1)
    }
  }, [])

  const videoRefCallbacksRef = useRef<Map<string, (el: HTMLVideoElement | null) => void>>(new Map())

  const getVideoRefCallback = useCallback(
    (peerId: string, peerName: string, isLocal: boolean) => {
      if (videoRefCallbacksRef.current.has(peerId)) {
        return videoRefCallbacksRef.current.get(peerId)!
      }

      const callback = (el: HTMLVideoElement | null) => {
        if (el) {
          if (isLocal) {
            setLocalVideoRef(el)
          } else {
            remoteVideoRefs.current.set(peerId, el)
            el.volume = speakerVolumeRef.current / 100
            void applySinkIdToElement(el, selectedAudioOutputIdRef.current)
            setVideoElementsVersion(v => v + 1)
          }
        } else {
          rtkDebug.log(`[RTK Modal] 🗑️ Video element destroyed for ${isLocal ? 'local' : 'peer'}`, {
            peerId,
            peerName,
            isLocal,
            isMinimized: callState.isMinimized,
            timestamp: Date.now()
          })
          if (isLocal) {
            setLocalVideoRef(null)
          } else {
            remoteVideoRefs.current.delete(peerId)
          }
        }
      }

      videoRefCallbacksRef.current.set(peerId, callback)
      return callback
    },
    [setLocalVideoRef, callState.isMinimized]
  )

  const [focusedScreenShareId, setFocusedScreenShareId] = useState<string | null>(null)
  const [expandedScreenShare, setExpandedScreenShare] = useState<{
    peerId: string
    peerName: string
    stream: MediaStream
  } | null>(null)

  return {
    localVideoRef,
    remoteVideoRefs,
    screenShareVideoRefs,
    speakerVolumeRef,
    selectedAudioOutputIdRef,
    applySinkIdToElement,
    videoElementsVersion,
    setVideoElementsVersion,
    setLocalVideoRef,
    videoRefCallbacksRef,
    getVideoRefCallback,
    focusedScreenShareId,
    setFocusedScreenShareId,
    expandedScreenShare,
    setExpandedScreenShare
  }
}
