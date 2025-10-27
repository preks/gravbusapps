/**
 * 🚀 Generic Query Router for Mock GraphQL Client
 *
 * Routes all GraphQL queries to the generic handler using the data registry.
 * No domain-specific knowledge required.
 */

import { debugLogger } from './debugLogger'
import { extractVariables, MockGraphQLResponse } from './queryHelpers'
import { QueryHandler } from './queryHandler'
import { dataRegistry } from './dataRegistry'

// Generic config auto-loader (no domain-specific imports needed!)
import { initializeAllDataConfigsSync } from '../config'

export class QueryRouter {
  private handler: QueryHandler

  constructor() {
    this.initializeDataSources()
    this.handler = new QueryHandler(dataRegistry)
  }

  /**
   * Initialize all data sources by registering them with the data registry
   * Uses generic auto-loader - no domain-specific knowledge required!
   */
  private initializeDataSources(): void {
    initializeAllDataConfigsSync()
  }

  /**
   * Route GraphQL query to the generic handler
   */
  async route(query: string): Promise<MockGraphQLResponse> {
    const queryName = debugLogger.extractQueryName(query)
    const operation = debugLogger.extractOperation(query)
    const variables = extractVariables(query)

    // All queries are handled generically
    return this.handler.handle(queryName, operation, variables)
  }
}

/**
 * Create and export router instance
 */
export const createQueryRouter = (): QueryRouter => {
  return new QueryRouter()
}
