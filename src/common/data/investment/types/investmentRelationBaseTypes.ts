// Base types that match GraphQL responses exactly for CRM relation entities
// These should match the DBML schema exactly without any computed fields
import type { CatalogEntry, BaseEntity } from '@/common/network/graphql/commonTypes';
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes';
import type { ContactType, AddressType, SourceTable, TaskTiming, TaskAssigneeType, TaskHolidayPolicy } from './investmentEnums';

// Forward declaration for InvestmentRef to avoid circular dependencies
export interface InvestmentRef {
  id: string;
  code?: string;
  name: string;
  isin?: string;
  initialInvestmentAmount?: number;
  totalInvestmentAmount?: number;
  investmentMarketValue?: number;
}

// Forward declarations for reference types to avoid circular dependencies
export interface InvestmentAccountRef {
  id: string;
  code: string;
  name: string;
  // Fields used in investment queries (inline account selection)
  email?: string;
  phone?: string;
  foundationDate?: string; // ISO date string
  geographicPresence?: string;
  // Catalog references (inline)
  companySize?: CatalogEntry;
  accountAnnualRevenueBand?: CatalogEntry;
  industryClass?: CatalogEntry;
  // Employee reference (inline selections)
  ownerEmployee?: EmployeeRef;
  // Inline relation selection used in queries
  investmentAccountContact?: Array<{
    contactType?: ContactType;
    contact?: InvestmentContactRef;
  }>;
}

export interface InvestmentContactRef {
  id: string;
  code: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  // Fields used in nested contact selection within accountContact
  email?: string;
  phone?: string;
  department?: string;
  jobPosition?: string;
  picture?: string;
  pictureThumbnail?: string;
}

export interface InvestmentOpportunityRef {
  id: string;
  code: string;
  name: string;
  dealType?: string;
}

export interface InvestmentLeadRef {
  id: string;
  code: string;
  firstName?: string;
  lastName?: string;
}

// =====================================================
// INVESTMENT RELATIONS ENTITIES (from DBML)
// =====================================================

// investment_lead table
export interface BaseInvestmentLead extends BaseEntity {
  id: string;
  
  // Common Fields (from nw_common_relations.lead)
  code?: string;
  description?: string;
  sensitive?: boolean;
  conversionDate?: string; // ISO date string // ISO date string
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  position?: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  addressLine?: any; // Jsonb
  postalCode?: string;
  locality?: string;

  // Catalog references  
  timeZone?: CatalogEntry;
  salutation?: CatalogEntry;
  academicTitle?: CatalogEntry;
  legalForm?: CatalogEntry;
  companySize?: CatalogEntry;
  industryClass?: CatalogEntry;
  accountAnnualRevenueBand?: CatalogEntry;
  country?: CatalogEntry;
  region?: CatalogEntry;
  leadRating?: CatalogEntry;
  leadStatus?: CatalogEntry;
  leadSource?: CatalogEntry;

  // Entity references (using Ref types)
  ownerEmployee?: EmployeeRef;
  convertedAccount?: InvestmentAccountRef;
  convertedContact?: InvestmentContactRef;
  convertedOpportunity?: InvestmentOpportunityRef;

  // Domain Specific Fields
  investmentName?: string;
  investmentGroup?: CatalogEntry;
  investmentType?: CatalogEntry;
  investmentRole?: CatalogEntry;
  investmentStakeType?: CatalogEntry;
  stakePercentage?: number;
  marketValue?: number;
  initialInvestmentAmount?: number;
  loanAmount?: number;
  loanInterestRate?: number;
  requiredCapitalAmount?: number;
  forecastedProfitAmount?: number;
  annualNetColdRent?: number;
}

// investment_account table
export interface BaseInvestmentAccount extends BaseEntity {
  id: string;
  
  // Common Fields (from nw_common_relations.account)
  code?: string;
  name: string;
  foundationDate?: string; // ISO date string // ISO date string
  liquidationDate?: string; // ISO date string // ISO date string
  website?: string;
  email?: string;
  phone?: string;
  picture?: string;
  pictureThumbnail?: string;
  mission?: string;
  geographicPresence?: string;
  specialty?: string;
  notesSummary?: string;

  // Catalog references
  legalForm?: CatalogEntry;
  companySize?: CatalogEntry;
  industryClass?: CatalogEntry;
  accountAnnualRevenueBand?: CatalogEntry;
  timeZone?: CatalogEntry;
  
