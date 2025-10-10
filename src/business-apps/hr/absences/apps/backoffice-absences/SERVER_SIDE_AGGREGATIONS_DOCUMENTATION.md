# Server-Side Aggregations Documentation

## Backoffice Absences Dashboard

This documentation outlines the exact data requirements for UI components and the server-side aggregation implementation strategy.

## UI Component Data Requirements Analysis

### 1. Main DashboardData Interface (types/index.ts)

The central `DashboardData` interface that ALL UI components expect:

```typescript
interface DashboardData {
  // ✅ CORE METRICS - Used by OptimizedKPISection widgets
  totalAbsences: number // Total count of absences
  pendingAbsences: number // Count with status = 'PENDING'
  approvedAbsences: number // Count with status = 'APPROVED'
  rejectedAbsences: number // Count with status = 'REJECTED'
  averageDuration: number // Average effectiveDays per absence
  approvalRate: number // (approved / total) * 100

  // ✅ VACATION METRICS - Used by entitlements cards
  averageVacationDays: number // Average total entitlement per employee
  averageUsed: number // Average used days per employee
  averagePending: number // Average pending days per employee
  totalVacationLiability: number // Total remaining vacation days across all employees

  // ✅ DEPARTMENT STATISTICS - Used by bar chart in OptimizedKPISection
  departmentStats: Array<{
    name: string // Department name or "No Department"
    totalDays: number // Sum of effectiveDays for this department
    uniqueEmployees: number // Count of unique employees in department
    avgDaysPerEmployee: number // totalDays / uniqueEmployees
    avgRequestsPerEmployee: number // totalRequests / uniqueEmployees
    totalRequests: number // Count of absences for this department
  }>

  // ✅ MONTHLY TRENDS - Used by OptimizedAbsenceTrends chart
  monthlyData: Array<{
    month: string // "Jan", "Feb", "Dec 2024" (includes year if multiple years)
    total: number // CRITICAL: Chart expects 'total', not 'totalRequests'
    uniqueEmployees: number // Count of unique employees this month
    avgRequestsPerEmployee: number // total / uniqueEmployees
    avgDurationPerRequest: number // totalDuration / total
    totalDuration: number // Sum of effectiveDays this month
    typeBreakdown: Record<string, number> // { "Vacation": 5, "Sick Leave": 3 }
  }>

  // ✅ RAW DATA - Used by AbsenceDetails for drill-downs
  rawAbsences: Array<any> // Full absence records for filtering

  // ✅ STATUS BREAKDOWN - Used by pie chart in OptimizedKPISection
  statusBreakdown: Array<{
    status: string // 'APPROVED', 'PENDING', 'REJECTED'
    totalDays: number // Sum of effectiveDays for this status
    count: number // Count of absences with this status
    percentage: number // (count / totalAbsences) * 100
  }>

  // ✅ TYPE BREAKDOWN - Used for additional analytics
  typeBreakdown: Array<{
    type: string // Absence type name
    totalDays: number // Sum of effectiveDays for this type
    count: number // Count of absences of this type
  }>

  // ✅ ENTITLEMENTS - Used by vacation analytics cards
  entitlements: {
    averageVacationPerEmployee: number // Same as averageVacationDays
    totalActiveEmployees: number // Count of employees with entitlements
    averageAvailable: number // Average available days per employee
    averageUsed: number // Average used days per employee
    totalVacationLiability: number // Same as totalVacationLiability
  }

  // ✅ LOADING STATES
  isLoading: boolean
  error: string | null
}
```

### 2. GraphQL Aggregation Capabilities (from MCP analysis)

The GraphQL schema supports full aggregations:

#### EmployeeAbsenceAggregate

- `aggregate.count` - Total count
- `aggregate.sum.effectiveDays` - Sum of effective days
- `aggregate.sum.calendarDays` - Sum of calendar days
- `aggregate.sum.workingDays` - Sum of working days
- `aggregate.avg.effectiveDays` - Average effective days
- `nodes` - Access to individual records for complex calculations

#### EmployeeAbsenceEntitlementAggregate

- `aggregate.count` - Total entitlements count
- `aggregate.sum.total` - Sum of total entitlement days
- `aggregate.sum.approved` - Sum of approved/used days
- `aggregate.sum.pending` - Sum of pending days
- `aggregate.avg.total` - Average entitlement per employee
- `nodes` - Access to individual entitlements

### 3. Component Usage Patterns

#### OptimizedKPISection.tsx

