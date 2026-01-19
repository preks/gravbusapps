export interface AbsenceEmployee {
  id: string
  firstName: string
  lastName: string
  businessKey?: string
  displayName: string
}

export interface AbsenceType {
  id: string
  code: string
  value: string
  parentEntryId: string | null
}

export interface AbsenceGroup {
  id: string
  code: string
  value: string
}

export interface AbsenceRecord {
  id: string
  activeFrom: string | null
  activeTo: string | null
  effectiveDays: number
  calendarDays: number
  description: string | null
  businessKey: string | null
  createdAt: string
  employee: AbsenceEmployee
  absenceType: AbsenceType | null
  absenceGroup: AbsenceGroup | null
  month: string
  year: number
  employeeAbsenceRecords: Array<{
    id: string
    activeFrom: string | null
    activeTo: string | null
    effectiveDays: number
    calendarDays: number
    description: string | null
    businessKey: string | null
  }>
}

export interface AbsenceBalance {
  id: string
  absenceYear: string
  annualTotal: number
  approved: number
  pending: number
  planned: number
  remaining: number
  carryover: number
  businessKey: string | null
  employee: AbsenceEmployee
  absenceType: AbsenceType | null
  absenceGroup: AbsenceGroup | null
}

export interface AbsenceStatistics {
  totalEmployees: number
  totalAbsenceDays: number
  vacationUsagePercentage: number
  sickUsagePercentage: number
  averageDaysUsed: number
  totalVacationDays: number
  totalSickDays: number
  totalSpecialLeaveDays: number
  totalWorkLeaveDays: number
  // Breakdown by group
  groupStats: Array<{
    groupCode: string
    groupName: string
    totalDays: number
    usagePercentage: number
    employeeCount: number
  }>
  // Breakdown by type
  typeStats: Array<{
    typeCode: string
    typeName: string
    groupCode: string
    totalDays: number
    usagePercentage: number
    employeeCount: number
  }>
}

export interface AbsenceChartData {
  monthlyUsageByGroup: Array<{
    month: string
    vacation: number
    sickLeave: number
    specialLeave: number
    workLeave: number
  }>
  totalAbsenceDays: Array<{
    month: string
    days: number
  }>
  absenceByGroup: Array<{
    group: string
    days: number
    percentage: number
    color: string
  }>
  absenceByType: Array<{
    type: string
    group: string
    days: number
    percentage: number
  }>
  departmentBreakdown: Array<{
    department: string
    vacation: number
    sickLeave: number
    specialLeave: number
    workLeave: number
    total: number
  }>
}

export interface AbsenceTableData {
  byCostCenter: Array<{
    costCenter: string
    vacation: number
    sickLeave: number
    specialLeave: number
    workLeave: number
    total: number
  }>
  byEmployee: Array<{
    employee: AbsenceEmployee
    totalDays: number
    vacation: number
    sickLeave: number
    specialLeave: number
    workLeave: number
    usagePercentage: number
    balanceInfo: Array<{
      type: string
      allocated: number
      used: number
      remaining: number
    }>
  }>
  byAbsenceType: Array<{
    type: AbsenceType
    group: AbsenceGroup
    totalDays: number
    employeeCount: number
    averageDaysPerEmployee: number
  }>
}

export interface UseAbsenceDataIntegrationResponse {
  absenceData: AbsenceRecord[]
  balanceData: AbsenceBalance[]
  absenceTypes: AbsenceType[]
  absenceGroups: AbsenceGroup[]
  statistics: AbsenceStatistics
  chartData: AbsenceChartData
  tableData: AbsenceTableData
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}
