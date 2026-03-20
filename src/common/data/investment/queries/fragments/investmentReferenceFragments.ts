/**
 * Investment Reference Fragments (REF)
 *
 * Contains ALL lightweight reference fragments for Investment Relations entities.
 * These fragments include ONLY scalar fields, catalog entries, and AUDIT_FIELDS.
 * NO entity relations (no arrays, no nested entities beyond catalogs).
 *
 * This file MUST be imported BEFORE investmentFragments.ts to ensure proper initialization.
 */

import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import {
  COMMON_LEAD_FIELDS,
  COMMON_ACCOUNT_FIELDS,
  COMMON_CONTACT_FIELDS,
  COMMON_OPPORTUNITY_FIELDS,
  COMMON_OPPORTUNITY_STAGE_CONDITION_REF,
  COMMON_TASK_TEMPLATE_FIELDS,
  COMMON_TASK_COMMENT_FIELDS,
  COMMON_ACTIVITY_FIELDS,
  COMMON_DOCUMENT_FIELDS,
  COMMON_NOTE_FIELDS
} from '@/common/data/relations/queries/commonFragments'

// Re-export for backward compatibility with old fragments
export { COMMUNICATION_CHANNEL_REF as INVESTMENT_COMMUNICATION_CHANNEL } from '@/common/data/common/queries/communicationChannelFragments'
export { ADDRESS_REF as INVESTMENT_ADDRESS } from '@/common/data/common/queries/addressFragments'

/**
 * ============================================================================
 * INVESTMENT_ACCOUNT_REF
 * ============================================================================
 * Investment Account Reference Fragment
 * Extends COMMON_ACCOUNT_FIELDS with IRM-specific scalar fields
 * NO entity relations (no arrays like tasks, documents, etc.)
 */
export const INVESTMENT_ACCOUNT_REF = `
  ${COMMON_ACCOUNT_FIELDS}
  
  # Base fields for mapping (IRM-specific correct names - no mapping needed)
  accountAnnualRevenueBand {
    ${CATALOG_ENTRY}
  }
  accountAnnualRevenueBandRef
  companySize {
    ${CATALOG_ENTRY}
  }
  companySizeRef
  industryClass {
    ${CATALOG_ENTRY}
  }
  industryClassRef
  picture
  pictureThumbnail
  website
`

/**
 * ============================================================================
 * INVESTMENT_CONTACT_REF
 * ============================================================================
 * Investment Contact Reference Fragment
 * Extends COMMON_CONTACT_FIELDS with IRM-specific scalar fields
 * NO entity relations (no arrays like investmentAccountContact, investmentLead, etc.)
 */
export const INVESTMENT_CONTACT_REF = `
  ${COMMON_CONTACT_FIELDS}
  description
  fullName
  jobPosition
  picture
  pictureThumbnail
  userId
`

/**
 * ============================================================================
 * INVESTMENT_LEAD_REF
 * ============================================================================
 * TODO: salutation -> common
 */
export const INVESTMENT_LEAD_REF = `
  ${COMMON_LEAD_FIELDS}
  
  # IRM-specific fields
  annualNetColdRent
  buildingYear
  forecastedProfitAmount
  industryClass {
    ${CATALOG_ENTRY}
  }
  industryClassRef
  initialInvestmentAmount
  investmentGroup {
    ${CATALOG_ENTRY}
  }
  investmentGroupRef
  investmentName
  investmentRole {
    ${CATALOG_ENTRY}
  }
  investmentRoleRef
  investmentStakeType {
    ${CATALOG_ENTRY}
  }
  investmentStakeTypeRef
  investmentType {
    ${CATALOG_ENTRY}
  }
  investmentTypeRef
  leadSourceType
  legalForm {
    ${CATALOG_ENTRY}
  }
  legalFormRef
  loanAmount
  loanInterestRate
  marketValue
  requiredCapitalAmount
  size
  sizeMeasurementUnit {
    ${CATALOG_ENTRY}
  }
  sizeMeasurementUnitRef
  stakePercentage
  timeZone {
    ${CATALOG_ENTRY}
  }
  timeZoneRef
`

/**
 * ============================================================================
 * INVESTMENT_OPPORTUNITY_REF
 * ============================================================================
 * Investment Opportunity Reference Fragment
 * Extends COMMON_OPPORTUNITY_FIELDS with IRM-specific scalar fields
 * NO entity relations (no arrays like tasks, documents, etc.)
 */