  // Entity references (using Ref types)
  ownerEmployee?: EmployeeRef;
}

// investment_contact table  
export interface BaseInvestmentContact extends BaseEntity {
  id: string;
  
  // Common Fields (from nw_common_relations.contact)
  code?: string;
  type?: ContactType;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  jobPosition?: string;
  department?: string;
  birthDate?: string; // ISO date string // ISO date string
  email?: string;
  phone?: string;
  picture?: string;
  pictureThumbnail?: string;
  description?: string;
  notesSummary?: string;

  // Catalog references
  salutation?: CatalogEntry;
  academicTitle?: CatalogEntry;
  language?: CatalogEntry;
  
  // Entity references (using Ref types)
  ownerEmployee?: EmployeeRef;
}

// investment_account_contact table
export interface BaseInvestmentAccountContact extends BaseEntity {
  id: string;
  
  // Common Fields
  contactType?: ContactType;
  
  // Entity references (using Ref types)
  account?: InvestmentAccountRef;
  contact?: InvestmentContactRef;
}

// investment_opportunity table
export interface BaseInvestmentOpportunity extends BaseEntity {
  id: string;
  
  // Common Fields (from nw_common_relations.opportunity)
  code?: string;
  name: string;
  notesSummary?: string;
  description?: string;
  probability?: number;
  lastInteraction?: string;
  closeDate?: string; // ISO date string
  estimatedAmount?: number;

  // Catalog references
  currency?: CatalogEntry;
  opportunityPipeline?: CatalogEntry;
  opportunityPipelineStage?: CatalogEntry;
  // Some queries may expose this as `stage`
  stage?: CatalogEntry;
  opportunityStatus?: CatalogEntry;
  
  // Entity references (using Ref types)
  ownerEmployee?: EmployeeRef;
  account?: InvestmentAccountRef;
  
  // Related investments (bidirectional relationship)
  investment?: InvestmentRef[]; // List of investments related to this opportunity

  // Domain Specific Fields
  dealType?: string; // INVESTMENT_DEAL, DINVESTMENT_DEAL, etc.
  investmentName?: string;
  investmentGroup?: CatalogEntry;
  investmentType?: CatalogEntry;
  investmentRole?: CatalogEntry;
  investmentStakeType?: CatalogEntry;
  stakePercentage?: number;
  marketValue?: number;
  initialInvestmentAmount?: number;
  loanAmount?: number;
  loanInterestRate?: number;
  requiredCapitalAmount?: number;
  forecastedProfitAmount?: number;
  annualNetColdRent?: number;
}

// investment_opportunity_contact table
export interface BaseInvestmentOpportunityContact extends BaseEntity {
  id: string;
  
  // Common Fields (from nw_common_relations.opportunity_contact)
  contactType?: ContactType;
  
  // Entity references (using Ref types)
  opportunity?: InvestmentOpportunityRef;
  contact?: InvestmentContactRef;
}

// investment_communication_channel table
export interface BaseInvestmentCommunicationChannel extends BaseEntity {
  id: string;
  
  // Common Fields (from nw_common_relations.communication_channel)
  source?: SourceTable;
  value?: string;
  valueExtension?: string;

  // Catalog references
  communicationChannel?: CatalogEntry;
  
  // Entity references (using Ref types)
  account?: InvestmentAccountRef;
  contact?: InvestmentContactRef;
  opportunity?: InvestmentOpportunityRef;
  lead?: InvestmentLeadRef;
}

// investment_address table
export interface BaseInvestmentAddress extends BaseEntity {
  id: string;
  
  // Common Fields (from nw_common_relations.address)
  source?: SourceTable;
  addressType?: AddressType;
  addressLine?: any; // Jsonb
  postalCode?: string;
  locality?: string;

  // Catalog references
  region?: CatalogEntry;
  country?: CatalogEntry;
  
  // Entity references (using Ref types)
  account?: InvestmentAccountRef;
  contact?: InvestmentContactRef;
  opportunity?: InvestmentOpportunityRef;
  lead?: InvestmentLeadRef;
}

// investment_note table
export interface BaseInvestmentNote extends BaseEntity {
  id: string;
  
  // Common Fields (from nw_common_relations.note)
  source?: SourceTable;
  title?: string;
  text?: string;
  reminderDate?: string; // ISO date string
  
