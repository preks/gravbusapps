/**
 * SpaceContent - Content browser for space items
 *
 * Modern table design with refined filtering and sorting.
 * Following NEWWORK design system.
 */

import React, { useState, useMemo, useCallback } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Checkbox,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Search,
  FileText,
  Table2,
  StickyNote,
  Presentation,
  PenTool,
  FolderOpen,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileType,
  MoreHorizontal,
  FolderInput,
  Trash2
} from 'lucide-react'
import type { SpaceContentItem } from '../types/space.types'
import translations from '../_i18n'
import { formatLocalizedDate } from '../utils/spaceLocalization'

export interface SpaceContentProps {
  items: SpaceContentItem[]
  isLoading?: boolean
  onItemClick?: (item: SpaceContentItem) => void
  onMoveToFolderClick?: (item: SpaceContentItem) => void
  onMoveMultipleToFolder?: (items: SpaceContentItem[]) => void
  onRemoveContent?: (item: SpaceContentItem) => void
  'data-testid'?: string
}

type ContentTab = 'all' | 'document' | 'spreadsheet' | 'note' | 'slide' | 'whiteboard'
type SortField = 'title' | 'updatedAt' | 'createdAt' | 'type'
type SortDirection = 'asc' | 'desc'

const tabConfig: Record<ContentTab, { icon: typeof FileText; labelKey: string }> = {
  all: { icon: FolderOpen, labelKey: 'content-tab-all' },
  document: { icon: FileText, labelKey: 'content-type-documents' },
  spreadsheet: { icon: Table2, labelKey: 'content-type-spreadsheets' },
  note: { icon: StickyNote, labelKey: 'content-type-notes' },
  slide: { icon: Presentation, labelKey: 'content-type-slides' },
  whiteboard: { icon: PenTool, labelKey: 'content-type-whiteboards' }
}

const contentTypeConfig: Record<string, { icon: typeof FileText; labelKey: string }> = {
  document: { icon: FileText, labelKey: 'content-type-document' },
  spreadsheet: { icon: Table2, labelKey: 'content-type-spreadsheet' },
  note: { icon: StickyNote, labelKey: 'content-type-note' },
  slide: { icon: Presentation, labelKey: 'content-type-slide' },
  whiteboard: { icon: PenTool, labelKey: 'content-type-whiteboard' }
}

