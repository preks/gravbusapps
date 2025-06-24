export interface JobPositionFormValues {
  id?: string; // present if editing
  name: string;
  jobProfileId: string;
  jobFamilyId: string;
  jobFunctionId: string;
  jobLevelGroupId: string;
  jobLevelId: string;
  organizationalUnitId: string;
}

export interface SelectOption {
  id: string;
  name: string;
  label?: string; // for compatibility
  value?: string; // for compatibility
  disabled?: boolean;
}

export interface JobPositionContextState {
  formValues: JobPositionFormValues;
  setFormValues: (values: Partial<JobPositionFormValues>) => void;
  jobProfiles: SelectOption[];
  allJobProfiles: any[]; // Full job profile data for auto-filling
  jobFamilies: SelectOption[];
  jobFunctions: SelectOption[];
  jobLevelGroups: SelectOption[];
  jobLevels: SelectOption[];
  organizationalUnits: SelectOption[];
  loading: boolean;
  error: string | null;
  fetchJobFunctions: (jobFamilyId: string) => void;
  fetchJobLevels: (jobLevelGroupId: string) => void;
  submit: () => Promise<void>;
  isEdit: boolean;
  accessToken: string;
  structureId: string;
  // Job profile specific methods
  searchJobProfiles: (searchTerm?: string) => void;
  loadMoreJobProfiles: () => void;
  hasMoreJobProfiles: boolean;
  jobProfilesError: string | null;
  jobProfilesLoading: boolean;
  // Organizational unit specific methods
  searchOrganizationalUnits: (searchTerm?: string) => void;
  loadMoreOrganizationalUnits: () => void;
  hasMoreOrganizationalUnits: boolean;
  organizationalUnitsError: string | null;
  organizationalUnitsLoading: boolean;
  // Job family specific methods
  searchJobFamilies: (searchTerm: string) => void;
  loadMoreJobFamilies: () => void;
  hasMoreJobFamilies: boolean;
  jobFamiliesError: string | null;
  jobFamiliesLoading: boolean;
  // Job function specific methods
  searchJobFunctions: (searchTerm: string) => void;
  loadMoreJobFunctions: () => void;
  hasMoreJobFunctions: boolean;
  jobFunctionsError: string | null;
  jobFunctionsLoading: boolean;
  // Job level group specific methods
  searchJobLevelGroups: (searchTerm: string) => void;
  loadMoreJobLevelGroups: () => void;
  hasMoreJobLevelGroups: boolean;
  jobLevelGroupsError: string | null;
  jobLevelGroupsLoading: boolean;
  // Job level specific methods
  searchJobLevels: (searchTerm: string) => void;
  loadMoreJobLevels: () => void;
  hasMoreJobLevels: boolean;
  jobLevelsError: string | null;
  jobLevelsLoading: boolean;
} 