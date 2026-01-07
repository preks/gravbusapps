/**
 * 📚 Catalog Data Configuration
 *
 * Registers catalog-related entities with the generic data registry.
 */

import { dataRegistry } from '../core/dataRegistry'

// Catalog data imports
// NOTE:
// The original implementation imported mock catalog data from
// "../../product/mock-data/catalogs" and "../../product/mock-data/pricing".
// These files do not exist in this repository, which breaks Vite's module
// resolution in local development.
//
// To keep the graphql-mock layer working without external dependencies,
// we provide minimal in-file stubs. They can be extended with real mock data
// later if needed.

const mockProductGroups: any[] = []
const mockProductTypes: any[] = []
const mockUnitOfMeasurements: any[] = []
const mockCurrencies: any[] = []
const mockLocationTypes: any[] = []
const mockInventoryMovementTypes: any[] = []

const mockPriceTypes: any[] = []
const mockCustomerGroups: any[] = []

/**
 * Register all catalog-related entities
 */
export const registerCatalogData = () => {
  // Combine all catalog entries
  const allCatalogEntries = [
    ...mockProductGroups,
    ...mockProductTypes,
    ...mockUnitOfMeasurements,
    ...mockCurrencies,
    ...mockLocationTypes,
    ...mockInventoryMovementTypes,
    ...mockPriceTypes,
    ...mockCustomerGroups
  ]

  // Register main CatalogEntry entity
  dataRegistry.register('CatalogEntry', {
    source: {
      data: allCatalogEntries,
      defaultSort: [{ value: 'ASC' }]
    },
    aliases: [
      'Catalog',
      'ProductGroup',
      'ProductType',
      'UnitOfMeasurement',
      'Currency',
      'LocationType',
      'InventoryMovementType',
      'PriceType',
      'CustomerGroup'
    ]
  })

  // Register specific catalog types for easier access
  dataRegistry.register('ProductGroup', {
    source: {
      data: mockProductGroups,
      defaultSort: [{ value: 'ASC' }]
    }
  })

  dataRegistry.register('ProductType', {
    source: {
      data: mockProductTypes,
      defaultSort: [{ value: 'ASC' }]
    }
  })

  dataRegistry.register('UnitOfMeasurement', {
    source: {
      data: mockUnitOfMeasurements,
      defaultSort: [{ value: 'ASC' }]
    },
    aliases: ['UOM']
  })

  dataRegistry.register('Currency', {
    source: {
      data: mockCurrencies,
      defaultSort: [{ value: 'ASC' }]
    }
  })

  dataRegistry.register('PriceType', {
    source: {
      data: mockPriceTypes,
      defaultSort: [{ value: 'ASC' }]
    }
  })

  dataRegistry.register('CustomerGroup', {
    source: {
      data: mockCustomerGroups,
      defaultSort: [{ value: 'ASC' }]
    }
  })
}
