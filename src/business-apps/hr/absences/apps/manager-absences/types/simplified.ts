// Simplified types - Preserving 100% functionality while reducing complexity

export interface SimpleAbsence {
  id: string
  employee: {
    id: string
    firstName: string
    lastName: string
    pictureThumbnail?: string // RESTORED: Critical for avatars
    employeePosition?: {
      organizationalUnit?: {
        name: string
      }
    }
  }
  groupName: string
  startDate: string
  endDate: string
  status: string
  effectiveDays: number
  calendarDays: number // RESTORED: Critical for calculations
  createdAt: string
  // Preserve all original fields for compatibility
  type?: {
    id: string
    value: string
    parentEntryId?: string
    objectValue?: string // RESTORED: Critical for icons and rich data
    translations?: {
      localeCode: string
      value: string
    }[] // RESTORED: Critical for i18n
  }
}

export interface SimpleStatistics {
  pendingRequests: number
  approvedAbsences: number
  teamMembersAway: number
  upcomingAbsences: number
  vacationCount: number
  sickLeaveCount: number
  averageDaysPerRequest: string
  approvalRate: number
  // Preserve additional fields for full functionality
  averageWorkStreak: string
  sickAbsencesByMonth: {
    month: string
    monthNumber: number | null
    count: number
  }
  plannedAbsences: number
  plannedAbsencesDays: number
  unplannedAbsences: number
  unplannedAbsencesDays: number
  absences: any[]
  yearOverYearData: any[]
}

export interface SimpleCoverage {
  id: string
  name: string
  coverage: number
  risk: 'low' | 'medium' | 'high'
  totalPeople: number
  peopleOff: number
  // Preserve additional fields for full functionality
  primaryResources: string[]
  backupResources: string[]
}

export interface SimpleColorMap {
  [key: string]: string
}

export interface SimpleColorConfig {
  id: string
  name: string
  color: string
  type: 'group' | 'type'
  parentGroupId?: string
}

// Utility type for API responses
export type ApiResponse<T> = {
  data: T[]
  totalRecords?: number
}

// Simplified filter interface - preserving all filter functionality
export interface SimpleFilters {
  search?: string
  status?: string[]
  group?: string[]
  type?: string[]
  employee?: string[]
  dateRange?: { start: string; end: string }
  creationDateRange?: { start: string; end: string }
}

// Preserve pagination functionality
export interface SimplePagination {
  currentPage: number
  pageSize: number
  total: number
  hasMore: boolean
}

// Preserve sorting functionality
export interface SimpleSorting {
  sortField: string
  sortOrder: 'ASC' | 'DESC' | ''
}
