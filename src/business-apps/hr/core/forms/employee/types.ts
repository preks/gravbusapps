export interface EmployeeFormValues {
  id?: string // present if editing
  firstName: string
  lastName: string
  email: string
  organizationalUnitId: string
  jobPositionId: string
  preferredName: string
  employmentTypeId: string
  contractTypeId: string
  hireDate: string
}

export interface SelectOption {
  id: string
  name: string
  label?: string // for compatibility
  value?: string // for compatibility
  disabled?: boolean
}

export interface EmployeeContextState {
  formValues: EmployeeFormValues
  setFormValues: (values: Partial<EmployeeFormValues>) => void
  organizationalUnits: SelectOption[]
  jobPositions: SelectOption[]
  allJobPositions: any[] // Full job position data
  employmentTypes: SelectOption[]
  contractTypes: SelectOption[]
  loading: boolean
  error: string | null
  submit: () => Promise<void>
  isEdit: boolean
  accessToken: string
  structureId: string
  // Organizational unit specific methods
  searchOrganizationalUnits: (searchTerm?: string) => void
  loadMoreOrganizationalUnits: () => void
  hasMoreOrganizationalUnits: boolean
  organizationalUnitsError: string | null
  organizationalUnitsLoading: boolean
  // Job position specific methods
  searchJobPositions: (searchTerm?: string) => void
  loadMoreJobPositions: () => void
  refetchJobPositions: () => void
  hasMoreJobPositions: boolean
  jobPositionsError: string | null
  jobPositionsLoading: boolean
  // Employment type specific methods
  searchEmploymentTypes: (searchTerm?: string) => void
  loadMoreEmploymentTypes: () => void
  hasMoreEmploymentTypes: boolean
  employmentTypesError: string | null
  employmentTypesLoading: boolean
  // Contract type specific methods
  searchContractTypes: (searchTerm?: string) => void
  loadMoreContractTypes: () => void
  hasMoreContractTypes: boolean
  contractTypesError: string | null
  contractTypesLoading: boolean
}
