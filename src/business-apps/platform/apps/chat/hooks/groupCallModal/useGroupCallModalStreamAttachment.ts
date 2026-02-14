/**
 * Local and remote stream attachment effects for GroupCallModalRtk (attach tracks to video elements).
 */

import { useRef, useEffect } from 'react'
import { rtkDebug } from '../../utils/rtkDebug'
import { getScreenShareTrack } from '../../utils/groupCallModalUtils'
import { isVideoTrackScreenShare, extractTracksFromCollection } from '../../utils/callUtils'
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
      rtkDebug.log('[RTK Modal] 🔄 Resetting local video initialization (returning from minimized)', {
        wasInitialized: localVideoInitializedRef.current
      })
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

    rtkDebug.log('[RTK Modal] 🔄 Local video stream attachment effect running', {
      hasVideoElement: !!videoElement,
      hasVideoTrack: !!localVideoTrack,
      hasAudioTrack: !!localAudioTrack,
      isVideoEnabled: effectiveLocalIsVideoEnabled,
      isInitialized: localVideoInitializedRef.current,
      videoTrackChanged: localVideoTrackIdRef.current !== currentVideoTrackId,
      audioTrackChanged: localAudioTrackIdRef.current !== currentAudioTrackId
    })

    if (!localVideoInitializedRef.current && (localVideoTrack || localAudioTrack)) {
      const stream = new MediaStream()
      if (localVideoTrack) stream.addTrack(localVideoTrack)
      if (localAudioTrack) stream.addTrack(localAudioTrack)
      videoElement.srcObject = stream
      localVideoInitializedRef.current = true
      localVideoTrackIdRef.current = currentVideoTrackId
      localAudioTrackIdRef.current = currentAudioTrackId
      rtkDebug.log('[RTK Modal] ✅ Local video stream initially attached', {
        hasVideo: !!localVideoTrack,
        hasAudio: !!localAudioTrack
      })
      return
    }

    if (localVideoInitializedRef.current && videoElement.srcObject instanceof MediaStream) {
      const stream = videoElement.srcObject
      const videoTrackChanged = localVideoTrackIdRef.current !== currentVideoTrackId
      const audioTrackChanged = localAudioTrackIdRef.current !== currentAudioTrackId

      if (videoTrackChanged || audioTrackChanged) {
        rtkDebug.log('[RTK Modal] 🔄 Local track changed', {
          videoChanged: videoTrackChanged,
          audioChanged: audioTrackChanged,
          oldVideoId: localVideoTrackIdRef.current,
          newVideoId: currentVideoTrackId,
          oldAudioId: localAudioTrackIdRef.current,
          newAudioId: currentAudioTrackId
        })
        try {
          if (videoTrackChanged) {
            stream.getVideoTracks().forEach(track => stream.removeTrack(track))
            if (localVideoTrack && effectiveLocalIsVideoEnabled) stream.addTrack(localVideoTrack)
            localVideoTrackIdRef.current = currentVideoTrackId
            rtkDebug.log('[RTK Modal] 📹 Updated local video track')
          }
          if (audioTrackChanged) {
            stream.getAudioTracks().forEach(track => stream.removeTrack(track))
            if (localAudioTrack) stream.addTrack(localAudioTrack)
            localAudioTrackIdRef.current = currentAudioTrackId
            rtkDebug.log('[RTK Modal] 🔊 Updated local audio track')
          }
          rtkDebug.log('[RTK Modal] ✅ Local tracks updated dynamically', {
            hasVideo: !!localVideoTrack && effectiveLocalIsVideoEnabled,
            hasAudio: !!localAudioTrack,
            streamVideoTracks: stream.getVideoTracks().length,
            streamAudioTracks: stream.getAudioTracks().length
          })
        } catch (error) {
          rtkDebug.warn('[RTK Modal] ⚠️ Local track update failed, falling back to full replacement:', error)
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
      rtkDebug.log('[RTK Modal] Minimized - clearing attached peers tracking for fresh attachment on maximize', {
        previouslyAttachedCount: attachedPeersRef.current.size,
        attachedPeerIds: Array.from(attachedPeersRef.current)
      })
      attachedPeersRef.current.clear()
    } else {
      rtkDebug.log('[RTK Modal] Maximized - attached peers will be tracked as streams attach', {
        currentlyAttachedCount: attachedPeersRef.current.size
      })
    }
  }, [callState.isMinimized])

  useEffect(() => {
    if (!stableRemotePeers) return

    rtkDebug.log('[RTK Modal] 🔄 Stream attachment effect running', {
      remotePeersCount: stableRemotePeers.length,
      isMinimized: callState.isMinimized,
      attachedPeersCount: attachedPeersRef.current.size,
      videoRefsCount: remoteVideoRefs.current.size,
      remotePeerIds: stableRemotePeers.map((p: any) => p.id),
      attachedPeerIds: Array.from(attachedPeersRef.current),
      videoRefPeerIds: Array.from(remoteVideoRefs.current.keys())
    })

    stableRemotePeers.forEach((peer: any) => {
      const videoElement = remoteVideoRefs.current.get(peer.id)
      const isAttached = attachedPeersRef.current.has(peer.id)
      const primaryScreenShareTrack = getScreenShareTrack(peer)
      const hasScreenShare = !!primaryScreenShareTrack
      const extractedScreenShareTracks = extractTracksFromCollection(peer.screenShareTracks)
      rtkDebug.log(`[RTK Modal] Checking peer ${peer.name || peer.id}:`, {
        hasVideoElement: !!videoElement,
        hasVideoTrack: !!peer.videoTrack,
        hasAudioTrack: !!peer.audioTrack,
        hasScreenShare,
        extractedScreenShareTracksCount: extractedScreenShareTracks.length,
        isAttached,
        videoTrackId: peer.videoTrack?.id,
        audioTrackId: peer.audioTrack?.id
      })

      const cameraVideoTrack = peer.videoTrack && !isVideoTrackScreenShare(peer.videoTrack) ? peer.videoTrack : null
      const isTestParticipant =
        peer.id?.startsWith('test-participant-') ||
        cameraVideoTrack?.id?.startsWith('mock-') ||
        peer.audioTrack?.id?.startsWith('mock-')

      if (videoElement && (cameraVideoTrack || peer.audioTrack) && !isAttached) {
        rtkDebug.log(`[RTK Modal] 🔗 Attaching stream for peer ${peer.name || peer.id} (initial)`, {
          peerId: peer.id,
          hasVideoElement: true,
          hasCameraTrack: !!cameraVideoTrack,
          hasAudioTrack: !!peer.audioTrack,
          wasAttached: isAttached,
          isMinimized: callState.isMinimized,
          isTestParticipant
        })

        if (isTestParticipant) {
          videoElement.srcObject = null
          attachedPeersRef.current.add(peer.id)
          rtkDebug.log(
            `[RTK Modal] ✅ Test participant marked as attached (avatar-only) for peer ${peer.name || peer.id}`,
            { hasVideo: !!cameraVideoTrack, hasAudio: !!peer.audioTrack }
          )
        } else {
          const stream = new MediaStream()
          if (cameraVideoTrack) stream.addTrack(cameraVideoTrack)
          if (peer.audioTrack) stream.addTrack(peer.audioTrack)
          videoElement.srcObject = stream
          attachedPeersRef.current.add(peer.id)
          rtkDebug.log(`[RTK Modal] ✅ Stream attached successfully for peer ${peer.name || peer.id}`, {
            hasVideo: !!cameraVideoTrack,
            hasAudio: !!peer.audioTrack,
            videoTrackIsScreenShare: isVideoTrackScreenShare(peer.videoTrack),
            streamTrackCount: stream.getTracks().length
          })
        }
      } else if (!videoElement) {
        rtkDebug.log(`[RTK Modal] ⏭️ Skipping peer ${peer.name || peer.id} - no video element yet`, {
          peerId: peer.id,
          isAttached,
          hasTracks: !!(cameraVideoTrack || peer.audioTrack)
        })
      } else if (isAttached) {
        rtkDebug.log(`[RTK Modal] ⏭️ Skipping peer ${peer.name || peer.id} - already attached`, { peerId: peer.id })
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
          rtkDebug.log(`[RTK Modal] 🔄 Track changed for peer ${peer.name || peer.id}`, {
            videoChanged: videoTrackChanged,
            audioChanged: audioTrackChanged,
            oldVideoId: currentVideoTrack?.id,
            newVideoId: cameraVideoTrackForUpdate?.id,
            oldAudioId: currentAudioTrack?.id,
            newAudioId: peer.audioTrack?.id,
            videoTrackIsScreenShare: isVideoTrackScreenShare(peer.videoTrack),
            isTestParticipant: isTestParticipantUpdate
          })

          if (isTestParticipantUpdate) {
            rtkDebug.log(`[RTK Modal] ⏭️ Skipping track update for test participant ${peer.name || peer.id}`)
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
                rtkDebug.log(`[RTK Modal] 🔊 Updated audio track for peer ${peer.name || peer.id}`, {
                  hasAudio: !!peer.audioTrack,
                  audioTrackId: peer.audioTrack?.id
                })
              }
              if (videoTrackChanged) {
                stream.getVideoTracks().forEach(track => stream.removeTrack(track))
                if (cameraVideoTrackForUpdate) stream.addTrack(cameraVideoTrackForUpdate)
                rtkDebug.log(`[RTK Modal] 📹 Updated video track for peer ${peer.name || peer.id}`, {
                  hasVideo: !!cameraVideoTrackForUpdate,
                  videoTrackId: cameraVideoTrackForUpdate?.id
                })
              }
              videoElement.muted = false
              videoElement.play().catch(err => {
                rtkDebug.warn(`[RTK Modal] Could not auto-play peer ${peer.name || peer.id}:`, err)
              })
              rtkDebug.log(`[RTK Modal] ✅ Updated tracks for peer ${peer.name || peer.id}`, {
                hasVideo: !!cameraVideoTrackForUpdate,
                hasAudio: !!peer.audioTrack,
                videoElementMuted: videoElement.muted,
                streamAudioTracks: stream.getAudioTracks().length,
                streamVideoTracks: stream.getVideoTracks().length
              })
            } catch (error) {
              rtkDebug.warn(
                `[RTK Modal] ⚠️ Track update failed for peer ${peer.name || peer.id}, falling back to full replacement:`,
                error
              )
              const newStream = new MediaStream()
              if (cameraVideoTrackForUpdate) newStream.addTrack(cameraVideoTrackForUpdate)
              if (peer.audioTrack) newStream.addTrack(peer.audioTrack)
              videoElement.srcObject = null
              setTimeout(() => {
                videoElement.srcObject = newStream
                videoElement.muted = false
                videoElement.play().catch(err => {
                  rtkDebug.warn(`[RTK Modal] Could not auto-play peer ${peer.name || peer.id}:`, err)
                })
              }, 10)
            }
            trackUpdateTimersRef.current.delete(peer.id)
          }, 50)
          trackUpdateTimersRef.current.set(peer.id, timer)
        }
      }

      if (hasScreenShare && primaryScreenShareTrack) {
        rtkDebug.log(`[RTK Modal] 📺 Screen share detected for peer ${peer.name || peer.id}:`, {
          trackId: primaryScreenShareTrack.id,
          trackLabel: primaryScreenShareTrack.label,
          trackEnabled: primaryScreenShareTrack.enabled,
          trackKind: primaryScreenShareTrack.kind,
          screenShareEnabled: peer.screenShareEnabled,
          extractedTracksCount: extractTracksFromCollection(peer.screenShareTracks).length
        })
      } else if (peer.screenShareEnabled && !hasScreenShare) {
        const extractedTracks = extractTracksFromCollection(peer.screenShareTracks)
        rtkDebug.warn(`[RTK Modal] ⚠️ Screen share enabled for peer ${peer.name || peer.id} but no track found:`, {
          screenShareEnabled: peer.screenShareEnabled,
          extractedTracksCount: extractedTracks.length,
          videoTrack: peer.videoTrack
            ? {
                id: peer.videoTrack.id,
                label: peer.videoTrack.label,
                kind: peer.videoTrack.kind,
                isScreenShare: isVideoTrackScreenShare(peer.videoTrack)
              }
            : null
        })
      }
    })

    const currentPeerIds = new Set(stableRemotePeers.map((p: any) => p.id))
    attachedPeersRef.current.forEach(peerId => {
      if (!currentPeerIds.has(peerId)) {
        attachedPeersRef.current.delete(peerId)
        rtkDebug.log(`[RTK Modal] Removed peer ${peerId} from attached set`)
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
