// Enhanced types that extend base types and add computed fields for CRM customer relation entities

import {
  BaseCustomerAccount,
  BaseCustomerContact,
  BaseCustomerLead,
  BaseCustomerOpportunity,
  BaseCustomerAddress,
  BaseCustomerNote,
  BaseCustomerDocument,
  BaseCustomerActivity,
  BaseCustomerTask,
  BaseCustomerCommunicationChannel,
  BaseCustomerAccountContact,
  BaseCustomerOpportunityContact
} from './customerRelationBaseTypes'

// Enhanced CustomerAccount type with computed fields
export interface CustomerAccount extends BaseCustomerAccount {
  // Computed display fields only
  displayName: string
  legalFormLabel?: string
  companySizeLabel?: string
  industryClassLabel?: string
  annualRevenueLabel?: string
  ownerDisplayName?: string
}

// Enhanced CustomerContact type with computed fields
export interface CustomerContact extends BaseCustomerContact {
  // Computed display fields only
  displayName: string
  fullName: string
  salutationLabel?: string
  academicTitleLabel?: string
  languageLabel?: string
  ownerDisplayName?: string
}

// Enhanced CustomerLead type with computed fields
export interface CustomerLead extends BaseCustomerLead {
  // Computed display fields only
  displayName: string
  fullName: string
  salutationLabel?: string
  academicTitleLabel?: string
  leadRatingLabel?: string
  leadStatusLabel?: string
  leadSourceLabel?: string
  industryClassLabel?: string
  companySizeLabel?: string
  ownerDisplayName?: string
}

// Enhanced CustomerOpportunity type with computed fields
export interface CustomerOpportunity extends BaseCustomerOpportunity {
  // Computed display fields only
  displayName: string
  currencyLabel?: string
  opportunityPipelineLabel?: string // label for normalized pipeline
  opportunityPipelineStageLabel?: string // label for normalized stage
  opportunityStatusLabel?: string // label for normalized status
  // Normalized catalog fields for UI consumption
  opportunityPipeline?: import('@/common/network/graphql/commonTypes').CatalogEntry
  opportunityPipelineStage?: import('@/common/network/graphql/commonTypes').CatalogEntry
  opportunityStatus?: import('@/common/network/graphql/commonTypes').CatalogEntry
  ownerDisplayName?: string
}

// Enhanced CustomerTask type with computed fields
export interface CustomerTask extends BaseCustomerTask {
  // Computed display fields only
  displayName: string
  // taskType, taskPriority, taskStatus inherited from Base (already CatalogEntry in Base)
  creatorDisplayName?: string
  assignedDisplayName?: string
  taskTiming?: string
  formattedDueDate?: string
  formattedStartDate?: string
  formattedEndDate?: string
  accountDisplayName?: string
  contactDisplayName?: string
  leadDisplayName?: string
  opportunityDisplayName?: string
  reference?: any
}

// Enhanced CustomerActivity type with computed fields
export interface CustomerActivity extends BaseCustomerActivity {
  // Computed display fields only
  displayName: string
  activityTypeLabel?: string
  ownerDisplayName?: string
  formattedOccurredAt?: string
  formattedCompletedAt?: string
  accountDisplayName?: string
  contactDisplayName?: string
  leadDisplayName?: string
  opportunityDisplayName?: string

  // Performance computed fields
  performanceCategoryLabel?: string
  activityImpactLabel?: string
  outcomeTypeLabel?: string
  performanceLevel?: 'excellent' | 'good' | 'average' | 'poor'
  scoreBadgeColor?: string
  scoreBadgeVariant?: 'success' | 'warning' | 'error' | 'info'
  revenueImpactLevel?: 'high' | 'medium' | 'low' | 'none'
  formattedRevenueImpact?: string
  timelinessScore?: number
  qualityScore?: number
  loggingDelay?: number
  loggingDelayLabel?: string
  isTimely?: boolean
  requiresFollowUp?: boolean
  formattedNextActionDate?: string
}

// Enhanced CustomerNote type with computed fields
export interface CustomerNote extends BaseCustomerNote {
  // Computed display fields only
  displayName: string
  authorDisplayName?: string
  formattedReminderDate?: string
}

// Enhanced CustomerDocument type with computed fields
export interface CustomerDocument extends BaseCustomerDocument {
  // Computed display fields only
  displayName: string
  documentGroupLabel?: string
  documentTypeLabel?: string
  formattedFileSize?: string
  formattedExpirationDate?: string
  isExpired?: boolean
  isExpiringSoon?: boolean
}

// Enhanced CustomerAddress type with computed fields
export interface CustomerAddress extends BaseCustomerAddress {
  // Computed display fields only
  displayAddress: string
  fullAddress: string
  countryLabel?: string
  timeZoneLabel?: string
}

// Enhanced CustomerCommunicationChannel type with computed fields
export interface CustomerCommunicationChannel extends BaseCustomerCommunicationChannel {
  // Computed display fields only
  displayName: string
  displayValue: string
  typeLabel?: string
}

// Enhanced CustomerAccountContact type with computed fields
export interface CustomerAccountContact extends BaseCustomerAccountContact {
  // Computed display fields only
  displayName: string
  contactTypeLabel?: string
}

// Enhanced CustomerOpportunityContact type with computed fields
export interface CustomerOpportunityContact extends BaseCustomerOpportunityContact {
  // Computed display fields only
  displayName: string
  contactTypeLabel?: string
}

// Collection types for queries that return multiple entities
export interface CustomerAccountsQueryResponse {
  accounts: CustomerAccount[]
  totalCount: number
}

export interface CustomerContactsQueryResponse {
  contacts: CustomerContact[]
  totalCount: number
}

export interface CustomerLeadsQueryResponse {
  leads: CustomerLead[]
  totalCount: number
}

export interface CustomerOpportunitiesQueryResponse {
  opportunities: CustomerOpportunity[]
  totalCount: number
}

export interface CustomerTasksQueryResponse {
  tasks: CustomerTask[]
  totalCount: number
}

export interface CustomerActivitiesQueryResponse {
  activities: CustomerActivity[]
  totalCount: number
}

export interface CustomerNotesQueryResponse {
  notes: CustomerNote[]
  totalCount: number
}

export interface CustomerDocumentsQueryResponse {
  documents: CustomerDocument[]
  totalCount: number
}

// Aggregate statistics types
export interface CustomerTaskStatistics {
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  upcomingTasks: number
  tasksByPriority: Record<string, number>
  tasksByStatus: Record<string, number>
  tasksByType: Record<string, number>
}

export interface CustomerActivityStatistics {
  totalActivities: number
  completedActivities: number
  activitiesByType: Record<string, number>
  activitiesThisMonth: number
  activitiesLastMonth: number
}

// Combined entity relationship types
export interface CustomerEntityWithRelations {
  account?: CustomerAccount
  contacts?: CustomerContact[]
  leads?: CustomerLead[]
  opportunities?: CustomerOpportunity[]
  tasks?: CustomerTask[]
  activities?: CustomerActivity[]
  notes?: CustomerNote[]
  documents?: CustomerDocument[]
  addresses?: CustomerAddress[]
  communicationChannels?: CustomerCommunicationChannel[]
}
