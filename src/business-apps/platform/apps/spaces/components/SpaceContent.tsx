/**
 * SpaceContent - Content browser for space items
 *
 * Compact table-like layout with sorting and filtering
 * Following NEWWORK design system
 */

import React, { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Input } from '@newwork/nw-design-system'
import { Search, FileText, Table2, StickyNote, Presentation, FolderOpen, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { SpaceContentItem } from '../types/space.types'

export interface SpaceContentProps {
  items: SpaceContentItem[]
  isLoading?: boolean
  onItemClick?: (item: SpaceContentItem) => void
  'data-testid'?: string
}

type ContentTab = 'all' | 'document' | 'spreadsheet' | 'note' | 'slide'
type SortField = 'title' | 'updatedAt' | 'createdAt' | 'type'
type SortDirection = 'asc' | 'desc'

const tabConfig: Record<ContentTab, { icon: typeof FileText; label: string }> = {
  all: { icon: FolderOpen, label: 'All' },
  document: { icon: FileText, label: 'Documents' },
  spreadsheet: { icon: Table2, label: 'Spreadsheets' },
  note: { icon: StickyNote, label: 'Notes' },
  slide: { icon: Presentation, label: 'Presentations' }
}

const contentTypeConfig: Record<string, { icon: typeof FileText; label: string }> = {
  document: { icon: FileText, label: 'Document' },
  spreadsheet: { icon: Table2, label: 'Spreadsheet' },
  note: { icon: StickyNote, label: 'Note' },
  slide: { icon: Presentation, label: 'Presentation' }
}

export const SpaceContent: React.FC<SpaceContentProps> = ({
  items,
  isLoading = false,
  onItemClick,
  'data-testid': testId = 'space-content'
}) => {
  const [activeTab, setActiveTab] = useState<ContentTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('updatedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="gba:w-3.5 gba:h-3.5" />
    return sortDirection === 'asc' ? (
      <ArrowUp className="gba:w-3.5 gba:h-3.5" />
    ) : (
      <ArrowDown className="gba:w-3.5 gba:h-3.5" />
    )
  }

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = items

    // Filter by tab
    if (activeTab !== 'all') {
      result = result.filter(item => item.type === activeTab)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        item => item.title.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query)
      )
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [items, activeTab, searchQuery, sortField, sortDirection])

  // Count by type
  const counts = useMemo(
    () => ({
      all: items.length,
      document: items.filter(i => i.type === 'document').length,
      spreadsheet: items.filter(i => i.type === 'spreadsheet').length,
      note: items.filter(i => i.type === 'note').length
    }),
    [items]
  )

  if (isLoading) {
    return (
      <div className="gba:space-y-2" data-testid={testId}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="gba:h-12 gba:rounded-md gba:bg-muted/30 gba:animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div data-testid={testId}>
      {/* Search & Tabs */}
      <div className="gba:flex gba:flex-col gba:sm:flex-row gba:gap-4 gba:mb-4">
        {/* Search */}
        <div className="gba:relative gba:flex-1">
          <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:pl-9 gba:h-9"
            data-testid={`${testId}-search`}
          />
        </div>

        {/* Tabs */}
        <div className="gba:flex gba:gap-1 gba:p-1 gba:bg-muted gba:rounded-lg">
          {(Object.keys(tabConfig) as ContentTab[]).map(tab => {
            const config = tabConfig[tab]
            const Icon = config.icon
            const count = counts[tab]
            const isActive = activeTab === tab

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1.5 gba:rounded-md gba:text-sm gba:font-medium gba:transition-colors ${
                  isActive
                    ? 'gba:bg-background gba:text-foreground'
                    : 'gba:text-muted-foreground hover:gba:text-foreground'
                }`}
                data-testid={`${testId}-tab-${tab}`}
              >
                <Icon className="gba:w-4 gba:h-4" />
                <span className="gba:hidden gba:sm:inline">{config.label}</span>
                <span className="gba:text-xs gba:opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="gba:text-center gba:py-12">
          <FolderOpen className="gba:w-10 gba:h-10 gba:text-muted-foreground/40 gba:mx-auto gba:mb-3" />
          <p className="gba:text-sm gba:text-muted-foreground">
            {searchQuery ? 'No content matches your search' : 'No content in this space yet'}
          </p>
        </div>
      )}

      {/* Content Table */}
      {filteredItems.length > 0 && (
        <div className="gba:border gba:border-border gba:rounded-lg gba:overflow-hidden">
          {/* Table Header */}
          <div className="gba:grid gba:grid-cols-12 gba:gap-4 gba:px-4 gba:py-2 gba:bg-muted/50 gba:border-b gba:border-border gba:text-xs gba:font-medium gba:text-muted-foreground">
            <div className="gba:col-span-5 gba:sm:col-span-6">
              <button
                onClick={() => handleSort('title')}
                className="gba:flex gba:items-center gba:gap-1 hover:gba:text-foreground gba:transition-colors"
              >
                Name {getSortIcon('title')}
              </button>
            </div>
            <div className="gba:col-span-3 gba:sm:col-span-2 gba:hidden gba:sm:block">
              <button
                onClick={() => handleSort('type')}
                className="gba:flex gba:items-center gba:gap-1 hover:gba:text-foreground gba:transition-colors"
              >
                Type {getSortIcon('type')}
              </button>
            </div>
            <div className="gba:col-span-4 gba:sm:col-span-2">
              <button
                onClick={() => handleSort('updatedAt')}
                className="gba:flex gba:items-center gba:gap-1 hover:gba:text-foreground gba:transition-colors"
              >
                Modified {getSortIcon('updatedAt')}
              </button>
            </div>
            <div className="gba:col-span-3 gba:sm:col-span-2 gba:hidden gba:sm:block">
              <button
                onClick={() => handleSort('createdAt')}
                className="gba:flex gba:items-center gba:gap-1 hover:gba:text-foreground gba:transition-colors"
              >
                Created {getSortIcon('createdAt')}
              </button>
            </div>
          </div>

          {/* Table Body */}
          <div className="gba:divide-y gba:divide-border">
            {filteredItems.map(item => {
              const config = contentTypeConfig[item.type] || contentTypeConfig.document
              const Icon = config.icon

              return (
                <div
                  key={item.id}
                  onClick={() => onItemClick?.(item)}
                  className="gba:grid gba:grid-cols-12 gba:gap-4 gba:px-4 gba:py-3 gba:cursor-pointer gba:transition-colors hover:gba:bg-muted/30"
                  data-testid={`${testId}-item-${item.id}`}
                >
                  {/* Name */}
                  <div className="gba:col-span-5 gba:sm:col-span-6 gba:flex gba:items-center gba:gap-3 gba:min-w-0">
                    <Icon className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0" />
                    <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{item.title}</span>
                  </div>

                  {/* Type */}
                  <div className="gba:col-span-3 gba:sm:col-span-2 gba:hidden gba:sm:flex gba:items-center">
                    <span className="gba:text-sm gba:text-muted-foreground">{config.label}</span>
                  </div>

                  {/* Modified */}
                  <div className="gba:col-span-4 gba:sm:col-span-2 gba:flex gba:items-center">
                    <span className="gba:text-sm gba:text-muted-foreground">
                      {format(new Date(item.updatedAt), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {/* Created */}
                  <div className="gba:col-span-3 gba:sm:col-span-2 gba:hidden gba:sm:flex gba:items-center">
                    <span className="gba:text-sm gba:text-muted-foreground">
                      {format(new Date(item.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default SpaceContent
