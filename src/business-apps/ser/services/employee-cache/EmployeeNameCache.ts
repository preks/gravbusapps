/**
 * Employee Name Cache Service
 * Provides in-memory caching with TTL and batch fetching for employee data
 */

// GraphQL client functionality implemented using fetch to avoid React hook issues
import type { 
  EmployeeData, 
  CacheEntry, 
  CacheStats, 
  BatchFetchRequest, 
  EmployeeNameCacheConfig,
  GraphQLEmployeeResponse,
  EmployeeNameCacheEvent,
  EmployeeNameCacheEventType
} from './types';
import { env } from '@/common/env/EnvUtils';

export class EmployeeNameCache {
  private cache = new Map<string, CacheEntry>();
  private config: EmployeeNameCacheConfig;
  private stats = {
    hitCount: 0,
    missCount: 0,
  };
  private batchQueue: BatchFetchRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private graphqlClient: any = null;
  private accessToken: string = '';

  constructor(config: Partial<EmployeeNameCacheConfig> = {}) {
    this.config = {
      ttl: 5 * 60 * 1000, // 5 minutes
      maxEntries: 1000,
      batchTimeout: 100, // 100ms
      maxBatchSize: 50,
      enableDebugLogging: false,
      ...config,
    };

    this.log('Cache initialized', { config: this.config });
  }

  /**
   * Initialize the cache with GraphQL client
   */
  public initialize(accessToken: string): void {
    this.accessToken = accessToken;
    // Note: We'll create the GraphQL client when needed to avoid hook issues
    this.log('Cache initialized with access token');
  }

  /**
   * Get employee data from cache or fetch if not available
   */
  public async get(userId: string): Promise<EmployeeData | null> {
    // Check cache first
    const cached = this.getCached(userId);
    if (cached) {
      this.stats.hitCount++;
      this.emitEvent('cache_hit', { userId });
      return cached.data;
    }

    this.stats.missCount++;
    this.emitEvent('cache_miss', { userId });

    // Fetch single employee
    const results = await this.batchFetch([userId]);
    return results.get(userId) || null;
  }

  /**
   * Get multiple employee data entries with batch fetching
   */
  public async getBatch(userIds: string[]): Promise<Map<string, EmployeeData | null>> {
    const results = new Map<string, EmployeeData | null>();
    const uncachedUserIds: string[] = [];

    // Check cache for each userId
    for (const userId of userIds) {
      const cached = this.getCached(userId);
      if (cached) {
        results.set(userId, cached.data);
        this.stats.hitCount++;
        this.emitEvent('cache_hit', { userId });
      } else {
        uncachedUserIds.push(userId);
        this.stats.missCount++;
        this.emitEvent('cache_miss', { userId });
      }
    }

    // Batch fetch uncached entries
    if (uncachedUserIds.length > 0) {
      const fetchedResults = await this.batchFetch(uncachedUserIds);
      for (const [userId, data] of fetchedResults) {
        results.set(userId, data);
      }
    }

    return results;
  }

  /**
   * Get cached entry if valid (not expired)
   */
  private getCached(userId: string): CacheEntry | null {
    const entry = this.cache.get(userId);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(userId);
      this.emitEvent('cache_expired', { userId });
      return null;
    }

