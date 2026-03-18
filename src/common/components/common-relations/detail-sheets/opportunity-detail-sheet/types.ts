import type { CatalogEntry } from '@/common/network/graphql/commonTypes'

export interface OpportunityEmployee {
  id: string
  firstName: string
  lastName: string
  displayName?: string
  pictureThumbnail?: string
}

export interface OpportunityAccount {
  id: string
  name: string
  pictureThumbnail?: string
  pictureThumbnailUrl?: string
  industry?: CatalogEntry
  numberOfEmployees?: CatalogEntry
  website?: string
  email?: string
  phone?: string
}

export interface OpportunityLead {
  id: string
  companyName: string
  leadStatus?: CatalogEntry
}

export interface OpportunityContact {
  id: string
  contactId?: string
  contact?: {
    id: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    jobTitle?: string
    academicTitle?: CatalogEntry
  }
}

export interface OpportunityDocument {
  id: string
  name: string
  mimeType?: string | null
  fileSize?: number | null
  fileInfo?: any
}

export interface Opportunity {
  id: string
  name: string
  estimatedAmount?: number
  forecastedProfitAmount?: number
  description?: string
  closeDate?: string
  createdAt?: string
  updatedAt?: string
  version?: string
  sourceApp?: string

  // Status and classification
  opportunityStatus?: CatalogEntry

  // Pipeline fields (works for both CRM and IRM)
  opportunityPipeline?: CatalogEntry
  opportunityPipelineStage?: CatalogEntry
  salesPipeline?: CatalogEntry
  salesPipelineStage?: CatalogEntry

  // Currency
  currency?: {
    id: string
    code: string
    value: string
  }

  // Relationships
  ownerEmployee?: OpportunityEmployee
  creatorEmployee?: OpportunityEmployee
  account?: OpportunityAccount
  lead?: OpportunityLead
  contacts?: OpportunityContact[]
  opportunityContacts?: OpportunityContact[]
  documents?: OpportunityDocument[]
}
