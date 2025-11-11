export interface ContactFormValues {
  // Personal Information
  firstName: string
  lastName: string
  academicTitleRef: string
  birthDate: string
  languageRef: string
  bio: string
  pictureUrl: string

  // Professional Information
  jobTitle: string
  department: string
  contactType: string
  workExperienceYears: string

  // Contact Information
  email: string
  phone: string
  fax: string
  linkedinUrl: string
  xingUrl: string

  // Account Information
  accountId: string // Legacy single account field
  account: string // Account ID for selection
  companyName: string // Company name for display (same as opportunity form)
  accountIds: Array<
    | string
    | {
        id: string
        name: string
        associationId?: string // Association object ID for tracking account-contact relationships
        associationVersion?: number // Association version for optimistic locking
      }
  > // ✅ NEW: Array of account IDs or objects with id/name and association metadata (matching IRM pattern)
  ownerEmployeeId: string
  owner: string // Owner employee ID for selection
  ownerOrganizationId: string

  // Campaign Information
  salesCampaignId: string // Campaign ID for backend

  // Additional Information
  notesSummary: string

  // Academic Title
  academicTitle: string // Academic title ID for selection

  // System fields
  id?: string
  version?: number
  businessKey?: string // ✅ ADDED - business key for external systems
  code?: string // ✅ ADDED - internal code for reference

  // Audit fields
  createdAt?: string
  updatedAt?: string

  // Source tracking
  sourceApp?: string
  recordState?: string
}

export interface SelectOption {
  id: string | number
  value: string
  label: string
  name: string
  extraInfo?: {
    email?: string
    phone?: string
    picture?: string | null
    pictureThumbnail?: string | null
    jobPosition?: string
    organizationalUnit?: string
    userId?: string | null
  }
}

export interface ContactContextState {
  // Loading states
  isLoading: boolean
  error: string | null

  // Data collections
  contactTypes: SelectOption[]
  academicTitles: SelectOption[]
  languages: SelectOption[]
  departments: SelectOption[]
  employeePositions: SelectOption[]
  accounts: SelectOption[]
}
