/**
 * EmailList - Displays a list of email messages with bulk operations.
 * Supports selection, star toggle, read/unread indicators, and multi-select.
 */

import React, { useState, useCallback, useEffect } from 'react'
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
  Forward
} from 'lucide-react'
import { EmailApiService } from '../services/EmailApiService'
import { useLabelSuggestions } from '../hooks/useLabelSuggestions'
import { normalizeLabels } from '../utils/labelUtils'
import { runOptimisticLabelMutation } from '../utils/runOptimisticLabelMutation'
import type { EmailMessageSummary } from '../types'
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
  onMessageLabelsUpdated?: (messageId: string, labels?: string[]) => Promise<void> | void
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
  const [labelsInput, setLabelsInput] = useState(selectedLabels.join(', '))

  useEffect(() => {
    setLabelsInput(selectedLabels.join(', '))
  }, [selectedLabels])

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

  const applyLabelFilter = useCallback(() => {
    if (!onLabelsChange) return
    onLabelsChange(normalizeLabels(labelsInput.split(',')))
  }, [onLabelsChange, labelsInput])

  const clearLabelFilter = useCallback(() => {
    setLabelsInput('')
    onLabelsChange?.([])
  }, [onLabelsChange])

  const syncAfterLabelMutation = useCallback(
    async (messageId: string, labels?: string[]) => {
      if (onMessageLabelsUpdated) {
        await onMessageLabelsUpdated(messageId, labels)
      } else {
        onRefresh()
      }
    },
    [onMessageLabelsUpdated, onRefresh]
  )

  const handleAddLabelsFromContextMenu = useCallback(
    async (messageId: string, labels: string[]): Promise<string[] | null> => {
      try {
        const result = await EmailApiService.addMessageLabels(messageId, labels)
        toast.success(t('list-context-labels-add-success'))
        await syncAfterLabelMutation(messageId, result.labels || [])
        return normalizeLabels(result.labels || [])
      } catch {
        toast.error(t('list-context-labels-add-failed'))
        return null
      }
    },
    [syncAfterLabelMutation, t]
  )

  const handleRemoveLabelFromContextMenu = useCallback(
    async (messageId: string, label: string): Promise<string[] | null> => {
      try {
        const result = await EmailApiService.removeMessageLabels(messageId, [label])
        toast.success(t('list-context-labels-remove-success'))
        await syncAfterLabelMutation(messageId, result.labels || [])
        return normalizeLabels(result.labels || [])
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
          <Input
            placeholder={t('list-label-filter-placeholder')}
            value={labelsInput}
            onChange={e => setLabelsInput(e.target.value)}
            className="gba:h-8"
            data-testid={`${testId}-label-filter-input`}
          />
          <Button variant="outline" size="sm" onClick={applyLabelFilter} data-testid={`${testId}-label-filter-apply`}>
            {t('list-label-filter-apply')}
          </Button>
          {hasActiveLabelFilter && (
            <Button variant="ghost" size="sm" onClick={clearLabelFilter} data-testid={`${testId}-label-filter-clear`}>
              {t('list-label-filter-clear')}
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
  onAddLabels: (labels: string[]) => Promise<string[] | null>
  onRemoveLabel: (label: string) => Promise<string[] | null>
  testId: string
  t: (key: string, vars?: Record<string, string | number>) => string
  formatDate: (dateString: string) => string
}) {
  const [isLabelsExpanded, setIsLabelsExpanded] = useState(false)
  const [labelInput, setLabelInput] = useState('')
  const [isMutatingLabels, setIsMutatingLabels] = useState(false)
  const [localLabels, setLocalLabels] = useState<string[]>(normalizeLabels(message.labels || []))
  const [suggestionRefreshTick, setSuggestionRefreshTick] = useState(0)

  useEffect(() => {
    setLocalLabels(normalizeLabels(message.labels || []))
    setLabelInput('')
  }, [message.id, message.labels])

  const { suggestions: labelSuggestions, isLoading: isLoadingSuggestions } = useLabelSuggestions({
    query: labelInput,
    existingLabels: localLabels,
    refreshKey: suggestionRefreshTick
  })

  const addLabelsFromMenu = useCallback(
    async (labelsToAdd: string[]) => {
      if (isMutatingLabels) return

      const labels = normalizeLabels(labelsToAdd)
      if (labels.length === 0) return

      setLabelInput('')
      await runOptimisticLabelMutation({
        previousLabels: localLabels,
        setLocalLabels,
        setIsMutating: setIsMutatingLabels,
        getOptimisticLabels: existing => [...existing, ...labels],
        mutate: async () => {
          const result = await onAddLabels(labels)
          if (!result) throw new Error('Failed to add labels')
          return result
        },
        onSuccess: () => {
          setSuggestionRefreshTick(prev => prev + 1)
        }
      })
    },
    [isMutatingLabels, localLabels, onAddLabels]
  )

  const handleAddFromMenu = useCallback(async () => {
    await addLabelsFromMenu([labelInput])
  }, [addLabelsFromMenu, labelInput])

  const handleAddSuggestionFromMenu = useCallback(
    async (suggestionName: string) => {
      await addLabelsFromMenu([suggestionName])
    },
    [addLabelsFromMenu]
  )

  const handleRemoveFromMenu = useCallback(
    async (label: string) => {
      if (isMutatingLabels) return

      await runOptimisticLabelMutation({
        previousLabels: localLabels,
        setLocalLabels,
        setIsMutating: setIsMutatingLabels,
        getOptimisticLabels: existing => existing.filter(current => current !== label),
        mutate: async () => {
          const result = await onRemoveLabel(label)
          if (!result) throw new Error('Failed to remove label')
          return result
        },
        onSuccess: () => {
          setSuggestionRefreshTick(prev => prev + 1)
        }
      })
    },
    [isMutatingLabels, localLabels, onRemoveLabel]
  )

  const shouldShowLabelSuggestions = labelInput.trim().length > 0
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
        {labelSuggestions.map(suggestion => (
          <button
            key={`${message.id}-menu-suggestion-${suggestion.id}`}
            type="button"
            className="gba:w-full gba:text-left gba:px-2 gba:py-1.5 gba:rounded hover:gba:bg-muted/50 gba:text-xs"
            onClick={() => void handleAddSuggestionFromMenu(suggestion.name)}
            data-testid={`${testId}-context-label-suggestion-${suggestion.id}`}
          >
            {suggestion.name}
          </button>
        ))}
      </>
    )
  }

  return (
    <ContextMenu>
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
                    key={`${message.id}-label-${label}`}
                    variant="secondary"
                    className="gba:text-[10px] gba:h-5"
                    data-testid={`${testId}-label-${label}`}
                  >
                    {label}
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

      <ContextMenuContent className="gba:w-52" data-testid={`${testId}-context-menu`}>
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
            <div className="gba:px-2 gba:py-2 gba:space-y-2">
              <div className="gba:flex gba:items-center gba:gap-1.5">
                <Input
                  value={labelInput}
                  onChange={event => setLabelInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void handleAddFromMenu()
                    }
                  }}
                  placeholder={t('list-context-labels-placeholder')}
                  className="gba:h-7"
                  data-testid={`${testId}-context-labels-input`}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gba:h-7"
                  onClick={() => void handleAddFromMenu()}
                  disabled={isMutatingLabels}
                  data-testid={`${testId}-context-labels-add`}
                >
                  <Plus className="gba:w-3.5 gba:h-3.5" />
                </Button>
              </div>

              {localLabels.length === 0 ? (
                <p className="gba:text-xs gba:text-muted-foreground gba:px-1">{t('list-context-labels-empty')}</p>
              ) : (
                <div className="gba:max-h-40 gba:overflow-auto gba:space-y-1">
                  {localLabels.map(label => (
                    <div key={`${message.id}-menu-label-${label}`} className="gba:flex gba:items-center gba:gap-1.5">
                      <Badge variant="secondary" className="gba:text-[10px] gba:h-5 gba:flex-1 gba:justify-start">
                        {label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="gba:h-5 gba:w-5"
                        onClick={() => void handleRemoveFromMenu(label)}
                        disabled={isMutatingLabels}
                        data-testid={`${testId}-context-label-remove-${label}`}
                      >
                        <X className="gba:w-3 gba:h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {shouldShowLabelSuggestions && (
                <div className="gba:border gba:rounded-md gba:p-1.5 gba:space-y-1">{labelSuggestionsContent}</div>
              )}
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
