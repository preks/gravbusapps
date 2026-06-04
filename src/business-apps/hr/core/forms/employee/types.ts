export interface EmployeeFormValues {
  id?: string // present if editing
  firstName: string
  lastName: string
  email: string
  legalEntityId: string
  siteLocationId: string
  costCenterId: string
  organizationalUnitId: string
  jobPositionId: string
  preferredName: string
  employmentTypeId: string
  contractTypeId: string
  hireDate: string
  fixedTermUntil: string
  fixedTermReason: string
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
  legalEntities: SelectOption[]
  siteLocations: SelectOption[]
  costCenters: SelectOption[]
  loading: boolean
  error: string | null
  submit: () => Promise<void>
  isEdit: boolean
  accessToken: string
  structureId: string
  // Legal entity specific methods
  searchLegalEntities: (searchTerm?: string) => void
  loadMoreLegalEntities: () => void
  hasMoreLegalEntities: boolean
  legalEntitiesError: string | null
  legalEntitiesLoading: boolean
  // Site location specific methods
  searchSiteLocations: (searchTerm?: string) => void
  loadMoreSiteLocations: () => void
  hasMoreSiteLocations: boolean
  siteLocationsError: string | null
  siteLocationsLoading: boolean
  // Cost center specific methods
  searchCostCenters: (searchTerm?: string) => void
  loadMoreCostCenters: () => void
  hasMoreCostCenters: boolean
  costCentersError: string | null
  costCentersLoading: boolean
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
  jobPositionsInitialLoadDone: boolean
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
