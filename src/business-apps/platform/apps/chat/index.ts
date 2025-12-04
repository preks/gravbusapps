export { Chat } from './Chat'
export { ChatWithCalendar } from './ChatWithCalendar'
export { ChatWithCalendar as default } from './ChatWithCalendar'
export { Calendar } from './calendar/Calendar'
export * from './calendar/types'

// Call components and types (1:1 calls)
export { CallModal } from './components/CallModal'
export { CallControls } from './components/CallControls'
export { IncomingCallDialog } from './components/IncomingCallDialog'
export { useCall } from './hooks/useCall'
export type {
  CallType,
  CallStatus,
  CallDirection,
  CallParticipant,
  CallState,
  CallSignal
} from './services/webrtcClient'

// Group call components and types
export { GroupCallModal } from './components/GroupCallModal'
export { IncomingGroupCallDialog } from './components/IncomingGroupCallDialog'
export { GlobalMinimizedCall, initGlobalMinimizedCallRenderer } from './components/GlobalMinimizedCall'
export { useGroupCall } from './hooks/useGroupCall'
export type {
  GroupCallParticipant,
  GroupCallState,
  VideoQuality,
  VideoQualitySettings
} from './services/groupWebrtcClient'
export { VIDEO_QUALITY_PRESETS } from './services/groupWebrtcClient'
export type { GroupCallUIState, GroupCallInvite, UseGroupCallReturn } from './hooks/useGroupCall'

// Global call manager for persistent calls
export { globalCallManager } from './services/globalCallManager'
export type { GlobalCallState } from './services/globalCallManager'
