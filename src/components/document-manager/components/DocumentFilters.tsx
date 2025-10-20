import React, { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Checkbox,
  Label
} from '@newwork/nw-design-system'
import { MagnifyingGlass, Funnel, List, TreeStructure, Columns } from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { DocumentFilterProps } from '../types/documentTypes'

export const DocumentFilters: React.FC<DocumentFilterProps> = ({
  searchQuery = '',
  onSearchChange,
  viewMode = 'icon',
  onViewModeChange,
  filters = {},
  onFilterChange,
  availableFilters = [],
  columns = [],
  onColumnVisibilityChange
}) => {
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false)
  const [isColumnPopoverOpen, setIsColumnPopoverOpen] = useState(false)

  const handleFilterChange = (filterKey: string, value: any) => {
    onFilterChange({ [filterKey]: value })
  }

  const handleColumnVisibilityChange = (columnId: string, visible: boolean) => {
    onColumnVisibilityChange(columnId, visible)
  }

  const clearAllFilters = () => {
    const clearedFilters: Record<string, any> = {}
    Object.keys(filters).forEach(key => {
      if (key !== 'searchQuery') {
        clearedFilters[key] = undefined
      }
    })
    onFilterChange(clearedFilters)
  }

  const hasActiveFilters = Object.keys(filters).some(
    key =>
      key !== 'searchQuery' &&
      filters[key as keyof typeof filters] !== undefined &&
      filters[key as keyof typeof filters] !== ''
  )

  // Type guard to check if availableFilters is the object type
  const hasAvailableFilters =
    Array.isArray(availableFilters) && availableFilters.length === 0
      ? false
      : typeof availableFilters === 'object' && availableFilters !== null

  return (
    <div className="gba:space-y-3" data-testid="document-filters">
      {/* Search and View Controls */}
      <div className="gba:flex gba:items-center gba:gap-4">
        {/* Search Input */}
        <div className="gba:flex-1">
          <div className="gba:relative gba:max-w-md">
            <MagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-gray-400" />
            <DebouncedInput
              data-testid="document-search-input"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={onSearchChange}
              className="gba:pl-10 gba:w-full"
            />
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="gba:flex gba:items-center gba:gap-1 gba:border gba:border-gray-200 gba:rounded-md gba:overflow-hidden">
          <Button
            data-testid="document-view-icon-button"
            variant={viewMode === 'icon' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('icon')}
            className="gba:rounded-none gba:border-0"
          >
            <TreeStructure className="gba:w-4 gba:h-4" />
          </Button>
          <Button
            data-testid="document-view-list-button"
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className="gba:rounded-none gba:border-0"
          >
            <List className="gba:w-4 gba:h-4" />
          </Button>
        </div>

        {/* Filters Popover */}
        <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              data-testid="document-filters-button"
              variant="outline"
              size="sm"
              className={`gba:gap-2 ${hasActiveFilters ? 'gba:bg-blue-50 gba:border-blue-200' : ''}`}
            >
              <Funnel className="gba:w-4 gba:h-4" />
              Filters
              {hasActiveFilters && <span className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full"></span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="gba:w-80" align="end">
            <div className="gba:space-y-4">
              <div className="gba:flex gba:items-center gba:justify-between">
                <h4 className="gba:font-medium">Filters</h4>
                {hasActiveFilters && (
                  <Button
                    data-testid="document-clear-filters-button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {/* Document Type Filter */}
              {hasAvailableFilters &&
                'documentTypes' in availableFilters &&
                availableFilters.documentTypes &&
                availableFilters.documentTypes.length > 0 && (
                  <div className="gba:space-y-2">
                    <Label>Document Type</Label>
                    <Select
                      value={filters.documentType?.[0] || ''}
                      onValueChange={value => handleFilterChange('documentType', value ? [value] : [])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All types</SelectItem>
                        {availableFilters.documentTypes.map((type: { id: string; value: string; code?: string }) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              {/* Document Group Filter */}
              {hasAvailableFilters &&
                'documentGroups' in availableFilters &&
                availableFilters.documentGroups &&
                availableFilters.documentGroups.length > 0 && (
                  <div className="gba:space-y-2">
                    <Label>Document Group</Label>
                    <Select
                      value={filters.documentGroup?.[0] || ''}
                      onValueChange={value => handleFilterChange('documentGroup', value ? [value] : [])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All groups" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All groups</SelectItem>
                        {availableFilters.documentGroups.map((group: { id: string; value: string; code?: string }) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              {/* File Type Filter */}
              {hasAvailableFilters &&
                'fileTypes' in availableFilters &&
                availableFilters.fileTypes &&
                availableFilters.fileTypes.length > 0 && (
                  <div className="gba:space-y-2">
                    <Label>File Type</Label>
                    <Select
                      value={filters.fileType?.[0] || ''}
                      onValueChange={value => handleFilterChange('fileType', value ? [value] : [])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All file types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All file types</SelectItem>
                        {availableFilters.fileTypes.map((fileType: { id: string; value: string }) => (
                          <SelectItem key={fileType.id} value={fileType.id}>
                            {fileType.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              {/* Uploaded By Filter */}
              {hasAvailableFilters &&
                'uploadedBy' in availableFilters &&
                availableFilters.uploadedBy &&
                availableFilters.uploadedBy.length > 0 && (
                  <div className="gba:space-y-2">
                    <Label>Uploaded By</Label>
                    <Select
                      value={filters.uploadedBy?.[0] || ''}
                      onValueChange={value => handleFilterChange('uploadedBy', value ? [value] : [])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All users</SelectItem>
                        {availableFilters.uploadedBy.map((user: { id: string; value: string }) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Columns Popover */}
        <Popover open={isColumnPopoverOpen} onOpenChange={setIsColumnPopoverOpen}>
          <PopoverTrigger asChild>
            <Button data-testid="document-columns-button" variant="outline" size="sm" className="gba:gap-2">
              <Columns className="gba:w-4 gba:h-4" />
              Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent className="gba:w-64" align="end">
            <div className="gba:space-y-3">
              <h4 className="gba:font-medium">Visible Columns</h4>
              {columns.map(column => (
                <div key={column.id} className="gba:flex gba:items-center gba:space-x-2">
                  <Checkbox
                    data-testid={`document-column-${column.id}-checkbox`}
                    id={`column-${column.id}`}
                    checked={column.visible}
                    onCheckedChange={checked => handleColumnVisibilityChange(column.id, checked as boolean)}
                    disabled={column.disabled}
                  />
                  <Label
                    htmlFor={`column-${column.id}`}
                    className={`gba:text-sm ${column.disabled ? 'gba:text-gray-400' : ''}`}
                  >
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="gba:flex gba:flex-wrap gba:gap-2 gba:items-center">
          <span className="gba:text-sm gba:text-gray-600">Active filters:</span>
          {Object.entries(filters).map(([key, value]) => {
            if (key === 'searchQuery' || !value || (Array.isArray(value) && value.length === 0)) return null

            let filterLabel = key
            let optionLabel = Array.isArray(value) ? value.join(', ') : value

            // Map filter keys to readable labels
            switch (key) {
              case 'documentType':
                filterLabel = 'Document Type'
                if (Array.isArray(value) && hasAvailableFilters && 'documentTypes' in availableFilters) {
                  optionLabel = value
                    .map(id => availableFilters.documentTypes.find(t => t.id === id)?.value || id)
                    .join(', ')
                }
                break
              case 'documentGroup':
                filterLabel = 'Document Group'
                if (Array.isArray(value) && hasAvailableFilters && 'documentGroups' in availableFilters) {
                  optionLabel = value
                    .map(id => availableFilters.documentGroups.find(g => g.id === id)?.value || id)
                    .join(', ')
                }
                break
              case 'fileType':
                filterLabel = 'File Type'
                if (Array.isArray(value) && hasAvailableFilters && 'fileTypes' in availableFilters) {
                  optionLabel = value
                    .map(id => availableFilters.fileTypes.find(f => f.id === id)?.value || id)
                    .join(', ')
                }
                break
              case 'uploadedBy':
                filterLabel = 'Uploaded By'
                if (Array.isArray(value) && hasAvailableFilters && 'uploadedBy' in availableFilters) {
                  optionLabel = value
                    .map(id => availableFilters.uploadedBy.find(u => u.id === id)?.value || id)
                    .join(', ')
                }
                break
            }

            return (
              <span
                key={key}
                className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:bg-blue-100 gba:text-blue-800 gba:text-xs gba:rounded-full"
              >
                {filterLabel}: {optionLabel}
                <Button
                  data-testid={`document-remove-filter-${key}-button`}
                  variant="ghost"
                  size="sm"
                  className="gba:h-4 gba:w-4 gba:p-0 gba:ml-1"
                  onClick={() => handleFilterChange(key, Array.isArray(value) ? [] : undefined)}
                >
                  ×
                </Button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
