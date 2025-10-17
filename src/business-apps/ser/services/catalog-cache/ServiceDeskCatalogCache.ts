/**
 * ServiceDeskCatalog Cache Service
 * Provides in-memory caching with TTL for ServiceDeskCatalog data
 * Prevents duplicate GraphQL queries across components
 */

import type {
  ServiceDeskCatalog,
  ServiceDeskCatalogEntry,
  CatalogCacheEntry,
  CatalogCacheConfig,
  CatalogCacheStats
} from './types'
import { env } from '@/common/env/EnvUtils'

// GraphQL query for ServiceDeskCatalog
const GET_SERVICE_DESK_CATALOG = `
  query GetServiceDeskCatalog {
    Catalog(where: {identifier: {_eq: "ServiceDeskCatalog"}}) {
      id
      name
      identifier
      description
      catalogEntries(where: {isDeleted: {_eq: false}}) {
        id
        code
        value
        objectValue
        additionalValue1
        additionalValue2
        additionalValue3
        isDeleted
      }
    }
  }
`

class ServiceDeskCatalogCache {
  private cache: CatalogCacheEntry | null = null
  private config: CatalogCacheConfig
  private accessToken: string | null = null
  private fetchPromise: Promise<ServiceDeskCatalog | null> | null = null

  constructor(config: CatalogCacheConfig) {
    this.config = config
    this.log('ServiceDeskCatalogCache initialized')
  }

  /**
   * Initialize cache with access token
   */
  public initialize(accessToken: string): void {
    this.accessToken = accessToken
    this.log('Cache initialized with access token')
  }

  /**
   * Get catalog data (with caching)
   */
  public async get(): Promise<ServiceDeskCatalog | null> {
    // Check if we have valid cached data
    if (this.cache && !this.isExpired(this.cache)) {
      this.log('Cache hit - returning cached data')
      return this.cache.data
    }

    // If there's already a fetch in progress, wait for it
    if (this.fetchPromise) {
      this.log('Fetch already in progress - waiting for result')
      return await this.fetchPromise
    }

    // Start new fetch
    this.fetchPromise = this.fetchFromAPI()

    try {
      const result = await this.fetchPromise
      return result
    } finally {
      this.fetchPromise = null
    }
  }

  /**
   * Get processed catalog entries (sorted with "Under desk" entry)
   */
  public async getCatalogEntries(): Promise<ServiceDeskCatalogEntry[]> {
    const catalog = await this.get()

    if (!catalog || !catalog.catalogEntries) {
      return []
    }

    // Sort catalog entries by additionalValue1 (display order) then by code
    const sortedEntries = catalog.catalogEntries.sort((a: ServiceDeskCatalogEntry, b: ServiceDeskCatalogEntry) => {
      // Parse additionalValue1 as numbers for proper sorting
      const orderA = a.additionalValue1 ? parseInt(a.additionalValue1, 10) : 999
      const orderB = b.additionalValue1 ? parseInt(b.additionalValue1, 10) : 999

      if (orderA !== orderB) {
        return orderA - orderB
      }

      // If order is the same, sort by code alphabetically
      return a.code.localeCompare(b.code)
    })

    // Add special "Under desk" entry for uncategorized tasks
    const entriesWithUnderDesk = [
      ...sortedEntries,
      {
        id: 'under-desk-special',
        code: 'Under desk',
        value: 'Under desk',
        additionalValue1: '999', // Show last
        additionalValue2: null,
        additionalValue3: null,
        isDeleted: false
      } as ServiceDeskCatalogEntry
    ]

    return entriesWithUnderDesk
  }

  /**
   * Fetch catalog from GraphQL API
   */
  private async fetchFromAPI(): Promise<ServiceDeskCatalog | null> {
    if (!this.accessToken) {
      throw new Error('ServiceDeskCatalogCache not initialized with access token')
    }

    this.log('Fetching ServiceDeskCatalog from GraphQL API')

    // Use the same GraphQL endpoint as the rest of the application
    let endpoint: string
    try {
      endpoint = env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK') || 'https://newwork-dev.newwork.com/v1/graphql'
    } catch (error) {
      console.warn('[ServiceDeskCatalogCache] Could not access environment variable, using default endpoint:', error)
      endpoint = 'https://newwork-dev.newwork.com/v1/graphql'
    }

    // Use fetch directly to avoid dependency issues
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({
        query: GET_SERVICE_DESK_CATALOG
      })
    })

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`)
    }

    const result: { data: { Catalog: ServiceDeskCatalog[] } } = await response.json()

    const catalogs = result.data?.Catalog || []
    const catalog = catalogs.length > 0 ? catalogs[0] : null

    // Cache the result
    this.cache = {
      data: catalog,
      timestamp: Date.now()
    }

    this.log(`Cached ServiceDeskCatalog with ${catalog?.catalogEntries?.length || 0} entries`)

    return catalog
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CatalogCacheEntry): boolean {
    const age = Date.now() - entry.timestamp
    return age > this.config.ttl
  }

  /**
   * Get cache statistics
   */
  public getStats(): CatalogCacheStats {
    const hasData = !!this.cache?.data
    const lastFetchTime = this.cache?.timestamp || null
    const ageMs = lastFetchTime ? Date.now() - lastFetchTime : null
    const isExpired = this.cache ? this.isExpired(this.cache) : true

    return {
      hasData,
      lastFetchTime,
      ageMs,
      isExpired
    }
  }

  /**
   * Clear cache
   */
  public clear(): void {
    this.cache = null
    this.fetchPromise = null
    this.log('Cache cleared')
  }

  /**
   * Debug logging
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.enableDebugLogging) {
      console.log(`[ServiceDeskCatalogCache] ${message}`, ...args)
    }
  }
}

// Global cache instance
let globalCatalogCache: ServiceDeskCatalogCache | null = null

/**
 * Get or create the global ServiceDeskCatalogCache instance
 */
export function getServiceDeskCatalogCache(config?: CatalogCacheConfig): ServiceDeskCatalogCache {
  if (!globalCatalogCache) {
    const defaultConfig: CatalogCacheConfig = {
      ttl: 5 * 60 * 1000, // 5 minutes default TTL
      enableDebugLogging: process.env.NODE_ENV === 'development'
    }
    globalCatalogCache = new ServiceDeskCatalogCache(config || defaultConfig)
  }
  return globalCatalogCache
}

/**
 * Reset the global cache (useful for testing)
 */
export function resetServiceDeskCatalogCache(): void {
  globalCatalogCache = null
}

export { ServiceDeskCatalogCache }
