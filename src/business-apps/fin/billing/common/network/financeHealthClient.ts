import { invokeLedgerTool, ledgerAdminEnabled } from '../ledger/network/ledgerAdminClient'

const HealthTools = {
  healthDetailed: 'blnk_health_detailed'
} as const

export const financeAdminEnabled = (): boolean => ledgerAdminEnabled()

export interface BackendHealth {
  status: string
  checks: Record<string, string>
}

export async function fetchDetailedHealth(accessToken: string): Promise<BackendHealth | null> {
  const rows = await invokeLedgerTool(accessToken, HealthTools.healthDetailed, {})
  const first = rows[0] as { status?: string; checks?: Record<string, string> } | undefined
  if (!first) return null
  return { status: first.status ?? 'UNKNOWN', checks: first.checks ?? {} }
}
