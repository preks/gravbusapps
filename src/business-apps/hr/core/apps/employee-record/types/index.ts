// Types for smart booking
export interface TeamAllocation {
  teamId: string
  teamName: string
  percentage: number
  projectId?: string
  projectName?: string
  assignedAt?: string // ISO date string - when employee was assigned to this team/project
}

export interface DayHours {
  date: string // ISO date string
  hours: number // Hours worked on this day for this team/project
}

export interface WeekBooking {
  teamId: string
  teamName: string
  percentage: number
  projectId?: string
  projectName?: string
  assignedAt?: string // ISO date string - when employee was assigned to this team/project
  days: DayHours[] // 7 days of the week
}

export interface WeekData {
  weekStart: string // ISO date string for Monday
  weekEnd: string // ISO date string for Sunday
  bookings: WeekBooking[]
}
