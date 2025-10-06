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
  investmentRole?: Array<{
    id: string;
    displayOrder?: number;
    investmentRole?: CatalogEntry;
  }>;
}

// Forward declarations for reference types to avoid circular dependencies
export interface InvestmentAccountRef {
  id: string;
  code: string;
  name: string;
  // Fields used in investment queries (inline account selection)
  email?: string;
  phone?: string;
  website?: string;
  foundationDate?: string; // ISO date string
  geographicPresence?: string;
  picture?: string;
  pictureThumbnail?: string;
  // Address information
  addresses?: Array<{
    id: string;
    addressType?: string;
    addressLine?: any; // Jsonb
    postalCode?: string;
    locality?: string;
    region?: CatalogEntry;
    country?: CatalogEntry;
  }>;
  // Catalog references (inline)
  legalForm?: CatalogEntry;
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
  // Catalog references
  academicTitle?: CatalogEntry;
  salutation?: CatalogEntry;
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

export interface InvestmentRoleRef {
  id: string;
  displayOrder?: number;
  investmentRole?: CatalogEntry;
  isDeleted?: boolean;
  version?: number;
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
  buildingYear?: string;
  size?: number;
  sizeMeasurementUnit?: CatalogEntry;
  sizeMeasurementUnitRef?: string;
}

// investment_account table
export interface BaseInvestmentAccount extends BaseEntity {
  id: string;
  
  // Common Fields (from nw_common_relations.account)
  code?: string;
  name: string;
  foundationDate?: string; // ISO date string
  liquidationDate?: string; // ISO date string
  website?: string;
  email?: string;
  phone?: string;
  picture?: string;
  pictureThumbnail?: string;
  mission?: string;
  geographicPresence?: string;
  specialty?: string;
  notesSummary?: string;
  
  // Additional fields from GraphQL schema
  businessKey?: string;
  additionalProperties?: any; // Jsonb
  processInstanceId?: string;
  synchronizedAt?: string; // timestamptz

  // Address information
  addresses?: Array<{
    id: string;
    addressType?: string;
    addressLine?: any; // Jsonb
    postalCode?: string;
    locality?: string;
    region?: CatalogEntry;
    country?: CatalogEntry;
  }>;

  // Communication channels
  communicationChannels?: Array<{
    id: string;
    source?: string;
    value?: string;
    valueExtension?: string;
    communicationChannel?: CatalogEntry;
    communicationChannelRef?: string;
    accountId?: string; // uuid
    contactId?: string; // uuid
    leadId?: string; // uuid
    opportunityId?: string; // uuid
    additionalProperties?: any; // Jsonb
    businessKey?: string;
    processInstanceId?: string;
    synchronizedAt?: string; // timestamptz
  } & BaseEntity>;

  // Catalog references
  legalForm?: CatalogEntry;
  companySize?: CatalogEntry;
  industryClass?: CatalogEntry;
  accountAnnualRevenueBand?: CatalogEntry;
  timeZone?: CatalogEntry;
  
  // Entity references (using Ref types)
  ownerEmployee?: EmployeeRef;
  
  // Address relationships
  investmentAddress?: BaseInvestmentAddress[];
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

  // Communication channels
  communicationChannels?: Array<{
    id: string;
    source?: string;
    value?: string;
    valueExtension?: string;
    communicationChannel?: CatalogEntry;
    communicationChannelRef?: string;
    accountId?: string; // uuid
    contactId?: string; // uuid
    leadId?: string; // uuid
    opportunityId?: string; // uuid
    additionalProperties?: any; // Jsonb
    businessKey?: string;
    processInstanceId?: string;
    synchronizedAt?: string; // timestamptz
  } & BaseEntity>;

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
  // Pipeline with stages (GraphQL provides childEntries on catalog entry)
  opportunityPipeline?: CatalogEntry & { childEntries?: CatalogEntry[] };
  opportunityPipelineStage?: CatalogEntry;
  // Some queries may expose this as `stage`
  stage?: CatalogEntry;
  opportunityStatus?: CatalogEntry;
  
  // Entity references (using Ref types)
  ownerEmployee?: EmployeeRef;
  account?: InvestmentAccountRef;
  
  // Contact relationships
  investmentOpportunityContact?: Array<{
    id: string;
    contactType?: ContactType;
    contact?: InvestmentContactRef;
  }>;
  
  // Related investments (bidirectional relationship)
  investment?: InvestmentRef[]; // List of investments related to this opportunity

  // Domain Specific Fields
  dealType?: string; // INVESTMENT_DEAL, DIVESTMENT_DEAL, etc.
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
  buildingYear?: string;
  size?: number;
  sizeMeasurementUnit?: CatalogEntry;
  sizeMeasurementUnitRef?: string;
  currencyRef?: string;

  // Stage conditions relationship (statuses per stage condition)
  opportunityStageConditions?: BaseInvestmentOpportunityStageCondition[];
}

// investment_opportunity_contact table (used for standalone entities)
export interface BaseInvestmentOpportunityContact extends BaseEntity {
  id: string;
  
  // Common Fields (from nw_common_relations.opportunity_contact)
  contactType?: ContactType;
  
  // Entity references (using Ref types)
  opportunity?: InvestmentOpportunityRef;
  contact?: InvestmentContactRef; // Use ContactRef for consistency
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
  investment?: InvestmentRef;
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
  fileInfo?: any; // JSONB field containing file metadata
  fileSize?: number;
  mimeType?: string;
  verified?: boolean;
  verificationDate?: string; // ISO date string
  authenticated?: boolean;
  authenticationDate?: string; // ISO date string
  mandatory?: boolean;
  expirationDate?: string; // ISO date string
  version: number;
  
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
  investment?: InvestmentRef; // Add investment relationship
}

// investment_activity table
export interface BaseInvestmentActivity extends BaseEntity {
  id: string;
  version: number;
  // Common Fields (from nw_common_relations.activity)
  source?: SourceTable;
  title?: string;
  description?: string;
  occurredAt?: string; // ISO datetime string
  completedAt?: string; // ISO datetime string

  // Catalog references
  activityTypeRef?: string;
  activityType?: CatalogEntry;
  
  // Entity references (using Ref types)
  investment?: InvestmentRef;
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
  investment?: InvestmentRef;
  creatorEmployee?: EmployeeRef;
  assignedEmployee?: EmployeeRef;
  creatorUserId?: string;
  assignedUserId?: string;
  taskTemplate?: BaseInvestmentTaskTemplate;
  account?: InvestmentAccountRef;
  contact?: InvestmentContactRef;
  lead?: InvestmentLeadRef;
  opportunity?: InvestmentOpportunityRef;
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