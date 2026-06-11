/**
 * Investment Opportunity Queries (New)
 * GraphQL queries for Investment Opportunity entities using fields mapping
 * Extends Common Opportunity Queries with InvestmentOpportunityFields (with overrides + IRM-specific fields)
 */

import {
  buildOpportunityQuery,
  buildOpportunityByIdQuery,
  buildOpportunitySearchQuery,
  buildOpportunityWhereCondition,
  buildOpportunityOrderBy,
  type CommonOpportunityQueryVariables,
  type OpportunityRelationBuilders,
  type OpportunityRelationFields
} from '@/common/data/relations/queries/opportunityQueries'
import {
  InvestmentOpportunityFields,
  INVESTMENT_OPPORTUNITY_DESCRIPTORS,
  InvestmentOpportunityStageConditionFields
} from '../types/investmentOpportunityTypes'
import { INVESTMENT_ADDRESS_FRAGMENT } from '../types/investmentAddressTypes'
// OpportunityFields type is used implicitly through Record<keyof typeof OpportunityFields, string>
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildAccountFragment,
  buildContactFragment,
  buildLeadFragment,
  buildActivityFragment,
  buildNoteFragment,
  buildDocumentFragment
} from '@/common/data/relations/queries/relationFragments'

// Import IRM-specific task fragment (uses taskAssignees instead of assignedEmployee)
import { buildInvestmentTaskFragmentForRelations } from './investmentTaskQueries'

// Import Investment Fields
import { InvestmentActivityFields } from '../types/investmentActivityTypes'
import { InvestmentAccountFields } from '../types/investmentAccountTypes'
import { InvestmentContactFields } from '../types/investmentContactTypes'
import { InvestmentDocumentFields } from '../types/investmentDocumentTypes'
import { InvestmentLeadFields } from '../types/investmentLeadTypes'
import { InvestmentNoteFields } from '../types/investmentNoteTypes'
import { InvestmentTaskFields } from '../types/investmentTaskTypes'
import { INVESTMENT_COMPANY_REF, INVESTMENT_REF } from './fragments/investmentReferenceFragments'

/**
 * Investment Opportunity Query Variables Interface
 * Extends CommonOpportunityQueryVariables with IRM-specific filters
 */
export interface InvestmentOpportunityQueryVariables extends CommonOpportunityQueryVariables {
  // IRM-specific filters
  dealType?: string
  currencyCode?: string // Simple currency code like 'EUR', 'USD' - convenience parameter
  divestmentIds?: string[]
  investmentIds?: string[]
  investmentGroupIds?: string[]
  investmentRoleIds?: string[]
  investmentStakeTypeIds?: string[]
  investmentTypeIds?: string[]
  sizeMeasurementUnitIds?: string[]
  forecastedProfitBetween?: [number, number]
  estimatedAmountRanges?: Array<{ min?: number; max?: number }>
  accountSearch?: string // Search account by name
}

/**
 * Build Investment Opportunity query with fields mapping
 */
export const buildInvestmentOpportunityQuery = (
  fields: typeof InvestmentOpportunityFields = InvestmentOpportunityFields
): string => {
  const entityFields = `
    # Addresses relation (IRM uses "locality")
    ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
      ${INVESTMENT_ADDRESS_FRAGMENT}
    }
    
    # Leads relation (IRM uses "investmentLead" as array, with where clause)
    ${fields.leads}(where: { isDeleted: { _eq: false } }) {
      ${buildLeadFragment(InvestmentLeadFields)}
    }
    
    # Divestment relation
    divestment {
      ${INVESTMENT_REF}
    }
    divestmentId

    # IRM-specific Investment fields
    dealType
    investmentGroup {
      ${CATALOG_ENTRY}
    }
    investmentGroupRef
    investmentName
    investmentType {
      ${CATALOG_ENTRY}
    }
    investmentTypeRef
    investmentRole {
      ${CATALOG_ENTRY}
    }
    investmentRoleRef
    investmentStakeType {
      ${CATALOG_ENTRY}
    }
    investmentStakeTypeRef
    initialInvestmentAmount
    forecastedProfitAmount
    requiredCapitalAmount
    marketValue
    loanAmount
    loanInterestRate
    stakePercentage
    annualNetColdRent
    buildingYear
    size
    sizeMeasurementUnit {
      ${CATALOG_ENTRY}
    }
    sizeMeasurementUnitRef
  `
  return buildOpportunityQuery('InvestmentOpportunity', fields as any, entityFields)
}

