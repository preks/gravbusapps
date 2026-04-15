export interface JobPositionFormValues {
  id?: string // present if editing
  version?: number // present if editing, required for updates
  name: string
  jobProfileId?: string // Now optional
  jobFamilyId: string
  jobFunctionId: string
  jobLevelGroupId?: string // Made optional - auto-selected from job function
  jobLevelId?: string // Made optional - not shown in form
  organizationalUnitId: string
  employmentTypeId?: string // Made optional - not shown in form
  contractTypeId?: string // Made optional - not shown in form
}

export interface SelectOption {
  id: string
  name: string
  label: string
  value: string
  disabled?: boolean
}

export interface JobPositionContextState {
  formValues: JobPositionFormValues
  setFormValues: (values: Partial<JobPositionFormValues>) => void
  jobProfiles: SelectOption[]
  allJobProfiles: any[] // Full job profile data for auto-filling
  jobFamilies: SelectOption[]
  jobFunctions: SelectOption[]
  allJobFunctions: any[] // Full job function data for auto-selecting job family
  jobLevelGroups: SelectOption[]
  jobLevels: SelectOption[]
  allJobLevels: any[] // Full job level data for auto-selecting job level group
  organizationalUnits: SelectOption[]
  employmentTypes: SelectOption[]
  contractTypes: SelectOption[]
  loading: boolean
  error: string | null
  fetchJobFunctions: (jobFamilyId: string) => void
  fetchJobLevels: (jobLevelGroupId: string) => void
  submit: () => Promise<void>
  isEdit: boolean
  accessToken: string
  structureId: string
  // Job profile specific methods
  searchJobProfiles: (searchTerm?: string) => void
  loadMoreJobProfiles: () => void
  hasMoreJobProfiles: boolean
  jobProfilesError: string | null
  jobProfilesLoading: boolean
  // Organizational unit specific methods
  searchOrganizationalUnits: (searchTerm?: string) => void
  loadMoreOrganizationalUnits: () => void
  hasMoreOrganizationalUnits: boolean
  organizationalUnitsError: string | null
  organizationalUnitsLoading: boolean
  // Job family specific methods
  searchJobFamilies: (searchTerm: string) => void
  loadMoreJobFamilies: () => void
  hasMoreJobFamilies: boolean
  jobFamiliesError: string | null
  jobFamiliesLoading: boolean
  // Job function specific methods
  searchJobFunctions: (searchTerm: string) => void
  loadMoreJobFunctions: () => void
  hasMoreJobFunctions: boolean
  jobFunctionsError: string | null
  jobFunctionsLoading: boolean
  // Job level group specific methods
  searchJobLevelGroups: (searchTerm: string) => void
  loadMoreJobLevelGroups: () => void
  hasMoreJobLevelGroups: boolean
  jobLevelGroupsError: string | null
  jobLevelGroupsLoading: boolean
  // Job level specific methods
  searchJobLevels: (searchTerm: string) => void
  loadMoreJobLevels: () => void
  hasMoreJobLevels: boolean
  jobLevelsError: string | null
  jobLevelsLoading: boolean
  // Employment type specific methods
  searchEmploymentTypes: (searchTerm: string) => void
  loadMoreEmploymentTypes: () => void
  hasMoreEmploymentTypes: boolean
  employmentTypesError: string | null
  employmentTypesLoading: boolean
  // Contract type specific methods
  searchContractTypes: (searchTerm: string) => void
  loadMoreContractTypes: () => void
  hasMoreContractTypes: boolean
  contractTypesError: string | null
  contractTypesLoading: boolean
}
