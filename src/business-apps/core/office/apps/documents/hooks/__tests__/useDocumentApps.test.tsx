import { act, renderHook, waitFor } from '@testing-library/react'
import { useOfficeClient } from '@/common/network/office/useOfficeClient'
import { useDocumentApps } from '../useDocumentApps'
import {
  getDocumentById,
  getDocumentForOpenById,
  mapApiDocToSummary,
  mapApiDocumentToDocument
} from '../../utils/documentOfficeOperations'

jest.mock('@newwork/nw-design-system', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('@/common/network/office/useOfficeClient', () => ({
  useOfficeClient: jest.fn()
}))

jest.mock('../../utils/documentOfficeOperations', () => ({
  getDocumentById: jest.fn(),
  getDocumentForOpenById: jest.fn(),
  mapApiDocToSummary: jest.fn(),
  mapApiDocumentToDocument: jest.fn()
}))

const mockedUseOfficeClient = useOfficeClient as jest.Mock
const mockedGetDocumentById = getDocumentById as jest.MockedFunction<typeof getDocumentById>
const mockedGetDocumentForOpenById = getDocumentForOpenById as jest.MockedFunction<typeof getDocumentForOpenById>
const mockedMapApiDocToSummary = mapApiDocToSummary as jest.MockedFunction<typeof mapApiDocToSummary>
const mockedMapApiDocumentToDocument = mapApiDocumentToDocument as jest.MockedFunction<typeof mapApiDocumentToDocument>

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => {
    resolve = res
  })

  return { promise, resolve }
}

function makeRawSummary(id: string, title: string) {
  return {
    id,
    title,
    createdBy: 'user-1',
    permission: 'owner',
    createdAt: '2026-05-10T10:00:00.000Z',
    updatedAt: '2026-05-10T11:00:00.000Z'
  }
}

describe('useDocumentApps', () => {
  const listMock = jest.fn()
  const getMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    mockedUseOfficeClient.mockReturnValue({
      documents: {
        list: listMock,
        get: getMock
      }
    })
    mockedMapApiDocToSummary.mockImplementation(doc => doc as ReturnType<typeof mapApiDocToSummary>)
    mockedGetDocumentById.mockReset()
    mockedGetDocumentForOpenById.mockReset()
    mockedMapApiDocumentToDocument.mockReset()
    listMock.mockReset()
    getMock.mockReset()
  })

  it('ignores stale list responses when a newer refresh finishes first', async () => {
    const firstList = createDeferred<{
      items: Array<Record<string, unknown>>
      total: number
      page: number
      limit: number
      totalPages: number
    }>()
    const secondList = createDeferred<{
      items: Array<Record<string, unknown>>
      total: number
      page: number
      limit: number
      totalPages: number
    }>()

    listMock.mockImplementationOnce(() => firstList.promise).mockImplementationOnce(() => secondList.promise)

    const { result } = renderHook(() => useDocumentApps('token', 'user-1'))

    await act(async () => {
      const firstPromise = result.current.refreshDocuments({ section: 'my-documents', page: 1, limit: 20 })
      const secondPromise = result.current.refreshDocuments({ section: 'favorites', page: 1, limit: 20 })

      secondList.resolve({
        items: [makeRawSummary('fav-1', 'Favorite document')],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      })
      firstList.resolve({
        items: [makeRawSummary('doc-1', 'Full list document')],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      })

      await Promise.all([firstPromise, secondPromise])
    })

    await waitFor(() => {
      expect(result.current.documents.map(doc => doc.id)).toEqual(['fav-1'])
    })
    expect(listMock).toHaveBeenNthCalledWith(1, expect.stringContaining('section=my-documents'))
    expect(listMock).toHaveBeenNthCalledWith(2, expect.stringContaining('section=favorites'))
  })

  it('does not mark admin shared documents as owner in list state', async () => {
    listMock.mockResolvedValue({
      items: [
        {
          id: 'shared-admin-doc',
          title: 'Shared admin doc',
          createdBy: 'owner-1',
          permission: 'admin',
          createdAt: '2026-05-10T10:00:00.000Z',
          updatedAt: '2026-05-10T11:00:00.000Z'
        }
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1
    })

    const { result } = renderHook(() => useDocumentApps('token', 'user-2'))

    await act(async () => {
      await result.current.refreshDocuments({ section: 'shared', page: 1, limit: 20 })
    })

    await waitFor(() => {
      expect(result.current.documents).toHaveLength(1)
    })

    expect(result.current.documents[0]).toMatchObject({
      permission: 'admin',
      isOwner: false
    })
  })

  it('keeps currentDocumentPermission as admin for admin shares', async () => {
    mockedGetDocumentForOpenById.mockResolvedValue({
      id: 'doc-1',
      title: 'Shared admin doc',
      createdBy: 'owner-1',
      permission: 'admin'
    } as any)

    const { result } = renderHook(() => useDocumentApps('token', 'user-2'))

    await act(async () => {
      await result.current.loadDocument('doc-1')
    })

    expect(result.current.currentDocumentPermission).toBe('admin')
  })
})
