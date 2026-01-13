/**
 * GraphQL Queries for Catalog Management
 * REST-like API structure with conditional includes
 */

import { CatalogQueryVariables, CatalogEntryQueryVariables } from '../types/catalogTypes'
import { CATALOG_REF, CATALOG_ENTRY_REF } from './catalogFragments'

// Interface for conditional includes
export interface CatalogIncludeOptions {
  includeCatalogEntries?: boolean
  includeParentCatalogEntry?: boolean
  includeChildCatalogEntries?: boolean
}

export interface CatalogQueryOptions extends CatalogQueryVariables, CatalogIncludeOptions {
  catalogIdentifiers?: string[] // For fetching specific catalogs by identifier:version
  // Uniform nested entries pagination for all returned catalogs (initial batched load)
  entriesLimit?: number
  entriesOffset?: number
}

// Helper function to build where conditions for catalogs
const buildCatalogWhereCondition = (variables: CatalogQueryOptions): string => {
  const conditions: string[] = ['{ isDeleted: { _neq: true } }']
  // Filter by specific catalog identifiers (identifier:version format)
  if (variables.catalogIdentifiers && variables.catalogIdentifiers.length > 0) {
    const identifierConditions = variables.catalogIdentifiers.map(identifierVersion => {
      const [identifier, version = 'v1'] = identifierVersion.split(':')
      return `{ _and: [{ identifier: { _eq: "${identifier}" } }, { version: { _eq: "${version}" } }] }`
    })
    conditions.push(`{ _or: [${identifierConditions.join(', ')}] }`)
  }

  if (variables.search?.trim()) {
    const searchPattern = `{ _ilike: "%${variables.search.trim()}%" }`
    conditions.push(`{
      _or: [
        { name: ${searchPattern} },
        { identifier: ${searchPattern} },
        { description: ${searchPattern} }
      ]
    }`)
  }

  if (variables.parentId) {
    conditions.push(`{ parentId: { _eq: "${variables.parentId}" } }`)
  }

  return conditions.length > 1 ? `where: { _and: [${conditions.join(', ')}] }` : `where: ${conditions[0]}`
}

// Helper function to build where conditions for catalog entries
const buildCatalogEntryWhereCondition = (variables: CatalogEntryQueryVariables): string => {
  const conditions: string[] = ['{ isDeleted: { _neq: true } }']

  // Filter by catalog identifier and version
  if (variables.catalogIdentifier) {
    const catalogConditions = [`{ identifier: { _eq: "${variables.catalogIdentifier}" } }`]
    if (variables.version) {
      catalogConditions.push(`{ version: { _eq: "${variables.version}" } }`)
    } else {
      catalogConditions.push(`{ version: { _eq: "v1" } }`) // Default to v1
    }
    conditions.push(`{ catalog: { _and: [${catalogConditions.join(', ')}] } }`)
  }

  // Filter by catalog ID (UUID)
  if (variables.catalogId) {
    conditions.push(`{ catalogId: { _eq: "${variables.catalogId}" } }`)
  }

  // Filter by a specific entry id
  if (variables.entryId) {
    conditions.push(`{ id: { _eq: "${variables.entryId}" } }`)
  }

  // Filter by parent entry
  if (variables.parentEntryId) {
    conditions.push(`{ parentEntryId: { _eq: "${variables.parentEntryId}" } }`)
  }

  // Comprehensive search across all displayed fields
  if (variables.search?.trim()) {
    const searchPattern = `{ _ilike: "%${variables.search.trim()}%" }`
    conditions.push(`{
      _or: [
        { value: ${searchPattern} },
        { code: ${searchPattern} },
        { alternativeCode: ${searchPattern} },
        { description: ${searchPattern} },
        { additionalValue1: ${searchPattern} },
        { additionalValue2: ${searchPattern} },
        { additionalValue3: ${searchPattern} },
        { type: ${searchPattern} }
      ]
    }`)
  }

  // Exact type filter (for external dependency use-cases)
  if (variables.typeEquals?.trim()) {
    conditions.push(`{ type: { _eq: "${variables.typeEquals.trim()}" } }`)
  }

  // Exclude codes filter (case-insensitive substring match)
  if (variables.excludeCodes && variables.excludeCodes.length > 0) {
    const excludePatterns = variables.excludeCodes.map(pattern => `{ code: { _ilike: "%${pattern}%" } }`)
    conditions.push(`{ _not: { _or: [${excludePatterns.join(', ')}] } }`)
  }

  // Include codes filter (case-insensitive substring match)
  if (variables.includeCodes && variables.includeCodes.length > 0) {
    const includePatterns = variables.includeCodes.map(pattern => `{ code: { _ilike: "%${pattern}%" } }`)
    conditions.push(`{ _or: [${includePatterns.join(', ')}] }`)
  }

  // Exclude types filter (case-insensitive substring match)
  if (variables.excludeTypes && variables.excludeTypes.length > 0) {
    const excludePatterns = variables.excludeTypes.map(pattern => `{ type: { _ilike: "%${pattern}%" } }`)
    conditions.push(`{ _not: { _or: [${excludePatterns.join(', ')}] } }`)
  }

  // Include types filter (case-insensitive substring match)
  if (variables.includeTypes && variables.includeTypes.length > 0) {
    const includePatterns = variables.includeTypes.map(pattern => `{ type: { _ilike: "%${pattern}%" } }`)
    conditions.push(`{ _or: [${includePatterns.join(', ')}] }`)
  }

  return conditions.length > 1 ? `where: { _and: [${conditions.join(', ')}] }` : `where: ${conditions[0]}`
}

