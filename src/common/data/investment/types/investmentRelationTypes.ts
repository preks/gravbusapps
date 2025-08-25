// Enhanced types that extend base types and add computed fields for CRM relation entities

import {
  BaseInvestmentAccount,
  BaseInvestmentContact,
  BaseInvestmentLead,
  BaseInvestmentOpportunity,
  BaseInvestmentAddress,
  BaseInvestmentNote,
  BaseInvestmentDocument,
  BaseInvestmentActivity,
  BaseInvestmentTask,
  BaseInvestmentTaskTemplate,
  BaseInvestmentCommunicationChannel,
  BaseInvestmentAccountContact,
  BaseInvestmentOpportunityContact,
  BaseInvestmentOpportunityStageCondition
} from './investmentRelationBaseTypes';

// Enhanced InvestmentAccount type with computed fields
export interface InvestmentAccount extends BaseInvestmentAccount {
  // Computed display fields only
  displayName: string;
  legalFormLabel?: string;
  companySizeLabel?: string;
  industryClassLabel?: string;
  accountAnnualRevenueBandLabel?: string;
  timeZoneLabel?: string;
  ownerDisplayName?: string;
}

// Enhanced InvestmentContact type with computed fields  
export interface InvestmentContact extends BaseInvestmentContact {
  // Computed display fields only
  displayName: string;
  fullName: string;
  salutationLabel?: string;
  academicTitleLabel?: string;
  languageLabel?: string;
  ownerDisplayName?: string;
}

// Enhanced InvestmentLead type with computed fields
export interface InvestmentLead extends BaseInvestmentLead {
  // Computed display fields only
  displayName: string;
  fullName: string;
  salutationLabel?: string;
  academicTitleLabel?: string;
  legalFormLabel?: string;
  companySizeLabel?: string;
  industryClassLabel?: string;
  accountAnnualRevenueBandLabel?: string;
  countryLabel?: string;
  regionLabel?: string;
  timeZoneLabel?: string;
  leadRatingLabel?: string;
  leadStatusLabel?: string;
  leadSourceLabel?: string;
  investmentGroupLabel?: string;
  investmentTypeLabel?: string;
  investmentRoleLabel?: string;
  investmentStakeTypeLabel?: string;
  ownerDisplayName?: string;
}

// Enhanced InvestmentOpportunity type with computed fields
export interface InvestmentOpportunity extends BaseInvestmentOpportunity {
  // Computed display fields only
  displayName: string;
  currencyLabel?: string;
  opportunityPipelineLabel?: string;
  opportunityPipelineStageLabel?: string;
  opportunityStatusLabel?: string;
  investmentGroupLabel?: string;
  investmentTypeLabel?: string;
  investmentRoleLabel?: string;
  investmentStakeTypeLabel?: string;
  ownerDisplayName?: string;
  accountDisplayName?: string;
}

// Enhanced InvestmentAccountContact type with computed fields
export interface InvestmentAccountContact extends BaseInvestmentAccountContact {
  // Computed display fields only
  displayName: string;
  accountDisplayName?: string;
  contactDisplayName?: string;
}

// Enhanced InvestmentOpportunityContact type with computed fields
export interface InvestmentOpportunityContact extends BaseInvestmentOpportunityContact {
  // Computed display fields only
  displayName: string;
  opportunityDisplayName?: string;
  contactDisplayName?: string;
}

// Enhanced InvestmentCommunicationChannel type with computed fields
export interface InvestmentCommunicationChannel extends BaseInvestmentCommunicationChannel {
  // Computed display fields only
  displayName: string;
  communicationChannelLabel?: string;
  accountDisplayName?: string;
  contactDisplayName?: string;
  opportunityDisplayName?: string;
  leadDisplayName?: string;
}

// Enhanced InvestmentAddress type with computed fields
export interface InvestmentAddress extends BaseInvestmentAddress {
  // Computed display fields only
  displayName: string;
  fullAddress: string;
  regionLabel?: string;
  countryLabel?: string;
  accountDisplayName?: string;
  contactDisplayName?: string;
  opportunityDisplayName?: string;
  leadDisplayName?: string;
}

// Enhanced InvestmentNote type with computed fields
export interface InvestmentNote extends BaseInvestmentNote {
  // Computed display fields only
  displayName: string;
  authorDisplayName?: string;
  accountDisplayName?: string;
  contactDisplayName?: string;
  opportunityDisplayName?: string;
  leadDisplayName?: string;
}

// Enhanced InvestmentDocument type with computed fields
export interface InvestmentDocument extends BaseInvestmentDocument {
  // Computed display fields only
  displayName: string;
  documentGroupLabel?: string;
  documentTypeLabel?: string;
  fileSizeFormatted?: string;
  accountDisplayName?: string;
  contactDisplayName?: string;
  opportunityDisplayName?: string;
  leadDisplayName?: string;
}

// Enhanced InvestmentActivity type with computed fields
export interface InvestmentActivity extends BaseInvestmentActivity {
  // Computed display fields only
  displayName: string;
  activityTypeLabel?: string;
  ownerDisplayName?: string;
  accountDisplayName?: string;
  contactDisplayName?: string;
  opportunityDisplayName?: string;
  leadDisplayName?: string;
}

// Enhanced InvestmentTaskTemplate type with computed fields
export interface InvestmentTaskTemplate extends BaseInvestmentTaskTemplate {
  // Computed display fields only
  displayName: string;
  typeLabel?: string;
  priorityLabel?: string;
  investmentTypeLabel?: string;
}

// Enhanced InvestmentTask type with computed fields
export interface InvestmentTask extends BaseInvestmentTask {
  // Computed display fields only
  displayName: string;
  taskTypeLabel?: string;
  taskPriorityLabel?: string;
  taskStatusLabel?: string;
  creatorDisplayName?: string;
  assignedDisplayName?: string;
  accountDisplayName?: string;
  contactDisplayName?: string;
  leadDisplayName?: string;
  opportunityDisplayName?: string;
}

// Enhanced InvestmentOpportunityStageCondition type with computed fields
export interface InvestmentOpportunityStageCondition extends BaseInvestmentOpportunityStageCondition {
  // Computed display fields only
  displayName: string;
  opportunityPipelineStageConditionLabel?: string;
  completedByDisplayName?: string;
  opportunityDisplayName?: string;
}

// Re-export base types for convenience
export type {
  BaseInvestmentAccount,
  BaseInvestmentContact,
  BaseInvestmentLead,
  BaseInvestmentOpportunity,
  BaseInvestmentAddress,
  BaseInvestmentNote,
  BaseInvestmentDocument,
  BaseInvestmentActivity,
  BaseInvestmentTask,
  BaseInvestmentTaskTemplate,
  BaseInvestmentCommunicationChannel,
  BaseInvestmentAccountContact,
  BaseInvestmentOpportunityContact,
  BaseInvestmentOpportunityStageCondition
};