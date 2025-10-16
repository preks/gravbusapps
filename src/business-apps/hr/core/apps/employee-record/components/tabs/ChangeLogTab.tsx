import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext'
import { createChangeLogService } from '../services/changeLogService'
import { format } from 'date-fns'
import { Download, Filter, Search, User, Bot, Settings } from 'lucide-react'
import { Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../common/utils/windowUtils'

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

const FIELD_CATEGORIES = [
  { value: 'personal', label: 'Personal Info', icon: User },
  { value: 'address', label: 'Address & Contact', icon: User },
  { value: 'org', label: 'Org Assignment', icon: Settings },
  { value: 'working', label: 'Working Conditions', icon: Settings },
  { value: 'financial', label: 'Financial', icon: Settings },
  { value: 'skills', label: 'Skills & Capabilities', icon: User },
  { value: 'performance', label: 'Performance & Goals', icon: User },
  { value: 'absence', label: 'Absence Entitlements', icon: User },
  { value: 'emergency', label: 'Emergency Contacts', icon: User }
]

// Cache for service instances to avoid creating new instances on every call
const serviceInstanceCache = new Map<string, any>()

// Get available field categories based on user role
const getAvailableFieldCategories = (userRole: string) => {
  const cacheKey = `categories-${userRole}`
  
  if (serviceInstanceCache.has(cacheKey)) {
    return serviceInstanceCache.get(cacheKey)
  }
  
  const changeLogService = createChangeLogService({
    accessToken: '',
    employeeId: '',
    userRole
  })
  
  const availableCategories = changeLogService.getAvailableFieldCategories()
  const result = FIELD_CATEGORIES.filter(cat => availableCategories.includes(cat.value))
  
  serviceInstanceCache.set(cacheKey, result)
  return result
}

const CHANGE_ACTORS = [
  { value: 'user', label: 'Manual Changes', icon: User },
  { value: 'ai', label: 'AI Generated', icon: Bot },
  { value: 'system', label: 'System Generated', icon: Settings }
]

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
      
      setChangeLogEntries(response.entries)
      setFilteredEntries(response.entries)
    } catch (err) {
      setError('Failed to load change log data')
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
      setError('Failed to export change log data')
    }
  }

  // Render change log entry
  const renderChangeEntry = (entry: ChangeLogEntry) => {
    if (!entry.isVisible) return null

    const categoryInfo = FIELD_CATEGORIES.find(cat => cat.value === entry.fieldCategory)
    const CategoryIcon = categoryInfo?.icon || User

    return (
      <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <CategoryIcon className="h-5 w-5 text-blue-600" />
            <div>
              <h4 className="font-medium text-gray-900">{entry.fieldName}</h4>
              <p className="text-sm text-gray-500">{categoryInfo?.label}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {entry.changeOrigin.isAIGenerated && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <Bot className="h-3 w-3 mr-1" />
                AI
              </span>
            )}
            {entry.changeOrigin.isSystemGenerated && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                <Settings className="h-3 w-3 mr-1" />
                System
              </span>
            )}
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Previous Value</label>
            <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
              {entry.isMasked ? 'Hidden for privacy' : (entry.previousValue || 'N/A')}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">New Value</label>
            <p className="text-sm text-gray-900 bg-green-50 p-2 rounded">
              {entry.isMasked ? 'Hidden for privacy' : (entry.newValue || 'N/A')}
            </p>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Changed by: {entry.changedBy.userName}</span>
            <span>•</span>
            <span>{format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}</span>
          </div>
          <span className="text-xs">FLOW: {entry.changeOrigin.flowName}</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchChangeLogData} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Change Log</h2>
          <p className="text-gray-600">Track all changes to {employeeName}'s profile</p>
        </div>
        {(userRole === 'admin' || userRole === 'hr_manager') && (
          <button 
            onClick={handleExport} 
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 mr-2" />
          <h3 className="text-lg font-medium">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={getTranslationFromI18nKeyAndLabel('changelog.filters.search_placeholder', 'Search changes...')}
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Field Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Field Category</label>
            <select
              value={filters.fieldCategory[0] || ''}
              onChange={(e) => handleFilterChange('fieldCategory', e.target.value ? [e.target.value] : [])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All categories</option>
              {getAvailableFieldCategories(userRole).map((category: any) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Change Actor */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Change Actor</label>
            <select
              value={filters.changeActor[0] || ''}
              onChange={(e) => handleFilterChange('changeActor', e.target.value ? [e.target.value] : [])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All actors</option>
              {CHANGE_ACTORS.map(actor => (
                <option key={actor.value} value={actor.value}>
                  {actor.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={filters.dateRange.from ? filters.dateRange.from.toISOString().split('T')[0] : ''}
                onChange={(e) => handleFilterChange('dateRange', { 
                  ...filters.dateRange, 
                  from: e.target.value ? new Date(e.target.value) : null 
                })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={filters.dateRange.to ? filters.dateRange.to.toISOString().split('T')[0] : ''}
                onChange={(e) => handleFilterChange('dateRange', { 
                  ...filters.dateRange, 
                  to: e.target.value ? new Date(e.target.value) : null 
                })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <button 
            onClick={clearFilters}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear Filters
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {filteredEntries.length} of {changeLogEntries.length} changes
            </span>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex border border-gray-300 rounded-md">
          <button
            onClick={() => setViewMode('flat')}
            className={`px-4 py-2 text-sm font-medium ${
              viewMode === 'flat' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Flat View
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-4 py-2 text-sm font-medium ${
              viewMode === 'grouped' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Grouped View
          </button>
        </div>
      </div>

      {/* Change Log Entries */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-500">No changes found matching your filters.</p>
          </div>
        ) : (
          filteredEntries.map(renderChangeEntry)
        )}
      </div>
    </div>
  )
}

export default ChangeLogTab
