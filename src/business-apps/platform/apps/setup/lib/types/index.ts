/**
 * Types for the setup module
 */

export interface Department {
  id: string
  name: string
  translationKey?: string
  description?: string
  employees?: number
  parentId?: string | null
}

export type UserPlacementMode = 'ceo' | 'existing_department' | 'not_in_org'

export interface SetupEmployee {
  id: string
  firstName: string
  lastName: string
  email: string
  jobPosition: string
  departmentId: string
  capabilityIds: string[]
  /** When true, platform assigns OU role Manager for this employee's department. */
  isManager?: boolean
  /** Optional; server applies via User Management after user creation. */
  initialPassword?: string | null
}

/**
 * Form data structure for the setup wizard
 */
export interface FormData {
  // Company Information
  companyCode: string
  companyName: string
  companyDescription?: string | null

  // User Information
  firstName: string | null
  lastName: string | null
  jobPosition: string
  userPlacementMode: UserPlacementMode | null
  selectedDepartmentId: string | null
  /** Mirrors Zod `z.string().nullable().optional()` for resolver compatibility. */
  selectedDepartmentName?: string | null | undefined
  customDepartmentName?: string | null | undefined

  // Department Information
  departments: Department[]
  selectedDepartments?: string[]
  capabilities?: Array<{ id: string; name: string }>
  selectedCapabilities?: string[]
  departmentCapabilities?: Record<string, string[]>
  additionalEmployees?: SetupEmployee[]
}

export interface SetupCurrentUserIdentity {
  email?: string | null
  givenName?: string | null
  familyName?: string | null
}

export interface SetupApiRequest {
  formValues: FormData
  currentUser?: SetupCurrentUserIdentity | null
  /** When true, skip the "active structure already exists" gate (must match `?forceSetup=true` on the setup page). */
  forceSetup?: boolean
}

export interface SetupApiResponse {
  structureId: string
  redirectUrl: string
}

export interface ActiveStructureBootstrapResponse {
  hasActiveStructure: boolean
  structureId: string | null
  cached: boolean
  checkedAt: number
}
