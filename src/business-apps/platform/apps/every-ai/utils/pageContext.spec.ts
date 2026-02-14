import { parsePageContext } from './pageContext'

describe('parsePageContext document routes', () => {
  it('maps CRM document detail route to crm_document entity', () => {
    const result = parsePageContext(
      'https://app.example.com/platform/crm/customer-relations?view=documents&documentId=8f7a2d90-1c4b-4f7a-9e2a-5c6b7d8e9f01'
    )

    expect(result).toEqual({
      type: 'entity',
      entity_name: 'crm_document',
      id: '8f7a2d90-1c4b-4f7a-9e2a-5c6b7d8e9f01'
    })
  })

  it('maps CRM documents overview route to crm_document overview', () => {
    const result = parsePageContext('https://app.example.com/platform/crm/customer-relations?view=documents')

    expect(result).toEqual({
      type: 'overview',
      entity_name: 'crm_document'
    })
  })
})
