/**
 * Ledger Admin client.
 *
 * Reaches the real ledger backend through NEWWORK Connect's connector framework
 * (the "BLNK Ledger" external connection, lane = mcp_servers). The browser calls
 * the prompt-manager connector API with the user's bearer token; the connector's
 * own credentials stay server-side.
 *
 * Transport: POST {promptManager}/external-connections/{connectionId}/invoke
 *   body: { action: "<tool>", arguments: {...} }
 *   resp: MCP wrapper result, normalized to rows below.
 *
 * The connection id is environment-specific; we resolve it from
 * NEXT_PUBLIC_LEDGER_CONNECTION_ID, otherwise auto-discover the active BLNK /
 * ledger MCP connection from the connector list.
 */
export { transactionAmount } from './ledgerAdminMappers'
export { DEFAULT_LEDGER_ID, invokeLedgerTool, ledgerAdminEnabled } from './ledgerAdminTransport'
export {
  checkLedgerHealth,
  createAccount,
  createBalance,
  createLedger,
  getBalance,
  getBalanceAtTime,
  getLedger,
  listAccounts,
  listBalances,
  listLedgers
} from './ledgerBalanceClient'
export {
  createSplitTransaction,
  createTransaction,
  getTransaction,
  getTransactionByReference,
  listTransactions,
  refundTransaction,
  reimburseExpense,
  updateInflightTransaction
} from './ledgerTransactionClient'
export { buildTransfers, ledgerBalanceRef, postLedgerTransaction } from './ledgerPostingClient'
export type {
  CreateAccountInput,
  CreateBalanceInput,
  CreateLedgerInput,
  CreateSplitTransactionInput,
  CreateTransactionInput,
  Ledger,
  LedgerAccount,
  LedgerBalance,
  LedgerTransaction,
  LedgerTransfer,
  PostLedgerResult,
  RefundTransactionInput,
  ReimburseExpenseInput,
  UpdateInflightTransactionInput
} from './ledgerAdminTypes'
