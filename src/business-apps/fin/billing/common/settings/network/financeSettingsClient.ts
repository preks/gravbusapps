import { invokeLedgerTool } from '../../ledger/network/ledgerAdminClient'
import type { BillingSettings } from '../../queries/billingCoreApi'
import type { PostingAccounts } from '../../constants'

const SettingsTools = {
  getSettings: 'blnk_get_finance_settings',
  saveSettings: 'blnk_save_finance_settings'
} as const

/**
 * Finance settings document persisted server-side under a single key.
 * Extends the invoice-facing BillingSettings with posting rules and numbering,
 * so the whole finance configuration lives in one authoritative document.
 */
export interface FinanceNumberingSettings {
  format: string
  resetPolicy: string
}

/** Editable posting-account map (same keys as the defaults, free-form codes). */
export type PostingAccountsConfig = Record<keyof PostingAccounts, string>

export interface FinanceSettingsDocument extends BillingSettings {
  postingAccounts: PostingAccountsConfig
  numbering: FinanceNumberingSettings
}

/**
 * Load the finance settings document from BLNK. Returns null when the backend
 * has no document yet (empty data) so callers can distinguish "not seeded" from
 * a real document. Never returns mock data.
 */
export async function getFinanceSettings(
  accessToken: string,
  key = 'default'
): Promise<FinanceSettingsDocument | null> {
  const rows = await invokeLedgerTool(accessToken, SettingsTools.getSettings, { key })
  const first = rows[0] as { data?: unknown } | undefined
  const data = first?.data
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) {
    return null
  }
  return data as FinanceSettingsDocument
}

/** Upsert the finance settings document in BLNK. */
export async function saveFinanceSettings(
  accessToken: string,
  document: FinanceSettingsDocument,
  key = 'default'
): Promise<void> {
  await invokeLedgerTool(accessToken, SettingsTools.saveSettings, { key, data: document })
}
