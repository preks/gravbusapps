import { CustomDataMutationClient } from './CustomDataMutationClient'

describe('CustomDataMutationClient', () => {
  it('retries createRow with original values when normalized payload returns unknown column', async () => {
    const client = new CustomDataMutationClient({ namespace: 'draft_ns' })
    const postMock = jest
      .spyOn(client as any, 'post')
      .mockRejectedValueOnce(new Error("Unknown column 'serialNumber'"))
      .mockResolvedValueOnce({ workflowId: 'wf-1', success: true })

    const result = await client.createRow({
      definitionKey: 'Asset',
      values: { serial_number: 'SN-001' }
    })

    expect(result).toEqual({ workflowId: 'wf-1', success: true })
    expect(postMock).toHaveBeenNthCalledWith(
      1,
      '/custom-data/flows/row-create',
      expect.objectContaining({
        values: { serialNumber: 'SN-001' }
      })
    )
    expect(postMock).toHaveBeenNthCalledWith(
      2,
      '/custom-data/flows/row-create',
      expect.objectContaining({
        values: { serial_number: 'SN-001' }
      })
    )
  })

  it('does not retry when keys are already canonical', async () => {
    const client = new CustomDataMutationClient({ namespace: 'draft_ns' })
    const postMock = jest.spyOn(client as any, 'post').mockRejectedValue(new Error("Unknown column 'serialNumber'"))

    await expect(
      client.createRow({
        definitionKey: 'Asset',
        values: { serialNumber: 'SN-001' }
      })
    ).rejects.toThrow('Provided fields: serialNumber')

    expect(postMock).toHaveBeenCalledTimes(1)
  })
})
