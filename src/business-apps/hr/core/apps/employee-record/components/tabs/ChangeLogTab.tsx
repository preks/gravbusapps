import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { createChangeLogService } from '../../services/changeLogService'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import ChangeLogFilters from './components/change-tab/ChangeLogFilters'
import { getFieldCategories } from './components/change-tab/constants'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { TimelineLayout, Sheet, SheetContent, SheetHeader, SheetTitle } from '@newwork/nw-design-system'
import { PencilIcon } from '@phosphor-icons/react'

// Types for Change Log
export interface ChangeLogEntry {
  id: string
  fieldName: string
  fieldCategory: string
  fieldDetail?: string
  channelName?: string
  previousValue: string | null
  newValue: string | null
  timestamp: string
  changedBy: {
    userId: string
    userName: string
    userRole: string
  }
  changeOrigin: {
    flowId: string
    flowName: string
    templateId?: string
    isSystemGenerated: boolean
    isAIGenerated: boolean
  }
  isVisible: boolean
  isMasked: boolean
}

export interface ChangeLogFilters {
  fieldCategory: string[]
  dateRange: {
    from: Date | null
    to: Date | null
  }
  changeActor: string[]
  searchTerm: string
}

export interface ChangeLogTabProps extends BusinessAppContextProps {
  employeeId: string
  employeeName: string
  userRole: string
  accessToken: string
}

