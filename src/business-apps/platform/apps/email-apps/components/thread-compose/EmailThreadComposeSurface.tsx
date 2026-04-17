import React, { useState } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { SparkleIcon, XIcon } from '@phosphor-icons/react'
import { ComposerAttachments } from '../ComposerAttachments'
import { EmailAssistantPanel } from '../EmailAssistantPanel'
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
  draftMessage,
  accounts,
  defaultAccountId,
  onSent,
  searchContacts,
  onRecipientsUsed,
  assistantEnabled = false,
  'data-testid': testId = 'email-thread-compose-surface'
}) => {
  const { t } = useTranslation(translations)
  const [isAssistantPanelOpen, setIsAssistantPanelOpen] = useState(false)
  const controller = useThreadComposeController({
    isOpen,
    mode,
    replyToMessage,
    draftMessage,
    accounts,
    defaultAccountId,
    onClose,
    onSent,
    onRecipientsUsed,
    assistantEnabled,
    t
  })

  if (!isOpen) return null

  const modeTitle =
    mode === 'new' && draftMessage
      ? t('composer-mode-edit-draft')
      : {
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

      <div className="gba:flex-1 gba:min-h-0 gba:p-6 gba:overflow-hidden">
        <div className="gba:h-full gba:flex gba:gap-4">
          <div className="gba:flex-1 gba:min-w-0 gba:min-h-0 gba:overflow-y-auto gba:space-y-4 gba:pr-1">
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
              belowBodySlot={
                (controller.assistant.isEnabled || controller.assistant.isCapabilitiesLoading) && (
                  <div className="gba:flex gba:items-center gba:justify-start">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gba:gap-2"
                      onClick={() => setIsAssistantPanelOpen(true)}
                      data-testid={`${testId}-assistant-open`}
                      aria-label={t('assistant-bubble-open')}
                    >
                      <SparkleIcon className="gba:w-4 gba:h-4" weight="fill" />
                      <span>{t('assistant-title')}</span>
                    </Button>
                  </div>
                )
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

          {isAssistantPanelOpen && (controller.assistant.isEnabled || controller.assistant.isCapabilitiesLoading) && (
            <div
              className="gba:w-96 gba:max-w-1/2 gba:min-w-80 gba:min-h-0 gba:border gba:rounded-lg gba:bg-card/80 gba:flex gba:flex-col gba:overflow-hidden"
              data-testid={`${testId}-assistant-panel-shell`}
            >
              <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <SparkleIcon className="gba:w-4 gba:h-4 gba:text-foreground" weight="fill" />
                  <p className="gba:text-sm gba:font-medium gba:text-foreground">{t('assistant-title')}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsAssistantPanelOpen(false)}
                  data-testid={`${testId}-assistant-close`}
                  aria-label={t('assistant-bubble-close')}
                >
                  <XIcon className="gba:w-4 gba:h-4" />
                </Button>
              </div>

              <div className="gba:min-h-0 gba:overflow-y-auto gba:bg-background/20">
                <EmailAssistantPanel
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
                  defaultAssistantExpanded
                  showInternalHeaderToggle={false}
                  enableInternalScrollClamp={false}
                  containerClassName="gba:mt-0 gba:border-0 gba:rounded-none gba:bg-transparent"
                  loadingClassName="gba:mt-0 gba:border-0 gba:rounded-none gba:bg-transparent"
                  data-testid={`${testId}-assistant`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
