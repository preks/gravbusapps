/**
 * Pure helpers for GroupCallModalRtk: device detection, screen share track resolution, aspect ratio, and stable no-op.
 */

import { isVideoTrackScreenShare, extractTracksFromCollection } from './callUtils'
import { rtkDebug } from './rtkDebug'

/** Skip setSinkId on mobile to avoid breaking playback (unsupported or invalid saved device IDs). */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/** Get screen share track from a RealtimeKit peer; prefers video track when SDK returns both video and audio. */
export function getScreenShareTrack(peer: any): MediaStreamTrack | null {
  const screenShareTracks = extractTracksFromCollection(peer.screenShareTracks)
  if (screenShareTracks.length > 0) {
    const videoTrack = screenShareTracks.find(t => t.kind === 'video' && t.readyState === 'live')
    if (videoTrack) {
      rtkDebug.log(`[RTK Modal] Found live VIDEO screen share track for peer ${peer.name || peer.id}:`, {
        trackId: videoTrack.id,
        trackLabel: videoTrack.label,
        trackKind: videoTrack.kind,
        readyState: videoTrack.readyState,
        totalTracks: screenShareTracks.length,
        allTrackKinds: screenShareTracks.map(t => t.kind)
      })
      return videoTrack
    }
    const firstLiveTrack = screenShareTracks.find(t => t.readyState === 'live')
    if (firstLiveTrack) {
      rtkDebug.warn(
        `[RTK Modal] ⚠️ No live video track in screenShareTracks for peer ${peer.name || peer.id}, using first live:`,
        {
          firstTrackKind: firstLiveTrack.kind,
          allTracks: screenShareTracks.map(t => ({ id: t.id, kind: t.kind, label: t.label, readyState: t.readyState }))
        }
      )
      return firstLiveTrack
    }
    rtkDebug.warn(`[RTK Modal] ⚠️ All screen share tracks ended for peer ${peer.name || peer.id}`)
  }

  if (peer.videoTrack && isVideoTrackScreenShare(peer.videoTrack) && peer.videoTrack.readyState === 'live') {
    rtkDebug.log(`[RTK Modal] Found live screen share track in videoTrack for peer ${peer.name || peer.id}:`, {
      trackId: peer.videoTrack.id,
      trackLabel: peer.videoTrack.label,
      trackKind: peer.videoTrack.kind,
      readyState: peer.videoTrack.readyState
    })
    return peer.videoTrack
  }

  if (peer.screenShareEnabled) {
    rtkDebug.warn(`[RTK Modal] Peer ${peer.name || peer.id} has screenShareEnabled=true but no track found:`, {
      screenShareEnabled: peer.screenShareEnabled,
      screenShareTracks: peer.screenShareTracks,
      screenShareTracksType: typeof peer.screenShareTracks,
      videoTrack: peer.videoTrack
        ? {
            id: peer.videoTrack.id,
            label: peer.videoTrack.label,
            isScreenShare: isVideoTrackScreenShare(peer.videoTrack)
          }
        : null
    })
  }

  return null
}

/** Optimal aspect ratio for video tiles from screen width, participant count, screen share, and sidebar. */
export function getOptimalAspectRatio(
  screenWidth: number,
  participantCount: number,
  isScreenShare: boolean,
  hasSidebar: boolean
): string {
  if (isScreenShare) return '16/9'
  if (screenWidth < 768) return '4/3'
  if (screenWidth < 1024) {
    if (hasSidebar || participantCount > 4) return '4/3'
    return '16/9'
  }
  if (hasSidebar) return participantCount <= 2 ? '4/3' : '16/9'
  return '16/9'
}

/** Stable empty function for missing callbacks. */
export const NOOP = () => {}
