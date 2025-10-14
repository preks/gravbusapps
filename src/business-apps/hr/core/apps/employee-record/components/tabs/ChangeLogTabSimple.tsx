import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext'
import { createChangeLogService } from '../../services/changeLogService'
import { format } from 'date-fns'

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
}

const FIELD_CATEGORIES = [
  { value: 'personal', label: 'Personal Info' },
  { value: 'address', label: 'Address & Contact' },
  { value: 'org', label: 'Org Assignment' },
  { value: 'working', label: 'Working Conditions' },
  { value: 'financial', label: 'Financial' },
  { value: 'skills', label: 'Skills & Capabilities' },
  { value: 'performance', label: 'Performance & Goals' },
  { value: 'absence', label: 'Absence Entitlements' },
  { value: 'emergency', label: 'Emergency Contacts' }
]

const CHANGE_ACTORS = [
  { value: 'user', label: 'Manual Changes' },
  { value: 'ai', label: 'AI Generated' },
  { value: 'system', label: 'System Generated' }
]

// Get available field categories based on user role
const getAvailableFieldCategories = (userRole: string) => {
  const changeLogService = createChangeLogService({
    accessToken: '',
    employeeId: '',
    userRole
  })
  
  const availableCategories = changeLogService.getAvailableFieldCategories()
  return FIELD_CATEGORIES.filter(cat => availableCategories.includes(cat.value))
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

    return (
      <div key={entry.id} style={{ 
        backgroundColor: 'white', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '16px', 
        marginBottom: '16px' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              backgroundColor: '#3b82f6', 
              borderRadius: '4px' 
            }}></div>
            <div>
              <h4 style={{ fontWeight: '500', color: '#111827', margin: 0 }}>
                {entry.fieldName}
              </h4>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                {categoryInfo?.label}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {entry.changeOrigin.isAIGenerated && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 8px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: '#f3e8ff',
                color: '#7c3aed'
              }}>
                AI
              </span>
            )}
            {entry.changeOrigin.isSystemGenerated && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 8px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: '#f3f4f6',
                color: '#374151'
              }}>
                System
              </span>
            )}
          </div>
        </div>
        
        <div style={{ 
          marginTop: '16px', 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px' 
        }}>
          <div>
            <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Previous Value
            </label>
            <p style={{ 
              fontSize: '14px', 
              color: '#111827', 
              backgroundColor: '#f9fafb', 
              padding: '8px', 
              borderRadius: '4px',
              margin: '4px 0 0 0'
            }}>
              {entry.isMasked ? 'Hidden for privacy' : (entry.previousValue || 'N/A')}
            </p>
          </div>
          <div>
            <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              New Value
            </label>
            <p style={{ 
              fontSize: '14px', 
              color: '#111827', 
              backgroundColor: '#f0fdf4', 
              padding: '8px', 
              borderRadius: '4px',
              margin: '4px 0 0 0'
            }}>
              {entry.isMasked ? 'Hidden for privacy' : (entry.newValue || 'N/A')}
            </p>
          </div>
        </div>
        
        <div style={{ 
          marginTop: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          fontSize: '14px', 
          color: '#6b7280' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>Changed by: {entry.changedBy.userName}</span>
            <span>•</span>
            <span>{format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}</span>
          </div>
          <span style={{ fontSize: '12px' }}>FLOW: {entry.changeOrigin.flowName}</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '256px' 
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2px solid #e5e7eb',
          borderTop: '2px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '32px' }}>
        <p style={{ color: '#dc2626' }}>{error}</p>
        <button 
          onClick={fetchChangeLogData}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            Change Log
          </h2>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>
            Track all changes to {employeeName}'s profile
          </p>
        </div>
        {(userRole === 'admin' || userRole === 'hr_manager') && (
          <button 
            onClick={handleExport} 
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Export
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '16px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '500', margin: 0 }}>Filters</h3>
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px' 
        }}>
          {/* Search */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Search changes..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                outline: 'none'
              }}
            />
          </div>

          {/* Field Category */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
              Field Category
            </label>
            <select
              value={filters.fieldCategory[0] || ''}
              onChange={(e) => handleFilterChange('fieldCategory', e.target.value ? [e.target.value] : [])}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                outline: 'none'
              }}
            >
              <option value="">All categories</option>
              {getAvailableFieldCategories(userRole).map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Change Actor */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
              Change Actor
            </label>
            <select
              value={filters.changeActor[0] || ''}
              onChange={(e) => handleFilterChange('changeActor', e.target.value ? [e.target.value] : [])}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                outline: 'none'
              }}
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
          <div>
            <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
              Date Range
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="date"
                value={filters.dateRange.from ? filters.dateRange.from.toISOString().split('T')[0] : ''}
                onChange={(e) => handleFilterChange('dateRange', { 
                  ...filters.dateRange, 
                  from: e.target.value ? new Date(e.target.value) : null 
                })}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
              <input
                type="date"
                value={filters.dateRange.to ? filters.dateRange.to.toISOString().split('T')[0] : ''}
                onChange={(e) => handleFilterChange('dateRange', { 
                  ...filters.dateRange, 
                  to: e.target.value ? new Date(e.target.value) : null 
                })}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: '16px' 
        }}>
          <button 
            onClick={clearFilters}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Clear Filters
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {filteredEntries.length} of {changeLogEntries.length} changes
            </span>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '6px' }}>
          <button
            onClick={() => setViewMode('flat')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: viewMode === 'flat' ? '#3b82f6' : 'white',
              color: viewMode === 'flat' ? 'white' : '#374151'
            }}
          >
            Flat View
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: viewMode === 'grouped' ? '#3b82f6' : 'white',
              color: viewMode === 'grouped' ? 'white' : '#374151'
            }}
          >
            Grouped View
          </button>
        </div>
      </div>

      {/* Change Log Entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredEntries.length === 0 ? (
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px', 
            padding: '32px', 
            textAlign: 'center' 
          }}>
            <p style={{ color: '#6b7280' }}>No changes found matching your filters.</p>
          </div>
        ) : (
          filteredEntries.map(renderChangeEntry)
        )}
      </div>
    </div>
  )
}

export default ChangeLogTab
