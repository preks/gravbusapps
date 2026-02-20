/**
 * Attach screen-share and video tracks to DOM elements in the grid (effects only).
 */

import { useEffect } from 'react'

type GridItem = {
  id: string
  type: 'video' | 'screen-share' | 'avatar'
  peerId: string
  peerName: string
  screenShareTrack?: MediaStreamTrack
  videoTrack?: MediaStreamTrack
  audioTrack?: MediaStreamTrack
  isLocal: boolean
}

export interface UseGroupCallModalTrackAttachmentParams {
  gridItems: GridItem[]
  currentPage: number
  isMinimized: boolean
  screenShareTrackIds: string
  videoTrackIds: string
  localVideoRef: React.RefObject<HTMLVideoElement | null>
  remoteVideoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>
  screenShareVideoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>
  applySinkIdToElement: (el: HTMLMediaElement | null, deviceId: string | null) => Promise<void>
  selectedAudioOutputIdRef: React.MutableRefObject<string | null>
}

export function useGroupCallModalTrackAttachment({
  gridItems,
  currentPage,
  isMinimized,
  screenShareTrackIds,
  videoTrackIds,
  localVideoRef,
  remoteVideoRefs,
  screenShareVideoRefs,
  applySinkIdToElement,
  selectedAudioOutputIdRef
}: UseGroupCallModalTrackAttachmentParams) {
  useEffect(() => {
    const attachVideos = () => {
      gridItems.forEach(item => {
        if (item.type === 'screen-share' && item.screenShareTrack) {
          const videoEl = screenShareVideoRefs.current.get(item.peerId)
          if (!videoEl) return
          const track = item.screenShareTrack
          if (track.readyState === 'ended') return
          const stream = new MediaStream()
          stream.addTrack(track)
          const currentStream = videoEl.srcObject as MediaStream
          const currentTrack = currentStream?.getVideoTracks()[0]
          if (currentStream && currentTrack?.id === track.id && track.readyState === 'live') {
            return
          }
          videoEl.srcObject = null
          setTimeout(() => {
            if (track.readyState === 'ended') {
              return
            }
            videoEl.srcObject = stream
            videoEl.muted = true
            const playPromise = videoEl.play()
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                setTimeout(() => {
                  videoEl.play().catch(() => {})
                }, 100)
              })
            }
          }, 100)
        }
      })
    }
    attachVideos()
    const retryTimer = setTimeout(attachVideos, 150)
    return () => clearTimeout(retryTimer)
  }, [screenShareTrackIds, gridItems, isMinimized, currentPage])

  useEffect(() => {
    const attachVideos = () => {
      gridItems.forEach(item => {
        if (item.type === 'video' && item.videoTrack) {
          const videoEl = item.isLocal ? localVideoRef.current : remoteVideoRefs.current.get(item.peerId)
          if (!videoEl) return
          const isTestParticipant =
            item.peerId?.startsWith('test-participant-') ||
            item.videoTrack?.id?.startsWith('mock-') ||
            item.audioTrack?.id?.startsWith('mock-')
          if (isTestParticipant) {
            videoEl.srcObject = null
            return
          }
          const stream = new MediaStream()
          if (item.videoTrack) stream.addTrack(item.videoTrack)
          if (item.audioTrack) stream.addTrack(item.audioTrack)
          const currentStream = videoEl.srcObject as MediaStream
          const currentVideoTrack = currentStream?.getVideoTracks()[0]
          if (currentStream && currentVideoTrack?.id === item.videoTrack.id) return
          videoEl.srcObject = null
          setTimeout(() => {
            videoEl.srcObject = stream
            videoEl.muted = item.isLocal
            void applySinkIdToElement(videoEl, selectedAudioOutputIdRef.current)
            videoEl.play().catch(() => {})
          }, 10)
        }
      })
    }
    attachVideos()
    const retryTimer = setTimeout(attachVideos, 150)
    return () => clearTimeout(retryTimer)
  }, [videoTrackIds, gridItems, isMinimized, currentPage])
}
