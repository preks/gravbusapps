export interface EmployeeFormValues {
  id?: string; // present if editing
  firstName: string;
  lastName: string;
  email: string;
  organizationalUnitId: string;
  jobPositionId: string;
}

export interface SelectOption {
  id: string;
  name: string;
  label?: string; // for compatibility
  value?: string; // for compatibility
  disabled?: boolean;
}

export interface EmployeeContextState {
  formValues: EmployeeFormValues;
  setFormValues: (values: Partial<EmployeeFormValues>) => void;
  organizationalUnits: SelectOption[];
  jobPositions: SelectOption[];
  allJobPositions: any[]; // Full job position data
  loading: boolean;
  error: string | null;
  submit: () => Promise<void>;
  isEdit: boolean;
  accessToken: string;
  structureId: string;
  // Organizational unit specific methods
  searchOrganizationalUnits: (searchTerm?: string) => void;
  loadMoreOrganizationalUnits: () => void;
  hasMoreOrganizationalUnits: boolean;
  organizationalUnitsError: string | null;
  organizationalUnitsLoading: boolean;
  // Job position specific methods
  searchJobPositions: (searchTerm?: string) => void;
  loadMoreJobPositions: () => void;
  hasMoreJobPositions: boolean;
  jobPositionsError: string | null;
  jobPositionsLoading: boolean;
} 