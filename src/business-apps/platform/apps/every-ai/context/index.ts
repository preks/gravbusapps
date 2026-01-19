/**
 * Context exports for EveryAI
 */

import SpeechModeProvider from './SpeechModeContext'
import useSpeechMode from './SpeechModeContext'

// Re-export as named exports
export { SpeechModeProvider, useSpeechMode }

export type { SpeechModeSettings, SpeechModeContextValue } from './SpeechModeContext'

// Default export for wrapper compatibility
export default {
  SpeechModeProvider,
  useSpeechMode
}
