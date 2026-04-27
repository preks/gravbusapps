import { act, renderHook, waitFor } from '@testing-library/react'
import { useSlides } from '../useSlides'

const toastSuccessMock = jest.fn()
const toastErrorMock = jest.fn()

const mockSetAccessToken = jest.fn()
const mockListSlides = jest.fn()
const mockImportSlide = jest.fn()
const mockCreateImportJob = jest.fn()
const mockGetImportJob = jest.fn()
const mockGetSlide = jest.fn()

jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args)
  }
}))

jest.mock('@newwork/nw-design-system', () => {
  const actual = jest.requireActual('@newwork/nw-design-system')
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key
    })
  }
})

jest.mock('../../services/SlidesApiService', () => ({
  SlidesApiService: {
    setAccessToken: (...args: unknown[]) => mockSetAccessToken(...args),
    listSlides: (...args: unknown[]) => mockListSlides(...args),
    importSlide: (...args: unknown[]) => mockImportSlide(...args),
    createImportJob: (...args: unknown[]) => mockCreateImportJob(...args),
    getImportJob: (...args: unknown[]) => mockGetImportJob(...args),
    getSlide: (...args: unknown[]) => mockGetSlide(...args)
  }
}))

function makeSlide(id = 'slide-1') {
  return {
    id,
    title: 'Imported deck',
    content: '',
    contentJson: { slides: [] },
    createdAt: '2026-04-27T14:00:00.000Z',
    updatedAt: '2026-04-27T14:00:00.000Z',
    createdBy: 'user-1',
    currentVersion: 1,
    permission: 'owner'
  }
}

describe('useSlides import progress', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockListSlides.mockResolvedValue([])
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('reports estimated finalizing progress for direct imports', async () => {
    mockImportSlide.mockResolvedValue(makeSlide('slide-direct-1'))

    const { result } = renderHook(() => useSlides('token-1'))

    await waitFor(() => {
      expect(mockListSlides).toHaveBeenCalled()
    })

    const progressCalls: Array<{ phase: string; percent: number; estimated?: boolean }> = []

    await act(async () => {
      await result.current.importSlide(
        {
          title: 'Direct import',
          contentJson: { slides: [{ id: 'slide-a' }] }
        },
        {
          onProgress: progress => {
            progressCalls.push({
              phase: progress.phase,
              percent: progress.percent,
              estimated: progress.estimated
            })
          }
        }
      )
    })

    expect(progressCalls.map(progress => progress.phase)).toEqual(['finalizing', 'finalizing', 'completed'])
    expect(progressCalls[0]?.estimated).toBe(true)
    expect(progressCalls[1]?.percent).toBeGreaterThan(progressCalls[0]?.percent ?? 0)
    expect(progressCalls[2]).toMatchObject({ phase: 'completed', percent: 100 })
  })

  it('maps backend job progress into the save segment for large imports', async () => {
    jest.useFakeTimers()

    mockCreateImportJob.mockResolvedValue({
      id: 'job-1',
      status: 'processing',
      progress: 10,
      diagnostics: {},
      createdAt: '2026-04-27T14:00:00.000Z',
      updatedAt: '2026-04-27T14:00:00.000Z'
    })
    mockGetImportJob
      .mockResolvedValueOnce({
        id: 'job-1',
        status: 'processing',
        progress: 60,
        diagnostics: {},
        createdAt: '2026-04-27T14:00:00.000Z',
        updatedAt: '2026-04-27T14:00:01.000Z'
      })
      .mockResolvedValueOnce({
        id: 'job-1',
        status: 'completed',
        progress: 100,
        diagnostics: {},
        createdAt: '2026-04-27T14:00:00.000Z',
        updatedAt: '2026-04-27T14:00:02.000Z',
        slideId: 'slide-job-1'
      })
    mockGetSlide.mockResolvedValue(makeSlide('slide-job-1'))

    const { result } = renderHook(() => useSlides('token-1'))

    await waitFor(() => {
      expect(mockListSlides).toHaveBeenCalled()
    })

    const progressCalls: Array<{ phase: string; percent: number }> = []

    await act(async () => {
      const importPromise = result.current.importSlide(
        {
          title: 'Large import',
          contentJson: {
            slides: Array.from({ length: 100 }, (_, index) => ({ id: `slide-${index + 1}` }))
          }
        },
        {
          onProgress: progress => {
            progressCalls.push({ phase: progress.phase, percent: progress.percent })
          }
        }
      )

      await jest.advanceTimersByTimeAsync(1000)
      await jest.advanceTimersByTimeAsync(1000)
      await importPromise
    })

    expect(progressCalls.map(progress => progress.phase)).toEqual(['saving', 'saving', 'saving', 'completed'])
    expect(progressCalls[1]?.percent).toBeGreaterThan(progressCalls[0]?.percent ?? 0)
    expect(progressCalls[2]?.percent).toBeGreaterThan(progressCalls[1]?.percent ?? 0)
    expect(progressCalls[3]).toMatchObject({ phase: 'completed', percent: 100 })
  })
})
