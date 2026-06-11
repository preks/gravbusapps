import {
  accountOptionLabel,
  buildAccountIndex,
  displayAccountName,
  hasFriendlyName,
  isExternalRef,
  resolveRefName
} from '../ledgerNames'
import type { LedgerAccount } from '../../network/ledgerAdminClient'

const t = (key: string) => key

function account(partial: Partial<LedgerAccount>): LedgerAccount {
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
  it('treats @World / world / empty as external', () => {
    expect(isExternalRef('@World')).toBe(true)
    expect(isExternalRef('@world')).toBe(true)
    expect(isExternalRef('world')).toBe(true)
    expect(isExternalRef('')).toBe(true)
    expect(isExternalRef(undefined)).toBe(true)
    expect(isExternalRef('bln-123')).toBe(false)
  })
})

describe('buildAccountIndex', () => {
  it('indexes by balanceId and id', () => {
    const acc = account({ balanceId: 'bln-1', name: 'Acme' })
    const index = buildAccountIndex([acc])
    expect(index.get('bln-1')).toBe(acc)
  })
})

describe('hasFriendlyName', () => {
  it('is false when name falls back to the id', () => {
    expect(hasFriendlyName(account({ balanceId: 'bln-1', name: 'bln-1' }))).toBe(false)
    expect(hasFriendlyName(account({ balanceId: 'bln-1', name: 'Acme' }))).toBe(true)
  })
})

describe('displayAccountName', () => {
  it('prefers the metadata name', () => {
    expect(displayAccountName(account({ balanceId: 'bln-1', name: 'Acme GmbH' }), t)).toBe('Acme GmbH')
  })

  it('resolves a GL balance ref to its named posting account', () => {
    expect(displayAccountName(account({ balanceId: 'nw-gl-1400', name: 'nw-gl-1400' }), t)).toBe(
      'billing-settings-account-ar (1400)'
    )
  })

  it('falls back to an unnamed-account label for opaque ids', () => {
    expect(displayAccountName(account({ balanceId: 'bln-xyz', name: '' }), t)).toBe('ledger-admin-unnamed-account')
  })

  it('uses the engine indicator when there is no metadata name', () => {
    expect(displayAccountName(account({ balanceId: 'bln-xyz', name: '', indicator: 'ACME-001' }), t)).toBe('ACME-001')
    expect(displayAccountName(account({ balanceId: 'bln-xyz', name: '', indicator: 'nw-gl-3806' }), t)).toBe(
      'billing-settings-account-tax (3806)'
    )
  })
})

describe('accountOptionLabel', () => {
  it('appends a short id + currency for unnamed accounts so duplicates differ', () => {
    const label = accountOptionLabel(account({ balanceId: 'bln_1234567890', name: '', currency: 'EUR' }), t)
    expect(label).toContain('ledger-admin-unnamed-account')
    expect(label).toContain('567890')
    expect(label).toContain('EUR')
  })

  it('shows just the name + currency for named accounts', () => {
    expect(accountOptionLabel(account({ balanceId: 'bln-1', name: 'Acme GmbH', currency: 'EUR' }), t)).toBe(
      'Acme GmbH · EUR'
    )
  })
})

describe('resolveRefName', () => {
  const index = buildAccountIndex([account({ balanceId: 'bln-1', name: 'Acme GmbH' })])

  it('labels external refs', () => {
    expect(resolveRefName('@World', index, t)).toBe('ledger-admin-external')
  })

  it('resolves known accounts to their name', () => {
    expect(resolveRefName('bln-1', index, t)).toBe('Acme GmbH')
  })

  it('resolves GL refs even when not in the index', () => {
    expect(resolveRefName('nw-gl-8000', index, t)).toBe('billing-settings-account-revenue (8000)')
  })

  it('passes through unknown refs', () => {
    expect(resolveRefName('bln-unknown', index, t)).toBe('bln-unknown')
  })
})
