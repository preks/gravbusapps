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

  it('queries lists through PascalCase root fields and Hasura-like inputs', async () => {
    const client = new CustomDataGraphQLClient()
    const requestSpy = jest.spyOn(client, 'request').mockResolvedValue({
      AssetRequest: [{ id: 'row-1', name: 'Bike' }]
    } as any)

    const result = await client.queryList('asset_request', ['id', 'name'], {
      where: { name: { _ilike: '%bike%' } },
      orderBy: [{ name: 'ASC_NULLS_LAST' }],
      limit: 10,
      offset: 5
    })

    expect(result).toEqual([{ id: 'row-1', name: 'Bike' }])
    expect(requestSpy).toHaveBeenCalledWith(
      expect.stringContaining('query ListAssetRequest($where: AssetRequestBoolExp, $orderBy: [AssetRequestOrderBy!])'),
      {
        where: { name: { _ilike: '%bike%' } },
        orderBy: [{ name: 'ASC_NULLS_LAST' }]
      }
    )
    expect(requestSpy).toHaveBeenCalledWith(
      expect.stringContaining('AssetRequest(limit: 10, offset: 5, where: $where, orderBy: $orderBy)'),
      expect.any(Object)
    )
  })

  it('queries by primary key through TypeNameByPk', async () => {
    const client = new CustomDataGraphQLClient()
    const requestSpy = jest.spyOn(client, 'request').mockResolvedValue({
      AssetRequestByPk: { id: 'row-1' }
    } as any)

    const result = await client.queryByPk('asset_request', 'row-1', ['id'])

    expect(result).toEqual({ id: 'row-1' })
    expect(requestSpy).toHaveBeenCalledWith(expect.stringContaining('AssetRequestByPk(id: $id)'), { id: 'row-1' })
  })

  it('queries aggregate count through TypeNameAggregate', async () => {
    const client = new CustomDataGraphQLClient()
    const requestSpy = jest.spyOn(client, 'request').mockResolvedValue({
      AssetRequestAggregate: { aggregate: { count: 2 } }
    } as any)

    const result = await client.queryAggregate('asset_request', { where: { name: { _eq: 'Bike' } } })

    expect(result).toEqual({ aggregate: { count: 2 } })
    expect(requestSpy).toHaveBeenCalledWith(
      expect.stringContaining('query AssetRequestAggregate($where: AssetRequestBoolExp)'),
      { where: { name: { _eq: 'Bike' } } }
    )
  })
})
