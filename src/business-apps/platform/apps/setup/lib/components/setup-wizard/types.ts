export type Department = {
  id: string
  name: string
  translationKey?: string
}

export type Capability = {
  id: string
  name: string
}

export type UserPlacementMode = 'ceo' | 'existing_department' | 'not_in_org'

export type SetupEmployee = {
  id: string
  firstName: string
  lastName: string
  email: string
  jobPosition: string
  departmentId: string
  capabilityIds: string[]
  initialPassword?: string | null
}

export type FormData = {
  companyCode: string
  companyName: string
  companyDescription?: string | null
  firstName: string | null
  lastName: string | null
  jobPosition: string
  userPlacementMode: UserPlacementMode | null
  selectedDepartmentId: string | null
  selectedDepartmentName: string | null
  customDepartmentName: string | null
  departments: Department[]
  selectedDepartments: string[]
  capabilities: Capability[]
  selectedCapabilities: string[]
  departmentCapabilities?: Record<string, string[]>
  additionalEmployees?: SetupEmployee[]
}

export interface SummaryStepProps {
  readonly onNext: () => void
  readonly onBack: () => void
}

export interface PlatformIntroductionStepProps {
  readonly onNext: () => void
}
