/**
 * Employee Name Cache Types
 * TypeScript interfaces for employee caching system
 */

export interface EmployeeData {
  id: string;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  displayName: string | null;
  preferredName: string | null;
  pictureThumbnail?: string | null;
}

export interface CacheEntry {
  data: EmployeeData;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheStats {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

export interface BatchFetchRequest {
  userIds: string[];
  timestamp: number;
  resolve: (results: Map<string, EmployeeData | null>) => void;
  reject: (error: Error) => void;
}

export interface EmployeeNameCacheConfig {
  /** Time to live for cache entries in milliseconds (default: 5 minutes) */
  ttl: number;
  /** Maximum number of entries to keep in cache (default: 1000) */
  maxEntries: number;
  /** Batch request timeout in milliseconds (default: 100ms) */
  batchTimeout: number;
  /** Maximum batch size for GraphQL queries (default: 50) */
  maxBatchSize: number;
  /** Enable debug logging (default: false) */
  enableDebugLogging: boolean;
}

export interface GraphQLEmployeeResponse {
  Employee: EmployeeData[];
}

export type EmployeeNameCacheEventType = 
  | 'cache_hit' 
  | 'cache_miss' 
  | 'cache_set' 
  | 'cache_expired' 
  | 'batch_fetch' 
  | 'cache_clear';

export interface EmployeeNameCacheEvent {
  type: EmployeeNameCacheEventType;
  userId?: string;
  userIds?: string[];
  timestamp: number;
  metadata?: Record<string, any>;
}