// Helper function to build order by clauses
const buildOrderBy = (orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>): string => {
  if (!orderBy || orderBy.length === 0) {
    return 'orderBy: [{ name: ASC }]' // Default sort for catalogs
  }

  const orderFields = orderBy.map(order => `{ ${order.field}: ${order.direction} }`)
  return `orderBy: [${orderFields.join(', ')}]`
}

const buildEntryOrderBy = (orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>): string => {
  if (!orderBy || orderBy.length === 0) {
    return 'orderBy: [{ displayOrder: ASC }, { value: ASC }]' // Default sort for entries
  }

  const orderFields = orderBy.map(order => `{ ${order.field}: ${order.direction} }`)
  return `orderBy: [${orderFields.join(', ')}]`
}

// Helper to build nested entry where (inside Catalog.catalogEntries)
const buildNestedEntryWhere = (variables: { search?: string; parentEntryId?: string }): string => {
  const conditions: string[] = ['{ isDeleted: { _neq: true } }']
  if (variables.parentEntryId) {
    conditions.push(`{ parentEntryId: { _eq: "${variables.parentEntryId}" } }`)
  }
  if (variables.search?.trim()) {
    const searchPattern = `{ _ilike: "%${variables.search.trim()}%" }`
    conditions.push(`{
      _or: [
        { value: ${searchPattern} },
        { code: ${searchPattern} },
        { alternativeCode: ${searchPattern} },
        { description: ${searchPattern} },
        { additionalValue1: ${searchPattern} },
        { additionalValue2: ${searchPattern} },
        { additionalValue3: ${searchPattern} },
        { type: ${searchPattern} }
      ]
    }`)
  }
  return conditions.length > 0 ? `where: { _and: [${conditions.join(', ')}] }` : ''
}

