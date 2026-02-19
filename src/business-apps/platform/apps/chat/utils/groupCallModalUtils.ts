/**
 * Pure helpers for GroupCallModalRtk: device detection, screen share track resolution, aspect ratio, and stable no-op.
 */

import { isVideoTrackScreenShare, extractTracksFromCollection } from './callUtils'

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
    if (videoTrack) return videoTrack
    const firstLiveTrack = screenShareTracks.find(t => t.readyState === 'live')
    if (firstLiveTrack) return firstLiveTrack
  }

  if (peer.videoTrack && isVideoTrackScreenShare(peer.videoTrack) && peer.videoTrack.readyState === 'live') {
    return peer.videoTrack
  }

  return null
}

/** Aspect ratio for video tiles: always 16:9 so the tile (tail) matches typical video and stays consistent. */
export function getOptimalAspectRatio(): string {
  return '16/9'
}

/** Stable empty function for missing callbacks. */
export const NOOP = () => {}

/** Build a MediaStream from a RealtimeKit peer's audio/video tracks. */
export function buildStreamFromPeer(
  peer: { audioTrack?: MediaStreamTrack; videoTrack?: MediaStreamTrack } | null
): MediaStream | null {
  if (!peer) return null
  const stream = new MediaStream()
  if (peer.audioTrack) stream.addTrack(peer.audioTrack)
  if (peer.videoTrack) stream.addTrack(peer.videoTrack)
  return stream.getTracks().length > 0 ? stream : null
}
