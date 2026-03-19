import { CustomDataGraphQLClient } from './CustomDataGraphQLClient'

describe('CustomDataGraphQLClient', () => {
  it('requests deprecated fields during entity introspection', async () => {
    const client = new CustomDataGraphQLClient()
    const requestSpy = jest.spyOn(client, 'request').mockResolvedValue({
      __type: { name: 'Asset', fields: [] }
    } as any)

    await client.introspectEntityType('Asset')

    expect(requestSpy).toHaveBeenCalledWith(expect.stringContaining('fields(includeDeprecated: true)'), {
      name: 'Asset'
    })
  })
})