  // Entity references (using Ref types)
  authorEmployee?: EmployeeRef;
  account?: InvestmentAccountRef;
  contact?: InvestmentContactRef;
  opportunity?: InvestmentOpportunityRef;
  lead?: InvestmentLeadRef;
}

// investment_document table
export interface BaseInvestmentDocument extends BaseEntity {
  id: string;
  
  // Common Fields (from nw_common_relations.document)
  source?: SourceTable;
  folder?: boolean;
  name?: string;
  description?: string;
  file?: string;
  fileSize?: number;
  mimeType?: string;
  verified?: boolean;
  verificationDate?: string; // ISO date string
  authenticated?: boolean;
  authenticationDate?: string; // ISO date string
  mandatory?: boolean;
  expirationDate?: string; // ISO date string
  
  // Catalog references
  documentGroup?: CatalogEntry;
  documentType?: CatalogEntry;
  
  // Entity references (using Ref types)
  parentDocument?: BaseInvestmentDocument;
  activity?: BaseInvestmentActivity;
  task?: BaseInvestmentTask;
  account?: InvestmentAccountRef;
  contact?: InvestmentContactRef;
  opportunity?: InvestmentOpportunityRef;
  lead?: InvestmentLeadRef;
}

// investment_activity table
export interface BaseInvestmentActivity extends BaseEntity {
  id: string;
  
  // Common Fields (from nw_common_relations.activity)
  source?: SourceTable;
  title?: string;
  description?: string;
  occurredAt?: string; // ISO datetime string
  completedAt?: string; // ISO datetime string

  // Catalog references
  activityType?: CatalogEntry;
  
  // Entity references (using Ref types)
  ownerEmployee?: EmployeeRef;
  account?: InvestmentAccountRef;
  contact?: InvestmentContactRef;
  opportunity?: InvestmentOpportunityRef;
  lead?: InvestmentLeadRef;
}

// investment_task_template table (missing from our current types)
export interface BaseInvestmentTaskTemplate extends BaseEntity {
  id: string;
  
  // Common Fields (from nw_common_relations.task_template)
  code?: string;
  name?: string;
  description?: string;
  displayOrder?: number;
  activeFrom?: string;
  activeTo?: string;
  enabled?: boolean;
  intervalDays?: number;
  durationDays?: number;
  daysOfWeek?: any; // jsonb
  daysOfMonth?: any; // jsonb
  monthsOfYear?: any; // jsonb
  assigneeType?: TaskAssigneeType;
  holidayPolicy?: TaskHolidayPolicy;
  nextStartDate?: string; // ISO date string

  // Catalog references
  type?: CatalogEntry;
  priority?: CatalogEntry;
  
  // Domain Specific Fields
  investmentType?: CatalogEntry;
}

// investment_task table
export interface BaseInvestmentTask extends BaseEntity {
  id: string;
  
  // Common Fields (from nw_common_relations.task)
  code?: string;
  name?: string;
  comment?: string;
  source?: SourceTable;
  description?: string;
  templateStartDate?: string; // ISO date string
  startDate?: string; // ISO date string
  dueDate?: string; // ISO date string
  endDate?: string; // ISO date string
  taskTiming?: TaskTiming;

  // Catalog references
  taskType?: CatalogEntry;
  taskPriority?: CatalogEntry;
  taskStatus?: CatalogEntry;
  
  // Entity references (using Ref types)
  creatorEmployee?: EmployeeRef;
  assignedEmployee?: EmployeeRef;
  creatorUserId?: string;
  assignedUserId?: string;
  taskTemplate?: BaseInvestmentTaskTemplate;
  account?: InvestmentAccountRef;
  contact?: InvestmentContactRef;
  lead?: InvestmentLeadRef;
  opportunity?: InvestmentOpportunityRef;
  // Note: investment reference will be added in investmentBaseTypes.ts
}

// investment_opportunity_stage_condition table
export interface BaseInvestmentOpportunityStageCondition extends BaseEntity {
  id: string;
  
  // Common Fields (from nw_common_relations.opportunity_stage_condition)
  configSnapshot?: any; // Jsonb
  deadlineAt?: string; // ISO datetime string
  completed?: boolean;
  completedAt?: string; // ISO datetime string

  // Catalog references
  opportunityPipelineStageCondition?: CatalogEntry;
  
  // Entity references (using Ref types)
  completedByEmployee?: EmployeeRef;
  opportunity?: InvestmentOpportunityRef;
  task?: BaseInvestmentTask;
}