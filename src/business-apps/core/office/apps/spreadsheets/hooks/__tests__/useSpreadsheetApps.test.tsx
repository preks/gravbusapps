import { renderHook, waitFor } from '@testing-library/react'
import { useSpreadsheetApps } from '../useSpreadsheetApps'
import { SpreadsheetApiService } from '../../services/SpreadsheetApiService'
import type { SpreadsheetAppSummary } from '../../types'

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('../../services/SpreadsheetApiService', () => ({
  SpreadsheetApiService: {
    listApps: jest.fn()
  }
}))

const mockedListApps = jest.mocked(SpreadsheetApiService.listApps)

function createAppSummary(index: number): SpreadsheetAppSummary {
  const timestamp = new Date(`2026-03-${String((index % 28) + 1).padStart(2, '0')}T09:00:00.000Z`).toISOString()

  return {
    id: `app-${index}`,
    name: `Spreadsheet ${index}`,
    description: '',
    icon: 'FileSpreadsheet',
    sheetCount: 1,
    rowCount: index,
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: 'user-1'
  }
}

describe('useSpreadsheetApps pagination', () => {
  beforeEach(() => {
    mockedListApps.mockReset()
  })

  it('stops paginating when the backend repeats the same full page', async () => {
    const repeatedPage = Array.from({ length: 100 }, (_, index) => createAppSummary(index))

    mockedListApps.mockResolvedValueOnce(repeatedPage).mockResolvedValueOnce(repeatedPage)

    const { result } = renderHook(() => useSpreadsheetApps('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockedListApps).toHaveBeenCalledTimes(2)
    expect(mockedListApps).toHaveBeenNthCalledWith(1, { limit: 100, page: 1 })
    expect(mockedListApps).toHaveBeenNthCalledWith(2, { limit: 100, page: 2 })
    expect(result.current.error).toBeNull()
    expect(result.current.apps).toHaveLength(100)
    expect(new Set(result.current.apps.map(app => app.id)).size).toBe(100)
  })
})
