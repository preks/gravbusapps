/**
 * GraphQL queries for Investment Types
 * Fetches investment catalog entries (InvestmentGroups, InvestmentTypes, InvestmentLiquidFundTypes)
 * with nested childEntries in a single optimized query
 */

import { BaseCatalogEntry } from '@/common/data/catalog/types/catalogTypes'

/**
 * GraphQL response interface for investment catalog data
 */
export interface InvestmentCatalogDataResponse {
  investmentGroups: BaseCatalogEntry[]
  investmentTypes: BaseCatalogEntry[]
  investmentLiquidFundTypes: BaseCatalogEntry[]
}

/**
 * GraphQL query to fetch all investment catalog entries with nested childEntries
 * Optimized to fetch all three catalog types in a single query
 * @returns GraphQL query string with variables
 */
export const GET_INVESTMENT_TYPES_QUERY = (): string => {
  return `
    query GetInvestmentTypes($activeUserLocale: String!) {
      investmentGroups: CatalogEntry(
        where: {
          catalog: {identifier: {_eq: "InvestmentGroup"}, version: {_eq: "v1"}}
          isDeleted: {_eq: false}
        }
        orderBy: [{displayOrder: ASC}, {value: ASC}]
      ) {
        id
        code
        value
        alternativeCode
        description
        additionalValue1
        additionalValue2
        additionalValue3
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          id
          localeCode
          value
          additionalValue1
          additionalValue2
          additionalValue3
          objectValue
        }
        type
        displayOrder
        objectValue
        activeFrom
        activeTo
        catalogId
        parentEntryId
        isDeleted
        recordState
        createdAt
        createdBy
        updatedAt
        updatedBy
        childEntries(
          where: {
            catalog: {identifier: {_eq: "InvestmentType"}, version: {_eq: "v1"}}
            isDeleted: {_eq: false}
          }
          orderBy: [{displayOrder: ASC}, {value: ASC}]
        ) {
          id
          code
          value
          alternativeCode
          description
          additionalValue1
          additionalValue2
          additionalValue3
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            id
            localeCode
            value
            additionalValue1
            additionalValue2
            additionalValue3
            objectValue
          }
          type
          displayOrder
          objectValue
          activeFrom
          activeTo
          catalogId
          parentEntryId
          isDeleted
          recordState
          createdAt
          createdBy
          updatedAt
          updatedBy
          childEntries(
            where: {
              catalog: {identifier: {_eq: "InvestmentLiquidFundType"}, version: {_eq: "v1"}}
              isDeleted: {_eq: false}
            }
            orderBy: [{displayOrder: ASC}, {value: ASC}]
          ) {
            id
            code
            value
            alternativeCode
            description
            additionalValue1
            additionalValue2
            additionalValue3
            translations(where: {localeCode: {_eq: $activeUserLocale}}) {
              id
              localeCode
              value
              additionalValue1
              additionalValue2
              additionalValue3
              objectValue
            }
            type
            displayOrder
            objectValue
            activeFrom
            activeTo
            catalogId
            parentEntryId
            isDeleted
            recordState
            createdAt
            createdBy
            updatedAt
            updatedBy
          }
        }
      }
      
      investmentTypes: CatalogEntry(
        where: {
          catalog: {identifier: {_eq: "InvestmentType"}, version: {_eq: "v1"}}
          isDeleted: {_eq: false}
        }
        orderBy: [{displayOrder: ASC}, {value: ASC}]
      ) {
        id
        code
        value
        alternativeCode
        description
        additionalValue1
        additionalValue2
        additionalValue3
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          id
          localeCode
          value
          additionalValue1
          additionalValue2
          additionalValue3
          objectValue
        }
        type
        displayOrder
        objectValue
        activeFrom
        activeTo
        catalogId
        parentEntryId
        isDeleted
        recordState
        createdAt
        createdBy
        updatedAt
        updatedBy
        childEntries(
          where: {
            catalog: {identifier: {_eq: "InvestmentLiquidFundType"}, version: {_eq: "v1"}}
            isDeleted: {_eq: false}
          }
          orderBy: [{displayOrder: ASC}, {value: ASC}]
        ) {
          id
          code
          value
          alternativeCode
          description
          additionalValue1
          additionalValue2
          additionalValue3
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            id
            localeCode
            value
            additionalValue1
            additionalValue2
            additionalValue3
            objectValue
          }
          type
          displayOrder
          objectValue
          activeFrom
          activeTo
          catalogId
          parentEntryId
          isDeleted
          recordState
          createdAt
          createdBy
          updatedAt
          updatedBy
        }
      }
      
      investmentLiquidFundTypes: CatalogEntry(
        where: {
          catalog: {identifier: {_eq: "InvestmentLiquidFundType"}, version: {_eq: "v1"}}
          isDeleted: {_eq: false}
        }
        orderBy: [{displayOrder: ASC}, {value: ASC}]
      ) {
        id
        code
        value
        alternativeCode
        description
        additionalValue1
        additionalValue2
        additionalValue3
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          id
          localeCode
          value
          additionalValue1
          additionalValue2
          additionalValue3
          objectValue
        }
        type
        displayOrder
        objectValue
        activeFrom
        activeTo
        catalogId
        parentEntryId
        isDeleted
        recordState
        createdAt
        createdBy
        updatedAt
        updatedBy
      }
    }
  `
}
