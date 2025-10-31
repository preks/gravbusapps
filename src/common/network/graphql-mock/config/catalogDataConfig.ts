/**
 * 📚 Catalog Data Configuration
 *
 * Registers catalog-related entities with the generic data registry.
 */

import { dataRegistry } from '../core/dataRegistry'

// Catalog data imports
import {
  mockProductGroups,
  mockProductTypes,
  mockUnitOfMeasurements,
  mockCurrencies,
  mockLocationTypes,
  mockInventoryMovementTypes
} from '../../product/mock-data/catalogs'

import { mockPriceTypes, mockCustomerGroups } from '../../product/mock-data/pricing'

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
