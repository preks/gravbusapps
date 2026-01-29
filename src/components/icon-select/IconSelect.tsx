import React, { useState, useEffect, useRef } from 'react'
import * as PhosphorIcons from '@phosphor-icons/react'
import { Popover, PopoverContent, PopoverTrigger, Button, Input, ScrollArea } from '@newwork/nw-design-system'
import { MagnifyingGlass } from '@phosphor-icons/react'

interface IconSelectProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

const DEFAULT_ICON = 'AppWindowIcon'

// Only icon names with "Icon" suffix to avoid duplicates (library exports both Xxx and XxxIcon)
const ALL_PHOSPHOR_ICONS = Object.keys(PhosphorIcons)
  .filter(name => /^[A-Z]/.test(name) && name.endsWith('Icon') && name !== 'IconContext' && name !== 'SSR')
  .sort()

// Common/recommended icons (Icon suffix only)
const COMMON_ICONS = [
  'ArticleIcon',
  'TargetIcon',
  'TrendUpIcon',
  'NoteIcon',
  'ListChecksIcon',
  'HandCoinsIcon',
  'ChartBarIcon',
  'LightbulbIcon',
  'CalendarIcon',
  'FileTextIcon',
  'UsersIcon',
  'BuildingsIcon',
  'WarningIcon',
  'CheckCircleIcon',
  'InfoIcon',
  'CurrencyDollarIcon',
  'ChartLineUpIcon',
  'MapPinIcon'
]

// Convert icon name to display label (e.g., "TrendUpIcon" -> "Trend Up Icon")
const getIconLabel = (iconName: string): string => {
  return iconName.replace(/([A-Z])/g, ' $1').trim()
}

const ICONS_PER_PAGE = 54 // 6 columns x 9 rows

