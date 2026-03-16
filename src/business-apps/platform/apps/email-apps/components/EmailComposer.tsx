/**
 * EmailComposer - Email composition dialog with auto-suggest recipients.
 * Supports new, reply, reply-all, and forward modes with rich HTML signature.
 * Signature is rendered as a styled preview below the body and injected into
 * the htmlBody on send, positioned before any quoted reply text.
 * Supports file attachments via button and drag-and-drop.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button, Textarea, useTranslation } from '@newwork/nw-design-system'
import { Send, X, Minus, Trash2, Paperclip } from 'lucide-react'
import { EmailApiService } from '../services/EmailApiService'
import { EmailRecipientInput } from './EmailRecipientInput'
import { ComposerAttachments } from './ComposerAttachments'
import { EmailAssistantBubble } from './EmailAssistantBubble'
import { useFileAttachments } from '../hooks/useFileAttachments'
import { useEmailAssistant } from '../hooks/useEmailAssistant'
import { buildReplySubject, buildReplyBody, buildHtmlBody, buildTextBody } from '../utils/composerUtils'
import { trackEmailAssistantEvent } from '../utils/emailAssistantTelemetry'
import type { EmailMessage, EmailAccount, ComposeMode, SendEmailRequest, EmailAddress, EmailContact } from '../types'
import translations from '../_i18n'

interface EmailComposerProps {
  isOpen: boolean
  onClose: () => void
  mode: ComposeMode
  replyToMessage?: EmailMessage | null
  accounts: EmailAccount[]
  defaultAccountId?: string
  onSent: () => void
  searchContacts: (query: string) => EmailContact[]
  onRecipientsUsed?: (recipients: Array<{ name?: string; email: string }>) => void
  'data-testid'?: string
}

function normalizeReplyGreeting(textBody: string, recipientName?: string): string {
  const cleanedName = recipientName?.trim()
  if (!cleanedName || !textBody.trim()) return textBody

  const lines = textBody.split('\n')
  const firstLine = lines[0] || ''
  const normalizedFirstLine = firstLine.trim().toLowerCase()
  const isGenericGreeting =
    normalizedFirstLine === 'hi team,' ||
    normalizedFirstLine === 'hi team' ||
    normalizedFirstLine === 'hello team,' ||
    normalizedFirstLine === 'hello team' ||
    normalizedFirstLine === 'dear team,' ||
    normalizedFirstLine === 'dear team'

  if (!isGenericGreeting) return textBody

  lines[0] = `Hi ${cleanedName},`
  return lines.join('\n')
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  isOpen,
  onClose,
  mode,
  replyToMessage,
  accounts,
  defaultAccountId,
  onSent,
  searchContacts,
  onRecipientsUsed,
  'data-testid': testId = 'email-composer'
}) => {
  const [accountId, setAccountId] = useState(defaultAccountId || '')
  const [toRecipients, setToRecipients] = useState<EmailAddress[]>([])
  const [ccRecipients, setCcRecipients] = useState<EmailAddress[]>([])
  const [bccRecipients, setBccRecipients] = useState<EmailAddress[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [assistantBulletDraft, setAssistantBulletDraft] = useState('')
  const [assistantReplyIntent, setAssistantReplyIntent] = useState('')
  const [assistantTone, setAssistantTone] = useState<'formal' | 'informal' | 'friendly' | 'professional' | 'concise'>(
    'professional'
  )
  const [assistantFormality, setAssistantFormality] = useState<'formal' | 'neutral' | 'informal'>('neutral')
  const [assistantLength, setAssistantLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [assistantCustomInstruction, setAssistantCustomInstruction] = useState('')
  const hasStartedComposingRef = useRef(false)
  const sigPreviewRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation(translations)
  const assistant = useEmailAssistant(isOpen && Boolean(accountId))
  const {
    isEnabled: isAssistantEnabled,
    isCapabilitiesLoading: isAssistantCapabilitiesLoading,
    loading: assistantLoading,
    latestOutput: assistantLatestOutput,
    previewDraft: assistantPreviewDraft,
    lastError: assistantLastError,
    autoTemperatureCheck,
    setAutoTemperatureCheck,
    clearPreviewDraft,
    generateDraft,
    rewriteDraft,
    suggestReply,
    runTemperatureCheck,
    runDebouncedTemperatureCheck,
    retryLastAction,
    cancelAction,
    setPreviewDraftOverride
  } = assistant

  const {
    attachments,
    totalSize,
    isDragging,
    fileInputRef,
    removeAttachment,
    clearAttachments,
    openFilePicker,
    handleFileInputChange,
    dragHandlers
  } = useFileAttachments({ t })

  // Update accountId when accounts load or defaultAccountId changes
  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(defaultAccountId || accounts[0]?.id || '')
    }
  }, [accounts, defaultAccountId, accountId])

  // Get active account for signature
  const activeAccount = accounts.find(a => a.id === accountId) || accounts[0]
  const signatureHtml = activeAccount?.signature || ''

  // Render HTML signature preview
  useEffect(() => {
    if (sigPreviewRef.current) {
      sigPreviewRef.current.innerHTML = signatureHtml
    }
  }, [signatureHtml])

  // Populate fields based on mode and replyToMessage.
  // `isOpen` is included so the reset re-runs every time the composer opens,
  // even when mode/replyToMessage haven't changed (e.g. composing two new
  // emails in a row).
  useEffect(() => {
    if (!isOpen) return

    hasStartedComposingRef.current = false
    clearPreviewDraft()
    setAssistantBulletDraft('')
    setAssistantReplyIntent('')
    setAssistantCustomInstruction('')

    if (!replyToMessage) {
      setToRecipients([])
      setCcRecipients([])
      setBccRecipients([])
      setSubject('')
      setBody('')
      setShowCcBcc(false)
      clearAttachments()
      return
    }

    const msg = replyToMessage
    setSubject(buildReplySubject(msg.subject || '', mode))
    const quoted = buildReplyBody(msg)

    if (mode === 'reply') {
      const replyAddr = msg.replyToAddresses?.[0] || msg.fromAddress
      setToRecipients([replyAddr])
      setBody(quoted)
    } else if (mode === 'reply-all') {
      const replyAddr = msg.replyToAddresses?.[0] || msg.fromAddress
      setToRecipients([replyAddr])
      const ccAddrs = [...msg.toAddresses, ...msg.ccAddresses].filter(a => a.address !== replyAddr.address)
      setCcRecipients(ccAddrs)
      setShowCcBcc(ccAddrs.length > 0)
      setBody(quoted)
    } else if (mode === 'forward') {
      setToRecipients([])
      setBody(quoted)
    }
  }, [isOpen, replyToMessage, mode, clearAttachments, clearPreviewDraft])

  useEffect(() => {
    if (!isAssistantEnabled) return
    if (!subject.trim() && !body.trim()) return
    const recipients = [...toRecipients, ...ccRecipients, ...bccRecipients]
    runDebouncedTemperatureCheck({
      subject,
      textBody: body,
      recipients: recipients.length > 0 ? recipients : undefined
    })
  }, [isAssistantEnabled, runDebouncedTemperatureCheck, body, subject, toRecipients, ccRecipients, bccRecipients])

  const handleApplyAssistantPreview = useCallback(() => {
    const preview = assistantPreviewDraft
    if (!preview) return
    if (preview.subject.trim()) setSubject(preview.subject)
    if (preview.textBody.trim()) setBody(preview.textBody)
    clearPreviewDraft()
    trackEmailAssistantEvent('assistant.preview.accepted', { mode })
  }, [assistantPreviewDraft, clearPreviewDraft, mode])

  const handleRejectAssistantPreview = useCallback(() => {
    clearPreviewDraft()
    trackEmailAssistantEvent('assistant.preview.rejected', { mode })
  }, [clearPreviewDraft, mode])

  const handleGenerateAssistantDraft = useCallback(async () => {
    if (!accountId) {
      toast.error(t('composer-toast-no-account'))
      return
    }
    const isReplyMode = mode === 'reply' || mode === 'reply-all'
    if (isReplyMode && replyToMessage) {
      const messageId = replyToMessage.id?.trim()
      const threadId = replyToMessage.threadId?.trim()
      if (!messageId && !threadId) {
        toast.error(t('assistant-reply-context-missing'))
        return
      }
      const response = await suggestReply({
        accountId,
        ...(messageId ? { messageId } : { threadId }),
        userBulletDraft: assistantBulletDraft.trim() || undefined,
        tone: assistantTone,
        formality: assistantFormality,
        length: assistantLength
      })
      const recipientName = toRecipients[0]?.name || replyToMessage.fromAddress?.name
      if (response?.draft?.textBody && recipientName) {
        const normalizedTextBody = normalizeReplyGreeting(response.draft.textBody, recipientName)
        if (normalizedTextBody !== response.draft.textBody) {
          setPreviewDraftOverride({
            ...response.draft,
            textBody: normalizedTextBody
          })
        }
      }
      return
    }

    await generateDraft({
      accountId,
      mode,
      bulletDraft: assistantBulletDraft,
      tone: assistantTone,
      formality: assistantFormality,
      length: assistantLength
    })
  }, [
    accountId,
    mode,
    replyToMessage,
    assistantReplyIntent,
    assistantBulletDraft,
    assistantTone,
    assistantFormality,
    assistantLength,
    suggestReply,
    generateDraft,
    t
  ])

  const handleSuggestReply = useCallback(async () => {
    if (!accountId || !replyToMessage) return
    const messageId = replyToMessage.id?.trim()
    const threadId = replyToMessage.threadId?.trim()
    if (!messageId && !threadId) {
      toast.error(t('assistant-reply-context-missing'))
      return
    }
    const response = await suggestReply({
      accountId,
      ...(messageId ? { messageId } : { threadId }),
      userBulletDraft: assistantBulletDraft.trim() || undefined,
      tone: assistantTone,
      formality: assistantFormality,
      length: assistantLength
    })
    const recipientName = toRecipients[0]?.name || replyToMessage.fromAddress?.name
    if (response?.draft?.textBody && recipientName) {
      const normalizedTextBody = normalizeReplyGreeting(response.draft.textBody, recipientName)
      if (normalizedTextBody !== response.draft.textBody) {
        setPreviewDraftOverride({
          ...response.draft,
          textBody: normalizedTextBody
        })
      }
    }
  }, [
    accountId,
    replyToMessage,
    suggestReply,
    assistantBulletDraft,
    assistantTone,
    assistantFormality,
    assistantLength,
    setPreviewDraftOverride,
    t,
    toRecipients
  ])

  const handleRewrite = useCallback(
    async (action: 'improve' | 'tone' | 'shorten' | 'expand' | 'custom', overrideTone?: typeof assistantTone) => {
      if (!accountId) {
        toast.error(t('composer-toast-no-account'))
        return
      }
      await rewriteDraft({
        accountId,
        action,
        draft: {
          subject,
          textBody: body
        },
        tone: overrideTone || assistantTone,
        length: assistantLength,
        instruction: action === 'custom' ? assistantCustomInstruction : undefined
      })
    },
    [accountId, subject, body, assistantTone, assistantLength, assistantCustomInstruction, rewriteDraft, t]
  )

  const handleRunTemperatureCheck = useCallback(async () => {
    const recipients = [...toRecipients, ...ccRecipients, ...bccRecipients]
    await runTemperatureCheck({
      subject,
      textBody: body,
      recipients: recipients.length > 0 ? recipients : undefined
    })
  }, [runTemperatureCheck, subject, body, toRecipients, ccRecipients, bccRecipients])

  const handleSend = useCallback(async () => {
    if (toRecipients.length === 0) {
      toast.error(t('composer-toast-no-recipient'))
      return
    }
    if (!accountId) {
      toast.error(t('composer-toast-no-account'))
      return
    }

    setIsSending(true)
    try {
      if (autoTemperatureCheck && (subject.trim() || body.trim())) {
        const recipients = [...toRecipients, ...ccRecipients, ...bccRecipients]
        void runTemperatureCheck({
          subject,
          textBody: body,
          recipients: recipients.length > 0 ? recipients : undefined
        })
      }

      const request: SendEmailRequest = {
        accountId,
        to: toRecipients,
        cc: ccRecipients.length > 0 ? ccRecipients : undefined,
        bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
        subject,
        textBody: buildTextBody(body, signatureHtml),
        htmlBody: buildHtmlBody(body, signatureHtml),
        inReplyTo: replyToMessage?.messageId,
        threadId: replyToMessage?.threadId,
        attachments: attachments.length > 0 ? attachments : undefined
      }

      await EmailApiService.sendEmail(request)

      const allRecipients = [
        ...toRecipients.map(r => ({ name: r.name, email: r.address })),
        ...ccRecipients.map(r => ({ name: r.name, email: r.address })),
        ...bccRecipients.map(r => ({ name: r.name, email: r.address }))
      ]
      onRecipientsUsed?.(allRecipients)

      toast.success(t('composer-toast-sent'))
      onSent()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('composer-toast-send-failed'))
    } finally {
      setIsSending(false)
    }
  }, [
    accountId,
    toRecipients,
    ccRecipients,
    bccRecipients,
    subject,
    body,
    signatureHtml,
    attachments,
    replyToMessage,
    autoTemperatureCheck,
    runTemperatureCheck,
    onSent,
    onClose,
    onRecipientsUsed,
    t
  ])

  const handleSaveDraft = useCallback(async () => {
    if (!accountId) return
    try {
      await EmailApiService.sendEmail({
        accountId,
        to: toRecipients,
        subject,
        textBody: body,
        isDraft: true
      })
      toast.success(t('composer-toast-draft-saved'))
      onClose()
    } catch {
      toast.error(t('composer-toast-draft-failed'))
    }
  }, [accountId, toRecipients, subject, body, onClose, t])

  const modeTitle = {
    new: t('composer-mode-new'),
    reply: t('composer-mode-reply'),
    'reply-all': t('composer-mode-reply-all'),
    forward: t('composer-mode-forward')
  }[mode]

  if (!isOpen) return null

  return (
    <div
      className={`gba:fixed gba:bottom-0 gba:right-6 gba:z-50 gba:w-xl gba:bg-card gba:border gba:rounded-t-xl gba:flex gba:flex-col ${
        isMinimized ? 'gba:h-12' : 'gba:max-h-screen gba:h-3/4'
      } gba:transition-all gba:duration-200`}
      data-testid={testId}
    >
      {/* Title bar */}
      <div
        className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:bg-primary gba:text-primary-foreground gba:rounded-t-xl gba:cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <span className="gba:text-sm gba:font-medium">{modeTitle}</span>
        <div className="gba:flex gba:items-center gba:gap-1">
          <button
            onClick={e => {
              e.stopPropagation()
              setIsMinimized(!isMinimized)
            }}
            className="gba:p-1 gba:rounded hover:gba:bg-primary-foreground/20"
          >
            <Minus className="gba:w-4 gba:h-4" />
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              onClose()
            }}
            className="gba:p-1 gba:rounded hover:gba:bg-primary-foreground/20"
          >
            <X className="gba:w-4 gba:h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Fields */}
          <div className="gba:px-4 gba:py-2 gba:space-y-2 gba:border-b">
            {/* From account selector */}
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-xs gba:text-muted-foreground gba:w-8">{t('composer-from')}</span>
              {accounts.length === 1 ? (
                <span className="gba:text-sm gba:text-foreground">{accounts[0]?.emailAddress}</span>
              ) : (
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="gba:h-8 gba:text-sm gba:bg-background gba:border gba:rounded gba:px-2 gba:flex-1"
                  data-testid={`${testId}-from`}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.emailAddress}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* To field with auto-suggest */}
            <div className="gba:flex gba:items-start gba:gap-2">
              <span className="gba:text-xs gba:text-muted-foreground gba:w-8 gba:mt-2">{t('composer-to')}</span>
              <EmailRecipientInput
                recipients={toRecipients}
                onChange={setToRecipients}
                searchContacts={searchContacts}
                placeholder={t('composer-recipients-placeholder')}
                data-testid={`${testId}-to`}
              />
              {!showCcBcc && (
                <button
                  onClick={() => setShowCcBcc(true)}
                  className="gba:text-xs gba:text-primary hover:gba:underline gba:flex-shrink-0 gba:mt-2"
                >
                  {t('composer-cc-bcc')}
                </button>
              )}
            </div>

            {showCcBcc && (
              <>
                <div className="gba:flex gba:items-start gba:gap-2">
                  <span className="gba:text-xs gba:text-muted-foreground gba:w-8 gba:mt-2">{t('composer-cc')}</span>
                  <EmailRecipientInput
                    recipients={ccRecipients}
                    onChange={setCcRecipients}
                    searchContacts={searchContacts}
                    placeholder={t('composer-recipient-input-placeholder')}
                    data-testid={`${testId}-cc`}
                  />
                </div>
                <div className="gba:flex gba:items-start gba:gap-2">
                  <span className="gba:text-xs gba:text-muted-foreground gba:w-8 gba:mt-2">{t('composer-bcc')}</span>
                  <EmailRecipientInput
                    recipients={bccRecipients}
                    onChange={setBccRecipients}
                    searchContacts={searchContacts}
                    placeholder={t('composer-recipient-input-placeholder')}
                    data-testid={`${testId}-bcc`}
                  />
                </div>
              </>
            )}

            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-xs gba:text-muted-foreground gba:w-8">{t('composer-subj')}</span>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder={t('composer-subject-placeholder')}
                className="gba:flex-1 gba:h-8 gba:text-sm gba:bg-background gba:border gba:rounded gba:px-2 gba:outline-none"
                data-testid={`${testId}-subject`}
              />
            </div>
          </div>

          {/* Body + Signature preview (drag-and-drop zone) */}
          <div className="gba:flex-1 gba:overflow-y-auto gba:px-4 gba:py-2 gba:relative" {...dragHandlers}>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={t('composer-body-placeholder')}
              className="gba:min-h-32 gba:resize-none gba:text-sm gba:border-0 gba:p-0 gba:focus:ring-0"
              data-testid={`${testId}-body`}
            />
            <EmailAssistantBubble
              isEnabled={isAssistantEnabled}
              isCapabilitiesLoading={isAssistantCapabilitiesLoading}
              loading={assistantLoading}
              mode={mode}
              bulletDraft={assistantBulletDraft}
              onBulletDraftChange={setAssistantBulletDraft}
              replyIntent={assistantReplyIntent}
              onReplyIntentChange={setAssistantReplyIntent}
              tone={assistantTone}
              onToneChange={setAssistantTone}
              formality={assistantFormality}
              onFormalityChange={setAssistantFormality}
              length={assistantLength}
              onLengthChange={setAssistantLength}
              customInstruction={assistantCustomInstruction}
              onCustomInstructionChange={setAssistantCustomInstruction}
              latestOutput={assistantLatestOutput}
              previewDraft={assistantPreviewDraft}
              lastError={assistantLastError}
              autoTemperatureCheck={autoTemperatureCheck}
              onAutoTemperatureCheckChange={setAutoTemperatureCheck}
              onGenerateDraft={handleGenerateAssistantDraft}
              onSuggestReply={handleSuggestReply}
              onRewrite={handleRewrite}
              onRewriteFormal={() => {
                setAssistantTone('formal')
                void handleRewrite('tone', 'formal')
              }}
              onRewriteInformal={() => {
                setAssistantTone('informal')
                void handleRewrite('tone', 'informal')
              }}
              onRunTemperatureCheck={handleRunTemperatureCheck}
              onAcceptPreview={handleApplyAssistantPreview}
              onRejectPreview={handleRejectAssistantPreview}
              onRetry={() => {
                void retryLastAction()
              }}
              onCancel={cancelAction}
              data-testid={`${testId}-assistant`}
            />

            {/* Rich signature preview */}
            {signatureHtml && (
              <div className="gba:mt-3 gba:pt-2 gba:border-t gba:border-dashed gba:border-muted-foreground/30">
                <p className="gba:text-[10px] gba:text-muted-foreground gba:mb-1">--</p>
                <div
                  ref={sigPreviewRef}
                  className="gba:prose gba:prose-sm gba:max-w-none gba:text-foreground gba:pointer-events-none gba:opacity-80"
                  data-testid={`${testId}-signature-preview`}
                />
              </div>
            )}

            {/* Drag-and-drop overlay */}
            {isDragging && (
              <div className="gba:absolute gba:inset-0 gba:z-10 gba:flex gba:items-center gba:justify-center gba:bg-primary/5 gba:border-2 gba:border-dashed gba:border-primary gba:rounded-lg">
                <div className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:text-primary">
                  <Paperclip className="gba:w-8 gba:h-8" />
                  <span className="gba:text-sm gba:font-medium">{t('composer-drop-files')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="gba:hidden"
            onChange={handleFileInputChange}
            data-testid={`${testId}-file-input`}
          />

          {/* Attachment chips */}
          <ComposerAttachments
            attachments={attachments}
            onRemove={removeAttachment}
            totalSize={totalSize}
            formatSummary={(count, size) => t('composer-attachments-summary', { count, size })}
            data-testid={`${testId}-attachments`}
          />

          {/* Footer */}
          <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:border-t">
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button onClick={handleSend} disabled={isSending} size="sm" data-testid={`${testId}-send`}>
                <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                {isSending ? t('composer-sending') : t('composer-send')}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSaveDraft}>
                {t('composer-save-draft')}
              </Button>
            </div>
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button variant="ghost" size="icon" onClick={openFilePicker} data-testid={`${testId}-attach-btn`}>
                <Paperclip className="gba:w-4 gba:h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <Trash2 className="gba:w-4 gba:h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
