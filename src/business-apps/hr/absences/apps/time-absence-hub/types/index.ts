import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext'
import type { CancelEmployeeAbsenceSnapshot } from '@/business-apps/hr/absences/utils/cancelEmployeeAbsence'

export type TimeFilter = 'current-year' | 'quarter' | 'month' | 'everything'

export interface DashboardDataProps extends BusinessAppContextProps {
  timeFilter?: TimeFilter
}

export interface AbsenceDetailsFilter {
  month?: string
  startDate?: string
  endDate?: string
  status?: string
  department?: string
  departmentId?: string
}

export type CurrentView = 'tabs' | 'absence-details' | 'entitlements-details' | 'attendance-details'

export type ActiveTab =
  | 'dashboard'
  | 'absences'
  | 'attendance'
  | 'entitlements'
  | 'insights'
  | 'absence-list'
  | 'calendar'
  | 'statistics'

export interface DashboardData {
  totalAbsences: number
  pendingAbsences: number
  approvedAbsences: number
  rejectedAbsences: number
  cancelledAbsences: number
  averageDuration: number
  approvalRate: number

  averageVacationDays: number
  averageUsed: number
  averagePending: number
  totalVacationLiability: number

  departmentStats: Array<{
    id?: string
    name: string
    totalDays: number
    uniqueEmployees: number
    avgDaysPerEmployee: number
    avgRequestsPerEmployee: number
    totalRequests: number
  }>

  monthlyData: Array<{
    month: string
    total: number
    uniqueEmployees: number
    avgRequestsPerEmployee: number
    avgDurationPerRequest: number
    totalDuration: number
    typeBreakdown: Record<string, number>
  }>

  rawAbsences: Array<any>

  statusBreakdown: Array<{
    status: string
    totalDays: number
    count: number
    percentage: number
  }>

  typeBreakdown: Array<{
    type: string
    totalDays: number
    count: number
    color?: string
  }>

  entitlements: {
    averageVacationPerEmployee: number
    totalActiveEmployees: number
    averageAvailable: number
    averageUsed: number
    totalVacationLiability: number
    totalVacationEntitlement: number
    estimatedCostPerDay: number
    totalLiabilityEstimate: number
    currencyCode: string
    hasMultipleCurrencies: boolean
  }

  isLoading: boolean
  error: string | null
}

export interface EnhancedAbsence {
  id: string
  status: string
  startDate: string
  endDate: string
  effectiveDays?: number
  calendarDays?: number
  type: {
    value: string
    parentEntryId?: string
  }
  employee: {
    id: string
    firstName: string
    lastName: string
    employeePosition?: {
      organizationalUnit?: {
        name: string
      }
    }
  }

  employeeName: string
  groupName: string
  originalGroupName: string
  typeName: string
  color?: string
  pictureThumbnail?: string
  createdAt?: string
  cancelSnapshot: CancelEmployeeAbsenceSnapshot
}

export interface DateFilters {
  startDate: string
  endDate: string
}

export interface DataFilter {
  id: string
  label: string
  selected: boolean
  count?: number
}

export interface DataFilterGroup {
  id: string
  title: string
  filters?: DataFilter[]
  backendSearch?: (search: string) => { filters: DataFilter[]; loading: boolean; error: any }
  customComponent?: React.ReactElement
  hideSearch?: boolean
}

export interface TabComponentProps extends BusinessAppContextProps {
  dashboardData?: DashboardData
}

export interface PageComponentProps extends BusinessAppContextProps {
  onNavigateBack?: () => void
}
