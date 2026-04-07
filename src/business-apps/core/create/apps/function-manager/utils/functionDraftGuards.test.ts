import { getApplicableDraftUpdates, hasImplementedHandler, hasMeaningfulSchema } from './functionDraftGuards'

describe('functionDraftGuards', () => {
  it('rejects empty schemas and placeholder handlers', () => {
    expect(hasMeaningfulSchema({})).toBe(false)
    expect(hasImplementedHandler('')).toBe(false)
    expect(
      hasImplementedHandler(
        "module.exports.handler = async (event) => {\n  // Your function code here\n  return { result: 'success' }\n}"
      )
    ).toBe(false)
  })

  it('returns only applicable draft updates for auto-apply', () => {
    expect(
      getApplicableDraftUpdates({
        source: '',
        inputSchema: {},
        outputSchema: {},
        configKeys: []
      })
    ).toEqual({
      source: null,
      inputSchemaText: null,
      outputSchemaText: null,
      configKeys: null
    })

    expect(
      getApplicableDraftUpdates({
        source: 'module.exports.handler = async () => ({ ok: true })',
        inputSchema: {
          type: 'object',
          properties: {
            recordId: { type: 'string' }
          },
          required: ['recordId']
        },
        outputSchema: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' }
          },
          required: ['ok']
        },
        configKeys: ['API_KEY']
      })
    ).toEqual({
      source: 'module.exports.handler = async () => ({ ok: true })',
      inputSchemaText: JSON.stringify(
        {
          type: 'object',
          properties: {
            recordId: { type: 'string' }
          },
          required: ['recordId']
        },
        null,
        2
      ),
      outputSchemaText: JSON.stringify(
        {
          type: 'object',
          properties: {
            ok: { type: 'boolean' }
          },
          required: ['ok']
        },
        null,
        2
      ),
      configKeys: ['API_KEY']
    })
  })
})
