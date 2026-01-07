import React from 'react'
import { Employee, EmployeeAbsenceEntitlement } from '../hooks/useEmployeeData'
import { UserInfoProps } from '@/common/BusinessAppContext'

// Types for absence data
export interface AbsenceListCardAbsence {
  type: string // Translated type name for display
  typeId: string // Original catalog ID for grouping
  status: string // Translated status for display
  originalStatus: string // Original status from database for color mapping
  title: string
  startDate: string
  endDate: string
  duration: string
  description: string
  icon: React.ReactNode
  typeColor: string
  statusColor: string
  requestDate: string
  // Optional fields used by consumers (e.g., DailyLog calendar)
  plannedMinutes?: number
  effectiveMinutes?: number
}

export interface Entitlement {
  type: string
  typeId: string // Original catalog ID for identification
  color: string
  used: number
  total: number
  pending: number
  available: number
  icon: React.ReactNode
  checkEntitlement?: boolean
}

export interface AbsencesTabProps {
  employee: Employee
  employeeAbsenceEntitlement: EmployeeAbsenceEntitlement[]
  accessToken: string
  employeeId?: string // Optional employeeId override for permissions check
  userInfo?: UserInfoProps // Current user info for self-view check
  isSelfView?: boolean // Whether user is viewing their own profile
  shownTab?: string
}

export interface CalendarProps {
  absenceList: AbsenceListCardAbsence[]
  loading: boolean
  error: string | null
  currentDate: any
  setCurrentDate: (date: any) => void
  selectedStartDate: any
  setSelectedStartDate: (date: any) => void
  selectedEndDate: any
  setSelectedEndDate: (date: any) => void
  showToday?: boolean
  showPrevNext?: boolean
  enableSelection?: boolean
  showFooter?: boolean
  showStatusInTooltip?: boolean
  showDurationInTooltip?: boolean
  customLegend?: React.ReactNode
  holidayDates?: string[]
}

export interface AbsenceListProps {
  absenceList: AbsenceListCardAbsence[]
  loading: boolean
  error: string | null
  currentPage: number
  setCurrentPage: (page: number) => void
  pageSize: number
  setPageSize: (size: number) => void
}

export interface EntitlementsProps {
  entitlements: Entitlement[]
  loading: boolean
  error: string | null
}

export interface ChartsSectionProps {
  entitlements: Entitlement[]
  absenceList: AbsenceListCardAbsence[]
  loading: boolean
  error: string | null
}
