import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// ========================================
// SITE LOCATION TYPES
// ========================================

export interface SiteLocationCapacity {
  siteLocationId: string
  name: string
  code?: string
  locality?: string
  country?: {
    code: string
    value: string
  }
  region?: {
    code: string
    value: string
  }
  capacity: number // Desk/seat capacity from desk_capacity field
}

// ========================================
// ATTENDANCE TYPES
// ========================================

export interface OfficeAttendanceRecord {
  id: string
  employeeId: string
  employee: {
    id: string
    firstName: string
    lastName: string
    displayName: string
    businessKey: string
    siteLocationId?: string // From EmployeeSiteLocation
    siteLocationName?: string
    jobTitle?: string
    organizationalUnit?: string
  }
  attendanceDate: string
  startTime: string
  endTime?: string
  effectiveTime?: string
  siteLocationId: string // Derived from EmployeeSiteLocation
}

export interface LivePresenceRecord {
  id: string
  employeeId: string
  employee: {
    id: string
    firstName: string
    lastName: string
    displayName: string
    businessKey: string
    jobTitle?: string
    organizationalUnit?: string
    pictureUrl?: string
  }
  siteLocationId: string
  siteLocationName: string
  startTime: string
  expectedEndTime?: string // Calculated from planned hours
}

// ========================================
// ANALYTICS TYPES
// ========================================

export interface DailyOccupancy {
  date: string // YYYY-MM-DD
  siteLocationId: string
  siteLocationName: string
  capacity: number
  occupied: number // Number of people in office that day
  occupancyPercentage: number // (occupied / capacity) * 100
  overCapacity: boolean // occupied > capacity
}

export interface WeeklyOccupancy {
  week: string // YYYY-Www (e.g., 2025-W48)
  siteLocationId: string
  siteLocationName: string
  capacity: number
  averageOccupied: number
  averageOccupancyPercentage: number
  peakOccupied: number
  peakOccupancyPercentage: number
}

export interface LocationUsageStats {
  siteLocationId: string
  siteLocationName: string
  capacity: number

  // Aggregated stats for selected period
  averageOccupancy: number // %
  peakOccupancy: number // %
  peakDate: string
  totalOfficeDays: number // Sum of all attendance records
  overCapacityDays: number // Days where occupied > capacity

  // Sparkline data for trend
  dailyOccupancyTrend: Array<{
    date: string
    occupancyPercentage: number
  }>
}

// ========================================
// FILTER TYPES
// ========================================

export interface OfficeUsageFilters {
  // Date range
  dateFrom: string // YYYY-MM-DD
  dateTo: string
  datePreset?: 'today' | 'this-week' | 'last-week' | 'last-30-days' | 'custom'

  // Granularity
  granularity: 'day' | 'week'

  // Location filter
  selectedLocations: string[] // Site location IDs (empty = all)

  // Team/Department filter (optional)
  selectedDepartments?: string[] // Org unit IDs
}

// ========================================
// KPI TYPES
// ========================================

export interface OfficeUsageKPIs {
  averageOccupancy: number // % across all locations
  peakOccupancy: {
    percentage: number
    date: string
    dayOfWeek: string
  }
  mostUsedLocation: {
    siteLocationId: string
    name: string
    averageOccupancy: number
    capacity: number
  }
  totalOfficeDays: number // Sum of all office attendance records
}

// ========================================
// COMPONENT PROPS
// ========================================

export interface OfficeUsageProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export interface UsageOverviewTabProps extends BusinessAppContextProps {
  filters: OfficeUsageFilters
  onFiltersChange: (filters: Partial<OfficeUsageFilters>) => void
  prefixDataTestId?: string
}

export interface LivePresenceTabProps extends BusinessAppContextProps {
  filters: OfficeUsageFilters
  prefixDataTestId?: string
}

export interface LocationDetailDrawerProps {
  open: boolean
  onClose: () => void
  location: LocationUsageStats
  filters: OfficeUsageFilters
  accessToken: string
  prefixDataTestId?: string
}
