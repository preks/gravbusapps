import { renderHook } from '@testing-library/react'
import { ReadableStream } from 'stream/web'
import { TextDecoder, TextEncoder } from 'util'
import { useCustomDataClient } from './useCustomDataClient'
import type { CustomDataSuggestionStreamEvent } from '../types'

jest.mock('@/common/network/flows/flowEngineUrl', () => ({
  getFlowEngineApiBaseUrl: () => 'http://flow-engine.test'
}))

describe('useCustomDataClient', () => {
  const originalFetch = global.fetch
  const originalTextDecoder = global.TextDecoder

  beforeAll(() => {
    ;(global as any).TextDecoder = TextDecoder
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.clearAllMocks()
  })

  afterAll(() => {
    global.TextDecoder = originalTextDecoder
  })

  it('loads namespaces from the paginated collection endpoint', async () => {
    const namespaceResponse = {
      data: [
        {
          namespace: 'sales',
          displayName: 'Sales',
          description: null,
          createdAt: '2026-05-18T18:00:00.000Z',
          updatedAt: '2026-05-18T18:00:00.000Z'
        }
      ],
      paging: {
        offset: 0,
        limit: 100,
        totalRecords: 1
      },
      _links: {
        self: '/api/v1/custom-data/namespaces?offset=0&limit=100&sort=%2Bnamespace&returnTotalRecords=true'
      },
      query: {
        sort: '+namespace',
        returnTotalRecords: true
      }
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue('application/json')
      },
      json: jest.fn().mockResolvedValue(namespaceResponse)
    }) as typeof fetch

    const { result } = renderHook(() => useCustomDataClient('token-123'))

    await expect(
      result.current.listNamespaces({
        offset: 0,
        limit: 100,
        sort: '+namespace',
        returnTotalRecords: true
      })
    ).resolves.toEqual(namespaceResponse)

    expect(global.fetch).toHaveBeenCalledWith(
      'http://flow-engine.test/v1/custom-data/namespaces?offset=0&limit=100&sort=%2Bnamespace&returnTotalRecords=true',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json'
        })
      })
    )
  })

  it('parses SSE suggestion events in order', async () => {
    const encoder = new TextEncoder()
    const streamBody = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"started"}\n\n'))
        controller.enqueue(encoder.encode('data: {"type":"thinking","content":"Inspecting graph"}\n\n'))
        controller.enqueue(encoder.encode('data: {"type":"response","content":"Created order model."}\n\n'))
        controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'))
        controller.close()
      }
    })

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: streamBody,
      json: jest.fn()
    }) as typeof fetch

    const { result } = renderHook(() => useCustomDataClient('token-123'))
    const receivedEvents: CustomDataSuggestionStreamEvent[] = []

    await result.current.streamCustomEntitySuggestion(
      'sales',
      { description: 'Create an order model' },
      {
        onEvent: event => {
          receivedEvents.push(event)
        }
      }
    )

    expect(receivedEvents).toEqual([
      { type: 'started' },
      { type: 'thinking', content: 'Inspecting graph' },
      { type: 'response', content: 'Created order model.' },
      { type: 'done' }
    ])
    expect(global.fetch).toHaveBeenCalledWith(
      'http://flow-engine.test/v1/custom-data/namespaces/sales/custom-entities/suggestions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123'
        })
      })
    )
  })

  it('calls the namespace promotion endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue('application/json')
      },
      json: jest.fn().mockResolvedValue({
        success: true,
        namespace: 'sales',
        entityOrder: ['vendor', 'asset'],
        entities: [],
        relationships: [],
        promotedEntityCount: 2,
        failedEntityCount: 0,
        skippedEntityCount: 0,
        createdRelationshipCount: 1,
        failedRelationshipCount: 0,
        skippedRelationshipCount: 0
      })
    }) as typeof fetch

    const { result } = renderHook(() => useCustomDataClient('token-123'))
    await expect(result.current.promoteNamespace('sales')).resolves.toEqual({
      success: true,
      namespace: 'sales',
      entityOrder: ['vendor', 'asset'],
      entities: [],
      relationships: [],
      promotedEntityCount: 2,
      failedEntityCount: 0,
      skippedEntityCount: 0,
      createdRelationshipCount: 1,
      failedRelationshipCount: 0,
      skippedRelationshipCount: 0
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'http://flow-engine.test/v1/custom-data/namespaces/sales/promotions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({})
      })
    )
  })
})
