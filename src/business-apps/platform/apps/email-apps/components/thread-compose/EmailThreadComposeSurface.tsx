import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { ComposerAttachments } from '../ComposerAttachments'
import { EmailThreadAssistantCard } from './EmailThreadAssistantCard'
import { EmailThreadComposeActions } from './EmailThreadComposeActions'
import { EmailThreadEditor } from './EmailThreadEditor'
import { EmailThreadRecipients } from './EmailThreadRecipients'
import { useThreadComposeController } from '../../hooks/useThreadComposeController'
import translations from '../../_i18n'
import type { ThreadComposeSurfaceProps } from '../../types/threadCompose.types'

export const EmailThreadComposeSurface: React.FC<ThreadComposeSurfaceProps> = ({
  isOpen,
  onClose,
  mode,
  replyToMessage,
  accounts,
  defaultAccountId,
  onSent,
  searchContacts,
  onRecipientsUsed,
  assistantEnabled = false,
  'data-testid': testId = 'email-thread-compose-surface'
}) => {
  const { t } = useTranslation(translations)
  const controller = useThreadComposeController({
    isOpen,
    mode,
    replyToMessage,
    accounts,
    defaultAccountId,
    onClose,
    onSent,
    onRecipientsUsed,
    assistantEnabled,
    t
  })

  if (!isOpen) return null

  const modeTitle = {
    new: t('composer-mode-new'),
    reply: t('composer-mode-reply'),
    'reply-all': t('composer-mode-reply-all'),
    forward: t('composer-mode-forward')
  }[mode]

  return (
    <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:min-h-0 gba:overflow-hidden" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:border-b gba:px-6 gba:py-4">
        <h2 className="gba:text-base gba:font-semibold">{modeTitle}</h2>
      </div>

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:p-6 gba:space-y-4">
        <EmailThreadRecipients
          accounts={accounts}
          accountId={controller.accountId}
          onAccountIdChange={controller.setAccountId}
          toRecipients={controller.toRecipients}
          onToRecipientsChange={controller.setToRecipients}
          ccRecipients={controller.ccRecipients}
          onCcRecipientsChange={controller.setCcRecipients}
          bccRecipients={controller.bccRecipients}
          onBccRecipientsChange={controller.setBccRecipients}
          showCcBcc={controller.showCcBcc}
          onShowCcBccChange={controller.setShowCcBcc}
          searchContacts={searchContacts}
          data-testid={`${testId}-recipients`}
        />

        <EmailThreadEditor
          subject={controller.subject}
          onSubjectChange={controller.setSubject}
          body={controller.body}
          onBodyChange={controller.setBody}
          replyToMessage={replyToMessage}
          signatureHtml={accounts.find(item => item.id === controller.accountId)?.signature || ''}
          isDragging={controller.isDragging}
          dragHandlers={controller.dragHandlers}
          afterSubjectSlot={
            <EmailThreadAssistantCard
              isEnabled={controller.assistant.isEnabled}
              isCapabilitiesLoading={controller.assistant.isCapabilitiesLoading}
              loading={controller.assistant.loading}
              mode={mode}
              bulletDraft={controller.assistantBulletDraft}
              onBulletDraftChange={controller.setAssistantBulletDraft}
              replyIntent={controller.assistantReplyIntent}
              onReplyIntentChange={controller.setAssistantReplyIntent}
              tone={controller.assistantTone}
              onToneChange={controller.setAssistantTone}
              formality={controller.assistantFormality}
              onFormalityChange={controller.setAssistantFormality}
              length={controller.assistantLength}
              onLengthChange={controller.setAssistantLength}
              customInstruction={controller.assistantCustomInstruction}
              onCustomInstructionChange={controller.setAssistantCustomInstruction}
              latestOutput={controller.assistant.latestOutput}
              previewDraft={controller.assistant.previewDraft}
              lastError={controller.assistant.lastError}
              autoTemperatureCheck={controller.assistant.autoTemperatureCheck}
              onAutoTemperatureCheckChange={controller.assistant.setAutoTemperatureCheck}
              onGenerateDraft={() => {
                void controller.actions.generateAssistantDraft()
              }}
              onSuggestReply={() => {
                void controller.actions.suggestReply()
              }}
              onRewrite={action => {
                void controller.actions.rewrite(action)
              }}
              onRewriteFormal={() => {
                controller.setAssistantTone('formal')
                void controller.actions.rewrite('tone', 'formal')
              }}
              onRewriteInformal={() => {
                controller.setAssistantTone('informal')
                void controller.actions.rewrite('tone', 'informal')
              }}
              onRunTemperatureCheck={() => {
                void controller.actions.runTemperatureCheck()
              }}
              onAcceptPreview={controller.actions.applyAssistantPreview}
              onRejectPreview={controller.actions.rejectAssistantPreview}
              onRetry={() => {
                void controller.assistant.retryLastAction()
              }}
              onCancel={controller.assistant.cancelAction}
              data-testid={`${testId}-assistant`}
            />
          }
          data-testid={`${testId}-editor`}
        />

        <input
          ref={controller.fileInputRef}
          type="file"
          multiple
          className="gba:hidden"
          onChange={controller.handleFileInputChange}
          data-testid={`${testId}-file-input`}
        />

        <ComposerAttachments
          attachments={controller.attachments}
          onRemove={controller.removeAttachment}
          totalSize={controller.totalAttachmentSize}
          formatSummary={(count, size) => t('composer-attachments-summary', { count, size })}
          data-testid={`${testId}-attachments`}
        />

        <EmailThreadComposeActions
          isSending={controller.isSending}
          onSend={() => {
            void controller.actions.send()
          }}
          onSaveDraft={() => {
            void controller.actions.saveDraft()
          }}
          onDiscard={onClose}
          onAttachFile={controller.openFilePicker}
          data-testid={`${testId}-actions`}
        />
      </div>
    </div>
  )
}
