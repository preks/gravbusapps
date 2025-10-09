export interface SelectOption {
  id: string
  value: string
  label: string
  name: string
  extraInfo?: {
    picture?: string
    pictureThumbnail?: string
    jobPosition?: string
    organizationalUnit?: string
    userId?: string
    // Additional fields for Account and Lead data
    businessKey?: string
    email?: string
    website?: string
    owner?: string
    firstName?: string
    lastName?: string
    companyName?: string
    jobTitle?: string
    phone?: string
    status?: string
  }
}

export interface OpportunityFormValues {
  // Opportunity Information
  owner: string
  name: string
  opportunityStatus: string
  pipeline: string
  salesPipelineStage: string
  stage: string
  status: string

  // Sales Information
  estimatedAmount: string
  currency: string
  winningChance: string
  closeDate: string

  // Relationship Information
  account: string
  lead: string
  companyName: string // Company name from searchable input

  // Campaign Information
  salesCampaignId: string // Campaign ID for backend

  // Business Information
  businessKey: string
  code: string
  sourceApp: string
  personal: boolean

  // Additional Information
  notesSummary: string
  lastInteraction: string

  // Address Information
  addresses: Array<{
    id?: string
    version?: number
    addressType: string
    addressLine: string
    postalCode: string
    city: string
    region: string
    country: string
  }>

  // Communication Channels
  communicationChannels: Array<{
    id?: string
    version?: number
    channelType: string
    channelValue: string
    isPrimary: boolean
  }>

  // Tags
  tags: Array<{
    id?: string
    version?: number
    tagName: string
    tagValue: string
  }>

  // Additional Properties for custom fields
  additionalProperties: Record<string, any>

  // Express fields for dynamic configuration
  express1: Record<string, any>
  express2: Record<string, any>

  // Process and system fields
  processInstanceId: string
  recordState: string

  // Audit information (readonly, for display)
  activeFrom: string
  activeTo: string
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
  synchronizedAt: string

  // System fields
  id: string | undefined
  version: number | undefined

  // Legacy fields (for backward compatibility)
  accountId: string
  leadId: string
  ownerEmployeeId: string
  ownerOrganizationId: string
}

export interface OpportunityContextState {
  isLoading: boolean
  error: string | null

  // Account autocomplete state
  accountSuggestions: SelectOption[]
  searchAccounts: (search: string) => Promise<SelectOption[]>
  isSearchingAccounts: boolean
  setIsSearchingAccounts: (loading: boolean) => void
  setAccountSuggestions: (suggestions: SelectOption[]) => void

  // Lead autocomplete state
  leadSuggestions: SelectOption[]
  searchLeads: (search: string) => Promise<SelectOption[]>
  isSearchingLeads: boolean
  setIsSearchingLeads: (loading: boolean) => void
  setLeadSuggestions: (suggestions: SelectOption[]) => void
}

// Address type options
export const ADDRESS_TYPES: SelectOption[] = [
  {
    id: 'BUSINESS',
    value: 'BUSINESS',
    label: 'Business Address',
    name: 'Business Address'
  },
  {
    id: 'BILLING',
    value: 'BILLING',
    label: 'Billing Address',
    name: 'Billing Address'
  },
  {
    id: 'SHIPPING',
    value: 'SHIPPING',
    label: 'Shipping Address',
    name: 'Shipping Address'
  },
  {
    id: 'OTHER',
    value: 'OTHER',
    label: 'Other Address',
    name: 'Other Address'
  }
]

// Communication channel types
export const COMMUNICATION_CHANNEL_TYPES: SelectOption[] = [
  { id: 'EMAIL', value: 'EMAIL', label: 'Email', name: 'Email' },
  { id: 'PHONE', value: 'PHONE', label: 'Phone', name: 'Phone' },
  { id: 'FAX', value: 'FAX', label: 'Fax', name: 'Fax' },
  { id: 'MOBILE', value: 'MOBILE', label: 'Mobile', name: 'Mobile' },
  { id: 'WEBSITE', value: 'WEBSITE', label: 'Website', name: 'Website' },
  { id: 'LINKEDIN', value: 'LINKEDIN', label: 'LinkedIn', name: 'LinkedIn' },
  { id: 'TWITTER', value: 'TWITTER', label: 'Twitter', name: 'Twitter' },
  { id: 'OTHER', value: 'OTHER', label: 'Other', name: 'Other' }
]

// Record state options
export const RECORD_STATES: SelectOption[] = [
  { id: 'DRAFT', value: 'DRAFT', label: 'Draft', name: 'Draft' },
  { id: 'ACTIVE', value: 'ACTIVE', label: 'Active', name: 'Active' },
  { id: 'INACTIVE', value: 'INACTIVE', label: 'Inactive', name: 'Inactive' },
  { id: 'ARCHIVED', value: 'ARCHIVED', label: 'Archived', name: 'Archived' }
]
