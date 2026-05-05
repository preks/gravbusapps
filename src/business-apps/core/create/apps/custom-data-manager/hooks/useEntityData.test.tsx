import { renderHook, waitFor } from '@testing-library/react'
import { useEntityData } from './useEntityData'
import type { CustomDataDefinition } from '../types'

jest.mock('@/common/utils/serviceResolver', () => ({
  CUSTOM_FLOW_ENGINE_API_URL: 'http://flow-engine.test'
}))

describe('useEntityData', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.clearAllMocks()
  })

  it('queries rows through the TypeName root field', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          data: { __type: { fields: [{ name: 'id' }, { name: 'assetName' }] } }
        })
      })
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          data: { Asset: [{ id: 'row-1', assetName: 'Laptop' }] }
        })
      }) as typeof fetch

    const definition = {
      id: 'asset-id',
      namespace: 'default',
      key: 'asset',
      kind: 'CUSTOM_ENTITY',
      display_name: 'Asset',
      columns_json: [{ type: 'TEXT', name: 'asset_name', label: 'Asset Name' }],
      publish_state: 'PROMOTED_TRACKED',
      created_at: '',
      updated_at: ''
    } as CustomDataDefinition

    const { result } = renderHook(() => useEntityData('token-123', definition))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))

    expect(result.current.rows).toEqual([{ id: 'row-1', assetName: 'Laptop' }])
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'http://flow-engine.test/custom-data/graphql',
      expect.objectContaining({
        body: JSON.stringify({ query: `{ Asset { id\n    assetName } }` })
      })
    )
  })
})
