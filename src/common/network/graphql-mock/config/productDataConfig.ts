/**
 * 🛍️ Product Data Configuration
 *
 * Registers product-related entities with the generic data registry.
 * This is the ONLY file that needs to know about product domain specifics.
 */

import { dataRegistry } from '../core/dataRegistry'

// Product data imports
import { mockProducts, getProductById } from '../../product/mock-data/products'

import {
  mockProductInventories,
  mockProductMovements,
  mockInventoryProductStock
} from '../../product/mock-data/inventory'

import { mockProductCompositions } from '../../product/mock-data/composition'

import { mockProductPrices, getProductPriceById } from '../../product/mock-data/pricing'

/**
 * Register all product-related entities
 */
export const registerProductData = () => {
  // Register Products
  dataRegistry.register('Product', {
    source: {
      data: mockProducts,
      getById: getProductById,
      defaultSort: [{ name: 'ASC' }]
    },
    aliases: ['Products']
  })

  // Register Product Inventories
  dataRegistry.register('ProductInventory', {
    source: {
      data: mockProductInventories,
      defaultSort: [{ name: 'ASC' }]
    },
    aliases: ['ProductInventories', 'Inventory']
  })

  // Register Inventory Stock
  dataRegistry.register('InventoryProductStock', {
    source: {
      data: mockInventoryProductStock,
      defaultSort: [{ productInventory: { name: 'ASC' } }]
    },
    aliases: ['Stock']
    // Note: Relations removed - data already contains proper relationship objects
  })

  // Register Product Movements
  dataRegistry.register('ProductMovement', {
    source: {
      data: mockProductMovements,
      defaultSort: [{ createdAt: 'DESC' }]
    },
    aliases: ['Movement', 'Movements']
    // Note: Relations removed - data already contains proper relationship objects
  })

  // Register Product Compositions
  dataRegistry.register('ProductComposition', {
    source: {
      data: mockProductCompositions,
      defaultSort: [{ parentProduct: { name: 'ASC' } }, { sequenceNumber: 'ASC' }]
    },
    aliases: ['Composition', 'BOM']
    // Note: Relations removed - data already contains proper relationship objects
  })

  // Register Product Prices
  dataRegistry.register('ProductPrice', {
    source: {
      data: mockProductPrices,
      getById: getProductPriceById,
      defaultSort: [{ product: { name: 'ASC' } }, { validFrom: 'DESC' }]
    },
    aliases: ['Price', 'Pricing']
    // Note: Relations removed - data already contains proper relationship objects
  })
}
