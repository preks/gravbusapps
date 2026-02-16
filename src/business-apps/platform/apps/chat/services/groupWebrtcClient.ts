/**
 * Shared group call types for RTK and compatibility.
 * Mesh GroupWebRTC implementation removed; types and presets retained for Realtime Kit usage.
 */

import type { CallParticipant } from './webrtcClient'

export type VideoQuality = 'high' | 'medium' | 'low'

export interface VideoQualitySettings {
  width: number
  height: number
  frameRate: number
  bitrate: number
}

export const VIDEO_QUALITY_PRESETS: Record<VideoQuality, VideoQualitySettings> = {
  high: { width: 1280, height: 720, frameRate: 30, bitrate: 2500000 },
  medium: { width: 640, height: 480, frameRate: 24, bitrate: 1000000 },
  low: { width: 320, height: 240, frameRate: 15, bitrate: 500000 }
}

export interface GroupCallParticipant extends CallParticipant {
  peerConnection?: RTCPeerConnection
  stream?: MediaStream
  connectionState?: RTCPeerConnectionState
}
