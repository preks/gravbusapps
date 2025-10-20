import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { createChangeLogService } from '../../services/changeLogService'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import ChangeLogFilters from './ChangeLogFilters'
import ChangeLogEntry from './ChangeLogEntry'
import ViewModeToggle from './ViewModeToggle'

// Types for Change Log
export interface ChangeLogEntry {
  id: string
  fieldName: string
  fieldCategory: string
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


export const ChangeLogTab: React.FC<ChangeLogTabProps> = ({
  employeeId,
  employeeName,
  userRole,
  accessToken
}) => {
  const [changeLogEntries, setChangeLogEntries] = useState<ChangeLogEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<ChangeLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ChangeLogFilters>({
    fieldCategory: [],
    dateRange: { from: null, to: null },
    changeActor: [],
    searchTerm: ''
  })
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped')

  // Fetch change log data
  const fetchChangeLogData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const changeLogService = createChangeLogService({
        accessToken,
        employeeId,
        userRole
      })
      
      const response = await changeLogService.fetchChangeLogEntries(filters, 50, 0)

      console.log(response.entries,' entries')
      
      setChangeLogEntries(response.entries)
      setFilteredEntries(response.entries)
    } catch (err) {
      setError(getTranslationFromI18nKeyAndLabel('changelog.error.load_failed', 'Failed to load change log data'))
      console.error('Error fetching change log:', err)
    } finally {
      setLoading(false)
    }
  }, [employeeId, userRole, accessToken, filters])

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = changeLogEntries

    // Filter by field category
    if (filters.fieldCategory.length > 0) {
      filtered = filtered.filter(entry => 
        filters.fieldCategory.includes(entry.fieldCategory)
      )
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

    // Filter by change actor
    if (filters.changeActor.length > 0) {
      filtered = filtered.filter(entry => {
        const actorType = entry.changeOrigin.isAIGenerated ? 'ai' : 
                         entry.changeOrigin.isSystemGenerated ? 'system' : 'user'
        return filters.changeActor.includes(actorType)
      })
    }

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(entry => 
        entry.fieldName.toLowerCase().includes(searchLower) ||
        entry.previousValue?.toLowerCase().includes(searchLower) ||
        entry.newValue?.toLowerCase().includes(searchLower) ||
        entry.changedBy.userName.toLowerCase().includes(searchLower)
      )
    }

    setFilteredEntries(filtered)
  }, [changeLogEntries, filters])

  // Load data on mount
  useEffect(() => {
    fetchChangeLogData()
  }, [fetchChangeLogData])

  // Apply filters when they change
  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  // Handle filter changes
  const handleFilterChange = (key: keyof ChangeLogFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
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
      const changeLogService = createChangeLogService({
        accessToken,
        employeeId,
        userRole
      })
      
      const blob = await changeLogService.exportChangeLog(filters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `change-log-${employeeName}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting change log:', err)
      setError(getTranslationFromI18nKeyAndLabel('changelog.error.export_failed', 'Failed to export change log data'))
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
          {getTranslationFromI18nKeyAndLabel('changelog.actions.retry', 'Retry')}
        </button>
      </div>
    )
  }

  console.log('yeah')

  return (
    <div className="gba:flex gba:flex-col gba:gap-6">
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:m-0">
            {getTranslationFromI18nKeyAndLabel('changelog.title', 'Change Log')}
          </h2>
          <p className="gba:text-gray-600 gba:mt-1">
            {getTranslationFromI18nKeyAndLabel('changelog.subtitle', 'Track all changes to {employeeName}\'s profile', { employeeName })}
          </p>
        </div>
        {(userRole === 'admin' || userRole === 'hr_manager') && (
          <button 
            onClick={handleExport} 
            className="gba:px-4 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:bg-white gba:cursor-pointer gba:flex gba:items-center gba:gap-2 gba:hover:bg-gray-50"
          >
            {getTranslationFromI18nKeyAndLabel('changelog.actions.export', 'Export')}
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
      />

      {/* View Mode Toggle */}
      <ViewModeToggle
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Change Log Entries */}
      <div className="gba:flex gba:flex-col gba:gap-4">
        {filteredEntries.length === 0 ? (
          <div className="gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:p-8 gba:text-center">
            <p className="gba:text-gray-500">{getTranslationFromI18nKeyAndLabel('changelog.no_results', 'No changes found matching your filters.')}</p>
          </div>
        ) : (
          filteredEntries.map(entry => <ChangeLogEntry key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  )
}

export default ChangeLogTab
