import { renderHook } from '@testing-library/react'
import { useSpreadsheetAppsHubFiltering } from '../useSpreadsheetAppsHubFiltering'
import type { SpreadsheetAppSummary } from '../../types'

const createApp = (overrides: Partial<SpreadsheetAppSummary>): SpreadsheetAppSummary => ({
  id: overrides.id || 'app-1',
  name: overrides.name || 'Spreadsheet',
  sheetCount: overrides.sheetCount ?? 1,
  rowCount: overrides.rowCount ?? 0,
  status: overrides.status || 'draft',
  createdAt: overrides.createdAt || new Date('2026-01-01').toISOString(),
  updatedAt: overrides.updatedAt || new Date('2026-01-01').toISOString(),
  createdBy: overrides.createdBy || 'user-1',
  ...overrides
})

describe('useSpreadsheetAppsHubFiltering', () => {
  it('keeps collection copies out of non-task sections', () => {
    const apps: SpreadsheetAppSummary[] = [
      createApp({ id: 'main-1', name: 'Main spreadsheet' }),
      createApp({
        id: 'copy-1',
        name: 'Collection copy',
        settings: { excel_collection_copy: true },
        permission: 'view',
        isShared: true
      })
    ]

    const { result } = renderHook(() =>
      useSpreadsheetAppsHubFiltering({
        apps,
        currentUserId: 'user-1',
        activeSection: 'my-files',
        favorites: new Set<string>(),
        searchQuery: '',
        sortBy: 'name',
        sortOrder: 'asc'
      })
    )

    expect(result.current.filteredApps.map(app => app.id)).toEqual(['main-1'])
  })

  it('includes fallback pending task apps in tasks section', () => {
    const apps: SpreadsheetAppSummary[] = [
      createApp({
        id: 'copy-1',
        name: 'Collection copy',
        settings: { excel_collection_copy: true },
        permission: 'view',
        isShared: true
      }),
      createApp({
        id: 'fallback-1',
        name: 'Fallback task app',
        settings: {},
        permission: 'view',
        isShared: true
      }),
      createApp({ id: 'normal-1', name: 'Normal spreadsheet' })
    ]

    const { result } = renderHook(() =>
      useSpreadsheetAppsHubFiltering({
        apps,
        currentUserId: 'user-1',
        activeSection: 'tasks',
        favorites: new Set<string>(),
        taskAppIds: new Set(['fallback-1']),
        searchQuery: '',
        sortBy: 'name',
        sortOrder: 'asc'
      })
    )

    const ids = result.current.filteredApps.map(app => app.id)
    expect(ids).toHaveLength(2)
    expect(ids).toEqual(expect.arrayContaining(['copy-1', 'fallback-1']))
  })

  it('de-duplicates tasks when app is in both sources', () => {
    const apps: SpreadsheetAppSummary[] = [
      createApp({
        id: 'copy-1',
        name: 'Collection copy',
        settings: { excel_collection_copy: true },
        permission: 'view',
        isShared: true
      })
    ]

    const { result } = renderHook(() =>
      useSpreadsheetAppsHubFiltering({
        apps,
        currentUserId: 'user-1',
        activeSection: 'tasks',
        favorites: new Set<string>(),
        taskAppIds: new Set(['copy-1']),
        searchQuery: '',
        sortBy: 'name',
        sortOrder: 'asc'
      })
    )

    expect(result.current.filteredApps.map(app => app.id)).toEqual(['copy-1'])
  })

  it('shows collection copy tasks even when permission flags are missing', () => {
    const apps: SpreadsheetAppSummary[] = [
      createApp({
        id: 'copy-no-permission',
        name: 'Copy without permission metadata',
        createdBy: 'manager-1',
        isShared: undefined,
        permission: undefined,
        settings: { excel_collection_copy: true }
      })
    ]

    const { result } = renderHook(() =>
      useSpreadsheetAppsHubFiltering({
        apps,
        currentUserId: 'recipient-1',
        activeSection: 'tasks',
        favorites: new Set<string>(),
        searchQuery: '',
        sortBy: 'name',
        sortOrder: 'asc'
      })
    )

    expect(result.current.filteredApps.map(app => app.id)).toEqual(['copy-no-permission'])
  })
})
