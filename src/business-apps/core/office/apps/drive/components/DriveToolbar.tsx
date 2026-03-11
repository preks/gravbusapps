import React, { useRef } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Search, LayoutGrid, List, Upload, SortAsc, SortDesc, Trash2 } from 'lucide-react'
import type { DriveViewMode, DriveSortBy, DriveSection } from '../types/drive.types'

export interface DriveToolbarProps {
  viewMode: DriveViewMode
  onViewModeChange: (mode: DriveViewMode) => void
  sortBy: DriveSortBy
  onSortByChange: (sort: DriveSortBy) => void
  sortOrder: 'ASC' | 'DESC'
  onSortOrderToggle: () => void
  onSearchClick: () => void
  onUploadFiles: (files: File[]) => void
  section: DriveSection
  onEmptyTrash?: () => void
  t: (key: string) => string
  'data-testid'?: string
}

export const DriveToolbar: React.FC<DriveToolbarProps> = ({
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  onSearchClick,
  onUploadFiles,
  section,
  onEmptyTrash,
  t,
  'data-testid': testId = 'drive-toolbar'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap" data-testid={testId}>
      <button
        onClick={onSearchClick}
        className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-lg gba:bg-muted/50 gba:text-muted-foreground gba:hover:bg-muted gba:transition-colors gba:text-sm gba:flex-1 gba:max-w-sm"
        data-testid={`${testId}-search-trigger`}
      >
        <Search className="gba:w-4 gba:h-4" />
        <span>{t('header-search-placeholder')}</span>
        <kbd className="gba:ml-auto gba:text-xs gba:text-muted-foreground/60 gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-background gba:border gba:border-border/50">
          ⌘K
        </kbd>
      </button>

      <div className="gba:flex gba:items-center gba:gap-1 gba:ml-auto">
        {section === 'trash' && onEmptyTrash && (
          <Button
            variant="ghost"
            size="sm"
            className="gba:gap-1.5 gba:text-destructive"
            onClick={onEmptyTrash}
            data-testid={`${testId}-empty-trash`}
          >
            <Trash2 className="gba:w-4 gba:h-4" />
            {t('action-empty-trash')}
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="gba:hidden"
          onChange={e => {
            const files = e.target.files
            if (files?.length) onUploadFiles(Array.from(files))
            e.target.value = ''
          }}
          data-testid={`${testId}-file-input`}
        />
        {section === 'my-drive' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gba:gap-1.5"
            data-testid={`${testId}-upload`}
          >
            <Upload className="gba:w-4 gba:h-4" />
            {t('header-upload-file')}
          </Button>
        )}

        <select
          value={sortBy}
          onChange={e => onSortByChange(e.target.value as DriveSortBy)}
          className="gba:text-xs gba:bg-transparent gba:border gba:border-border/50 gba:rounded-lg gba:px-2 gba:py-1.5 gba:text-muted-foreground"
          data-testid={`${testId}-sort-select`}
        >
          <option value="updatedAt">Modified</option>
          <option value="name">Name</option>
          <option value="createdAt">Created</option>
          <option value="size">Size</option>
        </select>

        <button
          onClick={onSortOrderToggle}
          className="gba:p-1.5 gba:rounded-lg gba:hover:bg-accent gba:text-muted-foreground gba:transition-colors"
          data-testid={`${testId}-sort-order`}
        >
          {sortOrder === 'ASC' ? <SortAsc className="gba:w-4 gba:h-4" /> : <SortDesc className="gba:w-4 gba:h-4" />}
        </button>

        <div className="gba:flex gba:items-center gba:border gba:border-border/50 gba:rounded-lg gba:p-0.5">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`gba:p-1.5 gba:rounded ${viewMode === 'grid' ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:text-muted-foreground'}`}
            data-testid={`${testId}-view-grid`}
          >
            <LayoutGrid className="gba:w-4 gba:h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`gba:p-1.5 gba:rounded ${viewMode === 'list' ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:text-muted-foreground'}`}
            data-testid={`${testId}-view-list`}
          >
            <List className="gba:w-4 gba:h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
