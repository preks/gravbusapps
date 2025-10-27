/**
 * 🔧 Query Handler for Mock GraphQL Client
 *
 * Handles all GraphQL queries using the data registry.
 * No domain-specific knowledge required.
 */

import { DataRegistry, EntityConfig } from './dataRegistry'
import {
  MockGraphQLVariables,
  MockGraphQLResponse,
  applyFilters,
  applySorting,
  createPaginatedResponse,
  createSimpleResponse,
  isIdQuery,
  extractIdFromWhere
} from './queryHelpers'
import { debugLogger } from './debugLogger'

export class QueryHandler {
  constructor(private registry: DataRegistry) {}

  /**
   * Handle any GraphQL query generically
   */
  async handle(queryName: string, operation: string, variables: MockGraphQLVariables): Promise<MockGraphQLResponse> {
    // Find entity configuration
    const entityConfig = this.registry.findEntityByQuery(queryName, operation)

    if (!entityConfig) {
      debugLogger.unhandledQuery(`${queryName} (${operation})`)
      throw new Error(`No entity registered for query: ${queryName} (${operation})`)
    }

    debugLogger.routeMatch(operation, entityConfig.source.data.length)

    // Handle specific ID queries
    if (isIdQuery(variables)) {
      return this.handleByIdQuery(operation, variables, entityConfig)
    }

    // Handle standard list queries
    return this.handleListQuery(operation, variables, entityConfig)
  }

  /**
   * Handle queries for specific entity by ID
   */
  private handleByIdQuery(
    operation: string,
    variables: MockGraphQLVariables,
    config: EntityConfig
  ): MockGraphQLResponse {
    const entityId = variables.id || extractIdFromWhere(variables.where)

    if (!entityId) {
      return createSimpleResponse([], operation)
    }

    let entity
    if (config.source.getById) {
      entity = config.source.getById(entityId)
    } else {
      const idField = config.source.idField || 'id'
      entity = config.source.data.find(item => item[idField] === entityId)
    }

    return createSimpleResponse(entity ? [entity] : [], operation)
  }

  /**
   * Handle standard list queries with filtering, sorting, pagination
   */
  private handleListQuery(
    operation: string,
    variables: MockGraphQLVariables,
    config: EntityConfig
  ): MockGraphQLResponse {
    let data = [...config.source.data]

    // Apply filtering
    data = applyFilters(data, variables.where)

    // Apply sorting (use default or provided)
    const orderBy = variables.orderBy || config.source.defaultSort
    data = applySorting(data, orderBy)

    return createPaginatedResponse(data, data.length, operation, variables.offset, variables.limit)
  }

  // Relation handling removed - data already contains proper relationship objects
}
