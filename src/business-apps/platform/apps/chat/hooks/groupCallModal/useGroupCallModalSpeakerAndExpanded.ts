/**
 * Speaker device change, expanded screen-share overlay, and PiP audio refs for GroupCallModalRtk.
 */

import { useRef, useEffect, useCallback } from 'react'
import { isMobileDevice } from '../../utils/groupCallModalUtils'
import type { GroupCallModalRtkProps } from '../../components/call/groupCallModalTypes'

type GridItem = { type: string; peerId: string; screenShareTrack?: MediaStreamTrack }

export function useGroupCallModalSpeakerAndExpanded(
  props: Pick<GroupCallModalRtkProps, 'callState'>,
  remoteVideoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>,
  expandedScreenShare: { peerId: string; peerName: string; stream: MediaStream } | null,
  setExpandedScreenShare: (v: { peerId: string; peerName: string; stream: MediaStream } | null) => void,
  applySinkIdToElement: (el: HTMLMediaElement | null, deviceId: string | null) => Promise<void>,
  selectedAudioOutputIdRef: React.MutableRefObject<string | null>,
  gridItems: GridItem[]
) {
  const { callState } = props

  const expandedScreenShareVideoRef = useRef<HTMLVideoElement>(null)
  const pipAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())

  const handleSpeakerDeviceChange = useCallback(
    (deviceId: string) => {
      selectedAudioOutputIdRef.current = deviceId
      remoteVideoRefs.current.forEach(videoEl => {
        void applySinkIdToElement(videoEl, deviceId)
      })
      pipAudioRefs.current.forEach(audioEl => {
        void applySinkIdToElement(audioEl, deviceId)
      })
      void applySinkIdToElement(expandedScreenShareVideoRef.current, deviceId)
    },
    [applySinkIdToElement, remoteVideoRefs]
  )

  const hasAppliedInitialSinkIdRef = useRef(false)
  useEffect(() => {
    if (hasAppliedInitialSinkIdRef.current) return
    if (globalThis.window === undefined) return
    if (!callState.roomId) return
    if (isMobileDevice()) {
      hasAppliedInitialSinkIdRef.current = true
      return
    }
    try {
      const saved = localStorage.getItem('chat-preferred-audio-output')
      if (saved) {
        handleSpeakerDeviceChange(saved)
      }
    } catch {
      // ignore
    } finally {
      hasAppliedInitialSinkIdRef.current = true
    }
  }, [callState.roomId, handleSpeakerDeviceChange])

  useEffect(() => {
    if (callState.roomId) return
    hasAppliedInitialSinkIdRef.current = false
  }, [callState.roomId])

  useEffect(() => {
    if (expandedScreenShare && expandedScreenShareVideoRef.current) {
      expandedScreenShareVideoRef.current.srcObject = expandedScreenShare.stream
      expandedScreenShareVideoRef.current.play().catch(err => console.debug('Expanded video play error:', err))
    }
  }, [expandedScreenShare])

  useEffect(() => {
    if (!expandedScreenShare) return
    const stillExists = gridItems.some(
      item => item.type === 'screen-share' && item.peerId === expandedScreenShare.peerId && item.screenShareTrack
    )
    if (!stillExists) {
      setExpandedScreenShare(null)
    }
  }, [expandedScreenShare, gridItems, setExpandedScreenShare])

  useEffect(() => {
    if (!expandedScreenShare) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedScreenShare(null)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [expandedScreenShare, setExpandedScreenShare])

  return {
    handleSpeakerDeviceChange,
    expandedScreenShareVideoRef,
    pipAudioRefs
  }
}
