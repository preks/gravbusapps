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

export enum InternalCalendarType {
  SHARED = 'shared',
  SPACE = 'space'
}

export enum InternalCalendarPermission {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  FREE_BUSY = 'free_busy'
}

/** Time window for the calendar (Outlook-style scopes) */
export type CalendarTimeScope = 'day' | 'threeDay' | 'workWeek' | 'week' | 'month'

/** Time grid vs agenda list for the same date range */
export type CalendarLayout = 'calendar' | 'list'

export const DEFAULT_CALENDAR_TIME_SCOPE: CalendarTimeScope = 'workWeek'
export const DEFAULT_CALENDAR_LAYOUT: CalendarLayout = 'calendar'

const CALENDAR_TIME_SCOPE_SET = new Set<string>(['day', 'threeDay', 'workWeek', 'week', 'month'])
const CALENDAR_LAYOUT_SET = new Set<string>(['calendar', 'list'])

export function parseCalendarTimeScope(value: unknown): CalendarTimeScope | null {
  return typeof value === 'string' && CALENDAR_TIME_SCOPE_SET.has(value) ? (value as CalendarTimeScope) : null
}

export function parseCalendarLayout(value: unknown): CalendarLayout | null {
  return typeof value === 'string' && CALENDAR_LAYOUT_SET.has(value) ? (value as CalendarLayout) : null
}

/** @deprecated Use CalendarTimeScope — kept for gradual migration in chat calendar only */
export type CalendarView = CalendarTimeScope

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
  /** Resolved display color from calendar or personal preference, with legacy meeting fallback. */
  color: string
  calendarId?: string
  calendar?: {
    id: string
    name?: string
    type?: InternalCalendarType
    color?: string
  } | null
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

export interface InternalCalendarSummary {
  id: string
  name: string
  description?: string
  color: string
  defaultColor: string
  type: InternalCalendarType
  ownerId: string
  spaceId?: string
  permission: InternalCalendarPermission
  memberCount: number
  canEdit: boolean
  isOwner: boolean
  hasColorOverride: boolean
}

export interface CreateSharedCalendarData {
  name: string
  description?: string
  color?: string
}

export interface UpdateSharedCalendarData {
  name: string
  description?: string
  color?: string
}

export interface InternalCalendarMember {
  userId: string
  permission: InternalCalendarPermission
  isOwner: boolean
  displayName?: string
  firstName?: string
  lastName?: string
  email?: string
  avatarUrl?: string
}

export interface ExternalCalendarSource {
  id: string
  label: string
  provider: 'microsoft' | 'google'
}

export interface AvailabilityBusySlot {
  start: string
  end: string
  meetingId: string
}

export interface UserAvailability {
  userId: string
  busySlots: AvailabilityBusySlot[]
}

export interface AvailabilitySuggestion {
  start: string
  end: string
}

export interface AvailabilityResponse {
  availability: UserAvailability[]
  suggestions: AvailabilitySuggestion[]
}

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
  /** Whether AI transcription/recording is enabled for this meeting */
  transcriptionEnabled?: boolean
  /** Source of the event: internal meeting or external provider */
  source?: CalendarEventSource
  /** External provider event ID */
  externalId?: string
  /** Link to open the event in the external provider */
  externalLink?: string
  /** Whether this event is read-only (external events cannot be edited) */
  isReadOnly?: boolean
  /** Internal shared calendar metadata */
  calendarId?: string
  calendarName?: string
  calendarType?: InternalCalendarType
  calendarPermission?: InternalCalendarPermission
  canEdit?: boolean
  isBusyBlock?: boolean
  /** External account source for visibility toggles */
  sourceId?: string
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
  participantIds: string[]
  optionalParticipantIds?: string[]
  conversationId?: string
  calendarId?: string
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
  addParticipantIds?: string[]
  removeParticipantIds?: string[]
  conversationId?: string
  calendarId?: string
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

/** Monday 00:00 through Friday 23:59:59 of the week containing `date` */
export const getWorkWeekRange = (date: Date): DateRange => {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const dayOfWeek = start.getDay()
  const daysFromMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  start.setDate(start.getDate() + daysFromMonday)

  const end = new Date(start)
  end.setDate(start.getDate() + 4)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

/** Three consecutive days starting at `date` (local midnight) */
export const getThreeDayRange = (date: Date): DateRange => {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 2)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export const getDateRangeForTimeScope = (date: Date, scope: CalendarTimeScope): DateRange => {
  switch (scope) {
    case 'day':
      return getDayRange(date)
    case 'threeDay':
      return getThreeDayRange(date)
    case 'workWeek':
      return getWorkWeekRange(date)
    case 'week':
      return getWeekRange(date)
    case 'month':
      return getMonthRange(date)
    default:
      return getWorkWeekRange(date)
  }
}

/** Inclusive local calendar days between range start and end (midnight boundaries). */
export const getDaysInDateRange = (dateRange: DateRange): Date[] => {
  const days: Date[] = []
  const cur = new Date(dateRange.start)
  cur.setHours(0, 0, 0, 0)
  const endDay = new Date(dateRange.end)
  endDay.setHours(0, 0, 0, 0)

  while (cur.getTime() <= endDay.getTime()) {
    days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }

  return days
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
