import { CATALOG_ENTRY_REF } from '@/common/data/catalog/queries/catalogFragments'
import {
  BENEFIT_PROVIDER_CATALOG,
  BENEFIT_PROVIDER_VERSION,
  BENEFIT_TYPE_CATALOG,
  BENEFIT_TYPE_VERSION,
  ENTRIES_PAGE_SIZE
} from '../constants/benefitsMaintenanceConstants'

function escapeGraphQLString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function buildBenefitTypesQuery(options?: { search?: string; parentEntryId?: string }): string {
  const conditions = [
    `{ catalog: { _and: [{ identifier: { _eq: "${BENEFIT_TYPE_CATALOG}" } }, { version: { _eq: "${BENEFIT_TYPE_VERSION}" } }] } }`
  ]

  if (options?.parentEntryId) {
    conditions.push(`{ parentEntryId: { _eq: "${escapeGraphQLString(options.parentEntryId)}" } }`)
  }

  if (options?.search?.trim()) {
    const searchPattern = `{ _ilike: "%${escapeGraphQLString(options.search.trim())}%" }`
    conditions.push(`{
      _or: [
        { value: ${searchPattern} },
        { code: ${searchPattern} },
        { description: ${searchPattern} }
      ]
    }`)
  }

  const whereClause = `where: { _and: [${conditions.join(', ')}] }`

  return `
    query GetBenefitTypesCatalog {
      CatalogEntry(
        limit: ${ENTRIES_PAGE_SIZE}
        offset: 0
        orderBy: [{ displayOrder: ASC_NULLS_LAST }, { value: ASC }]
        ${whereClause}
      ) {
        ${CATALOG_ENTRY_REF}
        catalog {
          id
          identifier
          version
          name
          description
          defaultLocale
          schemaDefinition
          parentId
          isDeleted
          isCustomerManaged
          recordState
          validFrom
          validTo
          createdAt
          createdBy
          updatedAt
          updatedBy
        }
        childEntries {
          ${CATALOG_ENTRY_REF}
        }
      }

      CatalogEntryAggregate(${whereClause}) {
        aggregate {
          count
        }
      }
    }
  `
}

export function buildProvidersQuery(): string {
  return `
    query GetBenefitProvidersCatalog {
      CatalogEntry(
        limit: 500
        offset: 0
        orderBy: [{ displayOrder: ASC_NULLS_LAST }, { value: ASC }]
        where: {
          catalog: {
            _and: [
              { identifier: { _eq: "${BENEFIT_PROVIDER_CATALOG}" } },
              { version: { _eq: "${BENEFIT_PROVIDER_VERSION}" } }
            ]
          }
        }
      ) {
        ${CATALOG_ENTRY_REF}
        catalog {
          id
          identifier
          version
          name
          description
          defaultLocale
          schemaDefinition
          parentId
          isDeleted
          isCustomerManaged
          recordState
          validFrom
          validTo
          createdAt
          createdBy
          updatedAt
          updatedBy
        }
      }

      CatalogEntryAggregate(
        where: {
          catalog: {
            _and: [
              { identifier: { _eq: "${BENEFIT_PROVIDER_CATALOG}" } },
              { version: { _eq: "${BENEFIT_PROVIDER_VERSION}" } }
            ]
          }
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}
