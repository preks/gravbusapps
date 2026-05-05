import { resolveEntityLink, getEntityUrl } from '../EntityLink'

const encodeFragment = (metadata: Record<string, unknown>): string => {
  const json = JSON.stringify(metadata)
  const base64 = Buffer.from(json, 'utf-8').toString('base64')
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('resolveEntityLink', () => {
  describe('expense_item protocol', () => {
    const itemId = 'dd0839fa-8237-4e82-80ed-19ccf8550f39'

    it('navigates to the expense items list (no dedicated item page exists)', () => {
      const resolved = resolveEntityLink(`expense_item://${itemId}`)

      expect(resolved).not.toBeNull()
      expect(resolved?.protocol).toBe('expense_item')
      expect(resolved?.id).toBe(itemId)
      expect(resolved?.url).toBe('/platform/fin/expenses/personal-expenses?tab=expense-items')
      expect(resolved?.url).not.toContain('expense-request-record')
    })

    it('still navigates to the items list even when an alternateId fragment is present', () => {
      const fragment = encodeFragment({ alternateId: '11111111-2222-3333-4444-555555555555' })
      const resolved = resolveEntityLink(`expense_item://${itemId}#${fragment}`)

      expect(resolved).not.toBeNull()
      expect(resolved?.url).toBe('/platform/fin/expenses/personal-expenses?tab=expense-items')
    })
  })

  describe('expense_request protocol', () => {
    it('builds the expense-request-record URL', () => {
      const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
      const resolved = resolveEntityLink(`expense_request://${id}`)

      expect(resolved?.url).toBe(`/platform/fin/expenses/expense-request-record?expenseRequestId=${id}`)
    })
  })
})

describe('getEntityUrl', () => {
  it('returns the items-list URL for expense_item', () => {
    const url = getEntityUrl('expense_item', 'item-1234')
    expect(url).toBe('/platform/fin/expenses/personal-expenses?tab=expense-items')
  })

  it('returns the items-list URL via link resolution too', () => {
    const url = getEntityUrl('expense_item', 'item-1234', 'expense_item://item-1234')
    expect(url).toBe('/platform/fin/expenses/personal-expenses?tab=expense-items')
  })
})
