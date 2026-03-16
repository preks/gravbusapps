import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useEmailAssistant } from './useEmailAssistant'
import { useFileAttachments } from './useFileAttachments'
import { EmailApiService } from '../services/EmailApiService'
import { buildHtmlBody, buildTextBody } from '../utils/composerUtils'
import { createThreadComposeStateFromMode } from '../utils/threadComposeInit'
import { trackEmailAssistantEvent } from '../utils/emailAssistantTelemetry'
import type {
  ComposeMode,
  EmailAccount,
  EmailAssistantFormality,
  EmailAssistantLength,
  EmailAssistantRewriteAction,
  EmailAssistantTone,
  EmailMessage,
  SendEmailRequest
} from '../types'
import type { ThreadComposeController } from '../types/threadCompose.types'

interface UseThreadComposeControllerOptions {
  isOpen: boolean
  mode: ComposeMode
  replyToMessage?: EmailMessage | null
  accounts: EmailAccount[]
  defaultAccountId?: string
  onClose: () => void
  onSent: () => void
  onRecipientsUsed?: (recipients: Array<{ name?: string; email: string }>) => void
  t: (key: string, vars?: Record<string, string | number>) => string
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

export function useThreadComposeController({
  isOpen,
  mode,
  replyToMessage,
  accounts,
  defaultAccountId,
  onClose,
  onSent,
  onRecipientsUsed,
  t
}: UseThreadComposeControllerOptions): ThreadComposeController {
  const [accountId, setAccountId] = useState(defaultAccountId || '')
  const [toRecipients, setToRecipients] = useState<ThreadComposeController['toRecipients']>([])
  const [ccRecipients, setCcRecipients] = useState<ThreadComposeController['ccRecipients']>([])
  const [bccRecipients, setBccRecipients] = useState<ThreadComposeController['bccRecipients']>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const [assistantBulletDraft, setAssistantBulletDraft] = useState('')
  const [assistantReplyIntent, setAssistantReplyIntent] = useState('')
  const [assistantTone, setAssistantTone] = useState<EmailAssistantTone>('professional')
  const [assistantFormality, setAssistantFormality] = useState<EmailAssistantFormality>('neutral')
  const [assistantLength, setAssistantLength] = useState<EmailAssistantLength>('medium')
  const [assistantCustomInstruction, setAssistantCustomInstruction] = useState('')

  const assistant = useEmailAssistant(isOpen && Boolean(accountId))
  const {
    autoTemperatureCheck,
    setAutoTemperatureCheck,
    clearPreviewDraft,
    setPreviewDraftOverride,
    generateDraft,
    suggestReply,
    rewriteDraft,
    runTemperatureCheck,
    runDebouncedTemperatureCheck
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

  const activeAccount = useMemo(
    () => accounts.find(item => item.id === accountId) || accounts[0],
    [accounts, accountId]
  )
  const signatureHtml = activeAccount?.signature || ''
  const quotedReplyBody = useMemo(
    () => createThreadComposeStateFromMode(mode, replyToMessage).body,
    [mode, replyToMessage]
  )

  const getTemperatureDraftBody = useCallback(
    (draftBody: string): string => {
      const normalizedDraft = draftBody.replace(/\r\n/g, '\n')
      const normalizedQuoted = quotedReplyBody.replace(/\r\n/g, '\n')
      if (!normalizedQuoted) return normalizedDraft
      if (!normalizedDraft.endsWith(normalizedQuoted)) return normalizedDraft
      return normalizedDraft.slice(0, normalizedDraft.length - normalizedQuoted.length).trimEnd()
    },
    [quotedReplyBody]
  )

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(defaultAccountId || accounts[0]?.id || '')
    }
  }, [accounts, accountId, defaultAccountId])

  useEffect(() => {
    if (!isOpen) return

    clearPreviewDraft()
    setAssistantBulletDraft('')
    setAssistantReplyIntent('')
    setAssistantCustomInstruction('')
    clearAttachments()

    const nextState = createThreadComposeStateFromMode(mode, replyToMessage)
    setToRecipients(nextState.toRecipients)
    setCcRecipients(nextState.ccRecipients)
    setBccRecipients(nextState.bccRecipients)
    setSubject(nextState.subject)
    setBody(nextState.body)
    setShowCcBcc(nextState.showCcBcc)
  }, [isOpen, mode, replyToMessage, clearAttachments, clearPreviewDraft])

  useEffect(() => {
    if (!assistant.isEnabled) return
    if (!subject.trim() && !body.trim()) return

    const draftBodyForTemperatureCheck = getTemperatureDraftBody(body)
    if (!subject.trim() && !draftBodyForTemperatureCheck.trim()) return

    const recipients = [...toRecipients, ...ccRecipients, ...bccRecipients]
    runDebouncedTemperatureCheck({
      subject,
      textBody: draftBodyForTemperatureCheck,
      recipients: recipients.length > 0 ? recipients : undefined
    })
  }, [
    assistant.isEnabled,
    runDebouncedTemperatureCheck,
    getTemperatureDraftBody,
    subject,
    body,
    toRecipients,
    ccRecipients,
    bccRecipients
  ])

  const applyAssistantPreview = useCallback(() => {
    const preview = assistant.previewDraft
    if (!preview) return
    if (preview.subject.trim()) setSubject(preview.subject)
    if (preview.textBody.trim()) setBody(preview.textBody)
    clearPreviewDraft()
    trackEmailAssistantEvent('assistant.preview.accepted', { mode })
  }, [assistant.previewDraft, clearPreviewDraft, mode])

  const rejectAssistantPreview = useCallback(() => {
    clearPreviewDraft()
    trackEmailAssistantEvent('assistant.preview.rejected', { mode })
  }, [clearPreviewDraft, mode])

  const generateAssistantDraft = useCallback(async () => {
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
          setPreviewDraftOverride({ ...response.draft, textBody: normalizedTextBody })
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
    suggestReply,
    assistantBulletDraft,
    assistantTone,
    assistantFormality,
    assistantLength,
    toRecipients,
    setPreviewDraftOverride,
    generateDraft,
    t
  ])

  const suggestAssistantReply = useCallback(async () => {
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
        setPreviewDraftOverride({ ...response.draft, textBody: normalizedTextBody })
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

  const rewrite = useCallback(
    async (action: EmailAssistantRewriteAction, overrideTone?: EmailAssistantTone) => {
      if (!accountId) {
        toast.error(t('composer-toast-no-account'))
        return
      }
      await rewriteDraft({
        accountId,
        action,
        draft: {
          subject: subject.trim() || undefined,
          textBody: body.trim() || undefined
        },
        tone: overrideTone || assistantTone,
        length: assistantLength,
        instruction: action === 'custom' ? assistantCustomInstruction : undefined
      })
    },
    [accountId, subject, body, assistantTone, assistantLength, assistantCustomInstruction, rewriteDraft, t]
  )

  const handleTemperatureCheck = useCallback(async () => {
    const draftBodyForTemperatureCheck = getTemperatureDraftBody(body)
    const recipients = [...toRecipients, ...ccRecipients, ...bccRecipients]
    await runTemperatureCheck({
      subject,
      textBody: draftBodyForTemperatureCheck,
      recipients: recipients.length > 0 ? recipients : undefined
    })
  }, [runTemperatureCheck, getTemperatureDraftBody, subject, body, toRecipients, ccRecipients, bccRecipients])

  const send = useCallback(async () => {
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
      const draftBodyForTemperatureCheck = getTemperatureDraftBody(body)
      if (autoTemperatureCheck && (subject.trim() || body.trim())) {
        const recipients = [...toRecipients, ...ccRecipients, ...bccRecipients]
        void runTemperatureCheck({
          subject,
          textBody: draftBodyForTemperatureCheck,
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
        ...toRecipients.map(item => ({ name: item.name, email: item.address })),
        ...ccRecipients.map(item => ({ name: item.name, email: item.address })),
        ...bccRecipients.map(item => ({ name: item.name, email: item.address }))
      ]
      onRecipientsUsed?.(allRecipients)
      toast.success(t('composer-toast-sent'))
      onSent()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('composer-toast-send-failed'))
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
    replyToMessage,
    attachments,
    onRecipientsUsed,
    autoTemperatureCheck,
    getTemperatureDraftBody,
    runTemperatureCheck,
    t,
    onSent,
    onClose
  ])

  const saveDraft = useCallback(async () => {
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
  }, [accountId, toRecipients, subject, body, t, onClose])

  return {
    accountId,
    setAccountId,
    toRecipients,
    setToRecipients,
    ccRecipients,
    setCcRecipients,
    bccRecipients,
    setBccRecipients,
    subject,
    setSubject,
    body,
    setBody,
    showCcBcc,
    setShowCcBcc,
    isSending,
    assistantBulletDraft,
    setAssistantBulletDraft,
    assistantReplyIntent,
    setAssistantReplyIntent,
    assistantTone,
    setAssistantTone,
    assistantFormality,
    setAssistantFormality,
    assistantLength,
    setAssistantLength,
    assistantCustomInstruction,
    setAssistantCustomInstruction,
    assistant: { ...assistant, autoTemperatureCheck, setAutoTemperatureCheck },
    attachments,
    totalAttachmentSize: totalSize,
    isDragging,
    fileInputRef,
    removeAttachment,
    openFilePicker,
    handleFileInputChange,
    dragHandlers,
    actions: {
      send,
      saveDraft,
      generateAssistantDraft,
      suggestReply: suggestAssistantReply,
      rewrite,
      runTemperatureCheck: handleTemperatureCheck,
      applyAssistantPreview,
      rejectAssistantPreview
    }
  }
}
