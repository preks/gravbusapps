import { CustomDataMutationClient } from './CustomDataMutationClient'

describe('CustomDataMutationClient', () => {
  it('posts createRow to the canonical v1 rows endpoint', async () => {
    const client = new CustomDataMutationClient({ namespace: 'draft_ns' })
    const postMock = jest
      .spyOn(client as any, 'post')
      .mockResolvedValueOnce({ success: true, resultData: { id: 'row-1' } })

    const result = await client.createRow({
      definitionKey: 'Asset',
      values: { serial_number: 'SN-001' }
    })

    expect(result).toEqual({ success: true, resultData: { id: 'row-1' } })
    expect(postMock).toHaveBeenNthCalledWith(
      1,
      '/v1/custom-data/namespaces/draft_ns/custom-entities/Asset/rows',
      expect.objectContaining({
        values: { serial_number: 'SN-001' }
      })
    )
  })

  it('patches updateRow to the canonical v1 row endpoint', async () => {
    const client = new CustomDataMutationClient({ namespace: 'draft_ns' })
    const patchMock = jest.spyOn(client as any, 'patch').mockResolvedValueOnce({ success: true })

    await client.updateRow({
      definitionKey: 'Asset',
      rowId: 'row-1',
      values: { serialNumber: 'SN-001' }
    })

    expect(patchMock).toHaveBeenCalledWith(
      '/v1/custom-data/namespaces/draft_ns/custom-entities/Asset/rows/row-1',
      expect.objectContaining({
        values: { serialNumber: 'SN-001' }
      })
    )
  })

  it('deletes rows through the canonical v1 row endpoint', async () => {
    const client = new CustomDataMutationClient({ namespace: 'draft_ns' })
    const deleteMock = jest.spyOn(client as any, 'delete').mockResolvedValueOnce({ success: true })

    await client.deleteRow({
      definitionKey: 'Asset',
      rowId: 'row-1'
    })

    expect(deleteMock).toHaveBeenCalledWith('/v1/custom-data/namespaces/draft_ns/custom-entities/Asset/rows/row-1')
  })
})
