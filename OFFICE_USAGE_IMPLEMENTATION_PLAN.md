# Office Usage & Presence - Implementation Plan

## 📋 Executive Summary

This document outlines the implementation plan for the **Office Usage & Presence** analytics feature. The feature will provide real-time and historical insights into office capacity utilization across all site locations, helping HR and facility managers optimize office space and track employee presence.

---

## 🎯 Feature Overview

### Core Functionality

1. **Usage Overview Tab**: Historical capacity vs usage analytics with trends and KPIs
2. **Who's in the Office Now Tab**: Real-time presence tracking per location
3. **Persistent Filter Bar**: Date range, granularity, location, and team filters
4. **Location Detail Drawer**: Deep-dive analytics for individual office locations

### Key Benefits

- Optimize office space allocation
- Track capacity utilization trends
- Identify peak usage patterns
- Monitor real-time office presence
- Support hybrid work planning

---

## 📊 GraphQL Schema Analysis

### 1. Site Location Schema (`nw_orgchart.site_location`)

Based on codebase analysis, the SiteLocation table structure:

```graphql
type SiteLocation {
  id: uuid!
  structureId: uuid!
  name: String!
  code: String
  description: String
  isDeleted: Boolean

  # Address information
  addressLine: jsonb
  locality: String # City
  postalCode: String
  region_ref: String # Region catalog reference
  country_ref: String! # Country catalog reference
  # Related data
  region: CatalogEntry
  country: CatalogEntry!

  # Capacity field
  desk_capacity: Int # ✅ Available in schema (column 14)
  # Relationships
  employees: [EmployeeSiteLocation!]!
  costCenters: [CostCenter!]!
}

type EmployeeSiteLocation {
  id: uuid!
  employeeId: uuid!
  siteLocationId: uuid!
  structureId: uuid!
  employee: Employee!
  siteLocation: SiteLocation!
}
```

**GraphQL Query Pattern**:

```graphql
query GetSiteLocations($structureId: uuid!) {
  SiteLocation(where: { structureId: { _eq: $structureId }, isDeleted: { _neq: true } }, orderBy: { name: ASC }) {
    id
    name
    code
    locality
    desk_capacity # ✅ Available in schema
    country {
      id
      code
      value
    }
    region {
      id
      code
      value
    }
  }
}
```

### 2. Employee Attendance Schema (`nw_employee_time.employee_attendance`)

Based on existing queries in the codebase:

```graphql
type EmployeeAttendance {
  id: uuid!
  version: Int!
  employeeId: uuid!
  attendanceDate: date!
  startTime: timestamptz
  endTime: timestamptz

  # Time tracking
  recordedTime: interval # Total time logged
  breakTime: interval # Break duration
  effectiveTime: interval # Recorded - Break
  plannedTime: interval # Expected work time
  differenceTime: interval # Effective - Planned
  # Metadata
  manualOverride: Boolean
  notes: String
  isDeleted: Boolean

  # CRITICAL FIELD: Location tracking
  attendanceLocation: String # Values: "IS_NEAR_HOME", "IS_NEAR_OFFICE", "UNKNOWN_LOCATION"
  # MISSING FIELD: Specific office location reference
  # Recommendation: Add `siteLocationId: uuid` to track which specific office
  # Current workaround: attendanceLocation only indicates "office" vs "home"
  # We'll need to cross-reference with EmployeeSiteLocation for the assigned office

  # Relationships
  employee: Employee!
}
```

**GraphQL Query Pattern for Office Usage**:

```graphql
query GetOfficeAttendance($dateFrom: date!, $dateTo: date!, $structureId: uuid!) {
  EmployeeAttendance(
    where: {
      attendanceDate: { _gte: $dateFrom, _lte: $dateTo }
      isDeleted: { _eq: false }
      attendanceLocation: { _eq: "IS_NEAR_OFFICE" } # Filter for office presence
      endTime: { _isNull: false } # Only completed attendance records
    }
    orderBy: { attendanceDate: DESC, startTime: DESC }
  ) {
    id
    employeeId
    attendanceDate
    startTime
    endTime
    effectiveTime
    attendanceLocation
    employee {
      id
      firstName
      lastName
      displayName
      businessKey
      # Get employee's assigned site location
      employeeSiteLocation(where: { structureId: { _eq: $structureId } }) {
        siteLocationId
        siteLocation {
          id
          name
          locality
        }
      }
    }
  }
}
```

