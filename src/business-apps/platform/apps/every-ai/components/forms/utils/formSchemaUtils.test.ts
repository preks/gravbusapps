import {
  enrichNestedFlowInitialValues,
  resolveFlowProposalFormResolution,
  resolveFlowProposalSchema
} from './formSchemaUtils'

const changeAddressPayload = {
  arguments: {
    flow: {
      address: {
        type: 'PRIMARY',
        addressLine: ['Unter den Linden 3'],
        postalCode: '012345',
        locality: 'Berlin',
        countryRef: 'Country:v1:DE'
      },
      employeeId: '08b7cc98-4ec6-4b17-87fa-3eb5ccb7df8f',
      changeMode: 'UPDATE'
    },
    task: {},
    employeeId: '08b7cc98-4ec6-4b17-87fa-3eb5ccb7df8f'
  },
  flow_schema: {
    type: 'object',
    properties: {
      flow: {
        type: 'object',
        properties: {
          changeMode: { type: 'string' },
          employeeId: { type: 'string', 'x-priority': 'primary' },
          address: {
            type: 'object',
            properties: {
              employeeId: { type: 'string', format: 'uuid', 'x-priority': 'primary' },
              type: { type: 'string', enum: ['PRIMARY', 'SECONDARY'], 'x-priority': 'primary' },
              addressLine: { type: 'array', items: { type: 'string' }, 'x-priority': 'primary' },
              postalCode: { type: 'string', 'x-priority': 'primary' },
              locality: { type: 'string', 'x-priority': 'primary' },
              countryRef: { type: 'string', format: 'Country', 'x-priority': 'primary' }
            },
            required: ['type']
          }
        }
      },
      task: { type: 'object', properties: {} }
    },
    required: ['flow', 'task']
  }
}

describe('resolveFlowProposalFormResolution', () => {
  it('flattens nested flow.address values for changeAddress proposals', () => {
    const resolution = resolveFlowProposalFormResolution(changeAddressPayload.arguments)

    expect(resolution.objectKey).toBe('address')
    expect(resolution.sourceType).toBe('flow')
    expect(resolution.initialValues).toEqual({
      type: 'PRIMARY',
      addressLine: ['Unter den Linden 3'],
      postalCode: '012345',
      locality: 'Berlin',
      countryRef: 'Country:v1:DE'
    })
  })
})

describe('resolveFlowProposalSchema', () => {
  it('uses flow.properties.<objectKey> instead of the wrapper root', () => {
    const resolution = resolveFlowProposalFormResolution(changeAddressPayload.arguments)
    const schema = resolveFlowProposalSchema(
      changeAddressPayload.flow_schema,
      resolution.objectKey,
      resolution.sourceType
    )

    expect(schema.properties.reason).toBeUndefined()
    expect(schema.properties.type).toBeDefined()
    expect(schema.properties.addressLine).toBeDefined()
    expect(schema.properties.flow).toBeUndefined()
    expect(schema.properties.task).toBeUndefined()
  })
})

describe('enrichNestedFlowInitialValues', () => {
  it('pulls sibling flow scalars such as employeeId into the flattened form', () => {
    const resolution = resolveFlowProposalFormResolution(changeAddressPayload.arguments)
    const schema = resolveFlowProposalSchema(
      changeAddressPayload.flow_schema,
      resolution.objectKey,
      resolution.sourceType
    )
    const enriched = enrichNestedFlowInitialValues(
      resolution.initialValues,
      resolution.objectKey!,
      changeAddressPayload.arguments.flow,
      schema
    )

    expect(enriched.employeeId).toBe('08b7cc98-4ec6-4b17-87fa-3eb5ccb7df8f')
    expect(enriched.postalCode).toBe('012345')
  })
})
