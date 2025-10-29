/**
 * 🚀 Generic Config Registry Auto-Loader
 *
 * Automatically imports and initializes ALL data configurations.
 * New configs just need to be added to this file - no changes needed elsewhere.
 */

import { debugLogger } from '../core/debugLogger'

// Import configurations directly at the top level
import { registerProductData } from './productDataConfig'
import { registerCatalogData } from './catalogDataConfig'
import { registerSalesData } from './salesDataConfig'
import { registerContentData } from '@/common/data/content/mock/contentDataConfig'

/**
 * Configuration registry interface
 * All config modules must export a register function
 */
export interface DataConfigModule {
  [key: string]: () => void // register functions
}

/**
 * Auto-initialize all data configurations (async version)
 * This function discovers and runs all register functions automatically
 */
export const initializeAllDataConfigs = async (): Promise<void> => {
  const startTime = Date.now()
  let configCount = 0

  try {
    // Import all config modules
    const configModules = {
      product: () => import('./productDataConfig'),
      catalog: () => import('./catalogDataConfig'),
      sales: () => import('./salesDataConfig'),
      content: () => import('@/common/data/content/mock/contentDataConfig')
      // Add new configs here - they'll be auto-loaded:
      // hr: () => import('./hrDataConfig'),
      // finance: () => import('./financeDataConfig'),
    }

    // Initialize each config module
    for (const [domain, importFn] of Object.entries(configModules)) {
      try {
        const module = await importFn()

        // Find the register function (follows naming convention: register{Domain}Data)
        const registerFunctionName = `register${domain.charAt(0).toUpperCase() + domain.slice(1)}Data`
        const registerFunction = module[registerFunctionName]

        if (typeof registerFunction === 'function') {
          registerFunction()
          configCount++
          debugLogger.log(`✅ Initialized ${domain} data configuration`)
        } else {
          debugLogger.log(`⚠️ No register function found for ${domain} (expected: ${registerFunctionName})`)
        }
      } catch (error) {
        debugLogger.log(`❌ Failed to initialize ${domain} configuration:`, error)
      }
    }

    const duration = Date.now() - startTime
    debugLogger.log(`🚀 Data Registry: Initialized ${configCount} configurations in ${duration}ms`)
  } catch (error) {
    debugLogger.log('❌ Failed to initialize data configurations:', error)
  }
}

/**
 * Synchronous version using direct imports
 * More reliable for immediate initialization
 */
export const initializeAllDataConfigsSync = (): void => {
  const startTime = Date.now()
  let configCount = 0

  try {
    const configs = [
      { name: 'product', fn: registerProductData },
      { name: 'catalog', fn: registerCatalogData },
      { name: 'sales', fn: registerSalesData },
      { name: 'content', fn: registerContentData }
      // Add new configs here:
      // { name: 'hr', fn: registerHRData },
      // { name: 'finance', fn: registerFinanceData },
    ]

    configs.forEach(({ name, fn }) => {
      try {
        fn()
        configCount++
        debugLogger.log(`✅ Initialized ${name} data configuration`)
      } catch (error) {
        debugLogger.log(`❌ Failed to initialize ${name} configuration:`, error)
      }
    })

    const duration = Date.now() - startTime
    debugLogger.log(`🚀 Data Registry: Initialized ${configCount} configurations in ${duration}ms`)
  } catch (error) {
    debugLogger.log('❌ Failed to initialize data configurations:', error)
  }
}
