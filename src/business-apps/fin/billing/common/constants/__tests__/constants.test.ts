import {
  DEFAULT_CURRENCY,
  DEFAULT_CURRENCY_SETTINGS,
  DEFAULT_TAX_CATEGORIES,
  DEFAULT_PAYMENT_TERMS,
  DEFAULT_POSTING_ACCOUNTS,
  BILLING_PERMISSIONS,
  CURRENCY_PRECISION,
  FINALIZED_STATUSES,
  EDITABLE_STATUSES
} from '..'

describe('enterprise billing defaults', () => {
  it('supports multi-currency from the start with sane precision', () => {
    expect(DEFAULT_CURRENCY).toBe('EUR')
    expect(DEFAULT_CURRENCY_SETTINGS.enabledCurrencies.length).toBeGreaterThan(1)
    expect(DEFAULT_CURRENCY_SETTINGS.enabledCurrencies).toContain('EUR')
    expect(CURRENCY_PRECISION.EUR).toBe(2)
    expect(CURRENCY_PRECISION.JPY).toBe(0)
  })

  it('ships EU/DE tax categories including reverse charge and exemption', () => {
    const treatments = DEFAULT_TAX_CATEGORIES.map(category => category.treatment)
    expect(treatments).toEqual(expect.arrayContaining(['STANDARD', 'REDUCED', 'REVERSE_CHARGE', 'EXEMPT']))
    // Every category carries at least one dated rate (validity-aware).
    DEFAULT_TAX_CATEGORIES.forEach(category => {
      expect(category.rates.length).toBeGreaterThan(0)
      category.rates.forEach(rate => expect(rate.validFrom).toBeTruthy())
    })
    const standard = DEFAULT_TAX_CATEGORIES.find(category => category.treatment === 'STANDARD')
    expect(standard?.rates[0].ratePercent).toBe(19)
  })

  it('provides payment terms including an early-payment discount term', () => {
    const ids = DEFAULT_PAYMENT_TERMS.map(term => term.id)
    expect(ids).toEqual(expect.arrayContaining(['term-net-14', 'term-net-30', 'term-net-60']))
    const discountTerm = DEFAULT_PAYMENT_TERMS.find(term => term.earlyPaymentDiscountPercent)
    expect(discountTerm?.earlyPaymentDiscountPercent).toBe(2)
    expect(discountTerm?.earlyPaymentDiscountDays).toBe(10)
  })

  it('maps all posting accounts required by the ledger builders', () => {
    expect(DEFAULT_POSTING_ACCOUNTS).toMatchObject({
      accountsReceivable: expect.any(String),
      revenue: expect.any(String),
      taxPayable: expect.any(String),
      cashClearing: expect.any(String),
      rounding: expect.any(String),
      fxGainLoss: expect.any(String),
      badDebt: expect.any(String)
    })
  })

  it('defines the enterprise permission set', () => {
    expect(Object.values(BILLING_PERMISSIONS)).toEqual(
      expect.arrayContaining([
        'billing.invoice.create',
        'billing.invoice.issue',
        'billing.invoice.cancel',
        'billing.creditNote.create',
        'billing.payment.allocate',
        'billing.settings.edit',
        'billing.report.export'
      ])
    )
  })

  it('separates finalized (immutable) statuses from editable ones', () => {
    expect(EDITABLE_STATUSES).toEqual(['DRAFT'])
    expect(FINALIZED_STATUSES).toContain('ISSUED')
    expect(FINALIZED_STATUSES).not.toContain('DRAFT')
  })
})
