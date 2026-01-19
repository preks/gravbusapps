export interface AbsenceItem {
  id: number
  type: string
  icon: React.ReactNode
  dates: string
  description: string
  timeUntil: string
  bgColor: string
}

export interface AbsenceListCardAbsence {
  type: string
  status: string
  title: string
  startDate: string
  endDate: string
  duration: string
  description: string
  requestedInfo: string
  icon: React.ReactNode
  typeColor: string
  statusColor: string
  requestDate: string
}

export interface AbsenceListCardProps {
  absence: AbsenceListCardAbsence
}

export interface StatItem {
  daysLeft?: number
  title: string
  used: number
  total: number
  progress: number
  icon: React.ReactNode
  color: string
  textColor: string
}

export interface StatsCardProps {
  stat: StatItem
}

export interface UpcomingAbsenceCardProps {
  absence: AbsenceItem
}

export interface TeamCalendarDayProps {
  day: number
  hasEvent: boolean
  eventText?: string
}

export interface TeamCalendarProps {
  currentWeek: string
  onPreviousWeek: () => void
  onNextWeek: () => void
}
