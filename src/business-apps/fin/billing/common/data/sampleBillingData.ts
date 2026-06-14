/**
 * Default billing configuration used while backend settings are unavailable.
 * Invoice/customer/statement records are not bundled as runtime fallbacks.
 */
import { DEFAULT_CURRENCY_SETTINGS, DEFAULT_PAYMENT_TERMS, DEFAULT_TAX_CATEGORIES } from '../constants'
import type { BillingSettings } from '../queries/billingCoreApi'
import type { LegalEntity } from '../types'

export const SAMPLE_LEGAL_ENTITY: LegalEntity = {
  id: 'le-newwork-gmbh',
  name: 'NEWWORK GmbH',
  addressLines: ['Friedrichstraße 1', '10117 Berlin'],
  countryCode: 'DE',
  taxId: 'DE-1234567',
  vatId: 'DE123456789',
  accountingCurrency: 'EUR',
  defaultCurrency: 'EUR',
  bankAccounts: [
    { id: 'ba-1', label: 'Main account', iban: 'DE89370400440532013000', bic: 'COBADEFFXXX', currency: 'EUR' }
  ],
  invoiceFooter: 'Thank you for your business.',
  defaultLocale: 'de-DE'
}

export const SAMPLE_SETTINGS: BillingSettings = {
  legalEntities: [SAMPLE_LEGAL_ENTITY],
  taxCategories: DEFAULT_TAX_CATEGORIES,
  currencies: DEFAULT_CURRENCY_SETTINGS,
  paymentTerms: DEFAULT_PAYMENT_TERMS
}
