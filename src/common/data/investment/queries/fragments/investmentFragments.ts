/**
 * Investment Main Fragments
 *
 * Contains ALL complete fragments for Investment Relations entities with entity relations.
 * These fragments extend their corresponding REF fragments and add entity relations.
 *
 * This file MUST be imported AFTER investmentReferenceFragments.ts.
 */

import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { ADDRESS_REF } from '@/common/data/common/queries/addressFragments'
import { COMMUNICATION_CHANNEL_REF } from '@/common/data/common/queries/communicationChannelFragments'
import { InvestmentAccountFields } from '../../types/investmentAccountTypes'
import { InvestmentContactFields } from '../../types/investmentContactTypes'
import {
  INVESTMENT_ACCOUNT_REF,
  INVESTMENT_CONTACT_REF,
  INVESTMENT_LEAD_REF,
  INVESTMENT_OPPORTUNITY_REF,
  INVESTMENT_TASK_REF,
  INVESTMENT_ACTIVITY_REF,
  INVESTMENT_DOCUMENT_REF,
  INVESTMENT_NOTE_REF,
  INVESTMENT_REF,
  EQUITY_INVESTMENT_REF,
  REAL_ESTATE_INVESTMENT_REF,
  LIQUID_FUND_INVESTMENT_REF
} from './investmentReferenceFragments'

/**
 * ============================================================================
 * INVESTMENT_OPPORTUNITY
 * ============================================================================
 * Investment Opportunity Fragment
 * Extends INVESTMENT_OPPORTUNITY_REF with entity relations
 */
export const INVESTMENT_OPPORTUNITY = `
  ${INVESTMENT_OPPORTUNITY_REF}
  
  # Entity relations (via junction table)
  # GraphQL field name: opportunityAccounts (not investmentOpportunityAccounts)
  opportunityAccounts(where: { isDeleted: { _eq: false } }) {
    id
    version
    opportunityId
    accountId
    accountTypeRef
    accountType {
      ${CATALOG_ENTRY}
    }
    account {
      ${INVESTMENT_ACCOUNT_REF}
    }
  }
  
  activities(where: { isDeleted: { _eq: false } }) {
    ${INVESTMENT_ACTIVITY_REF}
  }
  
  addresses(where: { isDeleted: { _eq: false } }) {
    ${ADDRESS_REF}
  }
  
  communicationChannels(where: { isDeleted: { _eq: false } }) {
    ${COMMUNICATION_CHANNEL_REF}
  }
  
  divestment {
    ${INVESTMENT_REF}
  }
  
  documents(where: { isDeleted: { _eq: false } }) {
    ${INVESTMENT_DOCUMENT_REF}
  }
  
  notes(where: { isDeleted: { _eq: false } }) {
    ${INVESTMENT_NOTE_REF}
  }
  
  rejectionReasons(where: { isDeleted: { _eq: false } }) {
    id
    ${AUDIT_FIELDS}
    rejectionReason {
    ${CATALOG_ENTRY}
    }
    rejectionReasonRef
    opportunityId
  }
  
  tasks(where: { isDeleted: { _eq: false } }) {
    ${INVESTMENT_TASK_REF}
  }
  
  # TODO: Map "investment" to "investments" in mapper
  investment(where: { isDeleted: { _eq: false } }) {
    ${INVESTMENT_REF}
  }
  
  # TODO: Map "investmentLead" to "leads" in mapper
  investmentLead(where: { isDeleted: { _eq: false } }) {
    ${INVESTMENT_LEAD_REF}
  }
  
  # TODO: Map "investmentOpportunityContact" to "opportunityContacts" in mapper
  investmentOpportunityContact(where: { isDeleted: { _eq: false } }) {
    id
    ${AUDIT_FIELDS}
    contactId
    contactType
    opportunityId
    contact {
      ${INVESTMENT_CONTACT_REF}
    }
  }
  
  # TODO: Map "investmentOpportunityStageCondition" to "opportunityStageConditions" in mapper
  investmentOpportunityStageCondition(where: { isDeleted: { _eq: false } }) {
    id
    ${AUDIT_FIELDS}
    completed
    completedAt
    completedByEmployee {
      ${EMPLOYEE_REF}
    }
    completedByEmployeeId
    configSnapshot
    deadlineAt
    opportunityId
    opportunityPipelineStageCondition {
      ${CATALOG_ENTRY}
      parentEntryId
    }
    opportunityPipelineStageConditionRef
    task {
      ${INVESTMENT_TASK_REF}
    }
    taskId
  }
  
  # IRM duplicate relations
  investmentActivity(where: { isDeleted: { _eq: false } }) {
    ${INVESTMENT_ACTIVITY_REF}
  }
  
  investmentAddress(where: { isDeleted: { _eq: false } }) {
    ${ADDRESS_REF}
  }
  
  investmentCommunicationChannel(where: { isDeleted: { _eq: false } }) {
    ${COMMUNICATION_CHANNEL_REF}
  }
  
  investmentDocument(where: { isDeleted: { _eq: false } }) {
    ${INVESTMENT_DOCUMENT_REF}
  }
  
  investmentNote(where: { isDeleted: { _eq: false } }) {
    ${INVESTMENT_NOTE_REF}
  }
  
  investmentTask(where: { isDeleted: { _eq: false } }) {
    ${INVESTMENT_TASK_REF}
  }
`

