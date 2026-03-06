import React from 'react'
import { Input, Button, Badge } from '@newwork/nw-design-system'
import { Search, X } from 'lucide-react'
import { getLabelChipClassName } from '../utils/labelUtils'

interface EmailListHeaderProps {
  folderName: string
  searchQuery: string
  onSearchChange: (query: string) => void
  isLabelSearchOpen: boolean
  setIsLabelSearchOpen: React.Dispatch<React.SetStateAction<boolean>>
  labelSearchQuery: string
  setLabelSearchQuery: React.Dispatch<React.SetStateAction<string>>
  labelSearchInputRef: React.RefObject<HTMLInputElement>
  labelFilterRowRef: React.RefObject<HTMLDivElement>
  filteredVisibleLabels: string[]
  selectedLabels: string[]
  labelColorByName: Map<string, string | null>
  toggleFilterLabel: (label: string) => void
  hasActiveLabelFilter: boolean
  clearFilterLabels: () => void
  handleLabelRowMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void
  handleLabelRowMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void
  stopLabelRowDragging: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
  testId: string
}

export const EmailListHeader: React.FC<EmailListHeaderProps> = ({
  folderName,
  searchQuery,
  onSearchChange,
  isLabelSearchOpen,
  setIsLabelSearchOpen,
  labelSearchQuery,
  setLabelSearchQuery,
  labelSearchInputRef,
  labelFilterRowRef,
  filteredVisibleLabels,
  selectedLabels,
  labelColorByName,
  toggleFilterLabel,
  hasActiveLabelFilter,
  clearFilterLabels,
  handleLabelRowMouseDown,
  handleLabelRowMouseMove,
  stopLabelRowDragging,
  t,
  testId
}) => {
  return (
    <div className="gba:border-b gba:p-4">
      <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-3">{folderName}</h2>
      <div className="gba:relative">
        <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
        <Input
          placeholder={t('list-search-placeholder')}
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="gba:pl-9 gba:h-9"
          data-testid={`${testId}-search`}
        />
      </div>
      <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
        <button
          type="button"
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:flex-shrink-0 gba:rounded hover:gba:bg-muted/50"
          onMouseDown={event => {
            event.preventDefault()
          }}
          onClick={() => {
            if (isLabelSearchOpen) {
              setIsLabelSearchOpen(false)
              setLabelSearchQuery('')
              return
            }
            setIsLabelSearchOpen(true)
          }}
          data-testid={`${testId}-label-filter-search-focus`}
        >
          <Search className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
        </button>
        {isLabelSearchOpen && (
          <Input
            ref={labelSearchInputRef}
            value={labelSearchQuery}
            onChange={e => setLabelSearchQuery(e.target.value)}
            onBlur={() => {
              if (!labelSearchQuery.trim()) {
                setIsLabelSearchOpen(false)
              }
            }}
            onKeyDown={event => {
              if (event.key === 'Escape') {
                if (!labelSearchQuery.trim()) {
                  setIsLabelSearchOpen(false)
                }
                return
              }
            }}
            placeholder={t('list-label-filter-search-placeholder')}
            className="gba:h-7 gba:w-32"
            data-testid={`${testId}-label-filter-search`}
          />
        )}
        <div
          ref={labelFilterRowRef}
          className="gba:flex-1 gba:min-w-0 gba:overflow-x-auto gba:scrollbar-hide gba:py-1"
          onMouseDown={handleLabelRowMouseDown}
          onMouseMove={handleLabelRowMouseMove}
          onMouseUp={stopLabelRowDragging}
          onMouseLeave={stopLabelRowDragging}
          data-testid={`${testId}-label-filter-row`}
        >
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:whitespace-nowrap gba:px-1 gba:pr-1">
            {filteredVisibleLabels.length === 0 ? (
              <span className="gba:text-xs gba:text-muted-foreground">{t('list-label-filter-empty')}</span>
            ) : (
              filteredVisibleLabels.map(label => {
                const isSelected = selectedLabels.includes(label)
                const chipColorClass = getLabelChipClassName(labelColorByName.get(label) || null)
                return (
                  <button
                    key={`${testId}-filter-label-${label}`}
                    type="button"
                    onClick={() => toggleFilterLabel(label)}
                    data-testid={`${testId}-label-filter-chip-${label}`}
                  >
                    <Badge
                      variant="secondary"
                      className={`gba:h-6 ${chipColorClass} ${
                        isSelected ? 'gba:ring-2 gba:ring-primary-ring gba:ring-offset-1' : ''
                      }`}
                    >
                      {label}
                    </Badge>
                  </button>
                )
              })
            )}
          </div>
        </div>
        {hasActiveLabelFilter && (
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-6 gba:w-6 gba:flex-shrink-0"
            onClick={clearFilterLabels}
            title={t('list-label-filter-clear')}
            data-testid={`${testId}-label-filter-clear`}
          >
            <X className="gba:h-3.5 gba:w-3.5" />
          </Button>
        )}
      </div>
      {hasActiveLabelFilter && (
        <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">{t('list-label-filter-match-all-hint')}</p>
      )}
    </div>
  )
}
