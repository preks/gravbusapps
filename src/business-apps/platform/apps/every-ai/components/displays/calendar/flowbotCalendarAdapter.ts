import type {
  CalendarEvent as FlowbotCalendarEvent,
  CalendarViewData as FlowbotCalendarViewData
} from '../../../types/models'
import {
  type CalendarEvent as ChatCalendarEvent,
  type DateRange,
  MeetingStatus,
  getDayRange,
  getDefaultCalendarColor,
  getMonthRange,
  getWeekRange
} from '../../../../chat/calendar/types'

export type FlowbotCalendarView = 'day' | 'week' | 'month'

const COLOR_MAP: Record<string, string> = {
  red: '#EF4444',
  green: '#10B981',
  blue: '#3B82F6',
  yellow: '#F59E0B',
  purple: '#8B5CF6',
  orange: '#F97316',
  pink: '#EC4899',
  gray: '#6B7280',
  black: '#111827',
  white: '#F3F4F6'
}

const DEFAULT_ORGANIZER = {
  id: 'flowbot',
  firstName: 'Flowbot',
  lastName: '',
  displayName: 'Flowbot',
  email: 'flowbot@local'
}

const parseDateTime = (dateStr: string, time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date(`${dateStr}T00:00:00`)
  date.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0)
  return date
}

const mapEventColor = (color?: string): string => {
  if (!color) return getDefaultCalendarColor()
  return COLOR_MAP[color] || getDefaultCalendarColor()
}

const toChatEvent = (event: FlowbotCalendarEvent): ChatCalendarEvent => {
  const title = event.label || event.id
  const description = event.tooltip
  const color = mapEventColor(event.color)
  const allDay = !event.duration || event.duration.type === 'allDay'

  let start = new Date(`${event.date}T00:00:00`)
  let end = new Date(`${event.date}T23:59:59`)

  if (event.duration?.type === 'time') {
    start = parseDateTime(event.date, event.duration.start)
    end = parseDateTime(event.date, event.duration.end)
    if (end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + 30 * 60 * 1000)
    }
  }

  return {
    id: event.id,
    title,
    description,
    start,
    end,
    allDay,
    color,
    status: MeetingStatus.SCHEDULED,
    isOrganizer: false,
    organizer: DEFAULT_ORGANIZER,
    participantCount: 0,
    acceptedCount: 0
  }
}

export const getFlowbotCalendarCurrentDate = (data: FlowbotCalendarViewData): Date => {
  const parsed = new Date(`${data.startDate}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return new Date()
  }
  return parsed
}

export const getFlowbotCalendarDateRange = (view: FlowbotCalendarView, currentDate: Date): DateRange => {
  switch (view) {
    case 'week':
      return getWeekRange(currentDate)
    case 'day':
      return getDayRange(currentDate)
    case 'month':
    default:
      return getMonthRange(currentDate)
  }
}

export const mapFlowbotCalendarEvents = (events: FlowbotCalendarEvent[]): ChatCalendarEvent[] => {
  return events.map(toChatEvent).sort((a, b) => a.start.getTime() - b.start.getTime())
}