```typescript
// EXPECTS from dashboardData:
const {
  totalAbsences, // Widget: "Total Absences"
  pendingAbsences, // Widget: "Pending Review"
  averageDuration, // Widget: "Avg Duration" + " days"
  approvalRate, // Widget: "Approval Rate" + "%"
  departmentStats, // Bar Chart: department.name vs department.totalDays
  statusBreakdown, // Pie Chart: status.status with status.count (NOT days)
  entitlements // Vacation cards: averageVacationPerEmployee, totalActiveEmployees, etc.
} = dashboardData
```

#### OptimizedAbsenceTrends.tsx

```typescript
// EXPECTS from dashboardData:
const { monthlyData } = dashboardData

// monthlyData MUST have:
// - month: string (display name)
// - total: number (CRITICAL - chart uses this field name)
// - uniqueEmployees: number (for tooltip)
// - avgRequestsPerEmployee: number (trend line)
// - avgDurationPerRequest: number (tooltip)
// - totalDuration: number (tooltip)
// - typeBreakdown: Record<string, number> (stacked bars by type)
```

### 4. Critical Naming Mismatches

❌ **BREAKING ISSUES FOUND:**

1. **Chart Field Names**: OptimizedAbsenceTrends expects `monthlyData[].total` but utils generate `totalRequests`
2. **Interface Duplication**: DashboardData has duplicate `entitlements` property
3. **Missing Functions**: `processServerSideAggregations` referenced but doesn't exist
4. **Field Mismatches**: UI expects `averageDuration` but current code uses `avgDuration`

## Server-Side Aggregation Strategy

### Phase 1: Core KPIs (Single GraphQL Query)

```graphql
query GetDashboardKPIs($where: EmployeeAbsenceBoolExp!) {
  # Total absence metrics
  totalAbsences: EmployeeAbsenceAggregate(where: $where) {
    aggregate {
      count
      sum {
        effectiveDays
        calendarDays
        workingDays
      }
      avg {
        effectiveDays
      }
    }
  }

  # Status-specific aggregations
  approvedAbsences: EmployeeAbsenceAggregate(where: { _and: [$where, { status: { _eq: "APPROVED" } }] }) {
    aggregate {
      count
      sum {
        effectiveDays
      }
    }
  }

  pendingAbsences: EmployeeAbsenceAggregate(where: { _and: [$where, { status: { _eq: "PENDING" } }] }) {
    aggregate {
      count
      sum {
        effectiveDays
      }
    }
  }

  rejectedAbsences: EmployeeAbsenceAggregate(where: { _and: [$where, { status: { _eq: "REJECTED" } }] }) {
    aggregate {
      count
      sum {
        effectiveDays
      }
    }
  }
}
```

### Phase 2: Vacation Entitlements (Separate Query)

```graphql
query GetVacationEntitlements($where: EmployeeAbsenceEntitlementBoolExp!) {
  vacationEntitlements: EmployeeAbsenceEntitlementAggregate(where: $where) {
    aggregate {
      count
      sum {
        total
        approved
        pending
      }
      avg {
        total
        approved
        pending
      }
    }
  }
}
```

### Phase 3: Department & Monthly Data (Hybrid Approach)

- Use `EmployeeAbsenceAggregate` with `nodes` to get raw data
- Apply client-side grouping using existing `groupAbsencesByDepartment` and `groupAbsencesByMonth` utilities
- This preserves complex business logic while leveraging server performance

## Implementation Requirements

### 1. Fix ServerSideAggregationQueries.ts

- Create working GraphQL queries using proper `*Aggregate` syntax
- Remove complex `JSON.stringify` approach that caused syntax errors
- Use simple, clean GraphQL query construction

### 2. Create processServerSideAggregations function

- Transform aggregation results into exact `DashboardData` format
- Ensure field names match UI expectations (e.g., `total` not `totalRequests`)
- Handle percentage calculations for statusBreakdown
- Map entitlements to both top-level and nested `entitlements` object

### 3. Update useDashboardData hook

- Remove interface mismatches and duplicated properties
- Ensure server-side path returns identical structure to client-side path
- Add proper error handling for aggregation queries

### 4. Preserve Existing Features

- Keep drill-down navigation working (pie chart, bar chart, trends chart)
- Maintain filter compatibility
- Preserve department mapping including "No Department" logic
- Keep month name formatting for multi-year data

## Success Criteria

✅ Dashboard loads without data mismatches
✅ All KPI widgets show correct values  
✅ Department bar chart displays properly with click navigation
✅ Status pie chart shows correct counts (not days) with percentages
✅ Monthly trends chart displays with proper field names
✅ Vacation entitlements cards show correct calculations
✅ Drill-down navigation works from all charts
✅ Server-side aggregations provide performance improvement
✅ Client-side fallback works if server aggregations fail
