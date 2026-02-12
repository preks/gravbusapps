// Calendar and Meeting Types

// Note: Agenda utilities are in ./utils/agendaUtils
// Import directly from there to avoid circular dependencies

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum MeetingRecurrence {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly'
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative'
}

export type CalendarView = 'day' | 'week' | 'month'

export interface MeetingParticipant {
  id: string
  meetingId: string
  userId: string
  status: InvitationStatus
  responseComment?: string
  isOrganizer: boolean
  isOptional: boolean
  notifiedAt?: string
  respondedAt?: string
  blinkTaskId?: string
  user?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    displayName?: string
    avatarUrl?: string
  }
}

export interface Meeting {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  timezone: string
  location?: string
  meetingLink?: string
  status: MeetingStatus
  recurrence: MeetingRecurrence
  recurrenceEndDate?: string
  parentMeetingId?: string
  organizerId: string
  conversationId?: string
  webrtcSessionId?: string
  transcriptionEnabled?: boolean
  reminderMinutes: number[]
  isAllDay: boolean
  color: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
  organizer?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    displayName?: string
    avatarUrl?: string
  }
  participants?: MeetingParticipant[]
}

export interface EventParticipant {
  id: string
  firstName?: string
  lastName?: string
  displayName?: string
  email: string
  avatarUrl?: string
  employeeId?: string
  status: InvitationStatus
  isOrganizer: boolean
  comment?: string
}

/** Source of the calendar event */
export type CalendarEventSource = 'internal' | 'microsoft' | 'google'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay: boolean
  color: string
  status: MeetingStatus
  participantStatus?: InvitationStatus
  isOrganizer: boolean
  organizer: {
    id: string
    firstName?: string
    lastName?: string
    displayName?: string
    email: string
    avatarUrl?: string
    employeeId?: string
  }
  participantCount: number
  acceptedCount: number
  participants?: EventParticipant[]
  meetingLink?: string
  location?: string
  conversationId?: string
  recurrence?: MeetingRecurrence
  recurrenceEndDate?: Date
  reminderMinutes?: number[]
  metadata?: Record<string, any>
  /** Source of the event: internal meeting or external provider */
  source?: CalendarEventSource
  /** External provider event ID */
  externalId?: string
  /** Link to open the event in the external provider */
  externalLink?: string
  /** Whether this event is read-only (external events cannot be edited) */
  isReadOnly?: boolean
}

export interface CreateMeetingData {
  title: string
  description?: string
  startTime: string
  endTime: string
  timezone?: string
  location?: string
  meetingLink?: string
  recurrence?: MeetingRecurrence
  recurrenceEndDate?: string
  reminderMinutes?: number[]
  isAllDay?: boolean
  color?: string
  participantIds: string[]
  optionalParticipantIds?: string[]
  conversationId?: string
  metadata?: Record<string, any>
}

export interface UpdateMeetingData {
  title?: string
  description?: string
  startTime?: string
  endTime?: string
  timezone?: string
  location?: string
  meetingLink?: string
  status?: MeetingStatus
  recurrence?: MeetingRecurrence
  recurrenceEndDate?: string
  reminderMinutes?: number[]
  isAllDay?: boolean
  color?: string
  addParticipantIds?: string[]
  removeParticipantIds?: string[]
  conversationId?: string
  metadata?: Record<string, any>
  notifyParticipants?: boolean
}

export interface InvitationResponse {
  status: InvitationStatus
  comment?: string
}

// Date range for calendar queries
export interface DateRange {
  start: Date
  end: Date
}

// Calendar navigation helpers
export const getWeekRange = (date: Date): DateRange => {
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay())
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export const getMonthRange = (date: Date): DateRange => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export const getDayRange = (date: Date): DateRange => {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)

  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

// Color presets for meetings
// Now using design system aligned colors from calendarColors utility
export { CALENDAR_COLORS as MEETING_COLORS, getCalendarColors, getDefaultCalendarColor } from './utils/calendarColors'

// Time slot intervals (in minutes)
export const TIME_SLOT_INTERVALS = [15, 30, 60]

// Default reminder options
export const REMINDER_OPTIONS = [
  { label: 'At time of event', value: 0 },
  { label: '5 minutes before', value: 5 },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 }
]