    return entry;
  }

  /**
   * Set cache entry
   */
  private setCached(userId: string, data: EmployeeData): void {
    // Cleanup old entries if we're at max capacity
    if (this.cache.size >= this.config.maxEntries) {
      this.cleanupOldEntries();
    }

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: this.config.ttl,
    };

    this.cache.set(userId, entry);
    this.emitEvent('cache_set', { userId });
    this.log(`Cached employee data for userId: ${userId}`, { displayName: data.displayName });
  }

  /**
   * Batch fetch employees with request queuing and deduplication
   */
  private async batchFetch(userIds: string[]): Promise<Map<string, EmployeeData | null>> {
    return new Promise((resolve, reject) => {
      // Add to batch queue
      this.batchQueue.push({
        userIds,
        timestamp: Date.now(),
        resolve,
        reject,
      });

      // Set timer if not already set
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatchQueue();
        }, this.config.batchTimeout);
      }
    });
  }

  /**
   * Process the batch queue and make GraphQL request
   */
  private async processBatchQueue(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const requests = [...this.batchQueue];
    this.batchQueue = [];
    this.batchTimer = null;

    // Deduplicate userIds across all requests
    const allUserIds = new Set<string>();
    for (const request of requests) {
      for (const userId of request.userIds) {
        allUserIds.add(userId);
      }
    }

    const uniqueUserIds = Array.from(allUserIds);
    this.log(`Processing batch queue: ${requests.length} requests, ${uniqueUserIds.length} unique userIds`);

    try {
      // Split into chunks if too large
      const chunks = this.chunkArray(uniqueUserIds, this.config.maxBatchSize);
      const allResults = new Map<string, EmployeeData | null>();

      for (const chunk of chunks) {
        const chunkResults = await this.fetchEmployeesFromAPI(chunk);
        for (const [userId, data] of chunkResults) {
          allResults.set(userId, data);
        }
      }

      // Resolve all requests
      for (const request of requests) {
        const requestResults = new Map<string, EmployeeData | null>();
        for (const userId of request.userIds) {
          requestResults.set(userId, allResults.get(userId) || null);
        }
        request.resolve(requestResults);
      }

      this.emitEvent('batch_fetch', { userIds: uniqueUserIds });

    } catch (error) {
      this.log('Batch fetch error', { error: error instanceof Error ? error.message : error });
      
      // Reject all requests
      for (const request of requests) {
        request.reject(error instanceof Error ? error : new Error('Batch fetch failed'));
      }
    }
  }

  /**
   * Fetch employees from GraphQL API
   */
  private async fetchEmployeesFromAPI(userIds: string[]): Promise<Map<string, EmployeeData | null>> {
    if (!this.accessToken) {
      throw new Error('EmployeeNameCache not initialized with access token');
    }

    // Use the same GraphQL endpoint as the rest of the application
    let endpoint: string;
    try {
      endpoint = env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK') || 'https://newwork-dev.newwork.com/v1/graphql';
    } catch (error) {
      console.warn('[EmployeeNameCache] Could not access environment variable, using default endpoint:', error);
      endpoint = 'https://newwork-dev.newwork.com/v1/graphql';
    }
    
    const GET_EMPLOYEES_BY_USER_IDS = `
      query GetEmployeesByUserIds($userIds: [String!]!) {
        Employee(where: { userId: { _in: $userIds } }) {
          id
          userId
          firstName
          lastName
          fullName
          displayName
          preferredName
          pictureThumbnail
        }
      }
    `;

    this.log(`Fetching ${userIds.length} employees from GraphQL API`);

    // Use fetch directly to avoid React hook issues in class method
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        query: GET_EMPLOYEES_BY_USER_IDS,
        variables: { userIds },
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const result: { data: GraphQLEmployeeResponse } = await response.json();

    const results = new Map<string, EmployeeData | null>();
    const foundEmployees = new Map<string, EmployeeData>();

    // Index found employees by userId
    for (const employee of result.data.Employee || []) {
      if (employee.userId) {
        foundEmployees.set(employee.userId, employee);
      }
    }

    // Set results for all requested userIds
    for (const userId of userIds) {
      const employee = foundEmployees.get(userId) || null;
      results.set(userId, employee);
      
      // Cache the result (even if null)
      if (employee) {
        this.setCached(userId, employee);
      }
    }

    this.log(`Fetched ${foundEmployees.size} employees out of ${userIds.length} requested`);
    return results;
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
    this.stats.hitCount = 0;
    this.stats.missCount = 0;
    this.emitEvent('cache_clear');
    this.log('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);
    
    return {
      totalEntries: this.cache.size,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      hitRate: this.stats.hitCount + this.stats.missCount > 0 
        ? this.stats.hitCount / (this.stats.hitCount + this.stats.missCount) 
        : 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }

  /**
   * Cleanup old entries when cache is full
   */
  private cleanupOldEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
    
    this.log(`Cleaned up ${toRemove} old cache entries`);
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Emit cache event (for debugging/monitoring)
   */
  private emitEvent(type: EmployeeNameCacheEventType, metadata: Record<string, any> = {}): void {
    const event: EmployeeNameCacheEvent = {
      type,
      timestamp: Date.now(),
      ...metadata,
    };

    // Could emit to external monitoring system here
    if (this.config.enableDebugLogging) {
      console.log('[EmployeeNameCache]', event);
    }
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.config.enableDebugLogging) {
      console.log(`[EmployeeNameCache] ${message}`, data || '');
    }
  }
}

// Singleton instance
let cacheInstance: EmployeeNameCache | null = null;

/**
 * Get or create singleton cache instance
 */
export function getEmployeeNameCache(config?: Partial<EmployeeNameCacheConfig>): EmployeeNameCache {
  if (!cacheInstance) {
    cacheInstance = new EmployeeNameCache(config);
  }
  return cacheInstance;
}

/**
 * Reset singleton instance (useful for testing)
 */
export function resetEmployeeNameCache(): void {
  cacheInstance = null;
}
