import { invokeLedgerTool } from '../../ledger/network/ledgerAdminClient'

/** Create a credit note against an invoice and return the new backend row. */
export async function createCreditNote(
  accessToken: string,
  invoiceId: string,
  args: { amount?: number; reason?: string }
): Promise<Record<string, unknown> | null> {
  const rows = await invokeLedgerTool(accessToken, 'blnk_create_credit_note', {
    invoice_id: invoiceId,
    amount: args.amount,
    reason: args.reason,
    idempotency_key: `creditnote:${invoiceId}:${Date.now()}`
  })
  return rows[0] ?? null
}