export const INVESTMENT_OPPORTUNITY_REF = `
  ${COMMON_OPPORTUNITY_FIELDS}
  
  # IRM-specific fields
  annualNetColdRent
  buildingYear
  dealType
  divestmentId
  forecastedProfitAmount
  initialInvestmentAmount
  investmentGroup {
    ${CATALOG_ENTRY}
  }
  investmentGroupRef
  investmentName
  investmentRole {
    ${CATALOG_ENTRY}
  }
  investmentRoleRef
  investmentStakeType {
    ${CATALOG_ENTRY}
  }
  investmentStakeTypeRef
  investmentType {
    ${CATALOG_ENTRY}
  }
  investmentTypeRef
  loanAmount
  loanInterestRate
  marketValue
  opportunityPipeline {
    ${CATALOG_ENTRY}
    childEntries(orderBy: { displayOrder: ASC }) {
      id
      code
      value
      alternativeCode
      displayOrder
      parentEntryId
    }
  }
  opportunityPipelineRef
  opportunityPipelineStage {
    ${CATALOG_ENTRY}
  }
  opportunityPipelineStageRef
  requiredCapitalAmount
  size
  sizeMeasurementUnit {
    ${CATALOG_ENTRY}
  }
  sizeMeasurementUnitRef
  stakePercentage
`

/**
 * ============================================================================
 * INVESTMENT_OPPORTUNITY_STAGE_CONDITION_REF
 * ============================================================================
 * Investment Opportunity Stage Condition Reference Fragment
 * Extends COMMON_OPPORTUNITY_STAGE_CONDITION_REF with IRM-specific scalar fields
 * NO entity relations
 */
export const INVESTMENT_OPPORTUNITY_STAGE_CONDITION_REF = `
  ${COMMON_OPPORTUNITY_STAGE_CONDITION_REF}
  
  # IRM-specific fields (correct names)
  opportunityId
  opportunityPipelineStageCondition {
    ${CATALOG_ENTRY}
  }
  opportunityPipelineStageConditionRef
  taskId
`

/**
 * Task Assignee Fragment for IRM
 * Used within INVESTMENT_TASK_REF to include multiple assignees
 */
const INVESTMENT_TASK_ASSIGNEE_FRAGMENT = `
  id
  taskId
  assignedEmployee {
    ${EMPLOYEE_REF}
  }
  assignedEmployeeId
  assignedUserId
  taskStatus
  completedAt
  ${AUDIT_FIELDS}
`

/**
 * ============================================================================
 * INVESTMENT_TASK_REF
 * ============================================================================
 * IRM-specific task reference fragment
 * IMPORTANT: Uses taskAssignees (multiple assignees), not assignedEmployee
 */
export const INVESTMENT_TASK_REF = `
  ${AUDIT_FIELDS}
  # Task Assignees (multiple assignees - NEW for IRM)
  taskAssignees(where: { isDeleted: { _eq: false } }) {
    ${INVESTMENT_TASK_ASSIGNEE_FRAGMENT}
  }
  code
  creatorEmployee {
    ${EMPLOYEE_REF}
  }
  creatorEmployeeId
  creatorUserId
  description
  dueDate
  endDate
  id
  name
  source
  startDate
  taskPriority {
    ${CATALOG_ENTRY}
  }
  taskPriorityRef
  taskStatus {
    ${CATALOG_ENTRY}
  }
  taskStatusRef
  taskTiming
  taskType {
    ${CATALOG_ENTRY}
  }
  taskTypeRef
`

/**
 * ============================================================================
 * INVESTMENT_TASK_TEMPLATE_REF
 * ============================================================================
 */
export const INVESTMENT_TASK_TEMPLATE_REF = `
  ${COMMON_TASK_TEMPLATE_FIELDS}
  description
  investmentGroup {
    ${CATALOG_ENTRY}
  }
  investmentGroupRef
  investmentType {
    ${CATALOG_ENTRY}
  }
  investmentTypeRef
`

/**
 * ============================================================================
 * INVESTMENT_TASK_COMMENT_REF
 * ============================================================================
 */
export const INVESTMENT_TASK_COMMENT_REF = `
  ${COMMON_TASK_COMMENT_FIELDS}
`

/**
 * ============================================================================
 * INVESTMENT_ACTIVITY_REF
 * ============================================================================
 */
