import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Button,
  Input,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { Search, Plus, FileText, FileSpreadsheet, StickyNote, Presentation, X, ArrowRight, Clock } from 'lucide-react'
import type { ContentItem } from '../hooks/useDeskData'
import { useDocumentPresence } from '../hooks/useDocumentPresence'

interface QuickActionsProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onCreateDocument: () => void
  onCreateSpreadsheet: () => void
  onCreateNote: () => void
  onCreateSlide: () => void
  searchResults?: ContentItem[]
  onItemClick?: (item: ContentItem) => void
  isLoading?: boolean
  accessToken?: string
  'data-testid'?: string
}

const typeConfig = {
  document: {
    icon: FileText,
    color: 'gba:text-sky-600',
    bg: 'gba:bg-sky-500/10',
    label: 'Document'
  },
  spreadsheet: {
    icon: FileSpreadsheet,
    color: 'gba:text-teal-600',
    bg: 'gba:bg-teal-500/10',
    label: 'Spreadsheet'
  },
  note: {
    icon: StickyNote,
    color: 'gba:text-amber-600',
    bg: 'gba:bg-amber-500/10',
    label: 'Note'
  },
  slide: {
    icon: Presentation,
    color: 'gba:text-info',
    bg: 'gba:bg-info/10',
    label: 'Presentation'
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/**
 * Highlight text matching the search query
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="gba:bg-primary/30 gba:text-foreground gba:rounded-sm gba:px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Presence participant from hook
 */
interface PresenceParticipant {
  odId: string
  userId: string
  userName: string
  userColor: string
  avatar?: string
}

/**
 * Mini presence display for search results
 */
const MiniPresence: React.FC<{ participants: PresenceParticipant[] }> = ({ participants }) => {
  if (participants.length === 0) return null

  const displayCount = Math.min(participants.length, 3) // Show up to 3 avatars
  const displayParticipants = participants.slice(0, displayCount)
  const remaining = participants.length - displayCount
  const isPlural = participants.length > 1

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="gba:flex gba:items-center gba:gap-2 gba:px-2.5 gba:py-1 gba:rounded-full gba:bg-success/10 gba:border gba:border-success/20">
            {/* Stacked avatars */}
            <div className="gba:flex gba:items-center gba:-space-x-2">
              {displayParticipants.map((p, idx) => (
                <Avatar
                  key={p.odId}
                  className="gba:w-7 gba:h-7 gba:border-2 gba:border-background gba:ring-1 gba:ring-success/20"
                  style={{ zIndex: displayCount - idx }}
                >
                  {p.avatar && <AvatarImage src={p.avatar} alt={p.userName} className="gba:object-cover" />}
                  <AvatarFallback
                    className="gba:text-[9px] gba:font-medium"
                    style={{ backgroundColor: `${p.userColor}30`, color: p.userColor }}
                  >
                    {getInitials(p.userName)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {remaining > 0 && (
                <div
                  className="gba:w-7 gba:h-7 gba:rounded-full gba:bg-muted gba:border-2 gba:border-background gba:flex gba:items-center gba:justify-center gba:text-[9px] gba:font-medium gba:text-muted-foreground"
                  style={{ zIndex: 0 }}
                >
                  +{remaining}
                </div>
              )}
            </div>
            {/* "is/are there" text */}
            <span className="gba:text-xs gba:font-medium gba:text-success gba:whitespace-nowrap">
              {isPlural ? 'are' : 'is'} there
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <div className="gba:flex gba:flex-col gba:gap-2">
            <span className="gba:text-xs gba:font-medium">Currently active:</span>
            {participants.map(p => (
              <div key={p.odId} className="gba:flex gba:items-center gba:gap-2">
                <Avatar className="gba:w-6 gba:h-6">
                  {p.avatar && <AvatarImage src={p.avatar} alt={p.userName} className="gba:object-cover" />}
                  <AvatarFallback className="gba:text-[8px]" style={{ backgroundColor: p.userColor }}>
                    {getInitials(p.userName)}
                  </AvatarFallback>
                </Avatar>
                <span className="gba:text-xs">{p.userName}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * QuickActions - Premium quick search and create section
 * Provides fast access to search and new content creation with inline results
 */
export const QuickActions: React.FC<QuickActionsProps> = ({
  searchQuery,
  onSearchChange,
  onCreateDocument,
  onCreateSpreadsheet,
  onCreateNote,
  onCreateSlide,
  searchResults = [],
  onItemClick,
  isLoading = false,
  accessToken,
  'data-testid': testId = 'desk-quick-actions'
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track presence across documents
  const { getPresence, hasActiveUsers, fetchPresence, isConnected } = useDocumentPresence({ accessToken })

  const showResults = isFocused && searchQuery.trim().length > 0
  const limitedResults = useMemo(() => searchResults.slice(0, 8), [searchResults])

  // Create a stable entity list key for presence fetching
  const entityListKey = useMemo(() => limitedResults.map(item => `${item.type}:${item.id}`).join(','), [limitedResults])

  // Fetch presence when search results change (debounced via entityListKey)
  useEffect(() => {
    console.log(
      '[QuickActions] Presence fetch effect triggered. Connected:',
      isConnected,
      'Results:',
      limitedResults.length
    )

    if (!entityListKey || !isConnected) {
      if (!isConnected) {
        console.warn('[QuickActions] ⚠️ Presence service not connected yet')
      }
      return
    }

    const entities = limitedResults.map(item => ({
      entityType: item.type,
      entityId: item.id
    }))

    if (entities.length > 0) {
      console.log('[QuickActions] 📞 Requesting presence for', entities.length, 'search results')
      fetchPresence(entities)
    }
  }, [entityListKey, isConnected, fetchPresence, limitedResults])

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: { type: 'document' | 'spreadsheet' | 'note' | 'slide'; items: ContentItem[] }[] = []

    const docs = limitedResults.filter(r => r.type === 'document')
    const sheets = limitedResults.filter(r => r.type === 'spreadsheet')
    const notesItems = limitedResults.filter(r => r.type === 'note')
    const slidesItems = limitedResults.filter(r => r.type === 'slide')

    if (docs.length > 0) groups.push({ type: 'document', items: docs })
    if (sheets.length > 0) groups.push({ type: 'spreadsheet', items: sheets })
    if (notesItems.length > 0) groups.push({ type: 'note', items: notesItems })
    if (slidesItems.length > 0) groups.push({ type: 'slide', items: slidesItems })

    return groups
  }, [limitedResults])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchResults])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }

      if (!showResults) {
        if (e.key === 'Escape' && searchQuery) {
          onSearchChange('')
          inputRef.current?.blur()
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, limitedResults.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (limitedResults[selectedIndex] && onItemClick) {
            onItemClick(limitedResults[selectedIndex])
            onSearchChange('')
            inputRef.current?.blur()
          }
          break
        case 'Escape':
          e.preventDefault()
          onSearchChange('')
          inputRef.current?.blur()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery, onSearchChange, showResults, limitedResults, selectedIndex, onItemClick])

  const handleClear = () => {
    onSearchChange('')
    inputRef.current?.focus()
  }

  const handleItemClick = (item: ContentItem) => {
    if (onItemClick) {
      onItemClick(item)
      onSearchChange('')
    }
  }

  // Calculate flat index for an item in grouped results
  let flatIndex = 0

  return (
    <section
      className="gba:py-6 gba:px-6 gba:relative gba:z-50"
      data-testid={testId}
      style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
    >
      {/* Background transition */}
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-b gba:from-transparent gba:via-background gba:to-background gba:-z-10" />

      <div className="gba:relative gba:max-w-3xl gba:mx-auto" ref={containerRef}>
        {/* Search area */}
        <div
          className={`gba:relative gba:border gba:transition-all gba:duration-200 gba:shadow-lg ${
            showResults ? 'gba:rounded-t-2xl gba:rounded-b-none' : 'gba:rounded-2xl'
          } ${isFocused ? 'gba:border-border/30 gba:shadow-xl' : 'gba:border-border/20'}`}
          style={{
            // eslint-disable-next-line newwork-local/no-hardcoded-colors
            backgroundColor: 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)'
          }}
        >
          <div className="gba:flex gba:items-center gba:gap-3 gba:p-3">
            <div className="gba:flex-1 gba:relative">
              <Search
                className={`gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:transition-colors ${
                  searchQuery ? 'gba:text-primary' : 'gba:text-muted-foreground'
                }`}
              />
              <Input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                placeholder="Search your documents, spreadsheets, and notes..."
                className="gba:pl-10 gba:pr-12 gba:border-0 gba:bg-transparent gba:text-base focus:gba:ring-0"
                data-testid={`${testId}-search-input`}
              />

              {/* Clear button */}
              {searchQuery && (
                <button
                  onClick={handleClear}
                  className="gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2 gba:p-1.5 gba:rounded-full gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-muted/80 gba:transition-all"
                  data-testid={`${testId}-clear`}
                >
                  <X className="gba:w-4 gba:h-4" />
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="gba:w-px gba:h-8 gba:bg-border" />

            {/* Quick create buttons */}
            <div className="gba:flex gba:items-center gba:gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gba:gap-1.5 gba:text-muted-foreground hover:gba:text-sky-600 hover:gba:bg-sky-500/10"
                      onClick={onCreateDocument}
                      data-testid={`${testId}-create-doc`}
                    >
                      <Plus className="gba:w-3.5 gba:h-3.5" />
                      <FileText className="gba:w-4 gba:h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create Document</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gba:gap-1.5 gba:text-muted-foreground hover:gba:text-teal-600 hover:gba:bg-teal-500/10"
                      onClick={onCreateSpreadsheet}
                      data-testid={`${testId}-create-sheet`}
                    >
                      <Plus className="gba:w-3.5 gba:h-3.5" />
                      <FileSpreadsheet className="gba:w-4 gba:h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create Spreadsheet</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gba:gap-1.5 gba:text-muted-foreground hover:gba:text-amber-600 hover:gba:bg-amber-500/10"
                      onClick={onCreateNote}
                      data-testid={`${testId}-create-note`}
                    >
                      <Plus className="gba:w-3.5 gba:h-3.5" />
                      <StickyNote className="gba:w-4 gba:h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create Note</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gba:gap-1.5 gba:text-muted-foreground hover:gba:text-purple-600 hover:gba:bg-purple-500/10"
                      onClick={onCreateSlide}
                      data-testid={`${testId}-create-slide`}
                    >
                      <Plus className="gba:w-3.5 gba:h-3.5" />
                      <Presentation className="gba:w-4 gba:h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create Presentation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Search Results Dropdown - Glassmorphism */}
        {showResults && (
          <div
            className="gba:absolute gba:left-0 gba:right-0 gba:top-full gba:rounded-b-2xl gba:overflow-hidden gba:border gba:border-t-0 gba:border-border/30 gba:shadow-xl"
            style={{
              // eslint-disable-next-line newwork-local/no-hardcoded-colors
              backgroundColor: 'rgba(255, 255, 255, 0.97)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)'
            }}
          >
            {/* Content */}
            <div className="gba:relative">
              {isLoading ? (
                <div className="gba:px-4 gba:py-8 gba:text-center">
                  <div className="gba:inline-flex gba:items-center gba:gap-2 gba:text-muted-foreground">
                    <div className="gba:w-4 gba:h-4 gba:border-2 gba:border-border gba:border-t-primary gba:rounded-full gba:animate-spin" />
                    <span className="gba:text-sm">Searching...</span>
                  </div>
                </div>
              ) : limitedResults.length === 0 ? (
                <div className="gba:px-4 gba:py-8 gba:text-center">
                  <Search className="gba:w-6 gba:h-6 gba:text-muted-foreground/40 gba:mx-auto gba:mb-2" />
                  <p className="gba:text-sm gba:text-muted-foreground">No results for "{searchQuery}"</p>
                </div>
              ) : (
                <>
                  <div className="gba:max-h-72 gba:overflow-y-auto gba:overscroll-contain">
                    {groupedResults.map(group => {
                      const config = typeConfig[group.type]
                      const GroupIcon = config.icon

                      return (
                        <div key={group.type}>
                          {/* Group header */}
                          <div
                            className="gba:px-4 gba:py-2 gba:sticky gba:top-0 gba:border-b gba:border-border/20"
                            style={{
                              // eslint-disable-next-line newwork-local/no-hardcoded-colors
                              backgroundColor: 'rgba(248, 250, 252, 0.95)',
                              backdropFilter: 'blur(10px)',
                              WebkitBackdropFilter: 'blur(10px)'
                            }}
                          >
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <GroupIcon className={`gba:w-3.5 gba:h-3.5 ${config.color}`} />
                              <span className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                                {config.label}s
                              </span>
                              <span className="gba:ml-auto gba:text-xs gba:text-muted-foreground/60">
                                {group.items.length}
                              </span>
                            </div>
                          </div>

                          {/* Group items - clean design */}
                          {group.items.map(item => {
                            const itemConfig = typeConfig[item.type]
                            const Icon = itemConfig.icon
                            const currentFlatIndex = flatIndex++
                            const isSelected = currentFlatIndex === selectedIndex

                            return (
                              <div
                                key={`${item.type}-${item.id}`}
                                className="gba:px-4 gba:py-2.5 gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:transition-all gba:duration-150 gba:border-l-2"
                                style={{
                                  background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                  borderLeftColor: isSelected ? 'rgb(59, 130, 246)' : 'transparent'
                                }}
                                onClick={() => handleItemClick(item)}
                                onMouseEnter={() => setSelectedIndex(currentFlatIndex)}
                              >
                                {/* Icon */}
                                <div
                                  className={`gba:w-9 gba:h-9 gba:rounded-lg ${itemConfig.bg} gba:flex gba:items-center gba:justify-center gba:flex-shrink-0`}
                                >
                                  <Icon className={`gba:w-4 gba:h-4 ${itemConfig.color}`} />
                                </div>

                                {/* Content */}
                                <div className="gba:flex-1 gba:min-w-0">
                                  <h4 className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                                    <HighlightedText text={item.title || 'Untitled'} query={searchQuery} />
                                  </h4>
                                  <div className="gba:flex gba:items-center gba:gap-1.5 gba:mt-0.5">
                                    <Clock className="gba:w-3 gba:h-3 gba:text-muted-foreground/50" />
                                    <span className="gba:text-xs gba:text-muted-foreground">
                                      {formatRelativeTime(item.updatedAt)}
                                    </span>
                                    {item.isShared && (
                                      <>
                                        <span className="gba:text-muted-foreground/30">·</span>
                                        <span className="gba:text-xs gba:text-muted-foreground">Shared</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Presence indicator - shows who's currently in the document */}
                                {hasActiveUsers(item.type, item.id) && (
                                  <MiniPresence participants={getPresence(item.type, item.id)} />
                                )}

                                {/* Arrow */}
                                <ArrowRight
                                  className={`gba:w-4 gba:h-4 gba:transition-all ${isSelected ? 'gba:text-primary gba:translate-x-0.5' : 'gba:text-muted-foreground/30'}`}
                                />
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>

                  {/* Footer */}
                  <div
                    className="gba:px-4 gba:py-2.5 gba:border-t gba:border-border/20 gba:flex gba:items-center gba:justify-between"
                    style={{
                      // eslint-disable-next-line newwork-local/no-hardcoded-colors
                      backgroundColor: 'rgba(248, 250, 252, 0.95)'
                    }}
                  >
                    <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-muted-foreground/70">
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <kbd className="gba:px-1 gba:py-0.5 gba:rounded gba:bg-background gba:text-[10px] gba:border gba:border-border/50">
                          ↑↓
                        </kbd>
                        navigate
                      </span>
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <kbd className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-background gba:text-[10px] gba:border gba:border-border/50">
                          ↵
                        </kbd>
                        open
                      </span>
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <kbd className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-background gba:text-[10px] gba:border gba:border-border/50">
                          esc
                        </kbd>
                        close
                      </span>
                    </div>
                    <span className="gba:text-xs gba:text-muted-foreground">
                      {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Hint text - only show when not searching */}
        {!showResults && (
          <p className="gba:text-center gba:text-xs gba:text-muted-foreground gba:mt-3">
            Press <kbd className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:font-mono gba:text-[10px]">⌘K</kbd>{' '}
            to search or create something new
          </p>
        )}
      </div>
    </section>
  )
}

export default QuickActions
