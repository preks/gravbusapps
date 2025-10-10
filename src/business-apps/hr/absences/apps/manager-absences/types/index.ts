// Core data interfaces for manager absences

export interface EmployeeAbsence {
  id: string
  employee: {
    id: string
    lastName: string
    firstName: string
    pictureThumbnail: string
    employeePosition: {
      organizationalUnit: {
        name: string
      }
    }
  }
  type: {
    objectValue: string
    translations: {
      localeCode: string
      value: string
    }[]
    id: string
    value: string
    parentEntryId: string
    groupName?: string
  }
  startDate: string
  endDate: string
  calendarDays: number
  effectiveDays: number
  status: string
  createdAt: string
}

export interface AbsenceType {
  id: string
  value: string
  code: string
  objectValue: string
  translations: {
    localeCode: string
    value: string
  }[]
  parentEntryId: string
}

export interface AbsenceGroup {
  id: string
  value: string
  name: string
}

// Statistics interfaces
export interface AbsenceStatistics {
  pendingRequests: number
  approvedAbsences: number
  teamMembersAway: number
  upcomingAbsences: number
}

export interface StatusCard {
  title: string
  icon: React.ReactNode
  count: number
  change: {
    type: string
    text: string
  }
}

// API Response interfaces
export interface AbsenceOverviewResponse {
  allAbsencesFromToday: EmployeeAbsence[]
  membersAway: EmployeeAbsence[]
  pendingRequests: {
    aggregate: {
      sum: {
        effectiveDays: number
      }
    }
  }
  approvedAbsences: {
    aggregate: {
      sum: {
        effectiveDays: number
      }
    }
  }
}

export interface AbsenceListResponse {
  EmployeeAbsence: EmployeeAbsence[]
  EmployeeAbsenceAggregate: {
    aggregate: {
      count: number
    }
  }
}

// Query variables interfaces
export interface AbsenceQueryVariables {
  offset?: number
  limit?: number
  orgUnitId?: string
  supervisorId?: string
  page?: number
  where?: any
  orderBy?: any[]
}

// Filter interfaces
export interface AbsenceFilters {
  search: string
  statuses: string[]
  types: string[]
  groups: string[]
  employees: string[]
  startDate?: string
  endDate?: string
  creationStartDate?: string
  creationEndDate?: string
}

// Calendar interfaces
export interface TimelineEvent {
  id: string
  title: string
  start: Date
  end: Date
  color?: string
  employee?: {
    id: string
    name: string
    avatar?: string
  }
}

// Chart data interfaces
export interface ChartDataPoint {
  month: string
  [key: string]: string | number
}

export interface PieChartData {
  name: string
  value: number
  color?: string
}

// Enhanced absence interface with computed fields
export interface EnhancedAbsence extends EmployeeAbsence {
  employeeName: string
  typeName: string
  groupName: string
  originalGroupName: string
  translatedStatus: string
  dateRange: string
  duration: string
  statusBadgeVariant: string
}
