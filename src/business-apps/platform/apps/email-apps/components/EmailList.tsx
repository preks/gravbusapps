/**
 * EmailList - Displays a list of email messages with sorting and actions.
 * Supports selection, star toggle, and read/unread indicators.
 */

import React from 'react'
import { Input, Spinner } from '@newwork/nw-design-system'
import { Search, Star, Paperclip, AlertCircle } from 'lucide-react'
import type { EmailMessageSummary } from '../types'

interface EmailListProps {
  messages: EmailMessageSummary[]
  selectedMessageId: string | null
  isLoading: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelectMessage: (id: string) => void
  onToggleStar: (id: string) => void
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
  searchQuery,
  onSearchChange,
  onSelectMessage,
  onToggleStar,
  folderName,
  'data-testid': testId = 'email-list'
}) => {
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

      {/* Message list */}
      <div className="gba:flex-1 gba:overflow-y-auto">
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
              onSelect={() => onSelectMessage(msg.id)}
              onToggleStar={() => onToggleStar(msg.id)}
              testId={`${testId}-item-${msg.id}`}
            />
          ))}
      </div>
    </div>
  )
}

/** Single email list item */
function EmailListItem({
  message,
  isSelected,
  onSelect,
  onToggleStar,
  testId
}: {
  message: EmailMessageSummary
  isSelected: boolean
  onSelect: () => void
  onToggleStar: () => void
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

        <p
          className={`gba:text-sm gba:truncate gba:mb-0.5 ${
            !message.isRead ? 'gba:font-medium gba:text-foreground' : 'gba:text-foreground'
          }`}
        >
          {message.subject || '(no subject)'}
        </p>

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