export const ChangeLogTab: React.FC<ChangeLogTabProps> = ({ employeeId, employeeName, userRole, accessToken }) => {
  const [changeLogEntries, setChangeLogEntries] = useState<ChangeLogEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<ChangeLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<'date' | 'category'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedEntry, setSelectedEntry] = useState<ChangeLogEntry | null>(null)
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [filters, setFilters] = useState<ChangeLogFilters>({
    fieldCategory: [],
    dateRange: { from: null, to: null },
    changeActor: [],
    searchTerm: ''
  })

  const fieldCategories = useMemo(() => getFieldCategories(), [])

  // Get available years from entries
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    changeLogEntries.forEach(entry => {
      const year = new Date(entry.timestamp).getFullYear()
      years.add(year)
    })
    return Array.from(years).sort((a, b) => b - a) // Most recent first
  }, [changeLogEntries])

  // GraphQL client for auxiliary lookups (must be called at top-level)
  const graphqlClient = useGraphQLClient(accessToken)
  const [availableActors, setAvailableActors] = useState<string[]>([])

  // Fetch change log data
  const fetchChangeLogData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const changeLogService = createChangeLogService(
        {
          accessToken,
          employeeId,
          userRole
        },
        graphqlClient
      )

      const response = await changeLogService.fetchChangeLogEntries(50)

      // 1) Collect createdBy ids
      const createdByIds = Array.from(
        new Set((response.entries || []).map(e => e.changedBy?.userId).filter(Boolean))
      ) as string[]

      // 2) Fetch display names in bulk (per id) using Promise.all
      const idToNameMap: Record<string, string> = {}
      if (createdByIds.length > 0) {
        const query = `
          query GetEmployeeByUserId($userId: String!) {
            EmployeePosition(where: { employee: { userId: { _eq: $userId } } }, limit: 1) {
              employee { displayName userId }
            }
          }
        `
        const results = await Promise.all(
          createdByIds.map(async id => {
            try {
              const res = await graphqlClient.request<any>(query, { userId: id })
              const name = res?.EmployeePosition?.[0]?.employee?.displayName
              return { id, name }
            } catch (err) {
              console.warn('Failed fetching name for userId', id, err)
              return { id, name: undefined as string | undefined }
            }
          })
        )
        results.forEach(({ id, name }) => {
          if (name) idToNameMap[id] = name
        })
      }

      const withNames = (response.entries || []).map(e => ({
        ...e,
        changedBy: {
          ...e.changedBy,
          userName: idToNameMap[e.changedBy?.userId] || e.changedBy?.userName
        }
      }))

      setChangeLogEntries(withNames)
      setFilteredEntries(withNames)

      // expose actor names for filter dropdown
      const actorNames = Array.from(new Set(Object.values(idToNameMap).filter(Boolean))) as string[]
      setAvailableActors(actorNames)
    } catch (err) {
      setError(
        getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.error.load_failed', 'Failed to load change log data')
      )
      console.error('Error fetching change log:', err)
    } finally {
      setLoading(false)
    }
  }, [employeeId, userRole, accessToken, filters])

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = changeLogEntries

    // Filter by year
    if (selectedYear !== 'all') {
      const year = parseInt(selectedYear)
      filtered = filtered.filter(entry => {
        const entryYear = new Date(entry.timestamp).getFullYear()
        return entryYear === year
      })
    }

    // Filter by field category
    if (filters.fieldCategory.length > 0) {
      filtered = filtered.filter(entry => filters.fieldCategory.includes(entry.fieldCategory))
    }

    // Filter by date range
    if (filters.dateRange.from || filters.dateRange.to) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.timestamp)
        const fromDate = filters.dateRange.from
        const toDate = filters.dateRange.to

        if (fromDate && entryDate < fromDate) return false
        if (toDate && entryDate > toDate) return false
        return true
      })
    }

    // Filter by change actor (system or specific user names)
    if (filters.changeActor.length > 0) {
      const selected = (filters.changeActor[0] || '').toLowerCase()
      if (selected === 'system') {
        filtered = filtered.filter(entry => {
          const byName = (entry.changedBy.userName || '').toLowerCase()
          const byId = (entry.changedBy.userId || '').toLowerCase()
          return byName === 'system' || byId === 'system'
        })
      } else if (selected) {
        filtered = filtered.filter(entry => (entry.changedBy.userName || '').toLowerCase() === selected)
      }
    }

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(
        entry =>
          entry.fieldName.toLowerCase().includes(searchLower) ||
          entry.previousValue?.toLowerCase().includes(searchLower) ||
          entry.newValue?.toLowerCase().includes(searchLower) ||
          entry.changedBy.userName.toLowerCase().includes(searchLower)
      )
    }

    setFilteredEntries(filtered)
  }, [changeLogEntries, filters, selectedYear])

  // Load data on mount
  useEffect(() => {
    fetchChangeLogData()
  }, [fetchChangeLogData])

  // Apply filters when they change
  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  // Handle filter changes
  const handleFilterChange = (key: string | number | symbol, value: any) => {
    const typedKey = key as keyof ChangeLogFilters
    setFilters(prev => ({
      ...prev,
      [typedKey]: value
    }))
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      fieldCategory: [],
      dateRange: { from: null, to: null },
      changeActor: [],
      searchTerm: ''
    })
  }

  // Export functionality (Admin only)
  const handleExport = async () => {
    if (userRole !== 'admin' && userRole !== 'hr_manager') return

    try {
      const changeLogService = createChangeLogService(
        {
          accessToken,
          employeeId,
          userRole
        },
        graphqlClient
      )

      const blob = await changeLogService.exportChangeLog()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `change-log-${employeeName}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting change log:', err)
      setError(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:changelog_tab.error.export_failed',
          'Failed to export change log data'
        )
      )
    }
  }

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <div className="gba:w-8 gba:h-8 gba:border-2 gba:border-gray-200 gba:border-t-blue-500 gba:rounded-full gba:animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:text-center gba:p-8">
        <p className="gba:text-red-600">{error}</p>
        <button
          onClick={fetchChangeLogData}
          className="gba:mt-4 gba:px-4 gba:py-2 gba:bg-blue-500 gba:text-white gba:border-none gba:rounded gba:cursor-pointer gba:hover:bg-blue-600"
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.actions.retry', 'Retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-6">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:m-0">
            {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.title', 'Change Log')}
          </h2>
          <p className="gba:text-gray-600 gba:mt-1">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:changelog_tab.subtitle',
              "Track all changes to {employeeName}'s profile",
              {
                employeeName
              }
            ).replace('{employeeName}', employeeName)}
          </p>
        </div>
        {(userRole === 'admin' || userRole === 'hr_manager') && (
          <button
            onClick={handleExport}
            className="gba:px-4 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:bg-white gba:cursor-pointer gba:flex gba:items-center gba:gap-2 gba:hover:bg-gray-50"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.actions.export', 'Export')}
          </button>
        )}
      </div>

      {/* Filters */}
      <ChangeLogFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        userRole={userRole}
        filteredEntriesCount={filteredEntries.length}
        totalEntriesCount={changeLogEntries.length}
        actorNames={availableActors}
      />

      {/* Year Filter and Group/Sort controls */}
      <div className="gba:flex gba:justify-between gba:items-center">
        {/* Year Filter */}
        <div className="gba:flex gba:items-center gba:gap-3">
          <label htmlFor="changelog-year" className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.year.title', 'Year')}
          </label>
          <select
            id="changelog-year"
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="gba:h-8 gba:w-[120px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
            data-testid="changelog-year-select"
          >
            <option value="all">
              {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.year.all', 'All Years')}
            </option>
            {availableYears.map(year => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Group/Sort controls */}
        <div className="gba:flex gba:items-center gba:gap-3">
          <label htmlFor="changelog-group-by" className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.group_by.title', 'Group by')}
          </label>
          <select
            id="changelog-group-by"
            value={groupBy}
            onChange={e => setGroupBy((e.target.value as 'date' | 'category') || 'date')}
            className="gba:h-8 gba:w-[140px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
            data-testid="changelog-group-by-select"
          >
            <option value="date">
              {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.group_by.date', 'Date')}
            </option>
            <option value="category">
              {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.group_by.category', 'Category')}
            </option>
          </select>

          <label htmlFor="changelog-sort" className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.sort.title', 'Sort')}
          </label>
          <select
            id="changelog-sort"
            value={sortOrder}
            onChange={e => setSortOrder((e.target.value as 'asc' | 'desc') || 'desc')}
            className="gba:h-8 gba:w-[160px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
            data-testid="changelog-sort-select"
          >
            {groupBy === 'date' ? (
              <>
                <option value="desc">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.sort.newest_first', 'Newest first')}
                </option>
                <option value="asc">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.sort.oldest_first', 'Oldest first')}
                </option>
              </>
            ) : (
              <>
                <option value="asc">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.sort.category_az', 'Category A–Z')}
                </option>
                <option value="desc">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.sort.category_za', 'Category Z–A')}
                </option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Change Log Entries in Timeline */}
      {(() => {
        if (filteredEntries.length === 0) {
          return (
            <div className="gba:bg-card gba:text-card-foreground gba:border gba:border-border gba:rounded-lg gba:p-8 gba:text-center">
              <p className="gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:changelog_tab.no_results',
                  'No changes found matching your filters.'
                )}
              </p>
            </div>
          )
        }

        const safeFormatDate = (value: string | Date, format: string = 'date.short') => {
          const formatted = formatDate(new Date(value), format) as string
          return typeof formatted === 'string' && formatted.includes('T')
            ? new Date(value).toLocaleDateString()
            : formatted
        }

        const sortedEntries = [...filteredEntries].sort((a, b) => {
          const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          return sortOrder === 'desc' ? -diff : diff
        })

        return (
          <>
            <TimelineLayout
              items={sortedEntries
                .filter(entry => entry.isVisible)
                .map(entry => {
                  const categoryInfo = fieldCategories.find(cat => cat.value === entry.fieldCategory)

                  return {
                    id: entry.id,
                    date: safeFormatDate(entry.timestamp, 'date.short'),
                    actor: entry.changedBy.userName || entry.changedBy.userId,
                    title: (
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span>{entry.fieldName}</span>
                        {entry.changeOrigin.isAIGenerated && (
                          <span className="gba:inline-flex gba:items-center gba:px-2 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium gba:bg-info-secondary gba:text-info-secondary-foreground">
                            AI
                          </span>
                        )}
                      </div>
                    ),
                    description: categoryInfo?.label,
                    icon: (props: any) => <PencilIcon weight="bold" {...props} />,
                    onClick: () => setSelectedEntry(entry)
                  } as any
                })}
              variant="default"
              orientation="vertical"
              alignment="left"
              className="gba:w-full"
            />

            <Sheet open={!!selectedEntry} onOpenChange={open => !open && setSelectedEntry(null)}>
              <SheetContent
                side="right"
                className="gba:w-[400px] gba:max-w-[400px] gba:sm:max-w-[400px] gba:p-0 gba:flex gba:flex-col"
                data-testid={`hr-changelog-details-${selectedEntry?.id}`}
              >
                <SheetHeader className="gba:px-6 gba:py-4 gba:border-b gba:border-border">
                  <SheetTitle>{selectedEntry?.fieldName}</SheetTitle>
                </SheetHeader>
                <div className="gba:flex-1 gba:overflow-auto gba:px-6 gba:py-4">
                  <div className="gba:space-y-4">
                    <div className="gba:space-y-3">
                      {(() => {
                        const channel =
                          selectedEntry?.channelName || (selectedEntry?.fieldDetail || '').replace(/^Channel:\s*/i, '')
                        return channel ? (
                          <div className="gba:py-2 gba:px-1">
                            <p className="gba:text-base gba:font-semibold gba:text-foreground">
                              {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.labels.channel', 'Channel')}
                            </p>
                            <p className="gba:text-sm gba:text-foreground">{channel}</p>
                          </div>
                        ) : null
                      })()}
                      <div className="gba:py-2 gba:px-1">
                        <p className="gba:text-base gba:font-semibold gba:text-foreground">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.group_by.category', 'Category')}
                        </p>
                        <p className="gba:text-sm gba:text-foreground">
                          {fieldCategories.find(cat => cat.value === selectedEntry?.fieldCategory)?.label || '-'}
                        </p>
                      </div>
                      <div className="gba:py-2 gba:px-1">
                        <p className="gba:text-base gba:font-semibold gba:text-foreground">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.labels.timestamp', 'Timestamp')}
                        </p>
                        <p className="gba:text-sm gba:text-foreground">
                          {selectedEntry ? safeFormatDate(selectedEntry.timestamp, 'date.short') : '-'}
                        </p>
                      </div>
                      <div className="gba:py-2 gba:px-1">
                        <p className="gba:text-base gba:font-semibold gba:text-foreground">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.privacy.created_by', 'Created by')}
                        </p>
                        <p className="gba:text-sm gba:text-foreground">
                          {selectedEntry?.changedBy.userName || selectedEntry?.changedBy.userId || '-'}
                        </p>
                      </div>
                      <div className="gba:py-2 gba:px-1">
                        <p className="gba:text-base gba:font-semibold gba:text-foreground">Flow</p>
                        <p className="gba:text-sm gba:text-foreground">{selectedEntry?.changeOrigin.flowName || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </>
        )
      })()}
    </div>
  )
}

export default ChangeLogTab
