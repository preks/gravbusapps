/**
 * Compatibility facade for finance admin clients.
 *
 * Prefer importing new code from the owning domain client:
 * - common/reconciliation/network/reconciliationClient
 * - common/settings/network/financeSettingsClient
 * - common/reports/network/financeReportsClient
 * - common/invoices/network/creditNoteClient
 */
export { createCreditNote } from '../invoices/network/creditNoteClient'
export {
  applyBankStatementMatch,
  importBankStatement,
  listBankStatementLines,
  suggestBankStatementMatches
} from '../reconciliation/network/reconciliationClient'
export type { ImportStatementLine } from '../reconciliation/network/reconciliationClient'
export {
  closeReportingPeriod,
  fetchArAging,
  fetchRevenue,
  fetchVat,
  listReportingPeriods,
  reopenReportingPeriod
} from '../reports/network/financeReportsClient'
export type {
  ArAgingBucket,
  ReportFilter,
  ReportingPeriod,
  RevenueRow,
  VatRow
} from '../reports/network/financeReportsClient'
export { getFinanceSettings, saveFinanceSettings } from '../settings/network/financeSettingsClient'
export type {
  FinanceNumberingSettings,
  FinanceSettingsDocument,
  PostingAccountsConfig
} from '../settings/network/financeSettingsClient'
export { fetchDetailedHealth, financeAdminEnabled } from './financeHealthClient'
export type { BackendHealth } from './financeHealthClient'
