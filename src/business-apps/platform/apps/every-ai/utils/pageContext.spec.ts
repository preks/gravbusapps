import { parsePageContext } from './pageContext'

describe('parsePageContext document routes', () => {
  it('maps task manager inbox route to cflow_task entity', () => {
    const result = parsePageContext(
      'https://newwork-dev.newwork.com/platform/task-manager?view=inbox&taskId=4694a31c-5f5f-30a7-992b-a13cc9f7f8ad'
    )

    expect(result).toEqual({
      type: 'entity',
      entity_name: 'cflow_task',
      id: '4694a31c-5f5f-30a7-992b-a13cc9f7f8ad'
    })
  })

  it('maps flow detail route to service_workflow entity', () => {
    const result = parsePageContext(
      'https://newwork-dev.newwork.com/platform/apps/flow/apps/detail?flowId=632e93bf-d40f-4965-b2d2-c165c97a1d0b'
    )

    expect(result).toEqual({
      type: 'entity',
      entity_name: 'service_workflow',
      id: '632e93bf-d40f-4965-b2d2-c165c97a1d0b'
    })
  })

  it('maps document-apps editor route to document entity', () => {
    const result = parsePageContext(
      'https://app.example.com/platform/apps/document-apps?docId=8f7a2d90-1c4b-4f7a-9e2a-5c6b7d8e9f01&view=editor'
    )

    expect(result).toEqual({
      type: 'entity',
      entity_name: 'document',
      id: '8f7a2d90-1c4b-4f7a-9e2a-5c6b7d8e9f01'
    })
  })

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
