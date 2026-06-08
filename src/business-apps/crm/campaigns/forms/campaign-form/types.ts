import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CampaignFormValues {
  id?: string
  version?: number
  name: string
  typeRef: string
  startDate: string
  endDate: string
  description?: string

  // Strategic Fields
  customerCampaignSegmentRef?: string
  customerPersonaRef?: string
  customerValuePackFocusRef?: string
  customerIndustryFocusRef?: string
  countryRef?: string

  // Financial Fields
  budgetAllocated?: number
  pipelineTarget?: number
  expectedWinRate?: number
  expectedRevenueContribution?: number

  // Execution Fields
  customerCampaignStatusRef?: string
  ownerEmployeeId?: string

  // Target accounts (for payload; UI state in component)
  customerCampaignAccounts?: Array<{
    id?: string
    version?: number
    customerAccountId: string
    customerEngagementLevelRef?: string
    customerAccount?: { id: string; name: string }
  }>
}

export interface CampaignFormContextValue {
  businessAppContext: BusinessAppContextProps
  formValues: CampaignFormValues
  /** For EmployeeSelect display when editing (GraphQL ownerEmployee). */
  prefetchedOwnerEmployee: { id: string; displayName: string } | null
  onSubmit: (values: CampaignFormValues) => Promise<void>
  onCancel: () => Promise<void>
  isLoading: boolean
  error: string | null
  isUpdateMode: boolean
}
