import {
  balanceLabel,
  balanceOptionLabel,
  buildBalanceIndex,
  hasFriendlyName,
  isExternalRef,
  resolveBalanceRefName
} from '../ledgerNames'
import type { LedgerBalance } from '../../network/ledgerAdminClient'

const t = (key: string) => key

function balance(partial: Partial<LedgerBalance>): LedgerBalance {
  return {
    id: partial.balanceId ?? partial.id ?? 'bln-x',
    balanceId: partial.balanceId ?? partial.id ?? 'bln-x',
    ledgerId: 'led-1',
    name: partial.name ?? '',
    currency: 'EUR',
    balance: 0,
    inflightBalance: 0,
    ...partial
  }
}

describe('isExternalRef', () => {
  it('treats @World / world as external', () => {
    expect(isExternalRef('@World')).toBe(true)
    expect(isExternalRef('@world')).toBe(true)
    expect(isExternalRef('world')).toBe(true)
    expect(isExternalRef('')).toBe(false)
    expect(isExternalRef(undefined)).toBe(false)
    expect(isExternalRef('bln-123')).toBe(false)
  })
})

describe('buildBalanceIndex', () => {
  it('indexes by balanceId, id, and indicator', () => {
    const item = balance({ balanceId: 'bln-1', name: 'Acme', indicator: '@World' })
    const index = buildBalanceIndex([item])
    expect(index.get('bln-1')).toBe(item)
    expect(index.get('@World')).toBe(item)
  })
})

describe('hasFriendlyName', () => {
  it('is false when name falls back to the id', () => {
    expect(hasFriendlyName(balance({ balanceId: 'bln-1', name: 'bln-1' }))).toBe(false)
    expect(hasFriendlyName(balance({ balanceId: 'bln-1', name: 'Acme' }))).toBe(true)
  })
})

describe('balanceLabel', () => {
  it('prefers the metadata name', () => {
    expect(balanceLabel(balance({ balanceId: 'bln-1', name: 'Acme GmbH' }), t)).toBe('Acme GmbH')
  })

  it('resolves a GL balance ref to its named posting account', () => {
    expect(balanceLabel(balance({ balanceId: 'nw-gl-1400', name: 'nw-gl-1400' }), t)).toBe(
      'billing-settings-account-ar (1400)'
    )
  })

  it('falls back to the balance id for opaque ids', () => {
    expect(balanceLabel(balance({ balanceId: 'bln-xyz', name: '' }), t)).toBe('bln-xyz')
  })

  it('uses the engine indicator when there is no metadata name', () => {
    expect(balanceLabel(balance({ balanceId: 'bln-xyz', name: '', indicator: 'ACME-001' }), t)).toBe('ACME-001')
    expect(balanceLabel(balance({ balanceId: 'bln-xyz', name: '', indicator: 'nw-gl-3806' }), t)).toBe(
      'billing-settings-account-tax (3806)'
    )
  })

  it('labels external indicator balances as external', () => {
    expect(balanceLabel(balance({ balanceId: 'bln-world', name: '', indicator: '@World' }), t)).toBe(
      'ledger-admin-external'
    )
  })
})

describe('balanceOptionLabel', () => {
  it('uses the balance id + currency for unnamed balances', () => {
    const label = balanceOptionLabel(balance({ balanceId: 'bln_1234567890', name: '', currency: 'EUR' }), t)
    expect(label).toBe('bln_1234567890 · EUR')
  })

  it('shows just the name + currency for named accounts', () => {
    expect(balanceOptionLabel(balance({ balanceId: 'bln-1', name: 'Acme GmbH', currency: 'EUR' }), t)).toBe(
      'Acme GmbH · EUR'
    )
  })
})

describe('resolveBalanceRefName', () => {
  const index = buildBalanceIndex([balance({ balanceId: 'bln-1', name: 'Acme GmbH' })])

  it('labels external refs', () => {
    expect(resolveBalanceRefName('@World', index, t)).toBe('ledger-admin-external')
  })

  it('resolves known accounts to their name', () => {
    expect(resolveBalanceRefName('bln-1', index, t)).toBe('Acme GmbH')
  })

  it('resolves GL refs even when not in the index', () => {
    expect(resolveBalanceRefName('nw-gl-8000', index, t)).toBe('billing-settings-account-revenue (8000)')
  })

  it('falls back to unresolved balance refs', () => {
    expect(resolveBalanceRefName('bln-unknown', index, t)).toBe('bln-unknown')
  })

  it('shows an empty marker for missing refs', () => {
    expect(resolveBalanceRefName(undefined, index, t)).toBe('—')
  })
})