export const IconSelect: React.FC<IconSelectProps> = ({ value, onValueChange, disabled = false, className }) => {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [displayCount, setDisplayCount] = useState(ICONS_PER_PAGE)
  const [triggerMounted, setTriggerMounted] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const setLoadMoreRef = React.useCallback((el: HTMLDivElement | null) => {
    loadMoreRef.current = el
    setTriggerMounted(!!el)
  }, [])

  const displayValue = value || DEFAULT_ICON
  let IconComponent = (PhosphorIcons as any)[displayValue]
  if (!IconComponent) {
    IconComponent = (PhosphorIcons as any)[DEFAULT_ICON]
  }

  // Filter icons based on search
  const filteredAllIcons = searchQuery.trim()
    ? ALL_PHOSPHOR_ICONS.filter(iconName => {
        const label = getIconLabel(iconName).toLowerCase()
        return label.includes(searchQuery.toLowerCase())
      })
    : ALL_PHOSPHOR_ICONS

  // Separate common icons from others
  const commonFiltered = COMMON_ICONS.filter(icon => (searchQuery.trim() ? filteredAllIcons.includes(icon) : true))

  // Get all non-common icons
  const allOtherIcons = filteredAllIcons.filter(icon => !COMMON_ICONS.includes(icon))

  // Slice for display
  const otherFiltered = allOtherIcons.slice(0, displayCount)

  const hasMore = displayCount < allOtherIcons.length

  // Reset display count when search changes
  useEffect(() => {
    setDisplayCount(ICONS_PER_PAGE)
  }, [searchQuery])

  // Infinite scroll implementation
  useEffect(() => {
    if (!open) {
      return
    }

    const currentLoadMoreRef = loadMoreRef.current
    if (!currentLoadMoreRef) {
      return
    }

    if (!hasMore) {
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (entry && entry.isIntersecting) {
          setDisplayCount(prev => Math.min(prev + ICONS_PER_PAGE, allOtherIcons.length))
        }
      },
      {
        threshold: 0,
        root: null,
        rootMargin: '50px'
      }
    )

    observer.observe(currentLoadMoreRef)

    return () => {
      observer.disconnect()
    }
  }, [open, hasMore, displayCount, allOtherIcons.length, triggerMounted])

  // Reset when closing
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setDisplayCount(ICONS_PER_PAGE)
      setTriggerMounted(false)
    }
  }, [open])

  const handleSelect = (iconName: string) => {
    onValueChange(iconName)
    setOpen(false)
    setSearchQuery('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={className}
          data-testid="icon-select-trigger"
        >
          <IconComponent size={20} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="gba:w-[400px] gba:p-0" align="start" data-testid="icon-select-content">
        <div className="gba:p-3 gba:border-b gba:border-border">
          <div className="gba:relative">
            <MagnifyingGlass
              className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-muted-foreground"
              size={16}
            />
            <Input
              placeholder="Search icons..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="gba:pl-9"
              data-testid="icon-select-search"
            />
          </div>
        </div>
        <ScrollArea className="gba:h-[300px]">
          <div className="gba:p-2">
            {commonFiltered.length > 0 && (
              <>
                <div className="gba:px-2 gba:py-1.5 gba:text-xs gba:font-semibold gba:text-muted-foreground">
                  Common Icons
                </div>
                <div className="gba:grid gba:grid-cols-6 gba:gap-1 gba:mb-2">
                  {commonFiltered.map(iconName => {
                    const Icon = (PhosphorIcons as any)[iconName]
                    if (!Icon) return null // Skip if icon not found
                    const isSelected = displayValue === iconName
                    return (
                      <button
                        key={iconName}
                        onClick={() => handleSelect(iconName)}
                        className={`gba:flex gba:flex-col gba:items-center gba:gap-1 gba:p-2 gba:rounded-md gba:transition-all gba:duration-200 hover:gba:bg-accent hover:gba:scale-110 hover:gba:shadow-sm ${
                          isSelected ? 'gba:bg-accent gba:ring-2 gba:ring-primary' : ''
                        }`}
                        title={getIconLabel(iconName)}
                        data-testid={`icon-select-${iconName}`}
                      >
                        <Icon size={24} />
                        <span className="gba:text-[10px] gba:text-muted-foreground gba:text-center gba:leading-tight">
                          {getIconLabel(iconName)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {otherFiltered.length > 0 && (
              <>
                <div className="gba:px-2 gba:py-1.5 gba:text-xs gba:font-semibold gba:text-muted-foreground gba:border-t gba:border-border gba:mt-2 gba:pt-2">
                  {searchQuery.trim() ? 'Search Results' : 'All Icons'}
                </div>
                <div className="gba:grid gba:grid-cols-6 gba:gap-1">
                  {otherFiltered.map(iconName => {
                    const Icon = (PhosphorIcons as any)[iconName]
                    if (!Icon) return null // Skip if icon not found
                    const isSelected = displayValue === iconName
                    return (
                      <button
                        key={iconName}
                        onClick={() => handleSelect(iconName)}
                        className={`gba:flex gba:flex-col gba:items-center gba:gap-1 gba:p-2 gba:rounded-md gba:transition-all gba:duration-200 hover:gba:bg-accent hover:gba:scale-110 hover:gba:shadow-sm ${
                          isSelected ? 'gba:bg-accent gba:ring-2 gba:ring-primary' : ''
                        }`}
                        title={getIconLabel(iconName)}
                        data-testid={`icon-select-${iconName}`}
                      >
                        <Icon size={24} />
                        <span className="gba:text-[10px] gba:text-muted-foreground gba:text-center gba:leading-tight">
                          {getIconLabel(iconName)}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {/* Load more trigger for infinite scroll */}
                <div
                  ref={setLoadMoreRef}
                  className="gba:h-2 gba:border-t gba:border-destructive"
                  data-testid="icon-select-load-more-trigger"
                  title="Infinite scroll trigger"
                />
                {hasMore && (
                  <div className="gba:text-center gba:py-3 gba:text-xs gba:text-muted-foreground">
                    Loading more icons... (Showing {otherFiltered.length} of {allOtherIcons.length})
                  </div>
                )}
                {!hasMore && allOtherIcons.length > ICONS_PER_PAGE && (
                  <div className="gba:text-center gba:py-3 gba:text-xs gba:text-muted-foreground">
                    All {allOtherIcons.length} icons loaded
                  </div>
                )}
              </>
            )}

            {!searchQuery.trim() && commonFiltered.length > 0 && otherFiltered.length === 0 && (
              <div className="gba:text-center gba:py-4 gba:text-xs gba:text-muted-foreground gba:border-t gba:border-border gba:mt-2">
                💡 Type to search from 1000+ icons
              </div>
            )}

            {searchQuery.trim() && commonFiltered.length === 0 && otherFiltered.length === 0 && (
              <div className="gba:text-center gba:py-6 gba:text-sm gba:text-muted-foreground">No icons found</div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
