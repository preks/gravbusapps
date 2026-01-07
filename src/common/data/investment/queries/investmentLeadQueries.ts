/**
 * Investment Lead Queries (New)
 * GraphQL queries for Investment Lead entities using fields mapping
 * Uses Common Lead Queries with LeadFields (no overrides needed)
 */

import {
  buildLeadQuery,
  buildLeadByIdQuery,
  buildLeadSearchQuery,
  buildLeadWhereCondition,
  buildLeadOrderBy,
  type CommonLeadQueryVariables,
  type LeadRelationBuilders,
  type LeadRelationFields
} from '@/common/data/relations/queries/leadQueries'
import { LeadFields } from '@/common/data/relations/types/leadTypes'
import { INVESTMENT_LEAD_DESCRIPTORS } from '../types/investmentLeadTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildActivityFragment,
  buildAccountFragment,
  buildContactFragment,
  buildDocumentFragment,
  buildNoteFragment,
  buildOpportunityFragment
} from '@/common/data/relations/queries/relationFragments'

// Import IRM-specific task fragment (uses taskAssignees instead of assignedEmployee)
import { buildInvestmentTaskFragmentForRelations } from './investmentTaskQueries'

// Import Investment Fields
import { InvestmentActivityFields } from '../types/investmentActivityTypes'
import { InvestmentAccountFields } from '../types/investmentAccountTypes'
import { InvestmentContactFields } from '../types/investmentContactTypes'
import { InvestmentDocumentFields } from '../types/investmentDocumentTypes'
import { InvestmentNoteFields } from '../types/investmentNoteTypes'
import { InvestmentOpportunityFields } from '../types/investmentOpportunityTypes'
import { InvestmentTaskFields } from '../types/investmentTaskTypes'

/**
 * Investment Lead Query Variables Interface
 * Extends CommonLeadQueryVariables (no additional fields needed)
 */
export type InvestmentLeadQueryVariables = CommonLeadQueryVariables

/**
 * Build Investment Lead query with fields mapping
 */
export const buildInvestmentLeadQuery = (fields: typeof LeadFields = LeadFields): string => {
  // IRM-specific Investment fields
  const entityFields = `
    # IRM-specific Investment fields
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
  return buildLeadQuery('InvestmentLead', fields, entityFields)
}

/**
 * Build Investment Lead by ID query
 */
export const buildInvestmentLeadByIdQuery = (fields: typeof LeadFields = LeadFields): string => {
  // Build relation builders and fields for common relations
  const relationBuilders: LeadRelationBuilders = {
    buildActivityFragment,
    buildDocumentFragment,
    buildNoteFragment,
    buildTaskFragment: buildInvestmentTaskFragmentForRelations, // Use IRM-specific version (taskAssignees)
    buildAccountFragment,
    buildContactFragment,
    buildOpportunityFragment
  }

  const relationFields: LeadRelationFields = {
    activityFields: InvestmentActivityFields,
    documentFields: InvestmentDocumentFields,
    noteFields: InvestmentNoteFields,
    taskFields: InvestmentTaskFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    opportunityFields: InvestmentOpportunityFields
  }

  // IRM-specific Investment fields
  const entityFields = `
    # IRM-specific Investment fields
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

  return buildLeadByIdQuery('InvestmentLead', fields, relationBuilders, relationFields, entityFields)
}

/**
 * Build Investment Lead search query
 */
export const buildInvestmentLeadSearchQuery = (fields: typeof LeadFields = LeadFields): string => {
  return buildLeadSearchQuery('InvestmentLead', fields)
}

/**
 * Build WHERE condition for Investment Lead queries
 * Uses INVESTMENT_LEAD_DESCRIPTORS which may have IRM-specific additions
 */
export const buildInvestmentLeadWhereCondition = (
  variables: InvestmentLeadQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // INVESTMENT_LEAD_DESCRIPTORS already includes common descriptors + any IRM-specific ones
  const descriptors = [...INVESTMENT_LEAD_DESCRIPTORS, ...additionalDescriptors]
  return buildLeadWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Investment Lead queries
 */
export const buildInvestmentLeadOrderBy = (
  orderBy: InvestmentLeadQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  const descriptors = [...INVESTMENT_LEAD_DESCRIPTORS, ...additionalDescriptors]
  return buildLeadOrderBy(orderBy, descriptors)
}
