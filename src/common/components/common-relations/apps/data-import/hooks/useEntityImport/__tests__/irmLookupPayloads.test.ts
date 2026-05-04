/**
 * IRM payload-builder smoke tests for the lookup arrays produced by Flowbot's
 * hardcoded IRM import layer (Owner/Contact/Account columns). These ensure the
 * resolved-id arrays are forwarded all the way through to the Java payload
 * for the new entity types covered in this batch (contact + opportunity).
 */

import { toInvestmentContactPayload } from '../irm/toInvestmentContactPayload'
import { toInvestmentOpportunityPayload } from '../irm/toInvestmentOpportunityPayload'

describe('toInvestmentContactPayload — lookup arrays from Flowbot', () => {
  it('forwards accountContacts with the resolved Account id and contactType', () => {
    const payload = toInvestmentContactPayload(
      {
        firstName: 'Anna',
        lastName: 'Vorberg',
        ownerEmployee: 'employee-resolved-id',
        accountContacts: [
          { account: 'account-anna-id', contactType: 'PRIMARY_CONTACT' },
          { account: 'account-newwork-id', contactType: 'SECONDARY_CONTACT' }
        ]
      },
      // No logged-in user override so the per-row owner survives.
      undefined
    )

    expect(payload.firstName).toBe('Anna')
    expect(payload.lastName).toBe('Vorberg')
    expect(payload.ownerEmployee).toBe('employee-resolved-id')
    expect(payload.accountContacts).toEqual([
      { account: 'account-anna-id', contactType: 'PRIMARY_CONTACT' },
      { account: 'account-newwork-id', contactType: 'SECONDARY_CONTACT' }
    ])
  })

  it('omits accountContacts when Flowbot did not produce a list', () => {
    const payload = toInvestmentContactPayload(
      {
        firstName: 'Anna',
        lastName: 'Vorberg',
        ownerEmployee: 'employee-resolved-id'
      },
      undefined
    )

    expect(payload.accountContacts).toBeUndefined()
  })

  it('prefers the logged-in employee id over the per-row owner (existing behaviour)', () => {
    const payload = toInvestmentContactPayload(
      {
        firstName: 'Anna',
        ownerEmployee: 'employee-from-row'
      },
      'employee-logged-in'
    )

    expect(payload.ownerEmployee).toBe('employee-logged-in')
  })
})

describe('toInvestmentOpportunityPayload — lookup arrays from Flowbot', () => {
  it('forwards opportunityContacts and opportunityAccounts as-is', () => {
    const payload = toInvestmentOpportunityPayload(
      {
        name: 'Deal A',
        ownerEmployee: 'employee-resolved-id',
        opportunityContacts: [
          { contact: 'contact-anna-id', contactType: 'PRIMARY_CONTACT' },
          { contact: 'contact-erjon-id', contactType: 'SECONDARY_CONTACT' }
        ],
        opportunityAccounts: [
          { account: 'account-newwork-id', accountTypeRef: 'InvestmentAccountType:v1:INVESTMENT' },
          { account: 'account-amazon-id', accountTypeRef: 'InvestmentAccountType:v1:REFERRAL' }
        ]
      },
      undefined
    )

    expect(payload.name).toBe('Deal A')
    expect(payload.ownerEmployee).toBe('employee-resolved-id')
    expect(payload.opportunityContacts).toEqual([
      { contact: 'contact-anna-id', contactType: 'PRIMARY_CONTACT' },
      { contact: 'contact-erjon-id', contactType: 'SECONDARY_CONTACT' }
    ])
    expect(payload.opportunityAccounts).toEqual([
      { account: 'account-newwork-id', accountTypeRef: 'InvestmentAccountType:v1:INVESTMENT' },
      { account: 'account-amazon-id', accountTypeRef: 'InvestmentAccountType:v1:REFERRAL' }
    ])
  })

  it('drops the legacy ownerEmployee key so only the renamed payload key is sent', () => {
    const payload = toInvestmentOpportunityPayload(
      {
        name: 'Deal A',
        ownerEmployee: 'employee-from-row'
      },
      undefined
    )

    expect(payload.ownerEmployee).toBe('employee-from-row')
  })
})