export const INVESTMENT_ACTIVITY_REF = `
  ${COMMON_ACTIVITY_FIELDS}
`

/**
 * ============================================================================
 * INVESTMENT_DOCUMENT_REF
 * ============================================================================
 */
export const INVESTMENT_DOCUMENT_REF = `
  ${COMMON_DOCUMENT_FIELDS}
`

/**
 * ============================================================================
 * INVESTMENT_NOTE_REF
 * ============================================================================
 * TODO: Move title/text to COMMON_NOTE_FIELDS
 */
export const INVESTMENT_NOTE_REF = `
  ${COMMON_NOTE_FIELDS}

  title
  text
`

/**
 * ============================================================================
 * INVESTMENT_REPORT_REF
 * ============================================================================
 * Investment Report Reference Fragment
 * Base fields for InvestmentReport
 * Does NOT include entity relations to avoid recursive loops
 * Core fields with catalog entries, no entity relations
 */
export const INVESTMENT_REPORT_REF = `
  id
  date
  forecast
  ${AUDIT_FIELDS}
  
  # Financial data
  forecastedRevenueAmount
  forecastedProfitAmount
  debtFinancingAmount
  fundManagerName
  identification
  
  # Catalog references
  currency {
    ${CATALOG_ENTRY}
  }
  currencyRef
`

/**
 * ============================================================================
 * INVESTMENT_REF
 * ============================================================================
 * Investment Reference Fragment
 * Core investment fields for references
 */
export const INVESTMENT_REF = `
    ${AUDIT_FIELDS}
    id
    code
    name
    isin
    initialInvestmentAmount
    totalInvestmentAmount
    investmentMarketValue
    acquisitionDate
    exitDate
    plannedExitDate
    planedExit
    additionalProperties
    
    # Basic investment info
    investmentGroup {
      ${CATALOG_ENTRY}
    }
    investmentType {
      ${CATALOG_ENTRY}
    }
    investmentStatus {
      ${CATALOG_ENTRY}
    }
    ownerEmployee {
      id
      firstName
      lastName
      pictureThumbnail

    }
    currency {
      ${CATALOG_ENTRY}
    }
`

/**
 * ============================================================================
 * Investment Specialization REF Fragments
 * ============================================================================
 */

/**
 * EQUITY_INVESTMENT_REF
 * Equity investment reference fields
 */
export const EQUITY_INVESTMENT_REF = `
    id
    version
    foundationDate
    marketValue
    ebitdaAmount
    turnoverAmount
    additionalProperties
    ${AUDIT_FIELDS}
    
    # Investment rounds (only active, non-deleted rounds)
    equityInvestmentRound(where: { isDeleted: { _eq: false } }, orderBy: { year: DESC_NULLS_LAST }) {
        id
        name
        year
        preValue
        investmentVolume
        volumeShare
        roundSharePercentage
        currencyRef
        currency {
            ${CATALOG_ENTRY}
        }
        investmentOpportunityId
        investmentOpportunity {
            id
            name
        }
        additionalProperties
        ${AUDIT_FIELDS}
    }
    
    # Investment reports (only active, non-deleted reports)
    equityInvestmentReport(where: { isDeleted: { _eq: false } }, orderBy: { date: DESC_NULLS_LAST }) {
        id
        date
        marketValue
        turnoverAmount
        ebitdaAmount
        additionalProperties
    }
`

/**
 * REAL_ESTATE_INVESTMENT_REF
 * Real estate investment reference fields
 */
export const REAL_ESTATE_INVESTMENT_REF = `
    id
    version
    buildingYear
    numberOfUnits
    annualNetColdRent
    actualAnnualExpenses
    targetAnnualExpenses
    funding
    occupancyPercent
    size
    sizeMeasurementUnitRef
    sizeMeasurementUnit {
        ${CATALOG_ENTRY}
    }
    locality
    postalCode
    liquidityForecast
    additionalProperties
`

/**
 * LIQUID_FUND_INVESTMENT_REF
 * Liquid fund investment reference fields
 */
export const LIQUID_FUND_INVESTMENT_REF = `
    id
    version
    proprietorName
    bankName
    bankAccountNumber
    earlyTerminationAllowed
    interestRate
    maturityDate
    additionalProperties
    
    # Investment liquid fund type
    investmentLiquidFundType {
        ${CATALOG_ENTRY}
    }
`
