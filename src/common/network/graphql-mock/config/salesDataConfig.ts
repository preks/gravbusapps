/**
 * 💰 Sales Data Configuration
 *
 * Registers sales-related entities with the generic data registry.
 * This is the ONLY file that needs to know about sales domain specifics.
 */

import { dataRegistry } from '../core/dataRegistry'

/**
 * Register all sales-related entities
 */
export const registerSalesData = () => {
  try {
    // Sales invoice imports
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const salesInvoiceModule = require('../../sales/mock-data/salesInvoices')
    const { mockSalesInvoices, getSalesInvoiceById } = salesInvoiceModule

    // Sales order imports
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const salesOrderModule = require('../../sales/mock-data/salesOrders')
    const { mockSalesOrders, getSalesOrderById } = salesOrderModule

    // Sales quote imports
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const salesQuoteModule = require('../../sales/mock-data/salesQuotes')
    const { mockSalesQuotes, getSalesQuoteById } = salesQuoteModule

    // Customer imports
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const customerModule = require('../../sales/mock-data/customers')
    const { mockCustomerAccounts, mockCustomerContacts, getCustomerAccountById, getCustomerContactById } =
      customerModule

    // Sales catalog imports
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const salesCatalogModule = require('../../sales/mock-data/catalogs')
    const {
      mockSalesInvoiceTypes,
      mockSalesOrderTypes,
      mockSalesQuoteTypes,
      mockPaymentTerms,
      mockDeliveryTypes,
      mockDeliveryTerms,
      mockCountries,
      mockCountryRegions,
      mockTaxCodes
    } = salesCatalogModule
    // Register Sales Invoices
    dataRegistry.register('SalesInvoice', {
      source: {
        data: mockSalesInvoices,
        getById: getSalesInvoiceById,
        defaultSort: [{ invoiceDate: 'DESC' }]
      },
      aliases: ['Invoice', 'Invoices']
      // Note: Relations removed - data already contains proper relationship objects
    })

    // Register Sales Orders
    dataRegistry.register('SalesOrder', {
      source: {
        data: mockSalesOrders,
        getById: getSalesOrderById,
        defaultSort: [{ orderDate: 'DESC' }]
      },
      aliases: ['Order', 'Orders']
      // Note: Relations removed - data already contains proper relationship objects
    })

    // Register Sales Quotes
    dataRegistry.register('SalesQuote', {
      source: {
        data: mockSalesQuotes,
        getById: getSalesQuoteById,
        defaultSort: [{ quoteDate: 'DESC' }]
      },
      aliases: ['Quote', 'Quotes']
      // Note: Relations removed - data already contains proper relationship objects
    })

    // Register Customer Accounts
    dataRegistry.register('CustomerAccount', {
      source: {
        data: mockCustomerAccounts,
        getById: getCustomerAccountById,
        defaultSort: [{ name: 'ASC' }]
      },
      aliases: ['Customer', 'Account']
    })

    // Register Customer Contacts
    dataRegistry.register('CustomerContact', {
      source: {
        data: mockCustomerContacts,
        getById: getCustomerContactById,
        defaultSort: [{ firstName: 'ASC' }, { lastName: 'ASC' }]
      },
      aliases: ['Contact']
    })

    // Register Sales-specific catalog entries
    const allSalesCatalogEntries = [
      ...mockSalesInvoiceTypes,
      ...mockSalesOrderTypes,
      ...mockSalesQuoteTypes,
      ...mockPaymentTerms,
      ...mockDeliveryTypes,
      ...mockDeliveryTerms,
      ...mockCountries,
      ...mockCountryRegions,
      ...mockTaxCodes
    ]

    // Add sales catalog entries to main catalog
    const existingCatalogConfig = dataRegistry.getEntity('CatalogEntry')
    if (existingCatalogConfig) {
      existingCatalogConfig.source.data.push(...allSalesCatalogEntries)
    }
  } catch {
    // Sales module doesn't exist - this is fine
    console.log('Sales module not available - skipping sales data registration')
  }
}
