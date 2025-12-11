import React from 'react'
import { ActivityViewFilter } from '../../../types'

export interface EmployeeInfo {
  id: string
  displayName?: string
  firstName?: string
  lastName?: string
  pictureThumbnail?: string
  employeePosition?: {
    jobPosition?: { name: string }
    organizationalUnit?: { name: string }
  }
}

export interface AbsenceInfo {
  totalDays: number
  isCurrentlyOnLeave: boolean
  absenceType?: string
  startDate?: string
  endDate?: string
}

export interface EmployeePerformance {
  employee: EmployeeInfo
  activitiesLast30Days: number
  activitiesPrev30Days: number
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
  avgPerWorkingDay: number
  absence?: AbsenceInfo
  // Additional flags for attention reasons
  isInactive?: boolean // Zero activities in last 30 days but was active before
  daysSinceLastActivity?: number // Days since last activity logged
  attentionReason?: 'declining' | 'inactive' | 'zero_this_period'
}

export interface ActivityStats {
  total: number
  today: number
  thisWeek: number
  last30Days: number
  prev30Days: number
  thisQuarter: number
  lastQuarter: number
  byAccount: number
  byContact: number
  byLead: number
  byOpportunity: number
  activeEmployees: number
  rollingTrend: number
  quarterTrend: number
}

export interface ViewOption {
  id: ActivityViewFilter
  title: string
  subtitle: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  count?: number
}

export interface EmployeeCardProps {
  emp: EmployeePerformance
  showTrend?: boolean
  showAbsence?: boolean
  onClick: (emp: EmployeePerformance) => void
}

export interface AIInsightsSectionProps {
  stats: ActivityStats | null
  topPerformers: EmployeePerformance[]
  underperformers: EmployeePerformance[]
  onLeave: EmployeePerformance[]
  loading: boolean
  onEmployeeClick: (emp: EmployeePerformance) => void
}

export interface ViewOptionsGridProps {
  options: ViewOption[]
  loading: boolean
  onSelect: (filter: ActivityViewFilter) => void
}
