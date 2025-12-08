import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

// Types for the GraphQL response
export interface CatalogEntryTranslation {
  localeCode: string
  value: string
}

export interface FormFieldDefinition {
  type: string // 'DATE' | 'DATETIME' | 'AMOUNT' | 'TEXT' | 'TEXTAREA' | 'CATALOG_<name>' | 'REF_<name>'
  label: string
  property: string // e.g., "investment.acquisitionDate" or "equityInvestment.marketValue"
  required: boolean
  displayOrder: string // e.g., "1.1", "1.2", "2"
}

export interface FormFieldGroup {
  groupId: string
  groupLabel: string
  displayOrder: number
  fields: FormFieldDefinition[]
}

export interface FormFieldsDefinition {
  formFields: FormFieldGroup[]
}

export interface InvestmentGroupEntry {
  id: string
  code: string
  value: string
  translations: CatalogEntryTranslation[]
  objectValue: FormFieldsDefinition
}

export interface InvestmentTypeEntry {
  id: string
  code: string
  parentEntryId: string
  value: string
  translations: CatalogEntryTranslation[]
  objectValue: FormFieldsDefinition
}

export interface InvestmentLiquidFundTypeEntry {
  id: string
  code: string
  parentEntryId: string
  value: string
  translations: CatalogEntryTranslation[]
  objectValue: FormFieldsDefinition
}

export interface InvestmentCatalogData {
  investmentGroups: InvestmentGroupEntry[]
  investmentTypes: InvestmentTypeEntry[]
  investmentLiquidFundTypes: InvestmentLiquidFundTypeEntry[]
}

// GraphQL query to fetch all investment groups and types with their form fields
export const GET_INVESTMENT_CATALOG_DATA = (): string => {
  return `
    query GetInvestmentCatalogData($activeUserLocale: String!) {
      investmentGroups: CatalogEntry(where: {
        catalog: {identifier: {_eq: "InvestmentGroup"}, version: {_eq: "v1"}}
        isDeleted: {_eq: false}
      }) {
        id
        code
        value
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
        objectValue
        # Get child entries (investment types) directly from the relationship
        childEntries(where: {isDeleted: {_eq: false}}) {
          id
          code
          value
          parentEntryId
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
          objectValue
        }
      }
      
      # Also fetch investment types separately to handle cases where relationship might be flipped
      investmentTypes: CatalogEntry(where: {
        catalog: {identifier: {_eq: "InvestmentType"}, version: {_eq: "v1"}}
        isDeleted: {_eq: false}
      }) {
        id
        code
        parentEntryId
        value
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
        objectValue
        # Also get parent entries (investment groups) to handle flipped relationships
        parentEntry {
          id
          code
          value
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
        }
      }
      
      # Investment Liquid Fund Types with form fields
      investmentLiquidFundTypes: CatalogEntry(where: {
        catalog: {identifier: {_eq: "InvestmentLiquidFundType"}, version: {_eq: "v1"}}
        isDeleted: {_eq: false}
      }) {
        id
        code
        parentEntryId
        value
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
        objectValue
        parentEntry {
          id
          code
          value
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
        }
      }
    }
  `
}

// Hook to fetch all investment catalog data
export const useGetInvestmentCatalogData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentCatalogData = useCallback(async (): Promise<InvestmentCatalogData> => {
    const activeUserLocale = getCurrentActiveUserLocale() || 'en'
    const query = GET_INVESTMENT_CATALOG_DATA()
    try {
      const result = await graphqlClient.request<InvestmentCatalogData>(query, {
        activeUserLocale
      })
      return result
    } catch (error) {
      console.error('Error fetching investment catalog data:', error)
      throw error
    }
  }, [graphqlClient])

  return { fetchInvestmentCatalogData }
}
