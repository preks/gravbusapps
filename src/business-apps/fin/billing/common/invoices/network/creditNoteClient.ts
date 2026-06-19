import { invokeLedgerTool } from '../../ledger/network/ledgerAdminClient'
import { normalizeInvoice } from './invoiceClient'
import type { Invoice } from '../types'

export interface CreateCreditNoteArgs {
  amount: number
  reason: string
  actorId?: string
  idempotencyKey: string
  netAmount?: number
  taxAmount?: number
}

function invoiceFromRow(row: Record<string, unknown> | undefined): Invoice | null {
  if (!row) return null
  const data = row.data
  if (!data || typeof data !== 'object') return null

  return normalizeInvoice({ ...(data as Invoice), documentType: 'CREDIT_NOTE' }, row)
}

/** Create a credit note against an invoice and return the new backend row. */
export async function createCreditNote(
  accessToken: string,
  invoiceId: string,
  args: CreateCreditNoteArgs
): Promise<Invoice | null> {
  const rows = await invokeLedgerTool(accessToken, 'blnk_create_credit_note', {
    invoice_id: invoiceId,
    idempotency_key: args.idempotencyKey,
    actor_id: args.actorId,
    amount: args.amount,
    net_amount: args.netAmount,
    tax_amount: args.taxAmount,
    reason: args.reason
  })
  return invoiceFromRow(rows[0])
}
