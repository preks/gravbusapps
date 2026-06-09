import React from 'react'
import { Button, Input, useTranslation } from '@newwork/nw-design-system'
import {
  List,
  LayoutGrid,
  ChevronRight,
  Search,
  SortAsc,
  SortDesc,
  PanelLeft,
  RefreshCw,
  Trash2,
  Pin,
  X
} from 'lucide-react'
import type { NoteTreeNode } from '../types'
import translations from '../_i18n'

export interface NoteContentHeaderProps {
  breadcrumbs: NoteTreeNode[]
  currentTitle?: string
  viewLayout: 'grid' | 'list'
  sortBy: 'name' | 'modified' | 'created'
  sortOrder: 'asc' | 'desc'
  isSidebarCollapsed: boolean
  searchQuery: string
  selectedCount: number
  onSearchChange: (query: string) => void
  onViewLayoutChange: (layout: 'grid' | 'list') => void
  onSortByChange: (sortBy: 'name' | 'modified' | 'created') => void
  onSortOrderToggle: () => void
  onBreadcrumbClick: (id: string | null) => void
  onToggleSidebar: () => void
  onRefresh: () => void
  onBulkDelete?: () => void
  onBulkPin?: () => void
  onClearSelection: () => void
}

export const NoteContentHeader: React.FC<NoteContentHeaderProps> = ({
  breadcrumbs,
  currentTitle,
  viewLayout,
  sortBy,
  sortOrder,
  isSidebarCollapsed,
  searchQuery,
  selectedCount,
  onSearchChange,
  onViewLayoutChange,
  onSortByChange,
  onSortOrderToggle,
  onBreadcrumbClick,
  onToggleSidebar,
  onRefresh,
  onBulkDelete,
  onBulkPin,
  onClearSelection
}) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:max-w-6xl gba:mx-auto gba:w-full gba:px-6 gba:pt-5" data-testid="note-content-header">
      <div className="gba:flex gba:flex-col gba:gap-3 gba:mb-4">
        {/* Spotlight search */}
        <div className="gba:relative">
          <Search className="gba:absolute gba:left-4 gba:top-1/2 gba:-translate-y-1/2 gba:w-5 gba:h-5 gba:text-muted-foreground/70" />
          <Input
            placeholder={t('notes-header-search-placeholder')}
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="gba:pl-12 gba:pr-4 gba:h-12 gba:text-base gba:rounded-xl gba:bg-muted/40 gba:border-border/60 gba:shadow-sm hover:gba:shadow-md hover:gba:bg-muted/70 hover:gba:border-border gba:transition-all gba:duration-200"
            data-testid="content-search"
          />
        </div>

        {/* Actions row */}
        {selectedCount > 0 ? (
          <div className="gba:flex gba:items-center gba:gap-2" data-testid="content-bulk-bar">
            <Button variant="ghost" size="sm" onClick={onClearSelection} data-testid="content-bulk-clear">
              <X className="gba:w-4 gba:h-4 gba:mr-1" />
              {t('bulk-selected', { count: selectedCount })}
            </Button>
            {onBulkPin && (
              <>
                <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-1" />
                <Button variant="ghost" size="sm" onClick={onBulkPin} data-testid="content-bulk-pin">
                  <Pin className="gba:w-4 gba:h-4 gba:mr-1" />
                  {t('menu-pin')}
                </Button>
              </>
            )}
            {onBulkDelete && (
              <>
                <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="gba:text-destructive"
                  onClick={onBulkDelete}
                  data-testid="content-bulk-delete"
                >
                  <Trash2 className="gba:w-4 gba:h-4 gba:mr-1" />
                  {t('menu-delete')}
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="gba:flex gba:items-center gba:gap-2">
            {/* Sidebar toggle (when collapsed) */}
            {isSidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-8 gba:w-8 gba:flex-shrink-0"
                onClick={onToggleSidebar}
              >
                <PanelLeft className="gba:w-4 gba:h-4" />
              </Button>
            )}

            {/* Breadcrumbs */}
            <nav
              className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:min-w-0 gba:mr-1"
              aria-label="Breadcrumb"
            >
              <button
                type="button"
                onClick={() => onBreadcrumbClick(null)}
                className="gba:text-muted-foreground hover:gba:text-foreground gba:transition-colors gba:truncate gba:max-w-[120px]"
              >
                {t('qa-all-notes')}
              </button>

              {breadcrumbs.map(node => (
                <React.Fragment key={node.id}>
                  <ChevronRight className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/50 gba:flex-shrink-0" />
                  <button
                    type="button"
                    onClick={() => onBreadcrumbClick(node.id)}
                    className="gba:text-muted-foreground hover:gba:text-foreground gba:transition-colors gba:truncate gba:max-w-[120px]"
                  >
                    {node.title || t('title-untitled')}
                  </button>
                </React.Fragment>
              ))}

              {currentTitle && (
                <>
                  <ChevronRight className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/50 gba:flex-shrink-0" />
                  <span className="gba:text-foreground gba:font-medium gba:truncate">{currentTitle}</span>
                </>
              )}
            </nav>

            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="gba:gap-1.5 gba:h-7 gba:text-xs"
              data-testid="content-refresh"
            >
              <RefreshCw className="gba:w-3.5 gba:h-3.5" />
              {t('nh-refresh')}
            </Button>

            <div className="gba:ml-auto gba:flex gba:items-center gba:gap-1.5">
              {/* Sort pill */}
              <div className="gba:flex gba:items-center gba:border gba:border-border/50 gba:rounded-lg gba:px-1 gba:py-0.5">
                <select
                  value={sortBy}
                  onChange={e => onSortByChange(e.target.value as 'name' | 'modified' | 'created')}
                  className="gba:text-xs gba:bg-transparent gba:border-0 gba:pr-1 gba:py-0.5 gba:text-muted-foreground gba:cursor-pointer focus:gba:outline-none"
                >
                  <option value="modified">{t('sort-modified')}</option>
                  <option value="name">{t('sort-name')}</option>
                  <option value="created">{t('sort-created')}</option>
                </select>
                <div className="gba:w-px gba:h-4 gba:bg-border/50" />
                <button
                  onClick={onSortOrderToggle}
                  className="gba:p-1 gba:rounded hover:gba:bg-accent gba:text-muted-foreground gba:transition-colors"
                >
                  {sortOrder === 'asc' ? (
                    <SortAsc className="gba:w-3.5 gba:h-3.5" />
                  ) : (
                    <SortDesc className="gba:w-3.5 gba:h-3.5" />
                  )}
                </button>
              </div>

              {/* View toggle */}
              <div className="gba:flex gba:items-center gba:border gba:border-border/50 gba:rounded-lg gba:p-0.5">
                <button
                  onClick={() => onViewLayoutChange('list')}
                  className={`gba:p-1 gba:rounded gba:transition-colors ${
                    viewLayout === 'list'
                      ? 'gba:bg-accent gba:text-accent-foreground'
                      : 'gba:text-muted-foreground hover:gba:text-foreground'
                  }`}
                >
                  <List className="gba:w-3.5 gba:h-3.5" />
                </button>
                <button
                  onClick={() => onViewLayoutChange('grid')}
                  className={`gba:p-1 gba:rounded gba:transition-colors ${
                    viewLayout === 'grid'
                      ? 'gba:bg-accent gba:text-accent-foreground'
                      : 'gba:text-muted-foreground hover:gba:text-foreground'
                  }`}
                >
                  <LayoutGrid className="gba:w-3.5 gba:h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
