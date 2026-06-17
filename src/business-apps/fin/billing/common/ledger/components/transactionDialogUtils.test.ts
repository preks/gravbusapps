import {
  balanceSelectionValue,
  indicatorSelectionValue,
  inputSelectionValue,
  isSystemIndicatorBalance,
  parseLedgerPartySelection,
  partySelectionBalanceId,
  partySelectionIndicator,
  partySelectionInputValue,
  partySelectionValue,
  serializeLedgerPartySelection,
  toIndicator,
  transactionPartyValue
} from './transactionDialogUtils'
import type { LedgerBalance } from '../network/ledgerAdminClient'

function balance(partial: Partial<LedgerBalance>): LedgerBalance {
  return {
    id: partial.balanceId ?? partial.id ?? 'bln-test',
    balanceId: partial.balanceId ?? partial.id ?? 'bln-test',
    ledgerId: 'led-test',
    name: partial.name ?? '',
    currency: partial.currency ?? 'EUR',
    balance: 0,
    inflightBalance: 0,
    ...partial
  }
}

describe('ledger party selection helpers', () => {
  it('serializes normal balances separately from submitted balance ids', () => {
    const value = balanceSelectionValue('bln_123')

    expect(value).toBe('balance:bln_123')
    expect(parseLedgerPartySelection(value)).toEqual({ kind: 'existing_balance', balanceId: 'bln_123' })
    expect(partySelectionValue(value)).toBe('bln_123')
    expect(partySelectionBalanceId(value)).toBe('bln_123')
    expect(partySelectionIndicator(value)).toBeNull()
  })

  it('serializes system indicators separately from submitted indicators', () => {
    const value = indicatorSelectionValue('@World')

    expect(value).toBe('indicator:@World')
    expect(parseLedgerPartySelection(value)).toEqual({ kind: 'system_indicator', indicator: '@World' })
    expect(partySelectionValue(value)).toBe('@World')
    expect(partySelectionIndicator(value)).toBe('@World')
    expect(partySelectionBalanceId(value)).toBeNull()
  })

  it('normalizes legacy raw refs into selector values', () => {
    expect(partySelectionInputValue('bln_123')).toBe('balance:bln_123')
    expect(partySelectionInputValue('@World')).toBe('indicator:@World')
  })

  it('keeps empty input mode values distinguishable from selection mode', () => {
    expect(inputSelectionValue('')).toBe('input:')
    expect(transactionPartyValue(inputSelectionValue(''))).toBe('')
  })

  it('detects balances backed by system indicators', () => {
    expect(isSystemIndicatorBalance(balance({ indicator: '@World' }))).toBe(true)
    expect(isSystemIndicatorBalance(balance({ indicator: 'customer-001' }))).toBe(false)
    expect(isSystemIndicatorBalance(balance({ indicator: undefined }))).toBe(false)
  })

  it('serializes typed selections for select values', () => {
    expect(serializeLedgerPartySelection({ kind: 'existing_balance', balanceId: 'bln_123' })).toBe('balance:bln_123')
    expect(serializeLedgerPartySelection({ kind: 'system_indicator', indicator: '@OpeningBalance' })).toBe(
      'indicator:@OpeningBalance'
    )
  })

  it('normalizes friendly external text into indicators', () => {
    expect(toIndicator('Opening Balance')).toBe('@OpeningBalance')
    expect(toIndicator('@World')).toBe('@World')
    expect(transactionPartyValue(inputSelectionValue('Opening Balance'))).toBe('@OpeningBalance')
  })

  it('resolves selected values and preserves explicit typed refs', () => {
    expect(transactionPartyValue('balance:bln_123')).toBe('bln_123')
    expect(transactionPartyValue(inputSelectionValue('@World'))).toBe('@World')
    expect(transactionPartyValue(inputSelectionValue('bln_123'))).toBe('bln_123')
  })
})
