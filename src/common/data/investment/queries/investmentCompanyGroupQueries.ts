import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'
import { buildOrderBy, buildWhere, type Descriptor } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_COMPANY_GROUP } from './fragments/investmentFragments'
import { INVESTMENT_COMPANY_GROUP_REF } from './fragments/investmentReferenceFragments'
import { INVESTMENT_COMPANY_GROUP_DESCRIPTORS } from '../types/investmentCompanyGroupTypes'

export interface InvestmentCompanyGroupQueryVariables extends BaseQueryVariables {
  investmentCompanyIds?: string[]
}

export const buildInvestmentCompanyGroupQuery = (): string => `
  query GetInvestmentCompanyGroups(
    $limit: Int
    $offset: Int
    $where: InvestmentCompanyGroupBoolExp
    $orderBy: [InvestmentCompanyGroupOrderBy!]
  ) {
    InvestmentCompanyGroup(limit: $limit offset: $offset orderBy: $orderBy where: $where) {
      ${INVESTMENT_COMPANY_GROUP_REF}
    }
    InvestmentCompanyGroupAggregate(where: $where) {
      aggregate { count }
    }
  }
`

export const buildInvestmentCompanyGroupByIdQuery = (): string => `
  query GetInvestmentCompanyGroupById($id: uuid!) {
    InvestmentCompanyGroupByPk(id: $id) {
      ${INVESTMENT_COMPANY_GROUP}
    }
  }
`

export const buildInvestmentCompanyGroupSearchQuery = (): string => `
  query SearchInvestmentCompanyGroups($searchPattern: String!, $limit: Int) {
    InvestmentCompanyGroup(
      limit: $limit
      orderBy: { name: ASC }
      where: {
        isDeleted: { _eq: false }
        name: { _ilike: $searchPattern }
      }
    ) {
      ${INVESTMENT_COMPANY_GROUP_REF}
    }
  }
`

export const buildInvestmentCompanyGroupWhereCondition = (
  variables: InvestmentCompanyGroupQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> =>
  buildWhere({
    variables,
    descriptors: [...INVESTMENT_COMPANY_GROUP_DESCRIPTORS, ...additionalDescriptors],
    ids: variables.ids,
    isDeleted: true,
    customConditions
  })

export const buildInvestmentCompanyGroupOrderBy = (
  orderBy: InvestmentCompanyGroupQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => buildOrderBy(orderBy, [...INVESTMENT_COMPANY_GROUP_DESCRIPTORS, ...additionalDescriptors])