// Investment Shareholder fragment
export const INVESTMENT_SHAREHOLDER = `
    id
    name
    description
    stakePercentage
    activeFrom
    activeTo
    investmentId
    businessKey
    ${AUDIT_FIELDS}
`

/**
 * ============================================================================
 * INVESTMENT_DOCUMENT
 * ============================================================================
 */
export const INVESTMENT_DOCUMENT = `
  ${INVESTMENT_DOCUMENT_REF}
  account { ${INVESTMENT_ACCOUNT_REF} }
  accountId
  contact { ${INVESTMENT_CONTACT_REF} }
  contactId
  opportunity { ${INVESTMENT_OPPORTUNITY_REF} }
  opportunityId
  lead { ${INVESTMENT_LEAD_REF} }
  leadId
  task { ${INVESTMENT_TASK_REF} }
  taskId
  activity { ${INVESTMENT_ACTIVITY_REF} }
  activityId
  note { ${INVESTMENT_NOTE_REF} }
  noteId
`
/**
 * ============================================================================
 * INVESTMENT
 * ============================================================================
 * Complete Investment Fragment
 */
export const INVESTMENT = `
    id
    code
    name
    isin
    acquisitionDate
    planedExit
    plannedExitDate
    exitDate
    initialInvestmentAmount
    totalInvestmentAmount
    investmentMarketValue
    debtFinancingAmount
    requiredCapitalAmount
    forecastedRevenueAmount
    forecastedProfitAmount
    stakePercentage
    loanRecipientName
    loanAmount
    loanOpenCommitmentAmount
    loanInterestRate
    loanStartDate
    loanEndDate
    loanInterestClaim
    totalCommitmentAmount
    totalDistributionAmount
    fundManagerName
    irr
    moic
    additionalProperties
    ${AUDIT_FIELDS}

    # Catalog relationships
    investmentGroup {
        ${CATALOG_ENTRY}
    }
    investmentType {
        ${CATALOG_ENTRY}
    }
    investmentStakeType {
        ${CATALOG_ENTRY}
    }
    investmentPhase {
        ${CATALOG_ENTRY}
    }
    investmentStatus {
        ${CATALOG_ENTRY}
    }
    investmentRiskLevel {
        ${CATALOG_ENTRY}
    }
    currency {
        ${CATALOG_ENTRY}
    }

    # Employee relationship
    ownerEmployee {
        ${EMPLOYEE_REF}
    }
    
    # Investment Role relationships (array)
    investmentRole(where: { isDeleted: { _eq: false } }, orderBy: { displayOrder: ASC_NULLS_LAST }) {
        id
        version
        displayOrder
        isDeleted
        investmentRole {
            ${CATALOG_ENTRY}
        }
    }
    
    # Entity relationships (via junction table)
    # GraphQL field name: investmentAccounts (not investmentInvestmentAccounts)
    investmentAccounts(where: { isDeleted: { _eq: false } }) {
        id
        version
        investmentId
        investmentAccountId
        investmentAccountTypeRef
        investmentAccountType {
            ${CATALOG_ENTRY}
        }
        investmentAccount {
            ${INVESTMENT_ACCOUNT_REF}
            ${InvestmentAccountFields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
                ${COMMUNICATION_CHANNEL_REF}
            }
            ${InvestmentAccountFields.addresses}(where: { isDeleted: { _eq: false } }) {
                ${ADDRESS_REF}
            }
            investmentAccountContact {
                contactType
                contact {
                    ${INVESTMENT_CONTACT_REF}
                    ${InvestmentContactFields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
                        ${COMMUNICATION_CHANNEL_REF}
                    }
                }
            }
        }
    }
    
    investmentOpportunity {
        ${INVESTMENT_OPPORTUNITY_REF}
    }
    
    # Loan recipient investment account
    loanRecipientInvestmentAccount {
        ${INVESTMENT_ACCOUNT_REF}
    }
    
    # All investment specializations with full details
    equityInvestment {
        ${EQUITY_INVESTMENT_REF}
    }
    
    realEstateInvestment {
        ${REAL_ESTATE_INVESTMENT_REF}
    }
    
    liquidFundInvestment {
        ${LIQUID_FUND_INVESTMENT_REF}
    }
`

