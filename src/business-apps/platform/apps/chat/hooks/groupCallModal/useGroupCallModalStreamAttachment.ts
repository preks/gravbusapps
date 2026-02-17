/**
 * Local and remote stream attachment effects for GroupCallModalRtk (attach tracks to video elements).
 */

import { useRef, useEffect } from 'react'
import { isVideoTrackScreenShare } from '../../utils/callUtils'
import type { GroupCallModalRtkProps } from '../../components/call/groupCallModalTypes'

export function useGroupCallModalStreamAttachment(
  props: Pick<GroupCallModalRtkProps, 'callState' | 'localStream'>,
  meeting: any,
  stableRemotePeers: any[],
  effectiveLocalIsVideoEnabled: boolean,
  localVideoRef: React.RefObject<HTMLVideoElement | null>,
  remoteVideoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>,
  videoElementsVersion: number
) {
  const { callState } = props

  const localVideoInitializedRef = useRef(false)
  const localVideoTrackIdRef = useRef<string | null>(null)
  const localAudioTrackIdRef = useRef<string | null>(null)
  const wasMinimizedRef = useRef(callState.isMinimized)
  const attachedPeersRef = useRef<Set<string>>(new Set())
  const trackUpdateTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  useEffect(() => {
    const wasMinimized = wasMinimizedRef.current
    const isMinimizedNow = callState.isMinimized
    if (wasMinimized && !isMinimizedNow) {
      localVideoInitializedRef.current = false
      localVideoTrackIdRef.current = null
      localAudioTrackIdRef.current = null
    }
    wasMinimizedRef.current = isMinimizedNow
  }, [callState.isMinimized])

  useEffect(() => {
    const videoElement = localVideoRef.current
    if (!videoElement) return

    const localVideoTrack =
      meeting?.self?.videoTrack && !isVideoTrackScreenShare(meeting.self.videoTrack) ? meeting.self.videoTrack : null
    const localAudioTrack = meeting?.self?.audioTrack
    const currentVideoTrackId = localVideoTrack?.id || null
    const currentAudioTrackId = localAudioTrack?.id || null

    if (!localVideoInitializedRef.current && (localVideoTrack || localAudioTrack)) {
      const stream = new MediaStream()
      if (localVideoTrack) stream.addTrack(localVideoTrack)
      if (localAudioTrack) stream.addTrack(localAudioTrack)
      videoElement.srcObject = stream
      localVideoInitializedRef.current = true
      localVideoTrackIdRef.current = currentVideoTrackId
      localAudioTrackIdRef.current = currentAudioTrackId
      return
    }

    if (localVideoInitializedRef.current && videoElement.srcObject instanceof MediaStream) {
      const stream = videoElement.srcObject
      const videoTrackChanged = localVideoTrackIdRef.current !== currentVideoTrackId
      const audioTrackChanged = localAudioTrackIdRef.current !== currentAudioTrackId

      if (videoTrackChanged || audioTrackChanged) {
        try {
          if (videoTrackChanged) {
            stream.getVideoTracks().forEach(track => stream.removeTrack(track))
            if (localVideoTrack && effectiveLocalIsVideoEnabled) stream.addTrack(localVideoTrack)
            localVideoTrackIdRef.current = currentVideoTrackId
          }
          if (audioTrackChanged) {
            stream.getAudioTracks().forEach(track => stream.removeTrack(track))
            if (localAudioTrack) stream.addTrack(localAudioTrack)
            localAudioTrackIdRef.current = currentAudioTrackId
          }
        } catch {
          const newStream = new MediaStream()
          if (localVideoTrack && effectiveLocalIsVideoEnabled) newStream.addTrack(localVideoTrack)
          if (localAudioTrack) newStream.addTrack(localAudioTrack)
          videoElement.srcObject = newStream
          localVideoTrackIdRef.current = currentVideoTrackId
          localAudioTrackIdRef.current = currentAudioTrackId
        }
      }
    }
  }, [meeting?.self?.videoTrack, meeting?.self?.audioTrack, effectiveLocalIsVideoEnabled, videoElementsVersion])

  useEffect(() => {
    if (callState.isMinimized) {
      attachedPeersRef.current.clear()
    }
  }, [callState.isMinimized])

  useEffect(() => {
    if (!stableRemotePeers) return

    stableRemotePeers.forEach((peer: any) => {
      const videoElement = remoteVideoRefs.current.get(peer.id)
      const isAttached = attachedPeersRef.current.has(peer.id)
      const cameraVideoTrack = peer.videoTrack && !isVideoTrackScreenShare(peer.videoTrack) ? peer.videoTrack : null
      const isTestParticipant =
        peer.id?.startsWith('test-participant-') ||
        cameraVideoTrack?.id?.startsWith('mock-') ||
        peer.audioTrack?.id?.startsWith('mock-')

      if (videoElement && (cameraVideoTrack || peer.audioTrack) && !isAttached) {
        if (isTestParticipant) {
          videoElement.srcObject = null
          attachedPeersRef.current.add(peer.id)
        } else {
          const stream = new MediaStream()
          if (cameraVideoTrack) stream.addTrack(cameraVideoTrack)
          if (peer.audioTrack) stream.addTrack(peer.audioTrack)
          videoElement.srcObject = stream
          attachedPeersRef.current.add(peer.id)
        }
      }

      if (videoElement && isAttached) {
        const currentStream = videoElement.srcObject as MediaStream
        const currentVideoTrack = currentStream?.getVideoTracks()[0]
        const currentAudioTrack = currentStream?.getAudioTracks()[0]
        const cameraVideoTrackForUpdate =
          peer.videoTrack && !isVideoTrackScreenShare(peer.videoTrack) ? peer.videoTrack : null
        const videoTrackChanged = currentVideoTrack?.id !== cameraVideoTrackForUpdate?.id
        const audioTrackChanged = currentAudioTrack?.id !== peer.audioTrack?.id
        const isTestParticipantUpdate =
          peer.id?.startsWith('test-participant-') ||
          cameraVideoTrackForUpdate?.id?.startsWith('mock-') ||
          peer.audioTrack?.id?.startsWith('mock-')

        if (videoTrackChanged || audioTrackChanged) {
          if (isTestParticipantUpdate) {
            return
          }

          const existingTimer = trackUpdateTimersRef.current.get(peer.id)
          if (existingTimer) clearTimeout(existingTimer)

          const timer = setTimeout(() => {
            try {
              const stream = videoElement.srcObject as MediaStream
              if (audioTrackChanged) {
                stream.getAudioTracks().forEach(track => stream.removeTrack(track))
                if (peer.audioTrack) stream.addTrack(peer.audioTrack)
              }
              if (videoTrackChanged) {
                stream.getVideoTracks().forEach(track => stream.removeTrack(track))
                if (cameraVideoTrackForUpdate) stream.addTrack(cameraVideoTrackForUpdate)
              }
              videoElement.muted = false
              videoElement.play().catch(() => {})
            } catch {
              const newStream = new MediaStream()
              if (cameraVideoTrackForUpdate) newStream.addTrack(cameraVideoTrackForUpdate)
              if (peer.audioTrack) newStream.addTrack(peer.audioTrack)
              videoElement.srcObject = null
              setTimeout(() => {
                videoElement.srcObject = newStream
                videoElement.muted = false
                videoElement.play().catch(() => {})
              }, 10)
            }
            trackUpdateTimersRef.current.delete(peer.id)
          }, 50)
          trackUpdateTimersRef.current.set(peer.id, timer)
        }
      }
    })

    const currentPeerIds = new Set(stableRemotePeers.map((p: any) => p.id))
    attachedPeersRef.current.forEach(peerId => {
      if (!currentPeerIds.has(peerId)) {
        attachedPeersRef.current.delete(peerId)
        const timer = trackUpdateTimersRef.current.get(peerId)
        if (timer) {
          clearTimeout(timer)
          trackUpdateTimersRef.current.delete(peerId)
        }
      }
    })
  }, [stableRemotePeers, videoElementsVersion, callState.isMinimized])

  useEffect(() => {
    return () => {
      trackUpdateTimersRef.current.forEach(timer => clearTimeout(timer))
      trackUpdateTimersRef.current.clear()
    }
  }, [])
}
