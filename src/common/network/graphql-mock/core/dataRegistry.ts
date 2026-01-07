/**
 * 🗃️ Generic Data Registry for Mock GraphQL Client
 *
 * Maps GraphQL operations to data sources using simple configuration.
 * This approach decouples the mock client from specific domains.
 */

export interface DataSource {
  data: any[]
  idField?: string
  defaultSort?: any[]
  getById?: (id: string) => any
}

export interface EntityConfig {
  // Primary data source
  source: DataSource

  // Alternative entity names (for query matching)
  aliases?: string[]

  // Note: Relations removed - data already contains proper relationship objects
}

/**
 * Generic Data Registry
 *
 * Entities register their data sources here, and the mock client
 * uses this registry to resolve queries generically.
 */
export class DataRegistry {
  private entities = new Map<string, EntityConfig>()

  /**
   * Register an entity with its data source
   */
  register(entityName: string, config: EntityConfig): void {
    this.entities.set(entityName, config)

    // Register aliases
    if (config.aliases) {
      config.aliases.forEach(alias => {
        this.entities.set(alias, config)
      })
    }
  }

  /**
   * Get entity configuration by name
   */
  getEntity(entityName: string): EntityConfig | undefined {
    return this.entities.get(entityName)
  }

  /**
   * Get all registered entity names
   */
  getEntityNames(): string[] {
    return Array.from(this.entities.keys())
  }

  /**
   * Find entity by query pattern
   */
  findEntityByQuery(queryName: string, operation: string): EntityConfig | undefined {
    // Direct match
    const entity = this.getEntity(operation)
    if (entity) return entity

    // Pattern matching
    for (const [entityName, config] of this.entities.entries()) {
      if (queryName.includes(entityName) || operation.includes(entityName)) {
        return config
      }
    }

    return undefined
  }
}

// Global registry instance
export const dataRegistry = new DataRegistry()