/**
 * ============================================================================
 * Investment Specialization Fragments
 * ============================================================================
 */

/**
 * EQUITY_INVESTMENT
 * Complete equity investment fragment
 */
export const EQUITY_INVESTMENT = `
    id
    version
    foundationDate
    marketValue
    turnoverAmount
    ebitdaAmount
    additionalProperties
    ${AUDIT_FIELDS}
    
    # Investment relationship
    investment {
        id
        name
        code
    }
    
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
 * REAL_ESTATE_INVESTMENT
 * Complete real estate investment fragment
 */
export const REAL_ESTATE_INVESTMENT = `
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
    locality
    postalCode
    addressLine
    liquidityForecast
    additionalProperties
    ${AUDIT_FIELDS}
    
    # Investment relationship
    investment {
        id
        name
        code
    }
    
    # Location relationships
    country {
        ${CATALOG_ENTRY}
    }
    region {
        ${CATALOG_ENTRY}
    }
    
    # Size measurement unit
    sizeMeasurementUnit {
        ${CATALOG_ENTRY}
    }
    
    # Investment reports (only active, non-deleted reports)
    realEstateInvestmentReport(where: { isDeleted: { _eq: false } }, orderBy: { date: DESC_NULLS_LAST }) {
        id
        date
        actualAnnualExpenses
        annualNetColdRent
        funding
        numberOfUnits
        occupancyPercent
        size
        sizeMeasurementUnitRef
        liquidityForecast
        additionalProperties
        ${AUDIT_FIELDS}
    }
`

/**
 * LIQUID_FUND_INVESTMENT
 * Complete liquid fund investment fragment
 */
export const LIQUID_FUND_INVESTMENT = `
    id
    version
    proprietorName
    bankName
    bankAccountNumber
    earlyTerminationAllowed
    interestRate
    maturityDate
    additionalProperties
    ${AUDIT_FIELDS}
    
    # Investment relationship
    investment {
        id
        name
        code
    }
    
    # Investment liquid fund type
    investmentLiquidFundType {
        ${CATALOG_ENTRY}
    }
    
    # Interest payment frequency
    interestPaymentFrequency {
        ${CATALOG_ENTRY}
    }
    
    # Investment reports (only active, non-deleted reports)
    liquidFundInvestmentReport(where: { isDeleted: { _eq: false } }, orderBy: { date: DESC_NULLS_LAST }) {
        id
        date
        interestRate
        maturityDate
        proprietorName
        bankName
        bankAccountNumber
        earlyTerminationAllowed
        interestPaymentFrequencyRef
        investmentLiquidFundTypeRef
        additionalProperties
        ${AUDIT_FIELDS}
    }
`
