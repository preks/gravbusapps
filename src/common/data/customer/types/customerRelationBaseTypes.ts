// Base types that match GraphQL responses exactly for CRM customer relation entities
// These should match the DBML schema exactly without any computed fields
import type { CatalogEntry, BaseEntity } from '@/common/network/graphql/commonTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import type { ContactType } from './customerEnums'
import type { FileInfo } from '@/common/types/FileTypes'
import type { CustomerAccountRef } from './customerAccountTypes'
import type { CustomerContactRef } from './customerContactTypes'

// Reference types for other entities
export interface CustomerOpportunityRef {
  id: string
  code: string
  name: string
}

export interface CustomerLeadRef {
  id: string
  code: string
  firstName?: string
  lastName?: string
  email?: string
}

export interface CustomerDocumentRef {
  id: string
  name?: string
  file?: string
  fileInfo?: FileInfo
  mimeType?: string
  fileSize?: number
}

// =====================================================
// CUSTOMER RELATIONS ENTITIES (from DBML)
// =====================================================

// crm_opportunity table
export interface BaseCustomerOpportunity extends BaseEntity {
  id: string

  // Common Opportunity Fields
  code?: string
  name?: string
  closeDate?: string // ISO date string

  // Amount and probability fields
  estimatedAmount?: number
  winningChance?: number

  // Catalog references
  currency?: CatalogEntry
  // Updated schema fields
  pipeline?: CatalogEntry
  salesPipeline?: CatalogEntry
  salesPipelineStage?: CatalogEntry
  opportunityStatus?: CatalogEntry
  // Direct scalar stage and status
  stage?: string
  status?: string

  // Employee reference
  ownerEmployee?: EmployeeRef

  // Related entity references
  account?: CustomerAccountRef
}

// crm_lead table
export interface BaseCustomerLead extends BaseEntity {
  id: string

  // Common Lead Fields
  code?: string
  firstName?: string
  lastName?: string
  email?: string
  phoneNumber?: string
  position?: string
  companyName?: string
  companyEmail?: string
  companyPhone?: string
  companyWebsite?: string
  description?: string
  conversionDate?: string // ISO date string

  // Catalog references
  academicTitle?: CatalogEntry
  salutation?: CatalogEntry
  leadRating?: CatalogEntry
  leadStatus?: CatalogEntry
  leadSource?: CatalogEntry
  industryClass?: CatalogEntry
  companySize?: CatalogEntry

  // Employee reference
  ownerEmployee?: EmployeeRef
}

// sales_task table
import { CommonTask } from '@/common/data/relations/types/commonTaskTypes'

export interface BaseCustomerTask extends CommonTask {
  // Customer-specific fields
  comment?: string
  templateStartDate?: string

  // Catalog references (actual database field names)
  type?: CatalogEntry
  priority?: CatalogEntry
  status?: CatalogEntry
  // Reference fields (string IDs)
  typeRef?: string
  priorityRef?: string
  statusRef?: string
  timingType?: string

  // Related entity references (Customer-specific)
  account?: CustomerAccountRef
  contact?: CustomerContactRef
  lead?: CustomerLeadRef
  opportunity?: CustomerOpportunityRef

  // Documents
  documents?: CustomerDocumentRef[]
}

// sales_activity table
export interface BaseCustomerActivity extends BaseEntity {
  id: string

  // Activity Fields
  title?: string
  description?: string
  occurredAt?: string // ISO date string
  completedAt?: string // ISO date string

  // Performance additions
  activityScore?: number
  activityCategory?: string // PROSPECTING, NURTURING, CLOSING, FOLLOW_UP
  activityImpact?: string // HIGH, MEDIUM, LOW
  outcomeType?: string // POSITIVE, NEUTRAL, NEGATIVE
  contributesToRevenue?: boolean
  relatedOpportunityValue?: number
  nextActionRequired?: boolean
  nextActionDate?: string // ISO date string

  // Catalog references
  activityType?: CatalogEntry

  // Employee references
  ownerEmployee?: EmployeeRef

  // Related entity references
  account?: CustomerAccountRef
  contact?: CustomerContactRef
  lead?: CustomerLeadRef
  opportunity?: CustomerOpportunityRef

  // Documents
  documents?: CustomerDocumentRef[]
}

// crm_note table
export interface BaseCustomerNote extends BaseEntity {
  id: string

  // Note Fields
  title?: string
  text?: string
  reminderDate?: string // ISO date string

  // Employee references
  authorEmployee?: EmployeeRef

  // Related entity references
  account?: CustomerAccountRef
  contact?: CustomerContactRef
  lead?: CustomerLeadRef
  opportunity?: CustomerOpportunityRef

  // Documents
  documents?: CustomerDocumentRef[]
}

// crm_document table
export interface BaseCustomerDocument extends BaseEntity {
  id: string

  // Document Fields
  name?: string
  description?: string
  file?: string
  fileSize?: number
  mimeType?: string
  verified?: boolean
  verificationDate?: string // ISO date string
  authenticated?: boolean
  authenticationDate?: string // ISO date string
  mandatory?: boolean
  expirationDate?: string // ISO date string

  // Catalog references
  documentGroup?: CatalogEntry
  documentType?: CatalogEntry

  // Related entity references
  account?: CustomerAccountRef
  contact?: CustomerContactRef
  lead?: CustomerLeadRef
  opportunity?: CustomerOpportunityRef
}

// Address type for related entities (CrmAddress)
export interface BaseCustomerAddress extends BaseEntity {
  id: string
  addressType?: string
  addressLine?: string
  city?: string
  postalCode?: string

  // Catalog references
  region?: CatalogEntry
  country?: CatalogEntry
}

// Communication channel type (SalesCommunicationChannel)
export interface BaseCustomerCommunicationChannel extends BaseEntity {
  id: string
  communicationChannel?: CatalogEntry
  value?: string
  valueExtension?: string

  // Related entity references
  account?: CustomerAccountRef
  contact?: CustomerContactRef
  lead?: CustomerLeadRef
  opportunity?: CustomerOpportunityRef
}

// Account-Contact relationship
export interface BaseCustomerAccountContact extends BaseEntity {
  id: string
  contactType?: ContactType

  // Related entity references
  account?: CustomerAccountRef
  contact?: CustomerContactRef
}

// Opportunity-Contact relationship
export interface BaseCustomerOpportunityContact extends BaseEntity {
  id: string
  contactType?: ContactType

  // Related entity references
  opportunity?: CustomerOpportunityRef
  contact?: CustomerContactRef
}