// 1. GET_CATALOGS - REST-like query with conditional includes
export const GET_CATALOGS = (variables: CatalogQueryOptions = {}): string => {
  const limit = Math.min(variables.limit || 20, 1000)
  const offset = variables.offset || 0
  const whereClause = buildCatalogWhereCondition(variables)
  const orderBy = buildOrderBy(variables.orderBy)
  const entriesLimit = Math.min(variables.entriesLimit || 100, 1000)
  const entriesOffset = variables.entriesOffset || 0

  // Build conditional includes directly in the query - attach @include to fields
  const catalogEntriesFragment = `
    catalogEntries(
      limit: ${entriesLimit}
      offset: ${entriesOffset}
      orderBy: [{ displayOrder: ASC }, { value: ASC }]
    ) @include(if: $includeCatalogEntries) {
      ${CATALOG_ENTRY_REF}
      ${
        variables.includeParentCatalogEntry
          ? `
        parentEntry @include(if: $includeParentCatalogEntry) {
          ${CATALOG_ENTRY_REF}
          catalog {
            ${CATALOG_REF}
          }
        }
      `
          : ''
      }
      ${
        variables.includeChildCatalogEntries
          ? `
        childEntries @include(if: $includeChildCatalogEntries) {
          ${CATALOG_ENTRY_REF}
          catalog {
            ${CATALOG_REF}
          }
        }
      `
          : ''
      }
    }
  `

  return `
    query GetCatalogs(
      $includeCatalogEntries: Boolean = ${variables.includeCatalogEntries || false}
      $includeParentCatalogEntry: Boolean = ${variables.includeParentCatalogEntry || false}
      $includeChildCatalogEntries: Boolean = ${variables.includeChildCatalogEntries || false}
    ) {
      Catalog(
        limit: ${limit}
        offset: ${offset}
        ${orderBy}
        ${whereClause}
      ) {
        ${CATALOG_REF}
        parentCatalog {
          ${CATALOG_REF}
        }
        catalogEntriesAggregate {
          aggregate {
            count
          }
        }
        ${catalogEntriesFragment}
      }
      
      CatalogAggregate(${whereClause}) {
        aggregate {
          count
        }
      }
    }
  `
}

// 2. GET_CATALOG_ENTRIES - REST-like query with conditional includes
export const GET_CATALOG_ENTRIES = (variables: CatalogEntryQueryVariables & CatalogIncludeOptions = {}): string => {
  const limit = Math.min(variables.limit || 100, 1000)
  const offset = variables.offset || 0
  const whereClause = buildCatalogEntryWhereCondition(variables)
  const orderBy = buildEntryOrderBy(variables.orderBy)

  // Build conditional includes directly in the query - attach @include to fields
  const parentEntryFragment = `
    parentEntry @include(if: $includeParentCatalogEntry) {
      ${CATALOG_ENTRY_REF}
      catalog {
        ${CATALOG_REF}
      }
    }
  `

  const childEntriesFragment = `
    childEntries @include(if: $includeChildCatalogEntries) {
      ${CATALOG_ENTRY_REF}
      catalog {
        ${CATALOG_REF}
      }
    }
  `

  return `
    query GetCatalogEntries(
      $includeParentCatalogEntry: Boolean = ${variables.includeParentCatalogEntry || false}
      $includeChildCatalogEntries: Boolean = ${variables.includeChildCatalogEntries || false}
    ) {
      CatalogEntry(
        limit: ${limit}
        offset: ${offset}
        ${orderBy}
        ${whereClause}
      ) {
        ${CATALOG_ENTRY_REF}
        catalog {
          ${CATALOG_REF}
        }
        ${parentEntryFragment}
        ${childEntriesFragment}
      }
      
      CatalogEntryAggregate(${whereClause}) {
        aggregate {
          count
        }
      }
    }
  `
}

// 3. GET_MULTIPLE_CATALOG_ENTRIES - Single request to fetch entries for multiple catalogs (each with its own limit/offset)
// Specs example: [{ alias: 'country', catalogIdentifier: 'Country', limit: 20, offset: 0 }]
// REMOVED: GET_MULTIPLE_CATALOG_ENTRIES — using GET_CATALOGS with entriesLimit/entriesOffset for initial batched load