/**
 * Build Investment Opportunity by ID query
 */
export const buildInvestmentOpportunityByIdQuery = (
  fields: typeof InvestmentOpportunityFields = InvestmentOpportunityFields
): string => {
  // Build relation builders and fields for common relations
  const relationBuilders: OpportunityRelationBuilders = {
    buildActivityFragment,
    buildAccountFragment,
    buildContactFragment,
    buildDocumentFragment,
    buildLeadFragment,
    buildNoteFragment,
    buildTaskFragment: buildInvestmentTaskFragmentForRelations // Use IRM-specific version (taskAssignees)
  }

  const relationFields: OpportunityRelationFields = {
    activityFields: InvestmentActivityFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    documentFields: InvestmentDocumentFields,
    leadFields: InvestmentLeadFields,
    noteFields: InvestmentNoteFields,
    taskFields: InvestmentTaskFields,
    stageConditionFields: InvestmentOpportunityStageConditionFields
  }

  // Domain-specific entity fields (addresses, leads, investment fields)
  const entityFields = `
    # Addresses relation (IRM uses "locality")
    ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
      ${INVESTMENT_ADDRESS_FRAGMENT}
    }
    
    # Leads relation (IRM uses "investmentLead" as array, with where clause)
    ${fields.leads}(where: { isDeleted: { _eq: false } }) {
      ${buildLeadFragment(InvestmentLeadFields)}
    }
    
    # Opportunity-Account Junction Table (many-to-many)
    # GraphQL field name: opportunityAccounts
    ${fields.investmentOpportunityAccounts}(where: { isDeleted: { _eq: false } }) {
      id
      version
      opportunityId
      accountId
      accountTypeRef
      accountType {
        ${CATALOG_ENTRY}
      }
      account {
        ${buildAccountFragment(InvestmentAccountFields)}
      }
    }
    
    # Divestment relation
    divestment {
      ${INVESTMENT_REF}
    }
    divestmentId
    
    # Investment relation (1-to-many opportunity -> investments)
    ${fields.investments}(where: { isDeleted: { _eq: false } }) {
      ${INVESTMENT_REF}
    }

    # IRM-specific Investment fields
    dealType

    # Company relationship (IRM uses investmentCompany; flat id is needed to prefill the form select)
    investmentCompanyId
    investmentCompany {
      ${INVESTMENT_COMPANY_REF}
    }

    investmentGroup {
      ${CATALOG_ENTRY}
    }
    investmentGroupRef
    investmentName
    investmentType {
      ${CATALOG_ENTRY}
    }
    investmentTypeRef
    investmentRole {
      ${CATALOG_ENTRY}
    }
    investmentRoleRef
    investmentStakeType {
      ${CATALOG_ENTRY}
    }
    investmentStakeTypeRef
    initialInvestmentAmount
    forecastedProfitAmount
    requiredCapitalAmount
    marketValue
    loanAmount
    loanInterestRate
    stakePercentage
    annualNetColdRent
    buildingYear
    size
    sizeMeasurementUnit {
      ${CATALOG_ENTRY}
    }
    sizeMeasurementUnitRef
  `

  return buildOpportunityByIdQuery(
    'InvestmentOpportunity',
    fields as any,
    relationBuilders,
    relationFields,
    entityFields
  )
}

/**
 * Build Investment Opportunity search query
 */
export const buildInvestmentOpportunitySearchQuery = (
  fields: typeof InvestmentOpportunityFields = InvestmentOpportunityFields
): string => {
  return buildOpportunitySearchQuery('InvestmentOpportunity', fields as any)
}

