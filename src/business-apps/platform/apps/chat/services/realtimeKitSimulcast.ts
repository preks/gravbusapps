/**
 * RealtimeKit Simulcast Configuration
 *
 * This module provides configuration for simulcast video quality layers.
 * Simulcast enables sending multiple quality streams simultaneously (high/medium/low)
 * so the SFU can forward the appropriate quality to each receiver based on network conditions.
 */

import type { VideoQuality } from './groupWebrtcClient'

/**
 * Quality to RID (Restriction Identifier) mapping for simulcast
 * RIDs should be ordered alphabetically where 'a' = highest quality
 *
 * - 'a': High quality (1280x720 @ 30fps, 2.5Mbps)
 * - 'b': Medium quality (640x360 @ 24fps, 1Mbps)
 * - 'c': Low quality (320x180 @ 15fps, 500Kbps)
 */
export const QUALITY_TO_RID: Record<VideoQuality, string> = {
  high: 'a', // Highest quality (1280x720 @ 30fps)
  medium: 'b', // Medium quality (640x480 @ 24fps)
  low: 'c' // Lowest quality (320x240 @ 15fps)
}

/**
 * Simulcast encoding configurations
 * These define the 3 quality layers that will be sent simultaneously
 *
 * The SFU automatically forwards the appropriate quality to each receiver
 * based on their bandwidth and network conditions.
 */
export const SIMULCAST_ENCODINGS: RTCRtpEncodingParameters[] = [
  { rid: 'a', scaleResolutionDownBy: 1, maxBitrate: 2500000 }, // High: 1280x720 @ 30fps
  { rid: 'b', scaleResolutionDownBy: 2, maxBitrate: 1000000 }, // Medium: 640x360 @ 24fps
  { rid: 'c', scaleResolutionDownBy: 4, maxBitrate: 500000 } // Low: 320x180 @ 15fps
]

/**
 * Get the RID (Restriction Identifier) for a given video quality
 *
 * @param quality - The desired video quality level
 * @returns The RID string ('a', 'b', or 'c')
 */
export function getRIDForQuality(quality: VideoQuality): string {
  return QUALITY_TO_RID[quality]
}

/**
 * Get the encoding configuration for a specific quality level
 *
 * @param quality - The desired video quality level
 * @returns The RTCRtpEncodingParameters for that quality, or undefined if not found
 */
export function getEncodingForQuality(quality: VideoQuality): RTCRtpEncodingParameters | undefined {
  const rid = QUALITY_TO_RID[quality]
  return SIMULCAST_ENCODINGS.find(encoding => encoding.rid === rid)
}

/**
 * Get all available quality levels in order (high to low)
 *
 * @returns Array of quality level identifiers
 */
export function getAvailableQualities(): VideoQuality[] {
  return ['high', 'medium', 'low']
}

/**
 * Validate if a quality level is valid
 *
 * @param quality - The quality level to validate
 * @returns True if the quality is valid
 */
export function isValidQuality(quality: string): quality is VideoQuality {
  return ['high', 'medium', 'low'].includes(quality)
}
