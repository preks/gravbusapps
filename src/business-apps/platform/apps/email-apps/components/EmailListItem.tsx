import React, { useCallback } from 'react'
import {
  Checkbox,
  Badge,
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuSeparator,
  ContextMenuItem
} from '@newwork/nw-design-system'
import {
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
  Reply,
  ReplyAll,
  Forward
} from 'lucide-react'
import { getLabelChipClassName } from '../utils/labelUtils'
import { getDisplayName } from '../utils/emailListFormatting'
import { useEmailListItemLabels } from '../hooks/useEmailListItemLabels'
import { EmailListItemLabelsMenuSection } from './EmailListItemLabelsMenuSection'
import { LabelSuggestionsList } from './labels/LabelSuggestionsList'
import type { EmailMessageSummary, AddLabelInput, EmailLabel } from '../types'

interface EmailListItemProps {
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
}

export const EmailListItem: React.FC<EmailListItemProps> = ({
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
}) => {
  const {
    isLabelsExpanded,
    setIsLabelsExpanded,
    labelInput,
    setLabelInput,
    selectedLabelColor,
    setSelectedLabelColor,
    editingLabelOriginalName,
    isMutatingLabels,
    localLabels,
    labelSuggestions,
    isLoadingSuggestions,
    activeLabelSuggestionIndex,
    setActiveLabelSuggestionIndex,
    shouldShowLabelSuggestions,
    handleAddFromMenu,
    handleAddSuggestionFromMenu,
    handleStartEditFromMenu,
    handleRemoveFromMenu
  } = useEmailListItemLabels({
    message,
    onAddLabels,
    onRemoveLabel
  })
  const labelSuggestionsContent = (
    <LabelSuggestionsList
      suggestions={labelSuggestions}
      isLoading={isLoadingSuggestions}
      activeIndex={activeLabelSuggestionIndex}
      onSelect={suggestionName => void handleAddSuggestionFromMenu(suggestionName)}
      onHover={setActiveLabelSuggestionIndex}
      loadingText={t('list-context-labels-suggestions-loading')}
      emptyText={t('list-context-labels-suggestions-empty')}
      itemTextClassName="gba:text-xs"
      testIdPrefix={`${testId}-context-label-suggestion`}
    />
  )
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
          <div onClick={onToggleCheck} className="gba:mt-1 gba:flex-shrink-0 gba:cursor-pointer">
            <Checkbox checked={isChecked} data-testid={`${testId}-checkbox`} />
          </div>

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
            <EmailListItemLabelsMenuSection
              messageId={message.id}
              testId={testId}
              labelInput={labelInput}
              setLabelInput={setLabelInput}
              editingLabelOriginalName={editingLabelOriginalName}
              isMutatingLabels={isMutatingLabels}
              shouldShowLabelSuggestions={shouldShowLabelSuggestions}
              labelSuggestions={labelSuggestions}
              activeLabelSuggestionIndex={activeLabelSuggestionIndex}
              setActiveLabelSuggestionIndex={setActiveLabelSuggestionIndex}
              labelSuggestionsContent={labelSuggestionsContent}
              localLabels={localLabels}
              selectedLabelColor={selectedLabelColor}
              setSelectedLabelColor={setSelectedLabelColor}
              onAddFromMenu={handleAddFromMenu}
              onAddSuggestionFromMenu={handleAddSuggestionFromMenu}
              onStartEditFromMenu={handleStartEditFromMenu}
              onRemoveFromMenu={handleRemoveFromMenu}
              t={t}
            />
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
