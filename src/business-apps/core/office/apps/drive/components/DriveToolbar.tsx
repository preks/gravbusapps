import React, { useRef } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Search, LayoutGrid, List, Upload, FolderPlus, SortAsc, SortDesc, Trash2, CloudDownload } from 'lucide-react'
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
  onImportExternal?: () => void
  onCreateFolder?: () => void
  actionsSlot?: React.ReactNode
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
  onImportExternal,
  onCreateFolder,
  actionsSlot,
  section,
  onEmptyTrash,
  t,
  'data-testid': testId = 'drive-toolbar'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="gba:flex gba:flex-col gba:gap-3" data-testid={testId}>
      {/* Spotlight search bar */}
      <button
        onClick={onSearchClick}
        className="gba:group gba:flex gba:items-center gba:gap-3 gba:w-full gba:px-4 gba:py-3 gba:rounded-xl gba:bg-muted/40 gba:border gba:border-border/60 gba:text-muted-foreground hover:gba:bg-muted/70 hover:gba:border-border gba:transition-all gba:duration-200 gba:shadow-sm hover:gba:shadow-md"
        data-testid={`${testId}-search-trigger`}
      >
        <Search className="gba:w-5 gba:h-5 gba:text-muted-foreground/70 group-hover:gba:text-foreground gba:transition-colors" />
        <span className="gba:text-sm gba:text-muted-foreground/70 group-hover:gba:text-muted-foreground gba:transition-colors">
          {t('header-search-placeholder')}
        </span>
        <kbd className="gba:ml-auto gba:text-[11px] gba:text-muted-foreground/50 gba:px-2 gba:py-0.5 gba:rounded-md gba:bg-background gba:border gba:border-border/50 gba:font-medium gba:tracking-wide">
          ⌘K
        </kbd>
      </button>

      {/* Actions row */}
      <div className="gba:flex gba:items-center gba:gap-2">
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
          <div className="gba:flex gba:items-center gba:gap-1 gba:border gba:border-border/50 gba:rounded-lg gba:px-1 gba:py-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gba:gap-1.5 gba:h-7 gba:text-xs"
              data-testid={`${testId}-upload`}
            >
              <Upload className="gba:w-3.5 gba:h-3.5" />
              {t('header-upload-file')}
            </Button>
            {onCreateFolder && (
              <>
                <div className="gba:w-px gba:h-4 gba:bg-border/50" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCreateFolder}
                  className="gba:gap-1.5 gba:h-7 gba:text-xs"
                  data-testid={`${testId}-create-folder`}
                >
                  <FolderPlus className="gba:w-3.5 gba:h-3.5" />
                  {t('header-new-folder')}
                </Button>
              </>
            )}
            {onImportExternal && (
              <>
                <div className="gba:w-px gba:h-4 gba:bg-border/50" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onImportExternal}
                  className="gba:gap-1.5 gba:h-7 gba:text-xs"
                  data-testid={`${testId}-import-external`}
                >
                  <CloudDownload className="gba:w-3.5 gba:h-3.5" />
                  {t('header-import-external')}
                </Button>
              </>
            )}
          </div>
        )}

        {actionsSlot}

        {section === 'trash' && onEmptyTrash && (
          <Button
            variant="ghost"
            size="sm"
            className="gba:gap-1.5 gba:text-destructive gba:h-7 gba:text-xs"
            onClick={onEmptyTrash}
            data-testid={`${testId}-empty-trash`}
          >
            <Trash2 className="gba:w-3.5 gba:h-3.5" />
            {t('action-empty-trash')}
          </Button>
        )}

        <div className="gba:ml-auto gba:flex gba:items-center gba:gap-1.5">
          <div className="gba:flex gba:items-center gba:border gba:border-border/50 gba:rounded-lg gba:px-1 gba:py-0.5">
            <select
              value={sortBy}
              onChange={e => onSortByChange(e.target.value as DriveSortBy)}
              className="gba:text-xs gba:bg-transparent gba:border-0 gba:pr-1 gba:py-0.5 gba:text-muted-foreground gba:cursor-pointer focus:gba:outline-none"
              data-testid={`${testId}-sort-select`}
            >
              <option value="updatedAt">{t('header-sort-modified')}</option>
              <option value="name">{t('header-sort-name')}</option>
              <option value="createdAt">{t('header-sort-created')}</option>
              <option value="size">{t('header-sort-size')}</option>
            </select>
            <div className="gba:w-px gba:h-4 gba:bg-border/50" />
            <button
              onClick={onSortOrderToggle}
              className="gba:p-1 gba:rounded gba:hover:bg-accent gba:text-muted-foreground gba:transition-colors"
              data-testid={`${testId}-sort-order`}
            >
              {sortOrder === 'ASC' ? (
                <SortAsc className="gba:w-3.5 gba:h-3.5" />
              ) : (
                <SortDesc className="gba:w-3.5 gba:h-3.5" />
              )}
            </button>
          </div>

          <div className="gba:flex gba:items-center gba:border gba:border-border/50 gba:rounded-lg gba:p-0.5">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`gba:p-1 gba:rounded gba:transition-colors ${viewMode === 'grid' ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:text-muted-foreground hover:gba:text-foreground'}`}
              data-testid={`${testId}-view-grid`}
            >
              <LayoutGrid className="gba:w-3.5 gba:h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`gba:p-1 gba:rounded gba:transition-colors ${viewMode === 'list' ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:text-muted-foreground hover:gba:text-foreground'}`}
              data-testid={`${testId}-view-list`}
            >
              <List className="gba:w-3.5 gba:h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
