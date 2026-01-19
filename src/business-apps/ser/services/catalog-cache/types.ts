/**
 * Types for ServiceDeskCatalog caching system
 */

export interface ServiceDeskCatalogEntry {
  id: string;
  code: string;
  value: string | null;
  additionalValue1: string | null; // Display order
  additionalValue2: string | null; // Manager role
  additionalValue3: string | null; // Department data
  isDeleted: boolean;
}

export interface ServiceDeskCatalog {
  id: string;
  name: string;
  identifier: string;
  description: string | null;
  catalogEntries: ServiceDeskCatalogEntry[];
}

export interface CatalogCacheEntry {
  data: ServiceDeskCatalog | null;
  timestamp: number; // Unix timestamp of when it was cached
}

export interface CatalogCacheConfig {
  ttl: number; // Time to live in milliseconds
  enableDebugLogging: boolean; // Enable console logging for cache operations
}

export interface CatalogCacheStats {
  hasData: boolean;
  lastFetchTime: number | null;
  ageMs: number | null;
  isExpired: boolean;
}
