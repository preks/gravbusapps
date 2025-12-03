export { Chat } from './Chat'
export { ChatWithCalendar } from './ChatWithCalendar'
export { ChatWithCalendar as default } from './ChatWithCalendar'
export { Calendar } from './calendar/Calendar'
export * from './calendar/types'

// Call components and types
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
