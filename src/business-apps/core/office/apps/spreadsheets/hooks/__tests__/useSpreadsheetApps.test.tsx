import { act, renderHook, waitFor } from '@testing-library/react'
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
    listApps: jest.fn(),
    getApp: jest.fn(),
    getTrashedPreview: jest.fn(),
    createSheet: jest.fn(),
    duplicateSheet: jest.fn(),
    getAllRows: jest.fn()
  }
}))

const mockedListApps = jest.mocked(SpreadsheetApiService.listApps)
const mockedGetApp = jest.mocked(SpreadsheetApiService.getApp)
const mockedGetTrashedPreview = jest.mocked(SpreadsheetApiService.getTrashedPreview)
const mockedCreateSheet = jest.mocked(SpreadsheetApiService.createSheet)
const mockedDuplicateSheet = jest.mocked(SpreadsheetApiService.duplicateSheet)
const mockedGetAllRows = jest.mocked(SpreadsheetApiService.getAllRows)

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
    mockedGetApp.mockReset()
    mockedGetTrashedPreview.mockReset()
    mockedCreateSheet.mockReset()
    mockedDuplicateSheet.mockReset()
    mockedGetAllRows.mockReset()
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

  it('loads trashed spreadsheet previews when allowTrashed is enabled', async () => {
    mockedListApps.mockResolvedValue([])
    mockedGetTrashedPreview.mockResolvedValue({
      id: 'app-trashed',
      name: 'Archived planning',
      description: '',
      icon: 'FileSpreadsheet',
      status: 'draft',
      trashedAt: '2026-04-10T10:00:00.000Z',
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-10T10:00:00.000Z',
      createdBy: 'user-1',
      sourceFile: {
        fileId: 'file-1',
        fileName: 'archived.xlsx',
        fileSize: 123,
        uploadedAt: '2026-04-01T10:00:00.000Z',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      },
      settings: {},
      relationships: [],
      sheets: [],
      permission: 'owner'
    } as any)

    const { result } = renderHook(() => useSpreadsheetApps('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let loadedApp: Awaited<ReturnType<typeof result.current.loadApp>> = null
    await act(async () => {
      loadedApp = await result.current.loadApp('app-trashed', undefined, { allowTrashed: true })
    })

    expect(mockedGetTrashedPreview).toHaveBeenCalledWith('app-trashed')
    expect(mockedGetApp).not.toHaveBeenCalled()
    expect(loadedApp?.trashedAt).toBe('2026-04-10T10:00:00.000Z')
    expect(result.current.currentAppPermission).toBe('owner')
  })

  it('replaces a pre-seeded temporary sheet with the backend-created sheet', async () => {
    mockedListApps.mockResolvedValue([])
    mockedGetApp.mockResolvedValue({
      id: 'app-1',
      name: 'Budget',
      description: '',
      icon: 'FileSpreadsheet',
      status: 'draft',
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
      createdBy: 'user-1',
      permission: 'owner',
      sheets: [
        {
          id: 'sheet-1',
          name: 'Sheet 1',
          columns: [],
          views: [],
          data: [],
          settings: {}
        },
        {
          id: 'temp-sheet',
          name: 'Sheet 2',
          columns: [],
          views: [],
          data: [],
          settings: {}
        }
      ]
    } as any)
    mockedCreateSheet.mockResolvedValue({
      id: 'real-sheet',
      name: 'Sheet 2',
      columns: [],
      views: [],
      data: [],
      settings: {}
    } as any)
    mockedGetAllRows.mockResolvedValue([])

    const { result } = renderHook(() => useSpreadsheetApps('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.loadApp('app-1')
    })

    await act(async () => {
      await result.current.addSheet('app-1', {
        id: 'temp-sheet',
        name: 'Sheet 2',
        columns: []
      })
    })

    await waitFor(() => {
      expect(result.current.currentApp?.sheets.map(sheet => sheet.id)).toEqual(['sheet-1', 'real-sheet'])
    })
    expect(result.current.currentApp?.sheets.some(sheet => sheet.id === 'temp-sheet')).toBe(false)
  })

  it('duplicates a sheet through the dedicated duplicate API', async () => {
    mockedListApps.mockResolvedValue([])
    mockedGetApp.mockResolvedValue({
      id: 'app-1',
      name: 'Budget',
      description: '',
      icon: 'FileSpreadsheet',
      status: 'draft',
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
      createdBy: 'user-1',
      permission: 'owner',
      sheets: [
        {
          id: 'sheet-1',
          name: 'Sheet 1',
          columns: [{ id: 'col-a', name: 'column_a', order: 0 }],
          views: [],
          data: [],
          settings: {}
        }
      ]
    } as any)
    mockedDuplicateSheet.mockResolvedValue({
      id: 'copy-sheet',
      name: 'Sheet 1 Copy',
      columns: [{ id: 'col-a', name: 'column_a', order: 0 }],
      views: [],
      data: [{ _id: 'row-1', column_a: 'Copied value' }],
      settings: {}
    } as any)
    mockedGetAllRows.mockResolvedValue([])

    const { result } = renderHook(() => useSpreadsheetApps('token', 'user-1'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.loadApp('app-1')
    })

    await act(async () => {
      await result.current.duplicateSheet('app-1', 'sheet-1', {
        id: 'copy-sheet',
        name: 'Sheet 1 Copy',
        visualWorksheetSnapshot: { id: 'copy-sheet', cellData: { 0: { 0: { s: 'style-red' } } } }
      })
    })

    expect(mockedCreateSheet).not.toHaveBeenCalled()
    expect(mockedDuplicateSheet).toHaveBeenCalledWith(
      'app-1',
      'sheet-1',
      expect.objectContaining({
        id: 'copy-sheet',
        visualWorksheetSnapshot: { id: 'copy-sheet', cellData: { 0: { 0: { s: 'style-red' } } } }
      })
    )
    expect(result.current.currentApp?.sheets.find(sheet => sheet.id === 'copy-sheet')?.data).toEqual([
      { _id: 'row-1', column_a: 'Copied value' }
    ])
  })
})
