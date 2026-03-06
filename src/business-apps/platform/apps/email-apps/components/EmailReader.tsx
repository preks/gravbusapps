import React, { useEffect, useCallback, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'
import { Badge } from '@newwork/nw-design-system'
import { Mail, Loader2 } from 'lucide-react'
import { EmailApiService } from '../services/EmailApiService'
import { EmailThreadView } from './EmailThreadView'
import { EmailCrmBooking } from './EmailCrmBooking'
import { useLabelSuggestions } from '../hooks/useLabelSuggestions'
import { useSenderAvatar } from '../hooks/useSenderAvatar'
import { useAttachmentDownload } from '../hooks/useAttachmentDownload'
import { useEmailThreadMessages } from '../hooks/useEmailThreadMessages'
import { normalizeLabelName, normalizeLabelObjects } from '../utils/labelUtils'
import { runOptimisticLabelMutation } from '../utils/runOptimisticLabelMutation'
import type { EmailMessage, EmailAccount, ComposeMode, AddLabelInput, EmailLabel } from '../types'
import { EmailReaderToolbar } from './email-reader/EmailReaderToolbar'
import { EmailReaderLabelsPanel } from './email-reader/EmailReaderLabelsPanel'
import { EmailReaderSingleMessageView } from './email-reader/EmailReaderSingleMessageView'
import { LabelSuggestionsList } from './labels/LabelSuggestionsList'

interface EmailReaderProps {
  message: EmailMessage | null
  onCompose: (mode: ComposeMode, replyTo?: EmailMessage) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
  onArchive: (id: string) => void
  onRefreshMessages?: () => void
  onMessageLabelsUpdated?: (messageId: string, labels?: EmailLabel[]) => Promise<void> | void
  accessToken?: string
  activeAccount?: EmailAccount | null
  employeeId?: string
  /** Conversation / thread view toggle (controlled by parent) */
  threadEnabled?: boolean
  onToggleThreadView?: () => void
  'data-testid'?: string
}

export const EmailReader: React.FC<EmailReaderProps> = ({
  message,
  onCompose,
  onDelete,
  onToggleStar,
  onArchive,
  onRefreshMessages,
  onMessageLabelsUpdated,
  accessToken,
  activeAccount,
  employeeId,
  threadEnabled = false,
  onToggleThreadView,
  'data-testid': testId = 'email-reader'
}) => {
  const { t } = useTranslation(translations)
  const { downloadingAttId, handleDownloadAttachment } = useAttachmentDownload(t)
  const { threadMessages, isLoadingThread, showThread } = useEmailThreadMessages({ message, threadEnabled })
  const [labelsInput, setLabelsInput] = useState('')
  const [selectedLabelColor, setSelectedLabelColor] = useState<string | null>(null)
  const [editingLabelOriginalName, setEditingLabelOriginalName] = useState<string | null>(null)
  const [localLabels, setLocalLabels] = useState<EmailLabel[]>([])
  const [isAddLabelMenuOpen, setIsAddLabelMenuOpen] = useState(false)
  const [isMutatingLabels, setIsMutatingLabels] = useState(false)
  const [suggestionRefreshTick, setSuggestionRefreshTick] = useState(0)
  const [activeLabelSuggestionIndex, setActiveLabelSuggestionIndex] = useState(-1)

  const senderAvatar = useSenderAvatar(message?.fromAddress?.address, accessToken)

  useEffect(() => {
    setLocalLabels(normalizeLabelObjects(message?.labels || []))
    setLabelsInput('')
    setSelectedLabelColor(null)
    setEditingLabelOriginalName(null)
    setIsAddLabelMenuOpen(false)
    setActiveLabelSuggestionIndex(-1)
  }, [message?.id, message?.labels])

  useEffect(() => {
    setActiveLabelSuggestionIndex(-1)
  }, [labelsInput, isAddLabelMenuOpen])

  const existingLabelNames = useMemo(() => localLabels.map(label => label.name), [localLabels])

  const { suggestions: labelSuggestions, isLoading: isLoadingSuggestions } = useLabelSuggestions({
    query: labelsInput,
    existingLabels: existingLabelNames,
    refreshKey: suggestionRefreshTick
  })

  const submitLabelDraft = useCallback(
    async (rawName: string) => {
      if (!message || isMutatingLabels) return

      const previousName = editingLabelOriginalName ? normalizeLabelName(editingLabelOriginalName) : null
      // Existing labels are color-edit only for now; name changes are disabled.
      const nextName = previousName ?? normalizeLabelName(rawName)
      if (!nextName) return
      const color =
        typeof selectedLabelColor === 'string' && selectedLabelColor.trim() ? selectedLabelColor.trim() : undefined
      const payload: AddLabelInput = color ? { name: nextName, color } : { name: nextName }

      const previous = localLabels
      setLabelsInput('')
      await runOptimisticLabelMutation({
        previousLabels: previous,
        setLocalLabels,
        setIsMutating: setIsMutatingLabels,
        getOptimisticLabels: labels => {
          const merged = previousName ? labels.filter(existing => existing.name !== previousName) : [...labels]
          const existingIdx = merged.findIndex(existing => existing.name === nextName)
          const nextLabel: EmailLabel = {
            id: existingIdx >= 0 ? merged[existingIdx].id : '',
            name: nextName,
            color: payload.color || null
          }
          if (existingIdx >= 0) {
            merged[existingIdx] = nextLabel
          } else {
            merged.push(nextLabel)
          }
          return normalizeLabelObjects(merged)
        },
        mutate: async () => {
          if (previousName && previousName !== nextName) {
            await EmailApiService.removeMessageLabels(message.id, [previousName])
          }
          const result = await EmailApiService.addMessageLabels(message.id, [payload])
          return normalizeLabelObjects(result.labels || [])
        },
        onSuccess: async updatedLabels => {
          setIsAddLabelMenuOpen(false)
          setSelectedLabelColor(null)
          setEditingLabelOriginalName(null)
          toast.success(t('reader-labels-add-success'))
          await onMessageLabelsUpdated?.(message.id, updatedLabels)
          setSuggestionRefreshTick(prevTick => prevTick + 1)
        },
        onError: () => {
          toast.error(t('reader-labels-add-failed'))
          onRefreshMessages?.()
        }
      })
    },
    [
      message,
      localLabels,
      isMutatingLabels,
      editingLabelOriginalName,
      selectedLabelColor,
      t,
      onMessageLabelsUpdated,
      onRefreshMessages
    ]
  )

  const handleAddLabel = useCallback(async () => {
    await submitLabelDraft(labelsInput)
  }, [submitLabelDraft, labelsInput])

  const handleAddSuggestion = useCallback(
    async (suggestionName: string) => {
      await submitLabelDraft(suggestionName)
    },
    [submitLabelDraft]
  )

  const handleStartEditLabel = useCallback((label: EmailLabel) => {
    setEditingLabelOriginalName(label.name)
    setLabelsInput(label.name)
    setSelectedLabelColor(label.color)
    setIsAddLabelMenuOpen(true)
  }, [])

  const handleRemoveLabel = useCallback(
    async (label: string) => {
      if (!message || isMutatingLabels) return

      const normalized = normalizeLabelName(label)
      if (!normalized) return

      await runOptimisticLabelMutation({
        previousLabels: localLabels,
        setLocalLabels,
        setIsMutating: setIsMutatingLabels,
        getOptimisticLabels: labels => labels.filter(existing => existing.name !== normalized),
        mutate: async () => {
          const result = await EmailApiService.removeMessageLabels(message.id, [normalized])
          return normalizeLabelObjects(result.labels || [])
        },
        onSuccess: async updatedLabels => {
          toast.success(t('reader-labels-remove-success'))
          await onMessageLabelsUpdated?.(message.id, updatedLabels)
          setSuggestionRefreshTick(prev => prev + 1)
        },
        onError: () => {
          toast.error(t('reader-labels-remove-failed'))
          onRefreshMessages?.()
        }
      })
    },
    [message, localLabels, isMutatingLabels, t, onMessageLabelsUpdated, onRefreshMessages]
  )

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

  const shouldShowLabelSuggestions = !editingLabelOriginalName && normalizeLabelName(labelsInput).length > 0

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
        onArchive={onArchive}
        onDelete={onDelete}
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
          <EmailThreadView messages={threadMessages} accessToken={accessToken} data-testid={`${testId}-thread`} />
        ) : (
          <EmailReaderSingleMessageView
            message={message}
            senderAvatar={senderAvatar}
            downloadingAttId={downloadingAttId}
            onDownloadAttachment={handleDownloadAttachment}
            t={t}
            testId={testId}
          />
        )}
      </div>

      {/* CRM Booking Panel */}
      {accessToken && (
        <EmailCrmBooking
          message={message}
          threadMessages={showThread ? threadMessages : undefined}
          accessToken={accessToken}
          activeAccount={activeAccount}
          employeeId={employeeId}
          data-testid={`${testId}-crm-booking`}
        />
      )}
    </div>
  )
}
