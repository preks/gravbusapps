import { env } from '@/common/env/EnvUtils'
import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'

/**
 * Supported MCP tool names exposed by the BLNK Ledger connection.
 * Keep this list intentionally narrow: MCP is a tool wrapper, not the full
 * BLNK REST API. In particular, there is no `blnk_list_balances` tool.
 */
export const LedgerTools = {
  findAccount: 'blnk_find_account',
  createBalance: 'blnk_create_balance',
  getBalance: 'blnk_get_balance',
  listTransactions: 'blnk_list_transactions',
  createTransaction: 'blnk_create_transaction',
  updateInflightTransaction: 'blnk_update_inflight_transaction'
} as const

const CONNECTOR_BASE = `${PROMPT_MANAGER_API_URL}/external-connections`
export const DEFAULT_LEDGER_ID = 'general_ledger_id'

/** The Ledger Admin lane is available whenever the prompt-manager base resolves. */
export const ledgerAdminEnabled = (): boolean => Boolean(PROMPT_MANAGER_API_URL)

export interface InvokeResult {
  rows: Array<Record<string, unknown>>
  fields?: Array<{ name: string }>
  totalEstimate?: number
}

interface ConnectionSummary {
  connection_id: string
  name?: string
  kind?: string
  url?: string
  active?: boolean
}

let cachedConnectionId: string | null = null

async function connectorGet<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${CONNECTOR_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!response.ok) throw new Error(`NEWWORK Connect request failed: ${response.status} ${path}`)
  return (await response.json()) as T
}

/** Resolve the BLNK ledger connection id (env override, else auto-discover). */
async function resolveConnectionId(accessToken: string): Promise<string> {
  const override = env('NEXT_PUBLIC_LEDGER_CONNECTION_ID')
  if (override) return override
  if (cachedConnectionId) return cachedConnectionId

  const json = await connectorGet<{ data?: ConnectionSummary[] } | ConnectionSummary[]>('/', accessToken)
  const list = Array.isArray(json) ? json : (json.data ?? [])
  const match =
    list.find(c => c.active && /blnk|ledger/i.test(`${c.name ?? ''} ${c.url ?? ''}`)) ??
    list.find(c => /blnk|ledger/i.test(`${c.name ?? ''} ${c.url ?? ''}`))
  if (!match) throw new Error('No active BLNK ledger connection found in NEWWORK Connect')
  cachedConnectionId = match.connection_id
  return cachedConnectionId
}

/** Invoke an MCP tool on the BLNK ledger connection and return its normalized result. */
export async function invokeLedgerAction(
  accessToken: string,
  action: string,
  args: Record<string, unknown> = {}
): Promise<InvokeResult> {
  const connectionId = await resolveConnectionId(accessToken)
  const response = await fetch(`${CONNECTOR_BASE}/${connectionId}/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ action, arguments: args })
  })
  const text = await response.text()
  const json = text ? JSON.parse(text) : {}
  if (!response.ok || json?.success === false || json?.error) {
    const detail = json?.error ?? json?.detail ?? json?.message ?? `${response.status}`
    throw new Error(`Ledger action "${action}" failed: ${normalizeConnectorError(detail)}`)
  }
  const result = json?.result ?? {}
  const rows = normalizeMcpRows(result)
  const rowError = rows.find(row => typeof row?.error === 'string')?.error
  if (rowError) {
    throw new Error(`Ledger action "${action}" failed: ${normalizeConnectorError(rowError)}`)
  }
  return {
    rows,
    fields: result.fields,
    totalEstimate: result.totalEstimate
  }
}

/**
 * Invoke an arbitrary tool on the shared BLNK connection and return its rows.
 * Used by sibling clients (e.g. the invoice client) that target the same
 * connector lane without duplicating connection resolution/transport.
 */
export async function invokeLedgerTool(
  accessToken: string,
  action: string,
  args: Record<string, unknown> = {}
): Promise<Array<Record<string, unknown>>> {
  const result = await invokeLedgerAction(accessToken, action, args)
  return result.rows
}

function normalizeMcpRows(result: unknown): Array<Record<string, unknown>> {
  if (result && typeof result === 'object') {
    const content = (result as Record<string, unknown>).content
    if (Array.isArray(content)) {
      const contentRows = content.flatMap(item => {
        if (!item || typeof item !== 'object') return []
        const text = (item as Record<string, unknown>).text
        if (typeof text !== 'string') return []
        try {
          return extractRowsFromValue(JSON.parse(text))
        } catch {
          return []
        }
      })
      if (contentRows.length > 0) return contentRows
    }
  }

  return extractRowsFromValue(result)
}

function extractRowsFromValue(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>
  if (!value || typeof value !== 'object') return []

  const record = value as Record<string, unknown>
  for (const key of ['rows', 'accounts', 'balances', 'transactions', 'items', 'data']) {
    if (Array.isArray(record[key])) return record[key] as Array<Record<string, unknown>>
  }
  if (record.structuredContent) return extractRowsFromValue(record.structuredContent)
  if (record.result) return extractRowsFromValue(record.result)
  return [record]
}

function normalizeConnectorError(detail: unknown): string {
  const message = typeof detail === 'string' ? detail : JSON.stringify(detail)
  if (/failure to get a peer from the ring-balancer/i.test(message)) {
    return 'Finance backend is temporarily unavailable: no healthy backend peer is available'
  }
  return message
}
