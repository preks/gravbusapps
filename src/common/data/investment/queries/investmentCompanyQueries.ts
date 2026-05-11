import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'
import { buildOrderBy, buildWhere, type Descriptor } from '@/common/network/graphql/queryHelpers'
import {
  INVESTMENT_COMPANY,
  INVESTMENT_COMPANY_EXECUTIVE,
  INVESTMENT_COMPANY_GROUP_ASSOCIATION,
  INVESTMENT_COMPANY_OWNERSHIP
} from './fragments/investmentFragments'
import { INVESTMENT_COMPANY_REF } from './fragments/investmentReferenceFragments'
import { INVESTMENT_COMPANY_DESCRIPTORS } from '../types/investmentCompanyTypes'

export interface InvestmentCompanyQueryVariables extends BaseQueryVariables {
  currencyIds?: string[]
  employeeIds?: string[]
  executiveTypeIds?: string[]
  groupIds?: string[]
  investmentContactIds?: string[]
  ownerInvestmentCompanyIds?: string[]
}

export const buildInvestmentCompanyQuery = (): string => `
  query GetInvestmentCompanies(
    $limit: Int
    $offset: Int
    $where: InvestmentCompanyBoolExp
    $orderBy: [InvestmentCompanyOrderBy!]
  ) {
    InvestmentCompany(limit: $limit offset: $offset orderBy: $orderBy where: $where) {
      ${INVESTMENT_COMPANY_REF}
    }
    InvestmentCompanyAggregate(where: $where) {
      aggregate { count }
    }
  }
`

export const buildInvestmentCompanyByIdQuery = (): string => `
  query GetInvestmentCompanyById($id: uuid!) {
    InvestmentCompanyByPk(id: $id) {
      ${INVESTMENT_COMPANY}
    }
  }
`

export const buildInvestmentCompanySearchQuery = (): string => `
  query SearchInvestmentCompanies($searchPattern: String!, $limit: Int) {
    InvestmentCompany(
      limit: $limit
      orderBy: { name: ASC }
      where: {
        isDeleted: { _eq: false }
        _or: [
          { name: { _ilike: $searchPattern } }
          { code: { _ilike: $searchPattern } }
          { commercialRegistrationNumber: { _ilike: $searchPattern } }
          { taxIdentificationNumber: { _ilike: $searchPattern } }
          { taxNumber: { _ilike: $searchPattern } }
          { valueAddedTaxNumber: { _ilike: $searchPattern } }
        ]
      }
    ) {
      ${INVESTMENT_COMPANY_REF}
    }
  }
`

export const buildInvestmentCompanyExecutivesByCompanyIdQuery = (): string => `
  query GetInvestmentCompanyExecutivesByCompanyId(
    $where: InvestmentCompanyExecutivesBoolExp
    $orderBy: [InvestmentCompanyExecutivesOrderBy!]
  ) {
    InvestmentCompanyExecutives(where: $where orderBy: $orderBy) {
      ${INVESTMENT_COMPANY_EXECUTIVE}
    }
  }
`

export const buildInvestmentCompanyOwnershipByCompanyIdQuery = (): string => `
  query GetInvestmentCompanyOwnershipByCompanyId(
    $where: InvestmentCompanyOwnershipBoolExp
    $orderBy: [InvestmentCompanyOwnershipOrderBy!]
  ) {
    InvestmentCompanyOwnership(where: $where orderBy: $orderBy) {
      ${INVESTMENT_COMPANY_OWNERSHIP}
    }
  }
`

export const buildInvestmentCompanyGroupAssociationsByCompanyIdQuery = (): string => `
  query GetInvestmentCompanyGroupAssociationsByCompanyId(
    $where: InvestmentCompanyGroupAssociationBoolExp
    $orderBy: [InvestmentCompanyGroupAssociationOrderBy!]
  ) {
    InvestmentCompanyGroupAssociation(where: $where orderBy: $orderBy) {
      ${INVESTMENT_COMPANY_GROUP_ASSOCIATION}
    }
  }
`

export const buildInvestmentCompanyWhereCondition = (
  variables: InvestmentCompanyQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> =>
  buildWhere({
    variables,
    descriptors: [...INVESTMENT_COMPANY_DESCRIPTORS, ...additionalDescriptors],
    ids: variables.ids,
    isDeleted: true,
    customConditions
  })

export const buildInvestmentCompanyOrderBy = (
  orderBy: InvestmentCompanyQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => buildOrderBy(orderBy, [...INVESTMENT_COMPANY_DESCRIPTORS, ...additionalDescriptors])
