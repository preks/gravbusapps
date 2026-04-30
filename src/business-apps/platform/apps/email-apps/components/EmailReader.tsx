import React, { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Badge, useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'
import { Mail, Loader2 } from 'lucide-react'
import { EmailApiService } from '../services/EmailApiService'
import { EmailThreadView } from './EmailThreadView'
import { useSenderAvatar } from '../hooks/useSenderAvatar'
import { useAttachmentDownload } from '../hooks/useAttachmentDownload'
import { useEmailThreadMessages } from '../hooks/useEmailThreadMessages'
import { useMessageLabels } from '../hooks/useMessageLabels'
import { normalizeLabelName } from '../utils/labelUtils'
import type { EmailMessage, EmailAccount, ComposeMode, EmailLabel } from '../types'
import { EmailReaderToolbar } from './email-reader/EmailReaderToolbar'
import { EmailReaderLabelsPanel } from './email-reader/EmailReaderLabelsPanel'
import { EmailReaderSingleMessageView } from './email-reader/EmailReaderSingleMessageView'
import { LabelSuggestionsList } from './labels/LabelSuggestionsList'

interface EmailReaderProps {
  message: EmailMessage | null
  onCompose: (mode: ComposeMode, replyTo?: EmailMessage) => void
  onEditDraft?: (draftMessage: EmailMessage) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
  onArchive: (id: string) => void
  onRestore?: (id: string) => void
  isTrashView?: boolean
  onRefreshMessages?: () => void
  onMessageLabelsUpdated?: (messageId: string, labels?: EmailLabel[]) => Promise<void> | void
  accessToken?: string
  activeAccount?: EmailAccount | null
  employeeId?: string
  /** Platform user id for AI suggestion quick tasks (e.g. hub `userInfo.id`) */
  initiatorUserId?: string
  /** Conversation / thread view toggle (controlled by parent) */
  threadEnabled?: boolean
  onToggleThreadView?: () => void
  'data-testid'?: string
}

export const EmailReader: React.FC<EmailReaderProps> = ({
  message,
  onCompose,
  onEditDraft,
  onDelete,
  onToggleStar,
  onArchive,
  onRestore,
  isTrashView = false,
  onRefreshMessages,
  onMessageLabelsUpdated,
  accessToken,
  activeAccount,
  employeeId,
  initiatorUserId,
  threadEnabled = false,
  onToggleThreadView,
  'data-testid': testId = 'email-reader'
}) => {
  const { t } = useTranslation(translations)
  const { downloadingAttId, handleDownloadAttachment } = useAttachmentDownload(t)
  const { threadMessages, isLoadingThread, showThread } = useEmailThreadMessages({ message, threadEnabled })
  const [isAddLabelMenuOpen, setIsAddLabelMenuOpen] = useState(false)

  const senderAvatar = useSenderAvatar(message?.fromAddress?.address, accessToken)

  const handleAddLabels = useCallback(
    async (labelsToAdd: { name: string; color?: string }[]) => {
      if (!message) return null
      const normalized = labelsToAdd
        .map(label => {
          const name = normalizeLabelName(label.name)
          if (!name) return null
          const color = typeof label.color === 'string' && label.color.trim() ? label.color.trim() : undefined
          return color ? { name, color } : { name }
        })
        .filter((label): label is { name: string; color?: string } => Boolean(label))
      if (normalized.length === 0) return null
      const result = await EmailApiService.addMessageLabels(message.id, normalized)
      return result.labels || null
    },
    [message]
  )

  const handleRemoveLabels = useCallback(
    async (label: string) => {
      if (!message) return null
      const normalizedName = normalizeLabelName(label)
      if (!normalizedName) return null
      const result = await EmailApiService.removeMessageLabels(message.id, [normalizedName])
      return result.labels || null
    },
    [message]
  )

  const {
    labelInput: labelsInput,
    setLabelInput: setLabelsInput,
    selectedLabelColor,
    setSelectedLabelColor,
    editingLabelOriginalName,
    setEditingLabelOriginalName,
    isMutatingLabels,
    localLabels,
    labelSuggestions,
    isLoadingSuggestions,
    activeLabelSuggestionIndex,
    setActiveLabelSuggestionIndex,
    shouldShowLabelSuggestions,
    handleAddFromMenu: handleAddLabel,
    handleAddSuggestionFromMenu: handleAddSuggestion,
    handleStartEditFromMenu: handleStartEditLabel,
    handleRemoveFromMenu: handleRemoveLabel
  } = useMessageLabels({
    messageId: message?.id,
    labels: message?.labels,
    isEditorOpen: isAddLabelMenuOpen,
    setIsEditorOpen: setIsAddLabelMenuOpen,
    onAddLabels: handleAddLabels,
    onRemoveLabel: handleRemoveLabels,
    closeEditorOnSuccess: true,
    onAddSuccess: async updatedLabels => {
      if (!message) return
      toast.success(t('reader-labels-add-success'))
      await onMessageLabelsUpdated?.(message.id, updatedLabels)
    },
    onAddError: () => {
      toast.error(t('reader-labels-add-failed'))
      onRefreshMessages?.()
    },
    onRemoveSuccess: async updatedLabels => {
      if (!message) return
      toast.success(t('reader-labels-remove-success'))
      await onMessageLabelsUpdated?.(message.id, updatedLabels)
    },
    onRemoveError: () => {
      toast.error(t('reader-labels-remove-failed'))
      onRefreshMessages?.()
    }
  })

  if (!message) {
    return (
      <div
        className="gba:flex-1 gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-muted-foreground"
        data-testid={testId}
      >
        <Mail className="gba:w-16 gba:h-16 gba:mb-4 gba:opacity-20" />
        <p className="gba:text-lg">{t('reader-select-prompt')}</p>
        <p className="gba:text-sm gba:mt-1">{t('reader-select-hint')}</p>
      </div>
    )
  }

  const labelSuggestionsContent = (
    <LabelSuggestionsList
      suggestions={labelSuggestions}
      isLoading={isLoadingSuggestions}
      activeIndex={activeLabelSuggestionIndex}
      onSelect={suggestionName => void handleAddSuggestion(suggestionName)}
      onHover={setActiveLabelSuggestionIndex}
      loadingText={t('reader-labels-suggestions-loading')}
      emptyText={t('reader-labels-suggestions-empty')}
      itemTextClassName="gba:text-sm"
      testIdPrefix={`${testId}-label-suggestion`}
    />
  )

  return (
    <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:min-h-0 gba:overflow-hidden" data-testid={testId}>
      <EmailReaderToolbar
        message={message}
        threadEnabled={threadEnabled}
        onCompose={onCompose}
        onEditDraft={onEditDraft}
        onArchive={onArchive}
        onDelete={onDelete}
        onRestore={onRestore}
        isTrashView={isTrashView}
        onToggleStar={onToggleStar}
        onToggleThreadView={onToggleThreadView}
        t={t}
        testId={testId}
      />

      {/* Email content */}
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:p-6">
        {/* Subject */}
        <div className="gba:flex gba:items-start gba:gap-3 gba:mb-4">
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground gba:flex-1">
            {message.subject || t('reader-no-subject')}
          </h2>
          {message.importance === 'high' && (
            <Badge variant="destructive" className="gba:flex-shrink-0">
              {t('reader-important')}
            </Badge>
          )}
        </div>

        <EmailReaderLabelsPanel
          messageId={message.id}
          localLabels={localLabels}
          labelsInput={labelsInput}
          setLabelsInput={setLabelsInput}
          selectedLabelColor={selectedLabelColor}
          setSelectedLabelColor={setSelectedLabelColor}
          editingLabelOriginalName={editingLabelOriginalName}
          setEditingLabelOriginalName={setEditingLabelOriginalName}
          isAddLabelMenuOpen={isAddLabelMenuOpen}
          setIsAddLabelMenuOpen={setIsAddLabelMenuOpen}
          isMutatingLabels={isMutatingLabels}
          shouldShowLabelSuggestions={shouldShowLabelSuggestions}
          labelSuggestions={labelSuggestions}
          activeLabelSuggestionIndex={activeLabelSuggestionIndex}
          setActiveLabelSuggestionIndex={setActiveLabelSuggestionIndex}
          labelSuggestionsContent={labelSuggestionsContent}
          onHandleAddLabel={handleAddLabel}
          onAddSuggestion={handleAddSuggestion}
          onStartEditLabel={handleStartEditLabel}
          onRemoveLabel={handleRemoveLabel}
          t={t}
          testId={testId}
        />

        {/* Thread loading state */}
        {isLoadingThread && threadEnabled && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:mb-4">
            <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
            {t('reader-loading-thread')}
          </div>
        )}

        {/* Thread view OR single-message view */}
        {showThread ? (
          <EmailThreadView
            messages={threadMessages}
            accessToken={accessToken}
            primaryMessage={message ?? undefined}
            activeAccount={activeAccount}
            employeeId={employeeId}
            initiatorUserId={initiatorUserId}
            data-testid={`${testId}-thread`}
          />
        ) : (
          <EmailReaderSingleMessageView
            message={message}
            senderAvatar={senderAvatar}
            downloadingAttId={downloadingAttId}
            onDownloadAttachment={handleDownloadAttachment}
            accessToken={accessToken}
            activeAccount={activeAccount}
            employeeId={employeeId}
            initiatorUserId={initiatorUserId}
            t={t}
            testId={testId}
          />
        )}
      </div>
    </div>
  )
}
