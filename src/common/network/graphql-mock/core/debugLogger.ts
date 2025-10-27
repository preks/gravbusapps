/**
 * 🔍 Debug Logger for Mock GraphQL Client
 *
 * Provides centralized logging for query execution, performance monitoring,
 * and development debugging across all mock GraphQL handlers.
 */

/**
 * 🔍 DEBUG CONFIGURATION
 *
 * DEBUG_ENABLED = true/false
 *   - Controls all debug output
 *   - Set to false to disable all console logging
 *
 * DEBUG_DETAILED = true/false
 *   - Controls verbose output (full query strings, full result objects)
 *   - Set to false to show only essential info (query name, execution time, result size)
 *
 * Debug output includes:
 *   🚀 Query execution start (name, operation type, variables)
 *   ✅ Query execution success (execution time, result size, data structure)
 *   ❌ Query execution errors (error details, failed query, variables)
 *   ⚠️ Unhandled queries (missing query implementations)
 */
const DEBUG_ENABLED = true
const DEBUG_DETAILED = true

interface QueryResult {
  data: any
  size: number
  keys: string[]
}

export class DebugLogger {
  /**
   * Extract query name from GraphQL query string
   */
  extractQueryName(query: string): string {
    const match = query.match(/query\s+(\w+)/)
    return match ? match[1] : 'Unknown'
  }

  /**
   * Extract operation name from query (e.g., 'Product', 'Inventory')
   */
  extractOperation(query: string): string {
    // Look for patterns like "Product(", "Inventory(", etc.
    const operationMatch = query.match(/{\s*(\w+)\s*\(/)
    return operationMatch ? operationMatch[1] : 'Unknown'
  }

  /**
   * Log query execution start
   */
  queryStart(query: string): void {
    if (!DEBUG_ENABLED) return

    const queryName = this.extractQueryName(query)
    const operation = this.extractOperation(query)

    console.log(`🚀 [${new Date().toISOString()}] Mock GraphQL Query: ${queryName}`)
    console.log(`🎯 Operation: ${operation}`)

    if (DEBUG_DETAILED) {
      console.log('📝 Query:', query)
    }
  }

  /**
   * Log successful query completion
   */
  querySuccess(query: string, startTime: number, result: any): void {
    if (!DEBUG_ENABLED) return

    const queryName = this.extractQueryName(query)
    const executionTime = Date.now() - startTime
    const resultInfo = this.analyzeResult(result)

    console.log(`✅ [${new Date().toISOString()}] Query ${queryName} completed in ${executionTime}ms`)
    console.log(`📊 Result: ${resultInfo.size} items, keys: [${resultInfo.keys.join(', ')}]`)

    if (DEBUG_DETAILED && resultInfo.data) {
      console.log('📋 Result data:', resultInfo.data)
    }
  }

  /**
   * Log query errors
   */
  queryError(query: string, error: any): void {
    if (!DEBUG_ENABLED) return

    const queryName = this.extractQueryName(query)

    console.error(`❌ [${new Date().toISOString()}] Query ${queryName} failed:`, error)

    if (DEBUG_DETAILED) {
      console.error('🔍 Failed query:', query)
    }
  }

  /**
   * Log unhandled queries
   */
  unhandledQuery(query: string): void {
    if (!DEBUG_ENABLED) return

    const queryName = this.extractQueryName(query)
    const operation = this.extractOperation(query)

    console.warn(`⚠️ [${new Date().toISOString()}] Unhandled query: ${queryName} (${operation})`)

    if (DEBUG_DETAILED) {
      console.warn('🔍 Unhandled query:', query)
    }
  }

  /**
   * Log route matching
   */
  routeMatch(routeName: string, dataSize: number): void {
    if (!DEBUG_ENABLED) return

    console.log(`🎯 MATCHED: ${routeName} route`)
    console.log(`📦 Initial data size: ${dataSize}`)
  }

  /**
   * Log data selection for catalog queries
   */
  catalogSelection(catalogType: string, dataSize: number, sampleEntry?: any): void {
    if (!DEBUG_ENABLED) return

    console.log(`📦 Selected ${catalogType} catalog data size: ${dataSize}`)

    if (DEBUG_DETAILED && sampleEntry) {
      console.log('📋 Sample catalog entry:', sampleEntry)
    }
  }

  /**
   * Generic log method for general debugging messages
   */
  log(message: string, ...args: any[]): void {
    if (!DEBUG_ENABLED) return

    console.log(`🔍 [${new Date().toISOString()}] ${message}`, ...args)
  }

  /**
   * Analyze result structure for logging
   */
  private analyzeResult(result: any): QueryResult {
    if (!result) {
      return { data: null, size: 0, keys: [] }
    }

    const keys = Object.keys(result)
    let size = 0

    // Calculate total size across all result keys
    keys.forEach(key => {
      const value = result[key]
      if (Array.isArray(value)) {
        size += value.length
      } else if (value && typeof value === 'object') {
        size += 1
      }
    })

    return {
      data: DEBUG_DETAILED ? result : null,
      size,
      keys
    }
  }
}

// Export singleton instance
export const debugLogger = new DebugLogger()
