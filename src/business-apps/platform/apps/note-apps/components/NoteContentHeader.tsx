import React from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Plus,
  List,
  LayoutGrid,
  ChevronRight,
  SortAsc,
  SortDesc,
  FileText,
  PenTool,
  Sparkles,
  FolderPlus,
  PanelLeft,
  RefreshCw
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
  onViewLayoutChange: (layout: 'grid' | 'list') => void
  onSortByChange: (sortBy: 'name' | 'modified' | 'created') => void
  onSortOrderToggle: () => void
  onBreadcrumbClick: (id: string | null) => void
  onToggleSidebar: () => void
  onCreateNote: (opts?: { noteType?: 'text' | 'handwriting' }) => void
  onCreateFolder?: () => void
  onRefresh: () => void
  /** When false, “Handwriting note” is hidden (catalog `preview.enabled` not true). */
  handwritingNotesEnabled?: boolean
}

export const NoteContentHeader: React.FC<NoteContentHeaderProps> = ({
  breadcrumbs,
  currentTitle,
  viewLayout,
  sortBy,
  sortOrder,
  isSidebarCollapsed,
  onViewLayoutChange,
  onSortByChange,
  onSortOrderToggle,
  onBreadcrumbClick,
  onToggleSidebar,
  onCreateNote,
  onCreateFolder,
  onRefresh,
  handwritingNotesEnabled = true
}) => {
  const { t } = useTranslation(translations)

  return (
    <div
      className="gba:flex gba:items-center gba:gap-3 gba:px-5 gba:py-3 gba:border-b gba:border-border/50 gba:bg-background/80 gba:backdrop-blur-sm gba:sticky gba:top-0 gba:z-10"
      data-testid="note-content-header"
    >
      {/* Sidebar toggle (when collapsed) */}
      {isSidebarCollapsed && (
        <Button variant="ghost" size="icon" className="gba:h-8 gba:w-8" onClick={onToggleSidebar}>
          <PanelLeft className="gba:w-4 gba:h-4" />
        </Button>
      )}

      {/* Breadcrumbs */}
      <nav className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:flex-1 gba:min-w-0" aria-label="Breadcrumb">
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

      {/* Actions */}
      <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="gba:h-7 gba:w-7 gba:p-0"
          data-testid="content-refresh"
        >
          <RefreshCw className="gba:w-3.5 gba:h-3.5" />
        </Button>

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

        {/* New note button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gba:h-8 gba:gap-1.5" data-testid="content-new-btn">
              <Plus className="gba:w-3.5 gba:h-3.5" />
              {t('sidebar-new')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="gba:w-52">
            <DropdownMenuItem onClick={() => onCreateNote()}>
              <FileText className="gba:w-4 gba:h-4 gba:mr-2 gba:text-warning" />
              <div>
                <div className="gba:font-medium gba:text-sm">{t('menu-new-text-title')}</div>
                <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-text-description')}</div>
              </div>
            </DropdownMenuItem>
            {handwritingNotesEnabled ? (
              <DropdownMenuItem onClick={() => onCreateNote({ noteType: 'handwriting' })}>
                <PenTool className="gba:w-4 gba:h-4 gba:mr-2 gba:text-info" />
                <div>
                  <div className="gba:font-medium gba:text-sm">{t('menu-new-handwriting-title')}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-handwriting-description')}</div>
                </div>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            {onCreateFolder && (
              <DropdownMenuItem onClick={onCreateFolder}>
                <FolderPlus className="gba:w-4 gba:h-4 gba:mr-2" />
                <div>
                  <div className="gba:font-medium gba:text-sm">{t('menu-new-folder-title')}</div>
                  <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-folder-description')}</div>
                </div>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onCreateNote()}>
              <Sparkles className="gba:w-4 gba:h-4 gba:mr-2 gba:text-primary" />
              <div>
                <div className="gba:font-medium gba:text-sm">{t('menu-new-template-title')}</div>
                <div className="gba:text-xs gba:text-muted-foreground">{t('menu-new-template-description')}</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
