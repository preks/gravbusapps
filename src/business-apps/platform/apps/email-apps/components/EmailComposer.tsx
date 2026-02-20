/**
 * EmailComposer - Email composition dialog with auto-suggest recipients.
 * Supports new, reply, reply-all, and forward modes with rich HTML signature.
 * Signature is rendered as a styled preview below the body and injected into
 * the htmlBody on send, positioned before any quoted reply text.
 * Supports file attachments via button and drag-and-drop.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button, Textarea } from '@newwork/nw-design-system'
import { Send, X, Minus, Trash2, Paperclip } from 'lucide-react'
import { EmailApiService } from '../services/EmailApiService'
import { EmailRecipientInput } from './EmailRecipientInput'
import { ComposerAttachments } from './ComposerAttachments'
import { useFileAttachments } from '../hooks/useFileAttachments'
import { buildReplySubject, buildReplyBody, buildHtmlBody, buildTextBody } from '../utils/composerUtils'
import type { EmailMessage, EmailAccount, ComposeMode, SendEmailRequest, EmailAddress, EmailContact } from '../types'

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
  const hasStartedComposingRef = useRef(false)
  const sigPreviewRef = useRef<HTMLDivElement>(null)

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
  } = useFileAttachments()

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
  }, [isOpen, replyToMessage, mode, clearAttachments])

  const handleSend = useCallback(async () => {
    if (toRecipients.length === 0) {
      toast.error('Please add at least one recipient')
      return
    }
    if (!accountId) {
      toast.error('Please select an account')
      return
    }

    setIsSending(true)
    try {
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

      toast.success('Email sent')
      onSent()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email')
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
    onSent,
    onClose,
    onRecipientsUsed
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
      toast.success('Draft saved')
      onClose()
    } catch {
      toast.error('Failed to save draft')
    }
  }, [accountId, toRecipients, subject, body, onClose])

  const modeTitle = { new: 'New message', reply: 'Reply', 'reply-all': 'Reply all', forward: 'Forward' }[mode]

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
              <span className="gba:text-xs gba:text-muted-foreground gba:w-8">From</span>
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
              <span className="gba:text-xs gba:text-muted-foreground gba:w-8 gba:mt-2">To</span>
              <EmailRecipientInput
                recipients={toRecipients}
                onChange={setToRecipients}
                searchContacts={searchContacts}
                placeholder="Recipients"
                data-testid={`${testId}-to`}
              />
              {!showCcBcc && (
                <button
                  onClick={() => setShowCcBcc(true)}
                  className="gba:text-xs gba:text-primary hover:gba:underline gba:flex-shrink-0 gba:mt-2"
                >
                  Cc/Bcc
                </button>
              )}
            </div>

            {showCcBcc && (
              <>
                <div className="gba:flex gba:items-start gba:gap-2">
                  <span className="gba:text-xs gba:text-muted-foreground gba:w-8 gba:mt-2">Cc</span>
                  <EmailRecipientInput
                    recipients={ccRecipients}
                    onChange={setCcRecipients}
                    searchContacts={searchContacts}
                    data-testid={`${testId}-cc`}
                  />
                </div>
                <div className="gba:flex gba:items-start gba:gap-2">
                  <span className="gba:text-xs gba:text-muted-foreground gba:w-8 gba:mt-2">Bcc</span>
                  <EmailRecipientInput
                    recipients={bccRecipients}
                    onChange={setBccRecipients}
                    searchContacts={searchContacts}
                    data-testid={`${testId}-bcc`}
                  />
                </div>
              </>
            )}

            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-xs gba:text-muted-foreground gba:w-8">Subj</span>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Subject"
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
              placeholder="Write your message..."
              className="gba:min-h-32 gba:resize-none gba:text-sm gba:border-0 gba:p-0 gba:focus:ring-0"
              data-testid={`${testId}-body`}
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
                  <span className="gba:text-sm gba:font-medium">Drop files to attach</span>
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
            data-testid={`${testId}-attachments`}
          />

          {/* Footer */}
          <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:border-t">
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button onClick={handleSend} disabled={isSending} size="sm" data-testid={`${testId}-send`}>
                <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                {isSending ? 'Sending...' : 'Send'}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSaveDraft}>
                Save draft
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
