// Base types that match GraphQL responses exactly for CRM customer relation entities
// These should match the DBML schema exactly without any computed fields
import type { CatalogEntry, BaseEntity } from '@/common/network/graphql/commonTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import type { ContactType, AddressType } from './customerEnums'
import type { FileInfo } from '@/common/types/FileTypes'

// Forward declarations for reference types to avoid circular dependencies
export interface CustomerAccountRef {
  id: string
  code: string
  name: string
  // Fields used in customer queries (inline account selection)
  email?: string
  phone?: string
  website?: string
  picture?: string
  pictureThumbnail?: string
  annualRevenue?: CatalogEntry
  // Employee reference (inline selections)
  ownerEmployee?: EmployeeRef
}

export interface CustomerContactRef {
  id: string
  code: string
  firstName?: string
  lastName?: string
  fullName?: string
  // Fields used in nested contact selection
  email?: string
  phone?: string
  department?: string
  jobPosition?: string
  picture?: string
  pictureThumbnail?: string
}

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

// crm_account table
export interface BaseCustomerAccount extends BaseEntity {
  id: string

  // Common Account Fields
  code?: string
  name?: string
  email?: string
  phone?: string
  foundationDate?: string // ISO date string
  liquidationDate?: string // ISO date string
  website?: string
  picture?: string
  pictureThumbnail?: string
  mission?: string
  geographicPresence?: string
  specialty?: string

  // Catalog references
  legalForm?: CatalogEntry
  annualRevenue?: CatalogEntry
  companySize?: CatalogEntry
  industryClass?: CatalogEntry

  // Employee reference
  ownerEmployee?: EmployeeRef
}

// crm_contact table
export interface BaseCustomerContact extends BaseEntity {
  id: string

  // Common Contact Fields
  code?: string
  firstName?: string
  lastName?: string
  fullName?: string
  email?: string
  phone?: string
  birthDate?: string // ISO date string
  department?: string
  description?: string
  jobPosition?: string
  picture?: string
  pictureThumbnail?: string

  // Catalog references
  academicTitle?: CatalogEntry
  salutation?: CatalogEntry
  language?: CatalogEntry

  // Employee reference
  ownerEmployee?: EmployeeRef
}

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
export interface BaseCustomerTask extends BaseEntity {
  id: string

  // Task Fields
  code?: string
  name?: string
  description?: string
  comment?: string
  startDate?: string // ISO date string
  dueDate?: string // ISO date string
  endDate?: string // ISO date string

  // Catalog references (actual database field names)
  type?: CatalogEntry
  priority?: CatalogEntry
  status?: CatalogEntry
  // Reference fields (string IDs)
  typeRef?: string
  priorityRef?: string
  statusRef?: string
  timingType?: string

  // Employee references
  creatorEmployee?: EmployeeRef
  assignedEmployee?: EmployeeRef

  // Related entity references
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

// Address type for related entities
export interface BaseCustomerAddress extends BaseEntity {
  id: string
  addressType?: AddressType
  addressLine?: any // Jsonb
  street?: string
  houseNumber?: string
  houseNumberAddition?: string
  postalCode?: string
  city?: string
  state?: string
  regionCode?: string

  // Catalog references
  country?: CatalogEntry
  timeZone?: CatalogEntry
}

// Communication channel type
export interface BaseCustomerCommunicationChannel extends BaseEntity {
  id: string
  type?: string
  value?: string
  verified?: boolean
  verificationDate?: string // ISO date string

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
