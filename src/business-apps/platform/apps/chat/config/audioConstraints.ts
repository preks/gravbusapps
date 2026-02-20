/**
 * Centralized Audio Constraint Configuration
 *
 * This file defines the standard audio constraints for all call implementations
 * (WebRTC, RealtimeKit, microphone tests, etc.)
 *
 * WHY THESE SETTINGS:
 * - echoCancellation: true - Prevents feedback loops and echo, essential for calls
 * - autoGainControl: true - CRITICAL for volume normalization (fixes low audio issues)
 * - noiseSuppression: true - Browser built-in noise suppression (RNNoise can be used on top if enabled)
 *
 * IMPORTANT: All audio constraint objects in the chat module should use these
 * functions to ensure consistency across all implementations.
 *
 * HISTORY:
 * - Previously, constraints were scattered across 6+ files with inconsistent values
 * - This caused low audio volume issues because AGC was disabled in some places
 * - Centralized config ensures consistency and prevents similar bugs
 */

/**
 * Default audio constraints used for all call audio
 */
export const DEFAULT_AUDIO_CONSTRAINTS = {
  echoCancellation: true, // Prevents feedback and echo
  autoGainControl: true, // Normalizes microphone volume automatically
  noiseSuppression: true // Browser built-in; RNNoise can be enabled on top
} as const

/**
 * Get audio constraints with optional overrides
 *
 * Use this for all getUserMedia() and applyConstraints() calls to ensure
 * consistent audio processing across the application.
 *
 * @param overrides - Additional or overriding MediaTrackConstraints
 * @returns Complete audio constraints object
 *
 * @example
 * // Basic usage:
 * audio: getAudioConstraints()
 *
 * @example
 * // With device selection:
 * audio: getAudioConstraints({ deviceId: { exact: deviceId } })
 *
 * @example
 * // Toggle specific constraint:
 * await track.applyConstraints(getAudioConstraints({ autoGainControl: false }))
 *
 * @example
 * // Multiple overrides:
 * audio: getAudioConstraints({
 *   deviceId: { exact: deviceId },
 *   sampleRate: 48000
 * })
 */
export function getAudioConstraints(overrides?: Partial<MediaTrackConstraints>): MediaTrackConstraints {
  return {
    ...DEFAULT_AUDIO_CONSTRAINTS,
    ...overrides
  }
}

/**
 * Raw audio constraints with NO processing
 *
 * Use ONLY for debugging/testing hardware issues or when you need
 * completely unprocessed audio.
 *
 * WARNING: Do not use in production calls - will cause echo and volume issues!
 */
export const RAW_AUDIO_CONSTRAINTS = {
  echoCancellation: false,
  autoGainControl: false,
  noiseSuppression: false
} as const
