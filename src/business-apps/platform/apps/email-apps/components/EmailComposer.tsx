/**
 * EmailComposer - Email composition dialog with rich text editing.
 * Supports new, reply, reply-all, and forward modes.
 */

import React, { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Button, Input, Textarea } from '@newwork/nw-design-system'
import { Send, X, Minus, Trash2 } from 'lucide-react'
import { EmailApiService } from '../services/EmailApiService'
import type { EmailMessage, EmailAccount, ComposeMode, SendEmailRequest, EmailAddress } from '../types'

interface EmailComposerProps {
  isOpen: boolean
  onClose: () => void
  mode: ComposeMode
  replyToMessage?: EmailMessage | null
  accounts: EmailAccount[]
  defaultAccountId?: string
  onSent: () => void
  'data-testid'?: string
}

function buildReplySubject(subject: string, mode: ComposeMode): string {
  const clean = subject.replace(/^(Re:\s*|Fwd:\s*)+/i, '')
  if (mode === 'forward') return `Fwd: ${clean}`
  return `Re: ${clean}`
}

function buildReplyBody(message: EmailMessage): string {
  const date = new Date(message.date).toLocaleString()
  const from = message.fromAddress.name || message.fromAddress.address
  const divider = `\n\n---------- On ${date}, ${from} wrote ----------\n\n`
  return divider + (message.textBody || '')
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  isOpen,
  onClose,
  mode,
  replyToMessage,
  accounts,
  defaultAccountId,
  onSent,
  'data-testid': testId = 'email-composer'
}) => {
  const [accountId, setAccountId] = useState(defaultAccountId || '')
  const [to, setTo] = useState('')

  // Update accountId when accounts load or defaultAccountId changes
  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(defaultAccountId || accounts[0]?.id || '')
    }
  }, [accounts, defaultAccountId, accountId])
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  // Populate fields based on mode
  useEffect(() => {
    if (!replyToMessage) {
      setTo('')
      setCc('')
      setBcc('')
      setSubject('')
      setBody('')
      return
    }

    const msg = replyToMessage
    setSubject(buildReplySubject(msg.subject || '', mode))

    if (mode === 'reply') {
      const replyAddr = msg.replyToAddresses?.[0] || msg.fromAddress
      setTo(replyAddr.address)
      setBody(buildReplyBody(msg))
    } else if (mode === 'reply-all') {
      const replyAddr = msg.replyToAddresses?.[0] || msg.fromAddress
      setTo(replyAddr.address)
      const ccAddrs = [...msg.toAddresses, ...msg.ccAddresses].filter(a => a.address !== replyAddr.address)
      setCc(ccAddrs.map(a => a.address).join(', '))
      setShowCcBcc(ccAddrs.length > 0)
      setBody(buildReplyBody(msg))
    } else if (mode === 'forward') {
      setTo('')
      setBody(buildReplyBody(msg))
    }
  }, [replyToMessage, mode])

  const parseAddresses = (input: string): EmailAddress[] => {
    return input
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(addr => ({ address: addr }))
  }

  const handleSend = useCallback(async () => {
    if (!to.trim()) {
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
        to: parseAddresses(to),
        cc: cc ? parseAddresses(cc) : undefined,
        bcc: bcc ? parseAddresses(bcc) : undefined,
        subject,
        textBody: body,
        htmlBody: `<div>${body.replace(/\n/g, '<br>')}</div>`,
        inReplyTo: replyToMessage?.messageId,
        threadId: replyToMessage?.threadId
      }

      await EmailApiService.sendEmail(request)
      toast.success('Email sent')
      onSent()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setIsSending(false)
    }
  }, [accountId, to, cc, bcc, subject, body, replyToMessage, onSent, onClose])

  const handleSaveDraft = useCallback(async () => {
    if (!accountId) return
    try {
      await EmailApiService.sendEmail({
        accountId,
        to: parseAddresses(to),
        subject,
        textBody: body,
        isDraft: true
      })
      toast.success('Draft saved')
      onClose()
    } catch {
      toast.error('Failed to save draft')
    }
  }, [accountId, to, subject, body, onClose])

  const modeTitle = {
    new: 'New message',
    reply: 'Reply',
    'reply-all': 'Reply all',
    forward: 'Forward'
  }[mode]

  if (!isOpen) return null

  return (
    <div
      className={`gba:fixed gba:bottom-0 gba:right-6 gba:z-50 gba:w-[560px] gba:bg-card gba:border gba:rounded-t-xl gba:shadow-lg gba:flex gba:flex-col ${
        isMinimized ? 'gba:h-12' : 'gba:h-[520px]'
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
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-xs gba:text-muted-foreground gba:w-8">To</span>
              <Input
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="Recipients"
                className="gba:h-8 gba:text-sm"
                data-testid={`${testId}-to`}
              />
              {!showCcBcc && (
                <button
                  onClick={() => setShowCcBcc(true)}
                  className="gba:text-xs gba:text-primary hover:gba:underline gba:flex-shrink-0"
                >
                  Cc/Bcc
                </button>
              )}
            </div>
            {showCcBcc && (
              <>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-xs gba:text-muted-foreground gba:w-8">Cc</span>
                  <Input value={cc} onChange={e => setCc(e.target.value)} className="gba:h-8 gba:text-sm" />
                </div>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-xs gba:text-muted-foreground gba:w-8">Bcc</span>
                  <Input value={bcc} onChange={e => setBcc(e.target.value)} className="gba:h-8 gba:text-sm" />
                </div>
              </>
            )}
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-xs gba:text-muted-foreground gba:w-8">Subj</span>
              <Input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Subject"
                className="gba:h-8 gba:text-sm"
                data-testid={`${testId}-subject`}
              />
            </div>
          </div>

          {/* Body */}
          <div className="gba:flex-1 gba:overflow-hidden gba:px-4 gba:py-2">
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your message..."
              className="gba:h-full gba:resize-none gba:text-sm gba:border-0 gba:p-0 focus:gba:ring-0"
              data-testid={`${testId}-body`}
            />
          </div>

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
            <Button variant="ghost" size="icon" onClick={onClose}>
              <Trash2 className="gba:w-4 gba:h-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
