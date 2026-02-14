/**
 * Attach screen-share and video tracks to DOM elements in the grid (effects only).
 */

import { useEffect } from 'react'
import { rtkDebug } from '../../utils/rtkDebug'

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

export function useGroupCallModalTrackAttachment(
  gridItems: GridItem[],
  currentPage: number,
  isMinimized: boolean,
  screenShareTrackIds: string,
  videoTrackIds: string,
  localVideoRef: React.RefObject<HTMLVideoElement | null>,
  remoteVideoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>,
  screenShareVideoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>,
  applySinkIdToElement: (el: HTMLMediaElement | null, deviceId: string | null) => Promise<void>,
  selectedAudioOutputIdRef: React.MutableRefObject<string | null>
) {
  useEffect(() => {
    const attachVideos = () => {
      gridItems.forEach(item => {
        if (item.type === 'screen-share' && item.screenShareTrack) {
          const videoEl = screenShareVideoRefs.current.get(item.peerId)
          if (!videoEl) {
            rtkDebug.warn(`[RTK Modal] ⚠️ No video element found for screen share ${item.peerId}`)
            return
          }
          const track = item.screenShareTrack!
          if (track.readyState === 'ended') {
            rtkDebug.warn(`[RTK Modal] Screen share track ${track.id} has ended`)
            return
          }
          const stream = new MediaStream()
          stream.addTrack(track)
          const currentStream = videoEl.srcObject as MediaStream
          const currentTrack = currentStream?.getVideoTracks()[0]
          if (currentStream && currentTrack?.id === track.id && track.readyState === 'live') {
            rtkDebug.log(`[RTK Modal] Screen share track already attached and live for ${item.peerId}`)
            return
          }
          if (!currentStream) {
            rtkDebug.log(`[RTK Modal] 📺 No current stream - re-attaching after Dialog remount`)
          }
          rtkDebug.log(`[RTK Modal] 📺 Attaching screen share track:`, {
            peerId: item.peerId,
            peerName: item.peerName,
            trackId: track.id,
            trackLabel: track.label,
            trackReadyState: track.readyState
          })
          videoEl.srcObject = null
          setTimeout(() => {
            if (track.readyState === 'ended') {
              rtkDebug.error(`[RTK Modal] Track ended before attachment for ${item.peerId}`)
              return
            }
            videoEl.srcObject = stream
            videoEl.muted = true
            const playPromise = videoEl.play()
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  rtkDebug.log(`[RTK Modal] ✅ Screen share playing for ${item.peerId}`, {
                    videoWidth: videoEl.videoWidth,
                    videoHeight: videoEl.videoHeight,
                    currentTime: videoEl.currentTime
                  })
                })
                .catch(err => {
                  rtkDebug.warn(`[RTK Modal] ⚠️ Could not auto-play screen share ${item.peerId}:`, err)
                  setTimeout(() => {
                    videoEl.play().catch(e => rtkDebug.error('[RTK Modal] Retry play failed:', e))
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
          if (!videoEl) {
            if (!isMinimized) {
              rtkDebug.warn(`[RTK Modal] ⚠️ No video element found for ${item.isLocal ? 'local' : item.peerId}`)
            }
            return
          }
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
          if (!currentStream) {
            rtkDebug.log(
              `[RTK Modal] 📹 Re-attaching video after Dialog remount for ${item.isLocal ? 'local' : item.peerId}`
            )
          }
          videoEl.srcObject = null
          setTimeout(() => {
            videoEl.srcObject = stream
            videoEl.muted = item.isLocal
            void applySinkIdToElement(videoEl, selectedAudioOutputIdRef.current)
            videoEl.play().catch(err => rtkDebug.warn(`[RTK Modal] Could not auto-play video ${item.peerId}:`, err))
          }, 10)
        }
      })
    }
    attachVideos()
    const retryTimer = setTimeout(attachVideos, 150)
    return () => clearTimeout(retryTimer)
  }, [videoTrackIds, gridItems, isMinimized, currentPage])
}
