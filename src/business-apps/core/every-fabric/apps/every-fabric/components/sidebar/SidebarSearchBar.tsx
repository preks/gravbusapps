import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import React, { useEffect, useRef } from 'react'
import { SidebarTooltip } from './SidebarTooltip'

interface SidebarSearchBarProps {
  isCollapsed: boolean
  query: string
  onChange: (value: string) => void
  /** Called when the user clicks the collapsed-mode search icon. */
  onRequestExpand: () => void
  isSearching?: boolean
  resultCount?: number
  focusRequestId?: number
}

export const SidebarSearchBar: React.FC<SidebarSearchBarProps> = ({
  isCollapsed,
  query,
  onChange,
  onRequestExpand,
  isSearching = false,
  resultCount,
  focusRequestId = 0
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isCollapsed && focusRequestId > 0) {
      inputRef.current?.focus()
    }
  }, [isCollapsed, focusRequestId])

  if (isCollapsed) {
    return (
      <div className="gba:flex gba:justify-center gba:px-2 gba:pb-2">
        <SidebarTooltip label="Search sessions">
          <button
            type="button"
            onClick={onRequestExpand}
            aria-label="Search sessions"
            className="gba:inline-flex gba:items-center gba:justify-center gba:h-9 gba:w-9 gba:rounded-xl gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
            data-testid="sidebar-search-icon"
          >
            <MagnifyingGlassIcon className="gba:h-4 gba:w-4" />
          </button>
        </SidebarTooltip>
      </div>
    )
  }

  const showResultCount = query.trim().length > 0 && resultCount !== undefined && !isSearching

  const renderTrailingControl = () => {
    if (isSearching) {
      return (
        <span
          className="gba:absolute gba:right-2.5 gba:h-3 gba:w-3 gba:rounded-full gba:border-2 gba:border-muted-foreground/25 gba:border-t-muted-foreground gba:animate-spin"
          aria-label="Searching sessions"
          data-testid="sidebar-search-loading"
        />
      )
    }

    if (query) {
      return (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="gba:absolute gba:right-1.5 gba:inline-flex gba:items-center gba:justify-center gba:h-5 gba:w-5 gba:rounded-full gba:text-muted-foreground/70 gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
          data-testid="sidebar-search-clear"
        >
          <XIcon className="gba:h-3 gba:w-3" />
        </button>
      )
    }

    return null
  }

  return (
    <div className="gba:px-2 gba:pb-2">
      <label className="gba:relative gba:flex gba:items-center">
        <MagnifyingGlassIcon className="gba:absolute gba:left-2.5 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/70 gba:pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => onChange(e.target.value)}
          placeholder="Search sessions"
          aria-label="Search sessions"
          className="gba:h-8 gba:w-full gba:rounded-lg gba:border gba:border-border/60 gba:bg-background/70 gba:pl-8 gba:pr-8 gba:text-[13px] gba:text-foreground gba:placeholder:text-muted-foreground/70 gba:outline-none focus-visible:gba:border-primary/50 focus-visible:gba:bg-background focus-visible:gba:ring-2 focus-visible:gba:ring-primary/10 gba:transition-colors"
          data-testid="sidebar-search-input"
        />
        {renderTrailingControl()}
      </label>
      {showResultCount ? (
        <p className="gba:mt-1 gba:px-1 gba:text-[11px] gba:text-muted-foreground/70" aria-live="polite">
          {resultCount === 1 ? '1 matching session' : `${resultCount} matching sessions`}
        </p>
      ) : null}
    </div>
  )
}
