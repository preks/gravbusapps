/**
 * EmailList - Displays a list of email messages with bulk operations.
 * Supports selection, star toggle, read/unread indicators, and multi-select.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import {
  Input,
  Spinner,
  Button,
  Checkbox,
  Badge,
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuSeparator,
  ContextMenuItem,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Search,
  Star,
  Paperclip,
  AlertCircle,
  Trash2,
  Archive,
  MailOpen,
  Mail,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Plus,
  X,
  Reply,
  ReplyAll,
  Forward,
  Check
} from 'lucide-react'
import { EmailApiService } from '../services/EmailApiService'
import { useLabelSuggestions } from '../hooks/useLabelSuggestions'
import {
  normalizeLabelName,
  normalizeLabelObjects,
  LABEL_COLOR_PALETTE,
  getLabelChipClassName
} from '../utils/labelUtils'
import { runOptimisticLabelMutation } from '../utils/runOptimisticLabelMutation'
import type { EmailMessageSummary, AddLabelInput, EmailLabel } from '../types'
import translations from '../_i18n'

interface EmailListProps {
  messages: EmailMessageSummary[]
  selectedMessageId: string | null
  isLoading: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
  total?: number
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedLabels?: string[]
  onLabelsChange?: (labels: string[]) => void
  onSelectMessage: (id: string) => void
  onToggleStar: (id: string) => void
  onReply?: (messageId: string) => void
  onReplyAll?: (messageId: string) => void
  onForward?: (messageId: string) => void
  onToggleRead?: (messageId: string, isRead: boolean) => void
  onArchive?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onRefresh: () => void
  onMessageLabelsUpdated?: (messageId: string, labels?: EmailLabel[]) => Promise<void> | void
  onLoadMore?: () => void
  folderName: string
  'data-testid'?: string
}

function formatEmailDate(dateString: string, t: (key: string) => string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  if (diffDays === 1) return t('time-yesterday')
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short' })
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getDisplayName(from: { name?: string; address: string }): string {
  return from.name || from.address.split('@')[0]
}

export const EmailList: React.FC<EmailListProps> = ({
  messages,
  selectedMessageId,
  isLoading,
  isLoadingMore = false,
  hasMore = false,
  total = 0,
  searchQuery,
  onSearchChange,
  selectedLabels = [],
  onLabelsChange,
  onSelectMessage,
  onToggleStar,
  onReply,
  onReplyAll,
  onForward,
  onToggleRead,
  onArchive,
  onDelete,
  onRefresh,
  onMessageLabelsUpdated,
  onLoadMore,
  folderName,
  'data-testid': testId = 'email-list'
}) => {
  const { t } = useTranslation(translations)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkAction, setIsBulkAction] = useState(false)
  const [labelSearchQuery, setLabelSearchQuery] = useState('')
  const [isLabelSearchOpen, setIsLabelSearchOpen] = useState(false)
  const labelSearchInputRef = useRef<HTMLInputElement>(null)
  const labelFilterRowRef = useRef<HTMLDivElement>(null)
  const isLabelRowDraggingRef = useRef(false)
  const labelRowStartXRef = useRef(0)
  const labelRowStartScrollLeftRef = useRef(0)

  useEffect(() => {
    if (!isLabelSearchOpen) return
    labelSearchInputRef.current?.focus()
  }, [isLabelSearchOpen])

  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(messages.map(m => m.id)))
    }
  }, [messages, selectedIds.size])

  const handleBulkMarkRead = useCallback(
    async (isRead: boolean) => {
      if (selectedIds.size === 0) return
      setIsBulkAction(true)
      try {
        await EmailApiService.batchMarkRead(Array.from(selectedIds), isRead)
        toast.success(
          t('list-toast-marked', {
            count: selectedIds.size,
            state: isRead ? t('list-state-read') : t('list-state-unread')
          })
        )
        setSelectedIds(new Set())
        onRefresh()
      } catch {
        toast.error(t('list-toast-update-failed'))
      } finally {
        setIsBulkAction(false)
      }
    },
    [selectedIds, onRefresh, t]
  )

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    setIsBulkAction(true)
    try {
      for (const id of selectedIds) {
        await EmailApiService.deleteMessage(id)
      }
      toast.success(t('list-toast-deleted', { count: selectedIds.size }))
      setSelectedIds(new Set())
      onRefresh()
    } catch {
      toast.error(t('list-toast-delete-failed'))
    } finally {
      setIsBulkAction(false)
    }
  }, [selectedIds, onRefresh, t])

  const hasBulkSelection = selectedIds.size > 0
  const remaining = Math.max(total - messages.length, 0)
  const hasActiveLabelFilter = selectedLabels.length > 0
  const availableLabels = useMemo(() => {
    const seen = new Set<string>()
    const ordered: string[] = []

    messages.forEach(message => {
      ;(message.labels || []).forEach(label => {
        const normalizedName = normalizeLabelName(label.name)
        if (!normalizedName || seen.has(normalizedName)) return
        seen.add(normalizedName)
        ordered.push(normalizedName)
      })
    })

    return ordered
  }, [messages])
  const labelColorByName = useMemo(() => {
    const map = new Map<string, string | null>()
    messages.forEach(message => {
      ;(message.labels || []).forEach(label => {
        const normalizedName = normalizeLabelName(label.name)
        if (!normalizedName) return
        map.set(normalizedName, label.color || null)
      })
    })

    // Prefer the currently selected message labels so inline edits
    // are reflected immediately in the filter chip colors.
    const selectedMessage = messages.find(message => message.id === selectedMessageId)
    ;(selectedMessage?.labels || []).forEach(label => {
      const normalizedName = normalizeLabelName(label.name)
      if (!normalizedName) return
      map.set(normalizedName, label.color || null)
    })
    return map
  }, [messages, selectedMessageId])
  const visibleFilterLabels = useMemo(() => {
    const merged = new Set<string>()
    const labels: string[] = []

    selectedLabels.forEach(label => {
      const normalized = normalizeLabelName(label)
      if (!normalized || merged.has(normalized)) return
      merged.add(normalized)
      labels.push(normalized)
    })

    availableLabels.forEach(label => {
      if (merged.has(label)) return
      merged.add(label)
      labels.push(label)
    })

    return labels
  }, [selectedLabels, availableLabels])
  const filteredVisibleLabels = useMemo(() => {
    const query = normalizeLabelName(labelSearchQuery)
    if (!query) return visibleFilterLabels
    return visibleFilterLabels.filter(label => label.includes(query))
  }, [labelSearchQuery, visibleFilterLabels])

  const handleLoadMore = useCallback(() => {
    if (onLoadMore && hasMore && !isLoadingMore) {
      onLoadMore()
    }
  }, [onLoadMore, hasMore, isLoadingMore])

  const handleListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!onLoadMore || !hasMore || isLoadingMore || isLoading) return
      const el = e.currentTarget
      // Trigger slightly before bottom to feel seamless
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 140
      if (nearBottom) onLoadMore()
    },
    [onLoadMore, hasMore, isLoadingMore, isLoading]
  )

  const toggleFilterLabel = useCallback(
    (label: string) => {
      if (!onLabelsChange) return
      if (selectedLabels.includes(label)) {
        onLabelsChange(selectedLabels.filter(selected => selected !== label))
        return
      }
      onLabelsChange([...selectedLabels, label])
    },
    [onLabelsChange, selectedLabels]
  )
  const clearFilterLabels = useCallback(() => {
    onLabelsChange?.([])
  }, [onLabelsChange])

  const handleLabelRowMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !labelFilterRowRef.current) return
    isLabelRowDraggingRef.current = true
    labelRowStartXRef.current = event.clientX
    labelRowStartScrollLeftRef.current = labelFilterRowRef.current.scrollLeft
  }, [])

  const handleLabelRowMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isLabelRowDraggingRef.current || !labelFilterRowRef.current) return
    const deltaX = event.clientX - labelRowStartXRef.current
    labelFilterRowRef.current.scrollLeft = labelRowStartScrollLeftRef.current - deltaX
    event.preventDefault()
  }, [])

  const stopLabelRowDragging = useCallback(() => {
    isLabelRowDraggingRef.current = false
  }, [])

  const syncAfterLabelMutation = useCallback(
    async (messageId: string, labels?: EmailLabel[]) => {
      if (onMessageLabelsUpdated) {
        await onMessageLabelsUpdated(messageId, labels)
      } else {
        onRefresh()
      }
    },
    [onMessageLabelsUpdated, onRefresh]
  )

  const handleAddLabelsFromContextMenu = useCallback(
    async (messageId: string, labels: AddLabelInput[]): Promise<EmailLabel[] | null> => {
      try {
        const result = await EmailApiService.addMessageLabels(messageId, labels)
        toast.success(t('list-context-labels-add-success'))
        await syncAfterLabelMutation(messageId, result.labels || [])
        return normalizeLabelObjects(result.labels || [])
      } catch {
        toast.error(t('list-context-labels-add-failed'))
        return null
      }
    },
    [syncAfterLabelMutation, t]
  )

  const handleRemoveLabelFromContextMenu = useCallback(
    async (messageId: string, label: string): Promise<EmailLabel[] | null> => {
      try {
        const result = await EmailApiService.removeMessageLabels(messageId, [label])
        toast.success(t('list-context-labels-remove-success'))
        await syncAfterLabelMutation(messageId, result.labels || [])
        return normalizeLabelObjects(result.labels || [])
      } catch {
        toast.error(t('list-context-labels-remove-failed'))
        return null
      }
    },
    [syncAfterLabelMutation, t]
  )

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:border-r gba:w-96 gba:flex-shrink-0" data-testid={testId}>
      {/* Header */}
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
              // Prevent input blur from firing before toggle click.
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

      {/* Bulk Actions Bar */}
      {hasBulkSelection && (
        <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:border-b gba:bg-accent/10">
          <button onClick={selectAll} className="gba:text-xs gba:text-primary gba:font-medium hover:gba:underline">
            {selectedIds.size === messages.length ? t('list-deselect-all') : t('list-select-all')}
          </button>
          <span className="gba:text-xs gba:text-muted-foreground">
            {t('list-selected-count', { count: selectedIds.size })}
          </span>
          <div className="gba:flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBulkMarkRead(true)}
            disabled={isBulkAction}
            className="gba:h-7 gba:text-xs"
            data-testid={`${testId}-bulk-read`}
          >
            <MailOpen className="gba:w-3 gba:h-3 gba:mr-1" />
            {t('list-read')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBulkMarkRead(false)}
            disabled={isBulkAction}
            className="gba:h-7 gba:text-xs"
            data-testid={`${testId}-bulk-unread`}
          >
            <Mail className="gba:w-3 gba:h-3 gba:mr-1" />
            {t('list-unread')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isBulkAction}
            className="gba:h-7 gba:text-xs gba:text-destructive"
            data-testid={`${testId}-bulk-delete`}
          >
            <Trash2 className="gba:w-3 gba:h-3 gba:mr-1" />
            {t('menu-delete')}
          </Button>
        </div>
      )}

      {/* Message list */}
      <div className="gba:flex-1 gba:overflow-y-auto" onScroll={handleListScroll}>
        {isLoading && (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
            <Spinner size="lg" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16 gba:px-4">
            <AlertCircle className="gba:w-10 gba:h-10 gba:text-muted-foreground gba:mb-3" />
            <p className="gba:text-muted-foreground gba:text-sm">{t('list-no-emails')}</p>
          </div>
        )}

        {!isLoading &&
          messages.map(msg => (
            <EmailListItem
              key={msg.id}
              message={msg}
              isSelected={selectedMessageId === msg.id}
              isChecked={selectedIds.has(msg.id)}
              onSelect={() => onSelectMessage(msg.id)}
              onToggleStar={() => onToggleStar(msg.id)}
              onToggleCheck={e => toggleSelect(msg.id, e)}
              onReply={() => onReply?.(msg.id)}
              onReplyAll={() => onReplyAll?.(msg.id)}
              onForward={() => onForward?.(msg.id)}
              onToggleRead={() => onToggleRead?.(msg.id, !msg.isRead)}
              onArchive={() => onArchive?.(msg.id)}
              onDelete={() => onDelete?.(msg.id)}
              onAddLabels={labels => handleAddLabelsFromContextMenu(msg.id, labels)}
              onRemoveLabel={label => handleRemoveLabelFromContextMenu(msg.id, label)}
              testId={`${testId}-item-${msg.id}`}
              t={t}
              formatDate={date => formatEmailDate(date, t)}
            />
          ))}

        {/* Load more button */}
        {!isLoading && messages.length > 0 && hasMore && (
          <div className="gba:py-3 gba:px-4 gba:flex gba:flex-col gba:items-center gba:gap-1.5">
            {isLoadingMore ? (
              <div className="gba:flex gba:items-center gba:gap-2 gba:py-1">
                <Spinner size="sm" />
                <span className="gba:text-xs gba:text-muted-foreground">{t('list-loading-more')}</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gba:w-full gba:text-xs"
                onClick={handleLoadMore}
                data-testid={`${testId}-load-more`}
              >
                {remaining > 0 ? t('list-load-more-with-remaining', { remaining }) : t('list-load-more')}
              </Button>
            )}
          </div>
        )}

        {/* End of list indicator */}
        {!isLoading && messages.length > 0 && !hasMore && total > 50 && (
          <div className="gba:py-3 gba:text-center">
            <span className="gba:text-xs gba:text-muted-foreground">{t('list-all-loaded')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

/** Single email list item */
function EmailListItem({
  message,
  isSelected,
  isChecked,
  onSelect,
  onToggleStar,
  onToggleCheck,
  onReply,
  onReplyAll,
  onForward,
  onToggleRead,
  onArchive,
  onDelete,
  onAddLabels,
  onRemoveLabel,
  testId,
  t,
  formatDate
}: {
  message: EmailMessageSummary
  isSelected: boolean
  isChecked: boolean
  onSelect: () => void
  onToggleStar: () => void
  onToggleCheck: (e: React.MouseEvent) => void
  onReply?: () => void
  onReplyAll?: () => void
  onForward?: () => void
  onToggleRead?: () => void
  onArchive?: () => void
  onDelete?: () => void
  onAddLabels: (labels: AddLabelInput[]) => Promise<EmailLabel[] | null>
  onRemoveLabel: (label: string) => Promise<EmailLabel[] | null>
  testId: string
  t: (key: string, vars?: Record<string, string | number>) => string
  formatDate: (dateString: string) => string
}) {
  const [isLabelsExpanded, setIsLabelsExpanded] = useState(false)
  const [labelInput, setLabelInput] = useState('')
  const [selectedLabelColor, setSelectedLabelColor] = useState<string | null>(null)
  const [editingLabelOriginalName, setEditingLabelOriginalName] = useState<string | null>(null)
  const [isMutatingLabels, setIsMutatingLabels] = useState(false)
  const [localLabels, setLocalLabels] = useState<EmailLabel[]>(normalizeLabelObjects(message.labels || []))
  const [suggestionRefreshTick, setSuggestionRefreshTick] = useState(0)
  const [activeLabelSuggestionIndex, setActiveLabelSuggestionIndex] = useState(-1)

  useEffect(() => {
    // Keep chips in sync with backend updates without clearing draft input/color.
    setLocalLabels(normalizeLabelObjects(message.labels || []))
  }, [message.labels])

  useEffect(() => {
    // Reset draft state only when switching to a different message row.
    setLabelInput('')
    setSelectedLabelColor(null)
    setEditingLabelOriginalName(null)
    setIsLabelsExpanded(false)
    setActiveLabelSuggestionIndex(-1)
  }, [message.id])

  useEffect(() => {
    // Closing the labels panel clears temporary draft state.
    if (isLabelsExpanded) return
    setLabelInput('')
    setSelectedLabelColor(null)
    setEditingLabelOriginalName(null)
    setActiveLabelSuggestionIndex(-1)
  }, [isLabelsExpanded])

  useEffect(() => {
    setActiveLabelSuggestionIndex(-1)
  }, [labelInput, isLabelsExpanded])

  const existingLabelNames = useMemo(() => localLabels.map(label => label.name), [localLabels])

  const { suggestions: labelSuggestions, isLoading: isLoadingSuggestions } = useLabelSuggestions({
    query: labelInput,
    existingLabels: existingLabelNames,
    refreshKey: suggestionRefreshTick
  })

  const addLabelsFromMenu = useCallback(
    async (labelsToAdd: AddLabelInput[]) => {
      if (isMutatingLabels) return

      const previousName = editingLabelOriginalName ? normalizeLabelName(editingLabelOriginalName) : null
      // Existing labels are color-edit only for now; name changes are disabled.
      const requestedName = previousName ?? normalizeLabelName(labelsToAdd[0]?.name || '')
      if (!requestedName) return
      const color =
        typeof labelsToAdd[0]?.color === 'string' && labelsToAdd[0].color?.trim()
          ? labelsToAdd[0].color.trim()
          : undefined
      const payload: AddLabelInput = color ? { name: requestedName, color } : { name: requestedName }

      setLabelInput('')
      await runOptimisticLabelMutation({
        previousLabels: localLabels,
        setLocalLabels,
        setIsMutating: setIsMutatingLabels,
        getOptimisticLabels: existing => {
          const merged = previousName ? existing.filter(label => label.name !== previousName) : [...existing]
          const idx = merged.findIndex(label => label.name === requestedName)
          const nextLabel: EmailLabel = {
            id: idx >= 0 ? merged[idx].id : '',
            name: requestedName,
            color: payload.color || null
          }
          if (idx >= 0) {
            merged[idx] = nextLabel
          } else {
            merged.push(nextLabel)
          }
          return normalizeLabelObjects(merged)
        },
        mutate: async () => {
          if (previousName && previousName !== requestedName) {
            const removed = await onRemoveLabel(previousName)
            if (!removed) throw new Error('Failed to rename label')
          }

          const result = await onAddLabels([payload])
          if (!result) throw new Error('Failed to add labels')
          return normalizeLabelObjects(result)
        },
        onSuccess: () => {
          setSelectedLabelColor(null)
          setEditingLabelOriginalName(null)
          setSuggestionRefreshTick(prev => prev + 1)
        }
      })
    },
    [isMutatingLabels, localLabels, editingLabelOriginalName, onAddLabels, onRemoveLabel]
  )

  const handleAddFromMenu = useCallback(async () => {
    const name = normalizeLabelName(labelInput)
    await addLabelsFromMenu([{ name, ...(selectedLabelColor ? { color: selectedLabelColor } : {}) }])
  }, [addLabelsFromMenu, labelInput, selectedLabelColor])

  const handleAddSuggestionFromMenu = useCallback(
    async (suggestionName: string) => {
      await addLabelsFromMenu([{ name: suggestionName, ...(selectedLabelColor ? { color: selectedLabelColor } : {}) }])
    },
    [addLabelsFromMenu, selectedLabelColor]
  )

  const handleStartEditFromMenu = useCallback((label: EmailLabel) => {
    setEditingLabelOriginalName(label.name)
    setLabelInput(label.name)
    setSelectedLabelColor(label.color)
    setIsLabelsExpanded(true)
  }, [])

  const handleRemoveFromMenu = useCallback(
    async (label: string) => {
      if (isMutatingLabels) return
      const normalizedName = normalizeLabelName(label)
      if (!normalizedName) return

      await runOptimisticLabelMutation({
        previousLabels: localLabels,
        setLocalLabels,
        setIsMutating: setIsMutatingLabels,
        getOptimisticLabels: existing => existing.filter(current => current.name !== normalizedName),
        mutate: async () => {
          const result = await onRemoveLabel(normalizedName)
          if (!result) throw new Error('Failed to remove label')
          return normalizeLabelObjects(result)
        },
        onSuccess: () => {
          setSuggestionRefreshTick(prev => prev + 1)
        }
      })
    },
    [isMutatingLabels, localLabels, onRemoveLabel]
  )

  const shouldShowLabelSuggestions = !editingLabelOriginalName && normalizeLabelName(labelInput).length > 0
  let labelSuggestionsContent: React.ReactNode = null

  if (isLoadingSuggestions) {
    labelSuggestionsContent = (
      <p className="gba:text-xs gba:text-muted-foreground">{t('list-context-labels-suggestions-loading')}</p>
    )
  } else if (labelSuggestions.length === 0) {
    labelSuggestionsContent = (
      <p className="gba:text-xs gba:text-muted-foreground">{t('list-context-labels-suggestions-empty')}</p>
    )
  } else {
    labelSuggestionsContent = (
      <>
        {labelSuggestions.map((suggestion, index) => (
          <button
            key={`${message.id}-menu-suggestion-${suggestion.id}`}
            type="button"
            className={`gba:w-full gba:text-left gba:px-2 gba:py-1.5 gba:rounded gba:text-xs ${
              activeLabelSuggestionIndex === index ? 'gba:bg-muted/60' : 'hover:gba:bg-muted/50'
            }`}
            onClick={() => void handleAddSuggestionFromMenu(suggestion.name)}
            onMouseEnter={() => setActiveLabelSuggestionIndex(index)}
            data-testid={`${testId}-context-label-suggestion-${suggestion.id}`}
          >
            {suggestion.name}
          </button>
        ))}
      </>
    )
  }

  const handleContextMenuOpenChange = useCallback((open: boolean) => {
    if (!open) setIsLabelsExpanded(false)
  }, [])

  return (
    <ContextMenu onOpenChange={handleContextMenuOpenChange}>
      <ContextMenuTrigger asChild>
        <div
          onClick={onSelect}
          className={`gba:flex gba:gap-3 gba:px-4 gba:py-3 gba:cursor-pointer gba:border-b gba:transition-colors ${
            isSelected ? 'gba:bg-primary/5 gba:border-l-2 gba:border-l-primary' : 'hover:gba:bg-muted/30'
          } ${!message.isRead ? 'gba:bg-accent/5' : ''}`}
          data-testid={testId}
        >
          {/* Checkbox for bulk select */}
          <div onClick={onToggleCheck} className="gba:mt-1 gba:flex-shrink-0 gba:cursor-pointer">
            <Checkbox checked={isChecked} data-testid={`${testId}-checkbox`} />
          </div>

          {/* Star */}
          <button
            onClick={e => {
              e.stopPropagation()
              onToggleStar()
            }}
            className={`gba:mt-1 gba:flex-shrink-0 ${
              message.isStarred ? 'gba:text-warning' : 'gba:text-muted-foreground hover:gba:text-foreground'
            }`}
          >
            <Star className={`gba:w-4 gba:h-4 ${message.isStarred ? 'gba:fill-current' : ''}`} />
          </button>

          {/* Content */}
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-0.5">
              <span
                className={`gba:text-sm gba:truncate ${
                  !message.isRead ? 'gba:font-semibold gba:text-foreground' : 'gba:text-foreground'
                }`}
              >
                {getDisplayName(message.fromAddress)}
              </span>
              <span className="gba:text-xs gba:text-muted-foreground gba:flex-shrink-0 gba:ml-2">
                {formatDate(message.date)}
              </span>
            </div>

            <div className="gba:flex gba:items-center gba:gap-1.5 gba:mb-0.5">
              <p
                className={`gba:text-sm gba:truncate gba:flex-1 ${
                  !message.isRead ? 'gba:font-medium gba:text-foreground' : 'gba:text-foreground'
                }`}
              >
                {message.subject || t('list-no-subject')}
              </p>
              {(message.threadMessageCount ?? 0) > 1 && (
                <span
                  className="gba:inline-flex gba:items-center gba:gap-0.5 gba:px-1.5 gba:py-0.5 gba:rounded-full gba:bg-primary/10 gba:text-primary gba:flex-shrink-0"
                  title={t('list-thread-tooltip', { count: message.threadMessageCount ?? 0 })}
                >
                  <MessageSquare className="gba:w-3 gba:h-3" />
                  <span className="gba:text-[10px] gba:font-semibold gba:leading-none">
                    {message.threadMessageCount}
                  </span>
                </span>
              )}
            </div>

            <div className="gba:flex gba:items-center gba:gap-2">
              <p className="gba:text-xs gba:text-muted-foreground gba:truncate gba:flex-1">{message.snippet}</p>
              {message.hasAttachments && (
                <Paperclip className="gba:w-3 gba:h-3 gba:text-muted-foreground gba:flex-shrink-0" />
              )}
              {message.importance === 'high' && (
                <AlertCircle className="gba:w-3 gba:h-3 gba:text-destructive gba:flex-shrink-0" />
              )}
            </div>
            {!!message.labels?.length && (
              <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-1">
                {message.labels.slice(0, 3).map(label => (
                  <Badge
                    key={`${message.id}-label-${label.id || label.name}`}
                    variant="secondary"
                    className={`gba:text-[10px] gba:h-5 ${getLabelChipClassName(label.color)}`}
                    data-testid={`${testId}-label-${label.name}`}
                  >
                    {label.name}
                  </Badge>
                ))}
                {message.labels.length > 3 && (
                  <Badge variant="outline" className="gba:text-[10px] gba:h-5">
                    +{message.labels.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Unread indicator */}
          {!message.isRead && (
            <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary gba:flex-shrink-0 gba:mt-2" />
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="gba:w-48" data-testid={`${testId}-context-menu`}>
        <ContextMenuItem onSelect={() => onReply?.()} disabled={!onReply} data-testid={`${testId}-context-reply`}>
          <Reply className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
          {t('list-context-reply')}
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => onReplyAll?.()}
          disabled={!onReplyAll}
          data-testid={`${testId}-context-reply-all`}
        >
          <ReplyAll className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
          {t('list-context-reply-all')}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onForward?.()} disabled={!onForward} data-testid={`${testId}-context-forward`}>
          <Forward className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
          {t('list-context-forward')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => onToggleRead?.()}
          disabled={!onToggleRead}
          data-testid={`${testId}-context-toggle-read`}
        >
          {message.isRead ? (
            <Mail className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
          ) : (
            <MailOpen className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
          )}
          {message.isRead ? t('list-context-mark-unread') : t('list-context-mark-read')}
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={event => {
            event.preventDefault()
            setIsLabelsExpanded(prev => !prev)
          }}
          data-testid={`${testId}-context-labels`}
        >
          {isLabelsExpanded ? (
            <ChevronDown className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
          ) : (
            <ChevronRight className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
          )}
          {t('list-context-labels')}
        </ContextMenuItem>

        {isLabelsExpanded && (
          <>
            <ContextMenuSeparator />
            <div className="gba:px-1.5 gba:py-1.5 gba:space-y-1.5">
              <div className="gba:flex gba:w-full gba:items-center gba:gap-1">
                <Input
                  value={labelInput}
                  onChange={event => setLabelInput(event.target.value)}
                  readOnly={!!editingLabelOriginalName}
                  onKeyDown={event => {
                    if (event.key === 'ArrowDown' && shouldShowLabelSuggestions && labelSuggestions.length > 0) {
                      event.preventDefault()
                      setActiveLabelSuggestionIndex(prev => Math.min(prev + 1, labelSuggestions.length - 1))
                      return
                    }
                    if (event.key === 'ArrowUp' && shouldShowLabelSuggestions && labelSuggestions.length > 0) {
                      event.preventDefault()
                      setActiveLabelSuggestionIndex(prev => Math.max(prev - 1, -1))
                      return
                    }
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      if (activeLabelSuggestionIndex >= 0 && labelSuggestions[activeLabelSuggestionIndex]) {
                        void handleAddSuggestionFromMenu(labelSuggestions[activeLabelSuggestionIndex].name)
                        return
                      }
                      void handleAddFromMenu()
                    }
                  }}
                  placeholder={t('list-context-labels-placeholder')}
                  className="gba:h-6 gba:min-w-0 gba:flex-1 gba:text-xs"
                  data-testid={`${testId}-context-labels-input`}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gba:h-6 gba:w-6 gba:px-0"
                  onClick={() => void handleAddFromMenu()}
                  disabled={isMutatingLabels}
                  data-testid={`${testId}-context-labels-add`}
                >
                  {editingLabelOriginalName ? (
                    <Check className="gba:w-3.5 gba:h-3.5" />
                  ) : (
                    <Plus className="gba:w-3.5 gba:h-3.5" />
                  )}
                </Button>
              </div>
              {shouldShowLabelSuggestions && (
                <div className="gba:border gba:rounded-md gba:p-1.5 gba:space-y-1">{labelSuggestionsContent}</div>
              )}

              {localLabels.length === 0 ? (
                <p className="gba:text-xs gba:text-muted-foreground gba:px-1">{t('list-context-labels-empty')}</p>
              ) : (
                <div className="gba:max-h-40 gba:overflow-auto gba:space-y-1">
                  {localLabels.map(label => (
                    <div
                      key={`${message.id}-menu-label-${label.id || label.name}`}
                      className="gba:flex gba:w-full gba:items-center gba:gap-1"
                    >
                      <button
                        type="button"
                        className="gba:flex-1 gba:inline-flex"
                        onClick={() => handleStartEditFromMenu(label)}
                        disabled={isMutatingLabels}
                        data-testid={`${testId}-context-label-edit-${label.name}`}
                      >
                        <Badge
                          variant="secondary"
                          className={`gba:text-[10px] gba:h-6 gba:w-full gba:justify-start ${getLabelChipClassName(label.color)}`}
                        >
                          {label.name}
                        </Badge>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-6 gba:w-6"
                        onClick={() => void handleRemoveFromMenu(label.name)}
                        disabled={isMutatingLabels}
                        data-testid={`${testId}-context-label-remove-${label.name}`}
                      >
                        <X className="gba:w-3 gba:h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="gba:space-y-0.5">
                <p className="gba:m-0 gba:text-xs gba:leading-none gba:text-muted-foreground">
                  {t('list-context-labels-color-title')}
                </p>
                <div className="gba:grid gba:w-fit gba:grid-cols-4 gba:gap-x-5 gba:gap-y-1">
                  {LABEL_COLOR_PALETTE.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      className={`gba:h-5 gba:w-5 gba:rounded-sm gba:border ${option.swatchClassName} ${
                        selectedLabelColor === option.hex ? 'gba:ring-2 gba:ring-primary-ring gba:ring-offset-1' : ''
                      }`}
                      onClick={() => setSelectedLabelColor(prev => (prev === option.hex ? null : option.hex))}
                      data-testid={`${testId}-context-label-color-${option.id}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => onArchive?.()} disabled={!onArchive} data-testid={`${testId}-context-archive`}>
          <Archive className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
          {t('list-context-archive')}
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => onDelete?.()}
          disabled={!onDelete}
          className="gba:text-destructive"
          data-testid={`${testId}-context-delete`}
        >
          <Trash2 className="gba:w-3.5 gba:h-3.5 gba:mr-2" />
          {t('list-context-delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
