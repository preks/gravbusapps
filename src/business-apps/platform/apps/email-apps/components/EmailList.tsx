import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { Spinner, Button, useTranslation } from '@newwork/nw-design-system'
import { AlertCircle, Trash2, MailOpen, Mail, Undo2 } from 'lucide-react'
import { EmailApiService } from '../services/EmailApiService'
import { normalizeLabelName, normalizeLabelObjects } from '../utils/labelUtils'
import { formatEmailDate } from '../utils/emailListFormatting'
import { EmailListHeader } from './EmailListHeader'
import { EmailListItem } from './EmailListItem'
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
  onEditDraft?: (messageId: string) => void
  onChatWithUser?: (message: EmailMessageSummary) => void
  canChatWithUser?: (message: EmailMessageSummary) => boolean
  onToggleRead?: (messageId: string, isRead: boolean) => void
  onArchive?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onRestore?: (messageId: string, options?: { silent?: boolean }) => Promise<void> | void
  isTrashView?: boolean
  onRefresh: () => void
  onMessageLabelsUpdated?: (messageId: string, labels?: EmailLabel[]) => Promise<void> | void
  onLoadMore?: () => void
  folderName: string
  'data-testid'?: string
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
  onEditDraft,
  onChatWithUser,
  canChatWithUser,
  onToggleRead,
  onArchive,
  onDelete,
  onRestore,
  isTrashView = false,
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
  const labelFilterRowRef = useRef<HTMLElement>(null)

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

  const handleBulkRestore = useCallback(async () => {
    if (selectedIds.size === 0 || !onRestore) return
    setIsBulkAction(true)
    try {
      for (const id of selectedIds) {
        await onRestore(id, { silent: true })
      }
      toast.success(t('list-toast-restored', { count: selectedIds.size }))
      setSelectedIds(new Set())
      onRefresh()
    } catch {
      toast.error(t('list-toast-restore-failed'))
    } finally {
      setIsBulkAction(false)
    }
  }, [selectedIds, onRefresh, onRestore, t])

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
      <EmailListHeader
        folderName={folderName}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        isLabelSearchOpen={isLabelSearchOpen}
        setIsLabelSearchOpen={setIsLabelSearchOpen}
        labelSearchQuery={labelSearchQuery}
        setLabelSearchQuery={setLabelSearchQuery}
        labelSearchInputRef={labelSearchInputRef}
        labelFilterRowRef={labelFilterRowRef}
        filteredVisibleLabels={filteredVisibleLabels}
        selectedLabels={selectedLabels}
        labelColorByName={labelColorByName}
        toggleFilterLabel={toggleFilterLabel}
        hasActiveLabelFilter={hasActiveLabelFilter}
        clearFilterLabels={clearFilterLabels}
        t={t}
        testId={testId}
      />

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
          {isTrashView && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkRestore}
              disabled={isBulkAction || !onRestore}
              className="gba:h-7 gba:text-xs"
              data-testid={`${testId}-bulk-restore`}
            >
              <Undo2 className="gba:w-3 gba:h-3 gba:mr-1" />
              {t('menu-restore')}
            </Button>
          )}
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
              onEditDraft={() => onEditDraft?.(msg.id)}
              onChatWithUser={() => onChatWithUser?.(msg)}
              canChatWithUser={canChatWithUser?.(msg) ?? false}
              onToggleRead={() => onToggleRead?.(msg.id, !msg.isRead)}
              onArchive={() => onArchive?.(msg.id)}
              onDelete={() => onDelete?.(msg.id)}
              onRestore={() => onRestore?.(msg.id)}
              isTrashView={isTrashView}
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
