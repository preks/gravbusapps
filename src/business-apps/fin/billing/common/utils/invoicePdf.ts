/**
 * Invoice PDF data model builder.
 *
 * Produces an immutable, presentation-ready snapshot of an issued invoice. The
 * actual rendering (pdfkit / template service) consumes this stable model so the
 * document content is deterministic and snapshot-testable.
 */
import { formatCurrency, formatPercent } from './currency'
import type { BillingCustomer, Invoice, LegalEntity } from '../types'

export interface InvoicePdfLine {
  description: string
  quantity: number
  unitPrice: string
  discount: string
  taxRate: string
  net: string
  gross: string
}

export interface InvoicePdfTaxRow {
  label: string
  net: string
  tax: string
}

export interface InvoicePdfModel {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  seller: { name: string; addressLines: string[]; vatId: string | null; bankIban: string | null }
  buyer: { name: string; addressLines: string[]; vatId: string | null }
  currency: string
  lines: InvoicePdfLine[]
  taxRows: InvoicePdfTaxRow[]
  netTotal: string
  taxTotal: string
  grossTotal: string
  footer: string | null
  locale: string
}

function safeDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

export function buildInvoicePdfModel(
  invoice: Invoice,
  legalEntity: LegalEntity,
  customer: BillingCustomer
): InvoicePdfModel {
  const locale = invoice.locale ?? customer.preferredLocale ?? legalEntity.defaultLocale ?? 'en-US'
  const currency = invoice.currency

  return {
    invoiceNumber: invoice.invoiceNumber ?? 'DRAFT',
    issueDate: safeDate(invoice.issueDate),
    dueDate: safeDate(invoice.dueDate),
    seller: {
      name: legalEntity.name,
      addressLines: legalEntity.addressLines,
      vatId: legalEntity.vatId ?? null,
      bankIban: legalEntity.bankAccounts[0]?.iban ?? null
    },
    buyer: {
      name: customer.name,
      addressLines: customer.billingAddressLines,
      vatId: customer.vatId ?? null
    },
    currency,
    lines: invoice.lines.map(line => ({
      description: line.description,
      quantity: line.quantity,
      unitPrice: formatCurrency(line.unitPrice, currency, locale),
      discount: formatPercent(line.discountPercent, locale),
      taxRate: formatPercent(line.taxRatePercent, locale),
      net: formatCurrency(line.netAmount, currency, locale),
      gross: formatCurrency(line.grossAmount, currency, locale)
    })),
    taxRows: invoice.totals.taxSummary.map(entry => ({
      label: `${formatPercent(entry.taxRatePercent, locale)} (${entry.treatment})`,
      net: formatCurrency(entry.netAmount, currency, locale),
      tax: formatCurrency(entry.taxAmount, currency, locale)
    })),
    netTotal: formatCurrency(invoice.totals.netTotal, currency, locale),
    taxTotal: formatCurrency(invoice.totals.taxTotal, currency, locale),
    grossTotal: formatCurrency(invoice.totals.grossTotal, currency, locale),
    footer: legalEntity.invoiceFooter ?? null,
    locale
  }
}
