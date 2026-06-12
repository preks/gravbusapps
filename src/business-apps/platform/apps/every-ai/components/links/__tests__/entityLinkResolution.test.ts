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

  describe('service_workflow protocol', () => {
    it('resolves running instances to the flow detail page', () => {
      const id = 'bed7f6c4-7172-45aa-b952-f97f577a18be'
      const resolved = resolveEntityLink(`service_workflow://${id}`)

      expect(resolved).not.toBeNull()
      expect(resolved?.protocol).toBe('service_workflow')
      expect(resolved?.id).toBe(id)
      expect(resolved?.url).toBe(`/platform/apps/flow/apps/detail?flowId=${id}`)
    })

    it('builds the Flow Studio draft URL when a draftId is embedded', () => {
      const resolved = resolveEntityLink('service_workflow://draft-123?draftId=draft-123')

      expect(resolved?.url).toBe('/platform/create/flow-studio?draftId=draft-123#manage')
      expect(resolved?.id).toBe('draft-123')
    })
  })

  describe('workflow_template protocol', () => {
    it('resolves templates to Flow Studio flows view', () => {
      const id = 'aaaaaaaa-bbbb-cccc-dddd-111111111111'
      const resolved = resolveEntityLink(`workflow_template://${id}`)

      expect(resolved).not.toBeNull()
      expect(resolved?.protocol).toBe('workflow_template')
      expect(resolved?.id).toBe(id)
      expect(resolved?.url).toBe(`/platform/create/flow-studio?flowId=${id}#flows`)
    })
  })
})

describe('getEntityUrl', () => {
  it('returns flow detail URL for service_workflow by id fallback', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const url = getEntityUrl('service_workflow', id)
    expect(url).toBe(`/platform/apps/flow/apps/detail?flowId=${id}`)
  })

  it('returns the items-list URL for expense_item', () => {
    const url = getEntityUrl('expense_item', 'item-1234')
    expect(url).toBe('/platform/fin/expenses/personal-expenses?tab=expense-items')
  })

  it('returns the items-list URL via link resolution too', () => {
    const url = getEntityUrl('expense_item', 'item-1234', 'expense_item://item-1234')
    expect(url).toBe('/platform/fin/expenses/personal-expenses?tab=expense-items')
  })

  it('preserves direct Flow Studio draft links', () => {
    const url = getEntityUrl('service_workflow', 'draft-123', '/platform/create/flow-studio?draftId=draft-123#manage')
    expect(url).toBe('/platform/create/flow-studio?draftId=draft-123#manage')
  })
})
