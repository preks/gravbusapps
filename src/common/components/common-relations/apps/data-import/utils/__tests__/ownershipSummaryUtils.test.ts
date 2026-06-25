import { formatOwnershipCompanyNames, summarizeOwnershipUpdates } from '../ownershipSummaryUtils'

describe('ownershipSummaryUtils', () => {
  it('formats company names with percentages and unresolved markers', () => {
    expect(formatOwnershipCompanyNames(['Beta Holdings', 'Missing Co'], ['company-beta-id', ''], [50, null])).toBe(
      'Beta Holdings (50%), Missing Co (Unresolved)'
    )
  })

  it('summarizes unresolved ownership ids', () => {
    expect(
      summarizeOwnershipUpdates([
        {
          rowIndex: 0,
          companyName: 'Alpha GmbH',
          ownerCompanyNames: ['Beta Holdings', 'Missing Co'],
          ownerCompanyIds: ['company-beta-id', ''],
          ownedCompanyNames: ['Delta Capital'],
          ownedCompanyIds: ['company-delta-id']
        }
      ])
    ).toEqual({
      relationshipCount: 3,
      unresolvedCount: 1
    })
  })
})
