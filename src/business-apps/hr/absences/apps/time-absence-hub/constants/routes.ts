export const HUB_VIEWS = [
  'dashboard',
  'absences',
  'attendance',
  'entitlements',
  'insights',
  'reports',
  'absence-details',
  'entitlements-details'
] as const

export type HubView = (typeof HUB_VIEWS)[number]

export const DEFAULT_VIEW: HubView = 'dashboard'

export const isHubView = (value: string | null | undefined): value is HubView =>
  Boolean(value) && (HUB_VIEWS as readonly string[]).includes(value as string)

export const ABSENCES_SUB_TABS = ['list', 'calendar'] as const
export type AbsencesSubTab = (typeof ABSENCES_SUB_TABS)[number]

export const isAbsencesSubTab = (value: string | null | undefined): value is AbsencesSubTab =>
  Boolean(value) && (ABSENCES_SUB_TABS as readonly string[]).includes(value as string)

export const URL_PARAMS = {
  view: 'view',
  tab: 'tab',
  timeScope: 'ts',
  dateFrom: 'from',
  dateTo: 'to',
  departmentIds: 'dept',
  locationIds: 'loc',
  legalEntityIds: 'le',
  managerIds: 'mgr',
  employeeQuery: 'q',
  absenceTypeIds: 'type',
  statusIds: 'status',
  absenceId: 'absenceId',
  entitlementId: 'entitlementId',
  attendanceMode: 'attMode'
} as const

export const TIME_SCOPES = ['current-year', 'quarter', 'month', 'everything', 'custom'] as const
export type TimeScope = (typeof TIME_SCOPES)[number]

export const DEFAULT_TIME_SCOPE: TimeScope = 'current-year'

export const isTimeScope = (value: string | null | undefined): value is TimeScope =>
  Boolean(value) && (TIME_SCOPES as readonly string[]).includes(value as string)
