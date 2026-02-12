/**
 * EmailList - Displays a list of email messages with bulk operations.
 * Supports selection, star toggle, read/unread indicators, and multi-select.
 */

import React, { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Input, Spinner, Button, Checkbox } from '@newwork/nw-design-system'
import { Search, Star, Paperclip, AlertCircle, Trash2, MailOpen, Mail, MessageSquare } from 'lucide-react'
import { EmailApiService } from '../services/EmailApiService'
import type { EmailMessageSummary } from '../types'

interface EmailListProps {
  messages: EmailMessageSummary[]
  selectedMessageId: string | null
  isLoading: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
  total?: number
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelectMessage: (id: string) => void
  onToggleStar: (id: string) => void
  onRefresh: () => void
  onLoadMore?: () => void
  folderName: string
  'data-testid'?: string
}

function formatEmailDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
  onSelectMessage,
  onToggleStar,
  onRefresh,
  onLoadMore,
  folderName,
  'data-testid': testId = 'email-list'
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkAction, setIsBulkAction] = useState(false)

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
        toast.success(`Marked ${selectedIds.size} emails as ${isRead ? 'read' : 'unread'}`)
        setSelectedIds(new Set())
        onRefresh()
      } catch {
        toast.error('Failed to update emails')
      } finally {
        setIsBulkAction(false)
      }
    },
    [selectedIds, onRefresh]
  )

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    setIsBulkAction(true)
    try {
      for (const id of selectedIds) {
        await EmailApiService.deleteMessage(id)
      }
      toast.success(`Deleted ${selectedIds.size} emails`)
      setSelectedIds(new Set())
      onRefresh()
    } catch {
      toast.error('Failed to delete emails')
    } finally {
      setIsBulkAction(false)
    }
  }, [selectedIds, onRefresh])

  const hasBulkSelection = selectedIds.size > 0
  const remaining = Math.max(total - messages.length, 0)

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

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:border-r gba:w-96 gba:flex-shrink-0" data-testid={testId}>
      {/* Header */}
      <div className="gba:border-b gba:p-4">
        <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-3">{folderName}</h2>
        <div className="gba:relative">
          <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="gba:pl-9 gba:h-9"
            data-testid={`${testId}-search`}
          />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {hasBulkSelection && (
        <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:border-b gba:bg-accent/10">
          <button onClick={selectAll} className="gba:text-xs gba:text-primary gba:font-medium hover:gba:underline">
            {selectedIds.size === messages.length ? 'Deselect all' : 'Select all'}
          </button>
          <span className="gba:text-xs gba:text-muted-foreground">{selectedIds.size} selected</span>
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
            Read
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
            Unread
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
            Delete
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
            <p className="gba:text-muted-foreground gba:text-sm">No emails found</p>
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
              testId={`${testId}-item-${msg.id}`}
            />
          ))}

        {/* Load more button */}
        {!isLoading && messages.length > 0 && hasMore && (
          <div className="gba:py-3 gba:px-4 gba:flex gba:flex-col gba:items-center gba:gap-1.5">
            {isLoadingMore ? (
              <div className="gba:flex gba:items-center gba:gap-2 gba:py-1">
                <Spinner size="sm" />
                <span className="gba:text-xs gba:text-muted-foreground">Loading more emails...</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gba:w-full gba:text-xs"
                onClick={handleLoadMore}
                data-testid={`${testId}-load-more`}
              >
                {remaining > 0 ? `Load more emails (${remaining} remaining)` : 'Load more emails'}
              </Button>
            )}
          </div>
        )}

        {/* End of list indicator */}
        {!isLoading && messages.length > 0 && !hasMore && total > 50 && (
          <div className="gba:py-3 gba:text-center">
            <span className="gba:text-xs gba:text-muted-foreground">All available emails loaded</span>
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
  testId
}: {
  message: EmailMessageSummary
  isSelected: boolean
  isChecked: boolean
  onSelect: () => void
  onToggleStar: () => void
  onToggleCheck: (e: React.MouseEvent) => void
  testId: string
}) {
  return (
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
            {formatEmailDate(message.date)}
          </span>
        </div>

        <div className="gba:flex gba:items-center gba:gap-1.5 gba:mb-0.5">
          <p
            className={`gba:text-sm gba:truncate gba:flex-1 ${
              !message.isRead ? 'gba:font-medium gba:text-foreground' : 'gba:text-foreground'
            }`}
          >
            {message.subject || '(no subject)'}
          </p>
          {(message.threadMessageCount ?? 0) > 1 && (
            <span
              className="gba:inline-flex gba:items-center gba:gap-0.5 gba:px-1.5 gba:py-0.5 gba:rounded-full gba:bg-primary/10 gba:text-primary gba:flex-shrink-0"
              title={`${message.threadMessageCount} messages in thread`}
            >
              <MessageSquare className="gba:w-3 gba:h-3" />
              <span className="gba:text-[10px] gba:font-semibold gba:leading-none">{message.threadMessageCount}</span>
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
      </div>

      {/* Unread indicator */}
      {!message.isRead && (
        <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary gba:flex-shrink-0 gba:mt-2" />
      )}
    </div>
  )
}
