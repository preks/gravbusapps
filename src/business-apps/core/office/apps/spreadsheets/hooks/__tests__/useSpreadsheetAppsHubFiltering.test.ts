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
  it('filters automations section by enabled/available automations', () => {
    const apps: SpreadsheetAppSummary[] = [
      createApp({ id: 'a1', name: 'With automations', enabledAutomationCount: 2 }),
      createApp({ id: 'a2', name: 'No automations', enabledAutomationCount: 0, automationCount: 0 }),
      createApp({ id: 'a3', name: 'Legacy automation count', automationCount: 1 })
    ]

    const { result } = renderHook(() =>
      useSpreadsheetAppsHubFiltering({
        apps,
        currentUserId: 'user-1',
        activeSection: 'automations',
        favorites: new Set<string>(),
        searchQuery: '',
        sortBy: 'name',
        sortOrder: 'asc'
      })
    )

    expect(result.current.filteredApps.map(app => app.id)).toEqual(['a1', 'a3'])
  })

  it('filters tasks section by task or workflow counts with fallback', () => {
    const apps: SpreadsheetAppSummary[] = [
      createApp({ id: 't1', name: 'Task count', taskCount: 3 }),
      createApp({ id: 't2', name: 'Active workflows', activeWorkflowLinkCount: 1 }),
      createApp({ id: 't3', name: 'Workflow history', workflowLinkCount: 2 }),
      createApp({ id: 't4', name: 'No tasks', taskCount: 0, activeWorkflowLinkCount: 0, workflowLinkCount: 0 })
    ]

    const { result } = renderHook(() =>
      useSpreadsheetAppsHubFiltering({
        apps,
        currentUserId: 'user-1',
        activeSection: 'tasks',
        favorites: new Set<string>(),
        searchQuery: '',
        sortBy: 'name',
        sortOrder: 'asc'
      })
    )

    expect(result.current.filteredApps.map(app => app.id)).toEqual(['t3', 't1', 't2'])
  })
})