/**
 * Build WHERE condition for Investment Opportunity queries
 * Includes IRM-specific descriptors from INVESTMENT_OPPORTUNITY_DESCRIPTORS
 */
export const buildInvestmentOpportunityWhereCondition = (
  variables: InvestmentOpportunityQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // INVESTMENT_OPPORTUNITY_DESCRIPTORS already includes common descriptors + IRM-specific ones
  const descriptors = [...INVESTMENT_OPPORTUNITY_DESCRIPTORS, ...additionalDescriptors]
  return buildOpportunityWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Investment Opportunity queries
 * Includes IRM-specific descriptors
 */
export const buildInvestmentOpportunityOrderBy = (
  orderBy: InvestmentOpportunityQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  const descriptors = [...INVESTMENT_OPPORTUNITY_DESCRIPTORS, ...additionalDescriptors]
  return buildOpportunityOrderBy(orderBy, descriptors)
}

// Investment Opportunity Queries - Complete queries using shared fragments
// NOTE: Related-entity queries have been moved to centralized query builders
// Use buildInvestmentTaskByOpportunityIdQuery, buildInvestmentActivityByOpportunityIdQuery, etc.
// from investmentTaskQueries.ts, investmentActivityQueries.ts, etc.
import { INVESTMENT_OPPORTUNITY } from './fragments/investmentFragments'

// Get Investment Opportunity by ID
export const GET_INVESTMENT_OPPORTUNITY_BY_ID = (id: string): string => {
  return `
    query GetInvestmentOpportunityById {
      InvestmentOpportunity(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${INVESTMENT_OPPORTUNITY}
      }
    }
  `
}

// =====================================================
// INVESTMENT OPPORTUNITY RELATED ENTITIES QUERIES
// =====================================================
// NOTE: Related-entity queries have been moved to centralized query builders
// Use buildInvestmentTaskByOpportunityIdQuery, buildInvestmentActivityByOpportunityIdQuery, etc.
// from investmentTaskQueries.ts, investmentActivityQueries.ts, etc.

// Get Investment Opportunity Aggregates - for metrics calculation
export const GET_INVESTMENT_OPPORTUNITY_AGGREGATES = (): string => {
  return `
    query GetInvestmentOpportunityAggregates(
      $where: InvestmentOpportunityBoolExp
      $wonWhere: InvestmentOpportunityBoolExp
    ) {
      # All opportunities aggregate
      InvestmentOpportunityAggregate(where: $where) {
        aggregate {
          count
          sum {
            estimatedAmount
          }
          avg {
            estimatedAmount
          }
        }
      }
      
      # Won opportunities aggregate
      InvestmentOpportunityWonAggregate: InvestmentOpportunityAggregate(where: $wonWhere) {
        aggregate {
          count
          sum {
            estimatedAmount
          }
        }
      }
    }
  `
}

// Get Investment Opportunity Stage Condition by ID
export const GET_INVESTMENT_OPPORTUNITY_STAGE_CONDITION_BY_ID = (id: string): string => {
  return `
    query GetInvestmentOpportunityStageConditionById {
      InvestmentOpportunityStageConditionByPk(id: "${id}") {
        id
        completed
        completedAt
        deadlineAt
        version
        opportunityPipelineStageCondition {
          id
          value
          code
          parentEntryId
        }
        configSnapshot
      }
    }
  `
}

// Get Equity Investment Round by Opportunity ID
export const GET_EQUITY_INVESTMENT_ROUND_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetEquityInvestmentRoundByOpportunityId {
      EquityInvestmentRound(
        where: { 
          investmentOpportunityId: { _eq: "${opportunityId}" }
          isDeleted: { _eq: false }
        }
        limit: 1
      ) {
        id
        name
        year
        version
        equityInvestmentId
        equityInvestment {
          investmentId
          investment {
            id
          }
        }
        createdAt
        createdBy
        updatedAt
        updatedBy
      }
    }
  `
}