// Search entries across all catalogs (for ParentCatalogEntrySelector)
export const SEARCH_CATALOG_ENTRIES_GLOBAL = (variables: {
  search: string
  limit?: number
  offset?: number
}): string => {
  const limit = Math.min(variables.limit || 50, 1000)
  const offset = variables.offset || 0
  const searchPattern = `{ _ilike: "%${variables.search.trim()}%" }`

  return `
    query SearchCatalogEntriesGlobal {
      CatalogEntry(
        limit: ${limit}
        offset: ${offset}
        where: {
          _and: [
            { isDeleted: { _neq: true } },
            {
              _or: [
                { value: ${searchPattern} },
                { code: ${searchPattern} },
                { description: ${searchPattern} }
              ]
            }
          ]
        }
        orderBy: [{ value: ASC }]
      ) {
        ${CATALOG_ENTRY_REF}
        catalog {
          ${CATALOG_REF}
        }
      }
    }
  `
}

// 4. GET_CATALOG - Single catalog with embedded entries supporting search/filter/sort/paging for entries
export const GET_CATALOG = (variables: {
  identifier: string
  version?: string
  limit?: number
  offset?: number
  search?: string
  parentEntryId?: string
  orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>
  includeParentCatalogEntry?: boolean
  includeChildCatalogEntries?: boolean
}): string => {
  const version = variables.version || 'v1'
  const limit = Math.min(variables.limit || 100, 1000)
  const offset = variables.offset || 0
  const entryWhere = buildNestedEntryWhere({ search: variables.search, parentEntryId: variables.parentEntryId })
  const entryOrderBy = buildEntryOrderBy(variables.orderBy)

  const parentEntryFragment = `
    parentEntry @include(if: $includeParentCatalogEntry) {
      ${CATALOG_ENTRY_REF}
      catalog { ${CATALOG_REF} }
    }
  `

  const childEntriesFragment = `
    childEntries @include(if: $includeChildCatalogEntries) {
      ${CATALOG_ENTRY_REF}
      catalog { ${CATALOG_REF} }
    }
  `

  return `
    query GetCatalog(
      $includeParentCatalogEntry: Boolean = ${variables.includeParentCatalogEntry || false}
      $includeChildCatalogEntries: Boolean = ${variables.includeChildCatalogEntries || false}
    ) {
      Catalog(
        limit: 1
        where: { _and: [
          { identifier: { _eq: "${variables.identifier}" } },
          { version: { _eq: "${version}" } },
          { isDeleted: { _neq: true } }
        ]}
      ) {
        ${CATALOG_REF}
        parentCatalog { ${CATALOG_REF} }
        catalogEntriesAggregate(where: { _and: [
          { isDeleted: { _neq: true } },
          ${variables.parentEntryId ? `{ parentEntryId: { _eq: "${variables.parentEntryId}" } },` : ''}
          ${
            variables.search?.trim()
              ? `{
            _or: [
              { value: { _ilike: "%${variables.search.trim()}%" } },
              { code: { _ilike: "%${variables.search.trim()}%" } },
              { alternativeCode: { _ilike: "%${variables.search.trim()}%" } },
              { description: { _ilike: "%${variables.search.trim()}%" } },
              { additionalValue1: { _ilike: "%${variables.search.trim()}%" } },
              { additionalValue2: { _ilike: "%${variables.search.trim()}%" } },
              { additionalValue3: { _ilike: "%${variables.search.trim()}%" } },
              { type: { _ilike: "%${variables.search.trim()}%" } }
            ]
          },`
              : ''
          }
        ]}) {
          aggregate { count }
        }
        catalogEntries(
          limit: ${limit}
          offset: ${offset}
          ${entryOrderBy}
          ${entryWhere}
        ) {
          ${CATALOG_ENTRY_REF}
          catalog { ${CATALOG_REF} }
          ${parentEntryFragment}
          ${childEntriesFragment}
        }
      }
    }
  `
}