export const SpaceContent: React.FC<SpaceContentProps> = ({
  items,
  isLoading = false,
  onItemClick,
  onMoveToFolderClick,
  onMoveMultipleToFolder,
  onRemoveContent,
  'data-testid': testId = 'space-content'
}) => {
  const { t, locale } = useTranslation(translations)
  const [activeTab, setActiveTab] = useState<ContentTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('updatedAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="gba:w-3 gba:h-3 gba:opacity-50" />
    return sortDirection === 'asc' ? <ArrowUp className="gba:w-3 gba:h-3" /> : <ArrowDown className="gba:w-3 gba:h-3" />
  }

  const filteredItems = useMemo(() => {
    let result = items

    if (activeTab !== 'all') {
      result = result.filter(item => item.type === activeTab)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        item => item.title.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query)
      )
    }

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

  const counts = useMemo(
    () => ({
      all: items.length,
      document: items.filter(i => i.type === 'document').length,
      spreadsheet: items.filter(i => i.type === 'spreadsheet').length,
      note: items.filter(i => i.type === 'note').length,
      slide: items.filter(i => i.type === 'slide').length
    }),
    [items]
  )

  const toggleSelectItem = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedItems(new Set(filteredItems.map(item => item.id)))
  }, [filteredItems])

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set())
  }, [])

  const handleMoveSelectedToFolder = useCallback(() => {
    if (selectedItems.size === 0 || !onMoveMultipleToFolder) return
    const itemsToMove = items.filter(item => selectedItems.has(item.id))
    onMoveMultipleToFolder(itemsToMove)
    clearSelection()
  }, [selectedItems, items, onMoveMultipleToFolder, clearSelection])

  if (isLoading) {
    return (
      <div className="gba:space-y-3" data-testid={testId}>
        <div className="gba:h-10 gba:rounded-lg gba:bg-muted/30 gba:animate-pulse" />
        <div className="gba:space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="gba:h-14 gba:rounded-lg gba:bg-muted/30 gba:animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {/* Header with search and tabs */}
      <div className="gba:flex gba:flex-col gba:gap-3 gba:sm:flex-row gba:sm:items-center gba:sm:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">{t('common-files')}</h3>
          {items.length > 0 && (
            <span className="gba:text-xs gba:text-muted-foreground gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded-full">
              {items.length}
            </span>
          )}
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          {/* Search */}
          <div className="gba:relative gba:w-full gba:sm:w-64">
            <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <Input
              placeholder={t('common-search-files-placeholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="gba:pl-9 gba:h-9"
              data-testid={`${testId}-search`}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="gba:flex gba:gap-1 gba:p-1 gba:bg-muted/50 gba:rounded-lg gba:w-fit">
        {(Object.keys(tabConfig) as ContentTab[]).map(tab => {
          const config = tabConfig[tab]
          const Icon = config.icon
          const count = counts[tab]
          const isActive = activeTab === tab

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1.5 gba:rounded-md gba:text-sm gba:font-medium gba:transition-all gba:duration-150 ${
                isActive
                  ? 'gba:bg-background gba:text-foreground gba:shadow-sm'
                  : 'gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-background/50'
              }`}
              data-testid={`${testId}-tab-${tab}`}
            >
              <Icon className="gba:w-3.5 gba:h-3.5" />
              <span className="gba:hidden gba:sm:inline">{t(config.labelKey)}</span>
              <span className="gba:text-xs gba:opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div className="gba:rounded-xl gba:border gba:border-dashed gba:border-border/60 gba:p-12 gba:text-center gba:bg-muted/20">
          <div className="gba:w-14 gba:h-14 gba:rounded-xl gba:bg-muted/50 gba:flex gba:items-center gba:justify-center gba:mx-auto gba:mb-4">
            <FolderOpen className="gba:w-7 gba:h-7 gba:text-muted-foreground/50" />
          </div>
          <p className="gba:text-sm gba:font-medium gba:text-muted-foreground">
            {searchQuery ? t('content-empty-search-title') : t('content-empty-title')}
          </p>
          <p className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1">
            {searchQuery ? t('content-empty-search-description') : t('content-empty-description')}
          </p>
        </div>
      )}

      {/* Selection Toolbar */}
      {selectedItems.size > 0 && (
        <div className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:bg-primary/10 gba:border gba:border-primary/20 gba:rounded-lg">
          <span className="gba:text-sm gba:font-medium gba:text-foreground">
            {t('common-selected-items', { count: selectedItems.size })}
          </span>
          <div className="gba:flex gba:gap-2 gba:ml-auto">
            {onMoveMultipleToFolder && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMoveSelectedToFolder}
                data-testid={`${testId}-move-selected`}
              >
                <FolderInput className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('common-move-to-folder')}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearSelection} data-testid={`${testId}-clear-selection`}>
              {t('common-clear')}
            </Button>
          </div>
        </div>
      )}

      {/* Content table */}
      {filteredItems.length > 0 && (
        <div className="gba:rounded-xl gba:border gba:border-border/50 gba:overflow-hidden gba:bg-card">
          {/* Table header */}
          <div className="gba:grid gba:grid-cols-12 gba:gap-4 gba:px-4 gba:py-3 gba:bg-muted/30 gba:border-b gba:border-border/50">
            <div className="gba:col-span-6 gba:sm:col-span-5 gba:flex gba:items-center gba:gap-3">
              <Checkbox
                checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                onCheckedChange={checked => (checked ? selectAll() : clearSelection())}
                data-testid={`${testId}-select-all`}
              />
              <button
                type="button"
                onClick={() => handleSort('title')}
                className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
              >
                {t('content-column-name')} {getSortIcon('title')}
              </button>
            </div>
            <div className="gba:col-span-2 gba:hidden gba:sm:block">
              <button
                type="button"
                onClick={() => handleSort('type')}
                className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
              >
                {t('content-column-type')} {getSortIcon('type')}
              </button>
            </div>
            <div className="gba:col-span-4 gba:sm:col-span-2">
              <button
                type="button"
                onClick={() => handleSort('updatedAt')}
                className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
              >
                {t('content-column-modified')} {getSortIcon('updatedAt')}
              </button>
            </div>
            <div className="gba:col-span-2 gba:hidden gba:sm:block">
              <button
                type="button"
                onClick={() => handleSort('createdAt')}
                className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
              >
                {t('content-column-created')} {getSortIcon('createdAt')}
              </button>
            </div>
            <div className="gba:col-span-1" />
          </div>

          {/* Table body */}
          <div className="gba:divide-y gba:divide-border/50">
            {filteredItems.map(item => {
              const config = contentTypeConfig[item.type] || contentTypeConfig.document
              const Icon = item.isPdf && item.type === 'document' ? FileType : config.icon

              return (
                <div
                  key={item.id}
                  draggable={!!onMoveToFolderClick}
                  onDragStart={e => {
                    if (onMoveToFolderClick) {
                      e.dataTransfer.effectAllowed = 'move'
                      // If item is selected, drag all selected items
                      if (selectedItems.has(item.id)) {
                        const itemsToDrag = items.filter(i => selectedItems.has(i.id))
                        e.dataTransfer.setData('application/json', JSON.stringify(itemsToDrag))
                      } else {
                        e.dataTransfer.setData('application/json', JSON.stringify([item]))
                      }
                      e.currentTarget.style.opacity = '0.5'
                    }
                  }}
                  onDragEnd={e => {
                    e.currentTarget.style.opacity = '1'
                  }}
                  onClick={() => onItemClick?.(item)}
                  className={`gba:group gba:grid gba:grid-cols-12 gba:gap-4 gba:px-4 gba:py-3 gba:cursor-pointer gba:transition-colors gba:hover:bg-muted/30 ${
                    selectedItems.has(item.id) ? 'gba:bg-primary/10' : ''
                  }`}
                  data-testid={`${testId}-item-${item.id}`}
                >
                  {/* Name */}
                  <div className="gba:col-span-6 gba:sm:col-span-5 gba:flex gba:items-center gba:gap-3 gba:min-w-0">
                    <div onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => toggleSelectItem(item.id)}
                        data-testid={`${testId}-select-${item.id}`}
                      />
                    </div>
                    <div
                      className={`gba:w-8 gba:h-8 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:flex-shrink-0 ${
                        item.isPdf && item.type === 'document' ? 'gba:bg-destructive/10' : 'gba:bg-muted/50'
                      }`}
                    >
                      <Icon
                        className={`gba:w-4 gba:h-4 ${
                          item.isPdf && item.type === 'document' ? 'gba:text-destructive' : 'gba:text-muted-foreground'
                        }`}
                      />
                    </div>
                    <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{item.title}</span>
                  </div>

                  {/* Type */}
                  <div className="gba:col-span-2 gba:hidden gba:sm:flex gba:items-center">
                    <span className="gba:text-sm gba:text-muted-foreground">{t(config.labelKey)}</span>
                  </div>

                  {/* Modified */}
                  <div className="gba:col-span-4 gba:sm:col-span-2 gba:flex gba:items-center">
                    <span className="gba:text-sm gba:text-muted-foreground">
                      {formatLocalizedDate(new Date(item.updatedAt), locale)}
                    </span>
                  </div>

                  {/* Created */}
                  <div className="gba:col-span-2 gba:hidden gba:sm:flex gba:items-center">
                    <span className="gba:text-sm gba:text-muted-foreground">
                      {formatLocalizedDate(new Date(item.createdAt), locale)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div
                    className="gba:col-span-2 gba:sm:col-span-1 gba:flex gba:items-center gba:justify-end gba:gap-1"
                    onClick={e => e.stopPropagation()}
                  >
                    {(onMoveToFolderClick || onRemoveContent) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="gba:h-8 gba:w-8 gba:opacity-60 hover:gba:opacity-100 gba:group-hover:opacity-100"
                            data-testid={`${testId}-item-actions-${item.id}`}
                          >
                            <MoreHorizontal className="gba:w-4 gba:h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onMoveToFolderClick && (
                            <DropdownMenuItem onClick={() => onMoveToFolderClick(item)}>
                              <FolderInput className="gba:w-4 gba:h-4 gba:mr-2" />
                              {t('common-move-to-folder')}
                            </DropdownMenuItem>
                          )}
                          {onRemoveContent && (
                            <DropdownMenuItem
                              onClick={() => onRemoveContent(item)}
                              className="gba:text-destructive focus:gba:text-destructive"
                            >
                              <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                              {t('content-remove-from-space')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
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
