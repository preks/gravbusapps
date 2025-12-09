/**
 * 🛍️ Product Data Configuration
 *
 * Registers product-related entities with the generic data registry.
 * This is the ONLY file that needs to know about product domain specifics.
 */

import { dataRegistry } from '../core/dataRegistry'

// Product data imports
// NOTE:
// The original implementation imported product mock data from
// "../../product/mock-data/*" modules which are not present in this repository.
// That breaks Vite's module resolution in local development.
//
// To keep the graphql-mock layer working without external dependencies,
// we provide minimal in-file stubs. They can be extended with real mock data
// later if needed.

const mockProducts: any[] = []
const getProductById = (id: string) => mockProducts.find(p => (p as any).id === id)

const mockProductInventories: any[] = []
const mockProductMovements: any[] = []
const mockInventoryProductStock: any[] = []

const mockProductCompositions: any[] = []

const mockProductPrices: any[] = []
const getProductPriceById = (id: string) => mockProductPrices.find(p => (p as any).id === id)

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