**Query for Live Presence (Who's in Now)**:

```graphql
query GetCurrentOfficePresence($today: date!, $structureId: uuid!) {
  EmployeeAttendance(
    where: {
      attendanceDate: { _eq: $today }
      isDeleted: { _eq: false }
      attendanceLocation: { _eq: "IS_NEAR_OFFICE" }
      startTime: { _isNull: false }
      endTime: { _isNull: true } # Currently clocked in (no end time)
    }
    orderBy: { startTime: DESC }
  ) {
    id
    employeeId
    startTime
    attendanceLocation
    employee {
      id
      firstName
      lastName
      displayName
      businessKey
      employeeSiteLocation(where: { structureId: { _eq: $structureId } }) {
        siteLocationId
        siteLocation {
          id
          name
        }
      }
      # Optional: Get employee's job position and team
      employeePosition {
        jobPosition {
          id
          name
        }
      }
    }
  }
}
```

### 3. Schema Limitations & Recommendations

#### ⚠️ **Schema Limitations**:

1. **`SiteLocation.desk_capacity`** (Int)
   - **Status**: ✅ **AVAILABLE** - Field exists in schema as `desk_capacity`
   - **No workaround needed!**

2. **`EmployeeAttendance.siteLocationId`** (uuid)
   - **Impact**: Cannot determine which specific office employee is in
   - **Current State**: `attendanceLocation` only says "office" or "home"
   - **Workaround**:
     - Use `EmployeeSiteLocation` to get employee's assigned/home office
     - Assume employee attends their assigned office when `attendanceLocation = "IS_NEAR_OFFICE"`
     - This is 80% accurate but not perfect for employees visiting other offices
   - **Long-term**: Request schema update to add explicit siteLocationId

3. **Organizational Unit / Department linkage**
   - **Current State**: Can get org unit from `OrganizationalUnitEmployee`
   - **Status**: ✅ Available through existing relationships

---

## 🏗️ Architecture & Component Structure

### File Structure

```
src/business-apps/hr/core/apps/office-usage/
├── OfficeUsage.tsx                    # Main app component
├── index.ts                           # Exports
├── types/
│   └── index.ts                       # TypeScript interfaces
├── hooks/
│   ├── useOfficeUsageData.ts         # Main data integration hook
│   ├── useSiteLocations.ts           # Site locations with capacity
│   ├── useOfficeAttendance.ts        # Historical attendance data
│   ├── useLivePresence.ts            # Real-time presence data
│   └── useOfficeUsageFilters.ts      # Filter state management
├── queries/
│   ├── siteLocationQueries.ts        # SiteLocation GraphQL queries
│   ├── attendanceQueries.ts          # EmployeeAttendance GraphQL queries
│   └── organizationalUnitQueries.ts  # Optional: Org unit queries
├── components/
│   ├── filters/
│   │   └── OfficeUsageFilterBar.tsx  # Persistent filter bar
│   ├── usage-overview/
│   │   ├── UsageOverviewTab.tsx      # Tab 1 container
│   │   ├── UsageKPICards.tsx         # High-level KPI cards
│   │   ├── CapacityUsageChart.tsx    # Main capacity vs usage chart
│   │   ├── LocationUsageCards.tsx    # Per-location usage grid
│   │   └── LocationDetailDrawer.tsx  # Side panel for location details
│   └── live-presence/
│       ├── LivePresenceTab.tsx       # Tab 2 container
│       ├── LivePresenceFilters.tsx   # Tab-specific filters
│       ├── LocationPresenceCards.tsx # Grouped by location view
│       └── PeoplePresenceTable.tsx   # People-centric table view
├── utils/
│   ├── dateUtils.ts                  # Date range helpers
│   └── occupancyCalculations.ts      # Occupancy % calculations
└── _i18n/
    ├── en-US.ftl
    ├── de-DE.ftl
    ├── ro-RO.ftl
    └── index.ts
```

---

## 📦 TypeScript Interfaces

### Core Types (`types/index.ts`)

```typescript
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
  capacity: number // Desk/seat capacity (from desk_capacity field)
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
```

---

## 🔧 Implementation Steps

### Phase 1: Foundation & Data Layer (Days 1-2)

#### 1.1 Create GraphQL Queries

**File**: `queries/siteLocationQueries.ts`

```typescript
export const GET_SITE_LOCATIONS = `
  query GetSiteLocations($structureId: uuid!) {
    SiteLocation(
      where: { 
        structureId: { _eq: $structureId }
        isDeleted: { _neq: true }
      }
      orderBy: { name: ASC }
    ) {
      id
      name
      code
      locality
      desk_capacity
      country {
        id
        code
        value
      }
      region {
        id
        code
        value
      }
    }
  }
`
```

**File**: `queries/attendanceQueries.ts`

```typescript
export const GET_OFFICE_ATTENDANCE = `
  query GetOfficeAttendance(
    $dateFrom: date!
    $dateTo: date!
    $structureId: uuid!
  ) {
    EmployeeAttendance(
      where: {
        attendanceDate: { _gte: $dateFrom, _lte: $dateTo }
        isDeleted: { _eq: false }
        attendanceLocation: { _eq: "IS_NEAR_OFFICE" }
        endTime: { _isNull: false }
      }
      orderBy: { attendanceDate: DESC, startTime: DESC }
    ) {
      id
      employeeId
      attendanceDate
      startTime
      endTime
      effectiveTime
      employee {
        id
        firstName
        lastName
        displayName
        businessKey
        employeeSiteLocation(where: { structureId: { _eq: $structureId } }) {
          siteLocationId
          siteLocation {
            id
            name
            locality
          }
        }
        employeePosition {
          jobPosition {
            id
            name
          }
          organizationalUnitEmployee {
            organizationalUnit {
              id
              name
            }
          }
        }
      }
    }
  }
`

export const GET_LIVE_PRESENCE = `
  query GetLivePresence(
    $today: date!
    $structureId: uuid!
  ) {
    EmployeeAttendance(
      where: {
        attendanceDate: { _eq: $today }
        isDeleted: { _eq: false }
        attendanceLocation: { _eq: "IS_NEAR_OFFICE" }
        startTime: { _isNull: false }
        endTime: { _isNull: true }
      }
      orderBy: { startTime: DESC }
    ) {
      id
      employeeId
      startTime
      employee {
        id
        firstName
        lastName
        displayName
        businessKey
        pictureUrl
        employeeSiteLocation(where: { structureId: { _eq: $structureId } }) {
          siteLocationId
          siteLocation {
            id
            name
          }
        }
        employeePosition {
          jobPosition {
            name
          }
          organizationalUnitEmployee {
            organizationalUnit {
              name
            }
          }
        }
      }
    }
  }
`
```

#### 1.2 Create Data Hooks

**File**: `hooks/useSiteLocations.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_SITE_LOCATIONS } from '../queries/siteLocationQueries'
import { SiteLocationCapacity } from '../types'

export const useSiteLocations = (accessToken: string, structureId: string) => {
  const [locations, setLocations] = useState<SiteLocationCapacity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchLocations = useCallback(async () => {
    if (!accessToken || !structureId) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request(GET_SITE_LOCATIONS, { structureId })

      const locationsWithCapacity: SiteLocationCapacity[] = result.SiteLocation.map((loc: any) => ({
        siteLocationId: loc.id,
        name: loc.name,
        code: loc.code,
        locality: loc.locality,
        country: loc.country,
        region: loc.region,
        capacity: loc.desk_capacity ?? 0 // Use desk_capacity from schema
      }))

      setLocations(locationsWithCapacity)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch site locations'))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, structureId, graphqlClient])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  return { locations, isLoading, error, refetch: fetchLocations }
}
```

**File**: `hooks/useOfficeAttendance.ts`

```typescript
import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_OFFICE_ATTENDANCE } from '../queries/attendanceQueries'
import { OfficeAttendanceRecord } from '../types'

export const useOfficeAttendance = (accessToken: string, structureId: string) => {
  const [attendance, setAttendance] = useState<OfficeAttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchAttendance = useCallback(
    async (dateFrom: string, dateTo: string) => {
      if (!accessToken || !structureId) return

      setIsLoading(true)
      setError(null)

      try {
        const result = await graphqlClient.request(GET_OFFICE_ATTENDANCE, {
          dateFrom,
          dateTo,
          structureId
        })

        const records: OfficeAttendanceRecord[] = result.EmployeeAttendance.map((att: any) => ({
          id: att.id,
          employeeId: att.employeeId,
          attendanceDate: att.attendanceDate,
          startTime: att.startTime,
          endTime: att.endTime,
          effectiveTime: att.effectiveTime,
          employee: {
            id: att.employee.id,
            firstName: att.employee.firstName,
            lastName: att.employee.lastName,
            displayName: att.employee.displayName,
            businessKey: att.employee.businessKey,
            siteLocationId: att.employee.employeeSiteLocation[0]?.siteLocationId,
            siteLocationName: att.employee.employeeSiteLocation[0]?.siteLocation?.name,
            jobTitle: att.employee.employeePosition?.[0]?.jobPosition?.name,
            organizationalUnit:
              att.employee.employeePosition?.[0]?.organizationalUnitEmployee?.[0]?.organizationalUnit?.name
          },
          siteLocationId: att.employee.employeeSiteLocation[0]?.siteLocationId || 'unknown'
        }))

        setAttendance(records)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch office attendance'))
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, structureId, graphqlClient]
  )

  return { attendance, isLoading, error, fetchAttendance }
}
```

### Phase 2: Filter Bar & State Management (Day 3)

#### 2.1 Create Filter Hook

**File**: `hooks/useOfficeUsageFilters.ts`

```typescript
import { useState, useCallback } from 'react'
import dayjs from 'dayjs'
import { OfficeUsageFilters } from '../types'

export const useOfficeUsageFilters = () => {
  const [filters, setFilters] = useState<OfficeUsageFilters>({
    dateFrom: dayjs().subtract(7, 'days').format('YYYY-MM-DD'),
    dateTo: dayjs().format('YYYY-MM-DD'),
    datePreset: 'last-week',
    granularity: 'day',
    selectedLocations: [],
    selectedDepartments: []
  })

  const updateFilters = useCallback((updates: Partial<OfficeUsageFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }, [])

  const setDatePreset = useCallback((preset: OfficeUsageFilters['datePreset']) => {
    let dateFrom: string
    let dateTo: string = dayjs().format('YYYY-MM-DD')

    switch (preset) {
      case 'today':
        dateFrom = dayjs().format('YYYY-MM-DD')
        break
      case 'this-week':
        dateFrom = dayjs().startOf('week').format('YYYY-MM-DD')
        dateTo = dayjs().endOf('week').format('YYYY-MM-DD')
        break
      case 'last-week':
        dateFrom = dayjs().subtract(1, 'week').startOf('week').format('YYYY-MM-DD')
        dateTo = dayjs().subtract(1, 'week').endOf('week').format('YYYY-MM-DD')
        break
      case 'last-30-days':
        dateFrom = dayjs().subtract(30, 'days').format('YYYY-MM-DD')
        break
      default:
        return
    }

    setFilters(prev => ({ ...prev, dateFrom, dateTo, datePreset: preset }))
  }, [])

  return { filters, updateFilters, setDatePreset }
}
```

#### 2.2 Create Filter Bar Component

**File**: `components/filters/OfficeUsageFilterBar.tsx`

```typescript
import React from 'react'
import {
  Card,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DateRangePicker,
  Badge,
  Button
} from '@newwork/nw-design-system'
import { Calendar, TrendingUp, Building2, Users } from '@phosphor-icons/react'
import { OfficeUsageFilters, SiteLocationCapacity } from '../../types'
import dayjs from 'dayjs'

export interface OfficeUsageFilterBarProps {
  filters: OfficeUsageFilters
  onFiltersChange: (filters: Partial<OfficeUsageFilters>) => void
  locations: SiteLocationCapacity[]
  departments?: Array<{ id: string; name: string }>
  isLoading?: boolean
}

export const OfficeUsageFilterBar: React.FC<OfficeUsageFilterBarProps> = ({
  filters,
  onFiltersChange,
  locations,
  departments = [],
  isLoading = false
}) => {
  return (
    <Card className="gba:p-4 gba:mb-6" data-testid="office-usage-filter-bar">
      <div className="gba:flex gba:flex-wrap gba:gap-4 gba:items-center">
        {/* Date Range Picker */}
        <div className="gba:flex-1 gba:min-w-[280px]">
          <label className="gba:text-sm gba:font-medium gba:mb-2 gba:block">
            Date Range
          </label>
          <DateRangePicker
            value={{
              from: new Date(filters.dateFrom),
              to: new Date(filters.dateTo)
            }}
            onValueChange={(range) => {
              if (range?.from && range?.to) {
                onFiltersChange({
                  dateFrom: dayjs(range.from).format('YYYY-MM-DD'),
                  dateTo: dayjs(range.to).format('YYYY-MM-DD'),
                  datePreset: 'custom'
                })
              }
            }}
            presets={[
              { label: 'Today', value: 'today' },
              { label: 'This Week', value: 'this-week' },
              { label: 'Last Week', value: 'last-week' },
              { label: 'Last 30 Days', value: 'last-30-days' }
            ]}
            disabled={isLoading}
            data-testid="date-range-picker"
          />
        </div>

        {/* Granularity Toggle */}
        <div>
          <label className="gba:text-sm gba:font-medium gba:mb-2 gba:block">
            View By
          </label>
          <div className="gba:flex gba:gap-2">
            <Button
              variant={filters.granularity === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFiltersChange({ granularity: 'day' })}
              disabled={isLoading}
              data-testid="granularity-day"
            >
              Day
            </Button>
            <Button
              variant={filters.granularity === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFiltersChange({ granularity: 'week' })}
              disabled={isLoading}
              data-testid="granularity-week"
            >
              Week
            </Button>
          </div>
        </div>

        {/* Location Filter */}
        <div className="gba:min-w-[200px]">
          <label className="gba:text-sm gba:font-medium gba:mb-2 gba:block">
            <Building2 className="gba:inline gba:mr-1" size={16} />
            Locations
          </label>
          <Select
            value={filters.selectedLocations.length === 0 ? 'all' : filters.selectedLocations[0]}
            onValueChange={(value) => {
              onFiltersChange({
                selectedLocations: value === 'all' ? [] : [value]
              })
            }}
            disabled={isLoading}
          >
            <SelectTrigger data-testid="location-filter">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map(loc => (
                <SelectItem key={loc.siteLocationId} value={loc.siteLocationId}>
                  {loc.name} ({loc.locality})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Department Filter (Optional) */}
        {departments.length > 0 && (
          <div className="gba:min-w-[200px]">
            <label className="gba:text-sm gba:font-medium gba:mb-2 gba:block">
              <Users className="gba:inline gba:mr-1" size={16} />
              Department
            </label>
            <Select
              value={filters.selectedDepartments?.[0] || 'all'}
              onValueChange={(value) => {
                onFiltersChange({
                  selectedDepartments: value === 'all' ? [] : [value]
                })
              }}
              disabled={isLoading}
            >
              <SelectTrigger data-testid="department-filter">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* View Mode Indicator */}
        <div className="gba:ml-auto">
          <Badge variant="secondary">
            <TrendingUp className="gba:mr-1" size={14} />
            Office presence vs capacity
          </Badge>
        </div>
      </div>
    </Card>
  )
}
```

### Phase 3: Usage Overview Tab (Days 4-6)

#### 3.1 KPI Cards Component

**File**: `components/usage-overview/UsageKPICards.tsx`

Use `SectionKpiCards` from nw-design-system following the statistics-components-guidelines cursor rule.

#### 3.2 Capacity Usage Chart

**File**: `components/usage-overview/CapacityUsageChart.tsx`

Use `ChartContainer`, `LineChart`, `BarChart` from nw-design-system following the charts-guidelines cursor rule.

#### 3.3 Location Usage Cards with Sparklines

Use `Card` component with mini sparkline charts using `ChartContainer`.

### Phase 4: Live Presence Tab (Days 7-8)

#### 4.1 Location Presence Cards

Group employees by location with avatar lists.

#### 4.2 People-Centric Table

Use `Table` component from nw-design-system with sortable columns.

---

## 🎨 Design System Components

All components MUST use `@newwork/nw-design-system`:

### Layout Components

- `Card`, `CardHeader`, `CardTitle`, `CardContent`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Sheet`, `SheetTrigger`, `SheetContent` (for drawer)

### Input Components

- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`
- `DateRangePicker`
- `Button`
- `Badge`

### Data Display

- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`
- `Avatar`, `AvatarImage`, `AvatarFallback`
- `SectionKpiCards` (for KPIs)
- `ChartContainer`, `LineChart`, `BarChart`, `PieChart`
- `Spinner` (loading states)
- `Alert` (error states)

### Icons

- Use `@phosphor-icons/react` for all icons
- Examples: `Building2`, `Users`, `Calendar`, `TrendingUp`, `Home`, `Globe`

---

## 🔢 Calculation Logic

### Occupancy Percentage

```typescript
const calculateOccupancy = (occupied: number, capacity: number): number => {
  if (capacity === 0) return 0
  return Math.round((occupied / capacity) * 100)
}
```

### Occupancy Status (for color coding)

```typescript
type OccupancyStatus = 'low' | 'moderate' | 'high' | 'over-capacity'

const getOccupancyStatus = (percentage: number): OccupancyStatus => {
  if (percentage < 60) return 'low'
  if (percentage < 80) return 'moderate'
  if (percentage <= 100) return 'high'
  return 'over-capacity'
}

const getOccupancyColor = (status: OccupancyStatus): string => {
  switch (status) {
    case 'low':
      return 'gba:text-muted-foreground'
    case 'moderate':
      return 'gba:text-info'
    case 'high':
      return 'gba:text-warning'
    case 'over-capacity':
      return 'gba:text-destructive'
  }
}
```

---

## 📝 i18n Translation Keys

Create keys in `_i18n/en-US.ftl`:

```fluent
# Page Title
office-usage-title = Office Usage & Presence
office-usage-subtitle = Monitor office capacity and real-time employee presence

# Tabs
usage-overview-tab = Usage Overview
live-presence-tab = Who's in the Office Now

# Filters
filter-date-range = Date Range
filter-granularity = View By
filter-granularity-day = Day
filter-granularity-week = Week
filter-locations = Locations
filter-departments = Departments
filter-all-locations = All Locations
filter-all-departments = All Departments

# KPIs
kpi-avg-occupancy = Average Occupancy
kpi-avg-occupancy-desc = Average across all locations
kpi-peak-occupancy = Peak Occupancy
kpi-peak-occupancy-desc = Highest usage recorded
kpi-most-used-location = Most Used Location
kpi-total-office-days = Total Office Days
kpi-total-office-days-desc = Total attendance records

# Usage Overview
usage-capacity-vs-usage = Capacity vs Usage
usage-per-location = Per-Location Usage
usage-no-data = No office usage data for selected period
usage-location-details = Location Details

# Live Presence
presence-as-of-now = As of now
presence-refresh = Refresh
presence-in-office-now = In Office Now
presence-working-from-home = Working From Home
presence-grouped-by-location = Grouped by Location
presence-people-list = People List
presence-no-one-in-office = No one currently in office

# Occupancy Status
occupancy-status-low = Low Utilization
occupancy-status-moderate = Moderate
occupancy-status-high = High Usage
occupancy-status-over = Over Capacity

# Empty States
empty-no-capacity = No capacity defined for this location
empty-no-capacity-desc = Add capacity in settings to see usage statistics
empty-no-data = No data available
empty-no-data-desc = Try adjusting your filters or date range

# Errors
error-loading-data = Error loading office usage data
error-loading-locations = Failed to load office locations
error-loading-attendance = Failed to load attendance data
error-try-again = Try again
```

---

## ✅ Acceptance Criteria Checklist

### Filter Bar

- [ ] Date range picker with presets (Today, This week, Last week, Last 30 days, Custom)
- [ ] Granularity toggle (Day/Week)
- [ ] Location multi-select dropdown
- [ ] Department filter (optional)
- [ ] Filters persist across tab switches
- [ ] Filters update URL query parameters (for bookmarking)

### Usage Overview Tab

- [ ] 4 KPI cards: Avg occupancy, Peak day, Most used location, Total office days
- [ ] Main chart showing capacity vs usage over time
- [ ] Chart supports both day and week granularity
- [ ] Chart allows toggling between all locations and individual locations
- [ ] Hover tooltips show detailed breakdown
- [ ] Per-location usage cards grid
- [ ] Each location card shows: name, capacity, avg occupancy, peak occupancy, sparkline
- [ ] Clicking location card opens detail drawer
- [ ] Drawer shows: location details, trend chart, day-by-day table
- [ ] Over-capacity indicators (visual warnings)

### Live Presence Tab

- [ ] Reference time indicator with refresh button
- [ ] Location selector pills
- [ ] Status filter (In office / Working from home)
- [ ] Location presence cards showing people currently in each office
- [ ] Avatar lists with employee names, roles, time windows
- [ ] View toggle: Grouped by location / People list
- [ ] People list table with sortable columns
- [ ] Empty state when no one in office
- [ ] Real-time data (or manual refresh)

### General Requirements

- [ ] All components use nw-design-system components
- [ ] No hardcoded values (use configuration/database)
- [ ] Loading states for all data fetches
- [ ] Error states with retry buttons
- [ ] Empty states with helpful messages
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Color coding for occupancy levels
- [ ] Icons for visual hierarchy
- [ ] Tooltips for additional context
- [ ] Data-testid attributes for all interactive elements
- [ ] i18n support (en-US, de-DE, ro-RO)

---

## 🚀 Next Steps

1. **Schema Updates** (External - coordinate with backend team):
   - ✅ `desk_capacity: Int` field already exists in `SiteLocation` table
   - ⚠️ Add `siteLocationId: uuid` field to `EmployeeAttendance` table (for specific office tracking)
   - Create migration script for EmployeeAttendance update

2. **Capacity Management UI** (Future enhancement):
   - Settings page to update desk_capacity values
   - Bulk import/export for capacity data
   - Historical capacity tracking (for capacity changes over time)
   - Validation rules (capacity > 0, reasonable limits)

3. **Advanced Features** (Future):
   - Predictive analytics for capacity planning
   - Desk booking integration
   - Meeting room utilization
   - Department-level analytics
   - Export to CSV/Excel functionality
   - Email notifications for over-capacity alerts
   - Mobile app support

---

## 📚 References

- **Cursor Rules**:
  - `newwork-gravity-business-apps`
  - `statistics-components-guidelines`
  - `charts-guidelines`
  - `data-testid-guidelines`
  - `develop-component-styling`
  - `graphql-integration`
  - `cross-repository-dependencies`

- **Existing Patterns**:
  - `src/business-apps/fin/expenses/apps/backoffice-expenses/components/tabs/expense-dashboard-tab/`
  - `src/business-apps/hr/core/apps/human-resources/components/views/analytics-view/`
  - `src/business-apps/ser/apps/service-desk/components/dashboard/`

- **Component Library**:
  - `@newwork/nw-design-system` documentation
  - PhosphorIcons: https://phosphoricons.com/

---

**Document Version**: 1.0  
**Last Updated**: December 9, 2025  
**Author**: AI Assistant (Claude Sonnet 4.5)  
**Status**: Ready for Implementation
