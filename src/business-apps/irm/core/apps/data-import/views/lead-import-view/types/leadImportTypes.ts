/**
 * Lead-specific import types
 */

import { ConvertedEntity } from '@/common/components/common-relations/apps/data-import/types'

// Converted lead structure ready for API
export interface ConvertedLead extends ConvertedEntity {
  // Personal Information
  salutationRef?: string | null
  academicTitleRef?: string | null
  firstName?: string | null
  lastName?: string | null
  position?: string | null

  // Contact Information
  email?: string | null
  phoneNumber?: string | null

  // Company Information
  companyName?: string | null
  companyEmail?: string | null
  companyPhone?: string | null
  companyWebsite?: string | null
  legalFormRef?: string | null
  numberOfEmployeesRef?: string | null
  industryRef?: string | null
  accountAnnualRevenueBandRef?: string | null

  // Address/Location
  addressLine?: string | null
  city?: string | null
  postalCode?: string | null
  countryRef?: string | null
  regionRef?: string | null

  // Lead Information
  leadSourceRef?: string | null
  leadStatusRef?: string | null
  leadRatingRef?: string | null
  sourceCompanyName?: string | null
  sourceIndividualName?: string | null

  // Owner
  ownerEmployeeId?: string | null

  // Additional
  description?: string | null
  sensitive?: boolean | null
}

// Lead import state
export interface LeadImportState {
  file: File | null
  csvText: string
  parsedData: Record<string, string>[]
  agentResponse: {
    fieldMappings: Array<{
      sourceField: string
      targetField: string
      transformationType: 'direct' | 'catalog'
      catalogIdentifier?: string
    }>
    sourceFields: string[]
    unmappedSourceFields: string[]
  } | null
  editedMappings: Array<{
    sourceField: string
    targetField: string
    transformationType: 'direct' | 'catalog'
    catalogIdentifier?: string
  }>
  convertedLeads: ConvertedLead[]
  step: 'upload' | 'mapping' | 'result'
  isLoading: boolean
  error: string | null
}
