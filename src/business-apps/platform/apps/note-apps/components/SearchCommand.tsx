/**
 * SearchCommand Component
 *
 * A command palette (Cmd+K) for quick actions and searching notes.
 * Inspired by modern note apps like Notion, Obsidian, and Linear.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  Input,
  Spinner,
  Badge,
  ScrollArea
} from '@newwork/nw-design-system'
import {
  Search,
  FileText,
  Plus,
  Pin,
  Archive,
  Trash2,
  Share2,
  Folder,
  Clock,
  Star,
  Hash,
  ArrowRight,
  Command,
  CornerDownLeft
} from 'lucide-react'
import type { NoteSummary, NoteColor } from '../types'
import { NoteApiService } from '../services/NoteApiService'

export interface SearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  currentUserId: string
  onCreateNote: (options?: { parentId?: string; color?: NoteColor }) => void
  onOpenNote: (id: string) => void
  onTogglePin?: (id: string) => void
  onArchiveNote?: (id: string) => void
  onShareNote?: (id: string) => void
  onDeleteNote?: (id: string) => void
  'data-testid'?: string
}

type CommandCategory = 'recent' | 'notes' | 'actions' | 'create'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  category: CommandCategory
  action: () => void
  keywords?: string[]
  badge?: string
}

export const SearchCommand: React.FC<SearchCommandProps> = ({
  open,
  onOpenChange,
  onCreateNote,
  onOpenNote,
  onTogglePin,
  onArchiveNote,
  onShareNote,
  onDeleteNote,
  'data-testid': testId = 'search-command'
}) => {
  // State
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<NoteSummary[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentNotes, setRecentNotes] = useState<NoteSummary[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load recent notes on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setSearchResults([])

      // Load recent notes
      NoteApiService.listNotes({ limit: 5, sortBy: 'updatedAt', sortOrder: 'DESC' })
        .then(result => setRecentNotes(result.items))
        .catch(() => setRecentNotes([]))

      // Focus input
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.length >= 2) {
      setIsSearching(true)
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await NoteApiService.listNotes({ search: query, limit: 10 })
          setSearchResults(result.items)
        } catch (e) {
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      }, 200)
    } else {
      setSearchResults([])
      setIsSearching(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query])

  // Build command items
  const commandItems: CommandItem[] = []

  // Create actions
  const createActions: CommandItem[] = [
    {
      id: 'create-note',
      label: 'New Note',
      description: 'Create a blank note',
      icon: <Plus className="gba:w-4 gba:h-4" />,
      category: 'create',
      action: () => {
        onCreateNote()
        onOpenChange(false)
      },
      keywords: ['new', 'create', 'blank']
    },
    {
      id: 'create-folder',
      label: 'New Folder',
      description: 'Create a new folder',
      icon: <Folder className="gba:w-4 gba:h-4" />,
      category: 'create',
      action: () => {
        onCreateNote()
        onOpenChange(false)
      },
      keywords: ['new', 'create', 'folder', 'directory']
    }
  ]

  // Quick actions
  const quickActions: CommandItem[] = [
    {
      id: 'action-pinned',
      label: 'Go to Pinned',
      description: 'View pinned notes',
      icon: <Pin className="gba:w-4 gba:h-4" />,
      category: 'actions',
      action: () => {
        // Navigate to pinned filter
        onOpenChange(false)
      },
      keywords: ['pinned', 'starred', 'favorites']
    },
    {
      id: 'action-archived',
      label: 'Go to Archive',
      description: 'View archived notes',
      icon: <Archive className="gba:w-4 gba:h-4" />,
      category: 'actions',
      action: () => {
        // Navigate to archive filter
        onOpenChange(false)
      },
      keywords: ['archive', 'archived', 'trash']
    },
    {
      id: 'action-shared',
      label: 'Go to Shared',
      description: 'View shared notes',
      icon: <Share2 className="gba:w-4 gba:h-4" />,
      category: 'actions',
      action: () => {
        // Navigate to shared filter
        onOpenChange(false)
      },
      keywords: ['shared', 'collaboration', 'team']
    }
  ]

  // Add recent notes (when no search query)
  if (query.length < 2) {
    // Add create actions
    commandItems.push(...createActions)

    // Add recent notes
    recentNotes.forEach(note => {
      commandItems.push({
        id: `recent-${note.id}`,
        label: note.title || 'Untitled',
        description: note.preview?.slice(0, 50),
        icon: note.icon ? <span>{note.icon}</span> : <FileText className="gba:w-4 gba:h-4" />,
        category: 'recent',
        action: () => {
          onOpenNote(note.id)
          onOpenChange(false)
        },
        badge: note.isPinned ? 'Pinned' : undefined
      })
    })

    // Add quick actions
    commandItems.push(...quickActions)
  } else {
    // Show search results
    searchResults.forEach(note => {
      commandItems.push({
        id: `search-${note.id}`,
        label: note.title || 'Untitled',
        description: note.preview?.slice(0, 50),
        icon: note.icon ? <span>{note.icon}</span> : <FileText className="gba:w-4 gba:h-4" />,
        category: 'notes',
        action: () => {
          onOpenNote(note.id)
          onOpenChange(false)
        },
        badge: note.isPinned ? 'Pinned' : note.isShared ? 'Shared' : undefined
      })
    })

    // Add create actions that match query
    const queryLower = query.toLowerCase()
    createActions.forEach(action => {
      const matches =
        action.label.toLowerCase().includes(queryLower) ||
        action.keywords?.some(k => k.includes(queryLower))
      if (matches) {
        commandItems.push(action)
      }
    })

    // Add matching quick actions
    quickActions.forEach(action => {
      const matches =
        action.label.toLowerCase().includes(queryLower) ||
        action.keywords?.some(k => k.includes(queryLower))
      if (matches) {
        commandItems.push(action)
      }
    })
  }

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % commandItems.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + commandItems.length) % commandItems.length)
          break
        case 'Enter':
          e.preventDefault()
          if (commandItems[selectedIndex]) {
            commandItems[selectedIndex].action()
          }
          break
        case 'Escape':
          e.preventDefault()
          onOpenChange(false)
          break
      }
    },
    [commandItems, selectedIndex, onOpenChange]
  )

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchResults.length, query])

  // Group items by category
  const groupedItems: Record<CommandCategory, CommandItem[]> = {
    recent: [],
    notes: [],
    actions: [],
    create: []
  }

  commandItems.forEach(item => {
    groupedItems[item.category].push(item)
  })

  const categoryLabels: Record<CommandCategory, string> = {
    recent: 'Recent',
    notes: 'Notes',
    actions: 'Quick Actions',
    create: 'Create'
  }

  // Calculate item index for selection
  let flatIndex = 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-w-xl gba:p-0 gba:overflow-hidden"
        data-testid={testId}
      >
        {/* Search Input */}
        <div className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:border-b">
          <Search className="gba:w-5 gba:h-5 gba:text-muted-foreground gba:flex-shrink-0" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search notes or type a command..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="gba:border-0 gba:bg-transparent gba:shadow-none gba:focus-visible:ring-0 gba:text-base gba:flex-1"
            data-testid={`${testId}-input`}
          />
          {isSearching && <Spinner size="sm" />}
          <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
            <kbd className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:font-mono">esc</kbd>
            <span>to close</span>
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="gba:max-h-80">
          <div className="gba:py-2">
            {commandItems.length === 0 ? (
              <div className="gba:py-8 gba:text-center gba:text-muted-foreground">
                {isSearching ? (
                  <p>Searching...</p>
                ) : query.length >= 2 ? (
                  <>
                    <Search className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-2 gba:opacity-50" />
                    <p>No results found for "{query}"</p>
                    <p className="gba:text-sm gba:mt-1">Try a different search term</p>
                  </>
                ) : (
                  <>
                    <FileText className="gba:w-8 gba:h-8 gba:mx-auto gba:mb-2 gba:opacity-50" />
                    <p>Start typing to search notes</p>
                  </>
                )}
              </div>
            ) : (
              (['create', 'recent', 'notes', 'actions'] as CommandCategory[]).map(category => {
                const items = groupedItems[category]
                if (items.length === 0) return null

                return (
                  <div key={category} className="gba:mb-2">
                    <div className="gba:px-4 gba:py-1.5 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider">
                      {categoryLabels[category]}
                    </div>
                    {items.map(item => {
                      const itemIndex = flatIndex++
                      const isSelected = itemIndex === selectedIndex

                      return (
                        <button
                          key={item.id}
                          className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-2.5 gba:text-left gba:transition-colors ${
                            isSelected
                              ? 'gba:bg-primary/10 gba:text-primary'
                              : 'hover:gba:bg-muted'
                          }`}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          data-testid={`${testId}-item-${item.id}`}
                        >
                          <span
                            className={`gba:flex-shrink-0 ${
                              isSelected ? 'gba:text-primary' : 'gba:text-muted-foreground'
                            }`}
                          >
                            {item.icon}
                          </span>
                          <div className="gba:flex-1 gba:min-w-0">
                            <p className="gba:font-medium gba:truncate">{item.label}</p>
                            {item.description && (
                              <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
                                {item.description}
                              </p>
                            )}
                          </div>
                          {item.badge && (
                            <Badge variant="secondary" className="gba:flex-shrink-0">
                              {item.badge}
                            </Badge>
                          )}
                          {isSelected && (
                            <CornerDownLeft className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="gba:border-t gba:px-4 gba:py-2 gba:bg-muted/30">
          <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
            <div className="gba:flex gba:items-center gba:gap-3">
              <span className="gba:flex gba:items-center gba:gap-1">
                <kbd className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:font-mono">↑</kbd>
                <kbd className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:font-mono">↓</kbd>
                <span>to navigate</span>
              </span>
              <span className="gba:flex gba:items-center gba:gap-1">
                <kbd className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:font-mono">↵</kbd>
                <span>to select</span>
              </span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-1">
              <Command className="gba:w-3 gba:h-3" />
              <span>K to open</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SearchCommand
