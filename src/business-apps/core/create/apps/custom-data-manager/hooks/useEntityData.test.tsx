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
    global.fetch = jest.fn().mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({
        data: { Asset: [{ id: 'row-1', assetName: 'Laptop' }] }
      })
    }) as typeof fetch

    const definition = {
      id: 'asset-id',
      namespace: 'default',
      entityName: 'Asset',
      kind: 'CUSTOM_ENTITY',
      displayName: 'Asset',
      columns: [{ type: 'TEXT', fieldName: 'assetName', label: 'Asset Name' }],
      publishState: 'PROMOTED_TRACKED',
      createdAt: '',
      updatedAt: ''
    } as CustomDataDefinition

    const { result } = renderHook(() => useEntityData('token-123', definition))

    await waitFor(() => expect(result.current.rows).toEqual([{ id: 'row-1', assetName: 'Laptop' }]))
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      'http://flow-engine.test/custom-data/graphql',
      expect.objectContaining({
        body: JSON.stringify({ query: `{ Asset { id\n    assetName } }` })
      })
    )
  })
})
