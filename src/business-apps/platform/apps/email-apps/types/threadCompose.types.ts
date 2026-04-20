import type React from 'react'
import type { ComposeMode, EmailAccount, EmailAddress, EmailContact, EmailMessage, SendAttachment } from './index'
import type { useEmailAssistant } from '../hooks/useEmailAssistant'

export interface ThreadComposeSurfaceProps {
  isOpen: boolean
  onClose: () => void
  mode: ComposeMode
  replyToMessage?: EmailMessage | null
  draftMessage?: EmailMessage | null
  accounts: EmailAccount[]
  defaultAccountId?: string
  onSent: () => void
  searchContacts: (query: string) => EmailContact[]
  onRecipientsUsed?: (recipients: Array<{ name?: string; email: string }>) => void
  assistantEnabled?: boolean
  'data-testid'?: string
}

export interface ThreadComposeDraftState {
  toRecipients: EmailAddress[]
  ccRecipients: EmailAddress[]
  bccRecipients: EmailAddress[]
  subject: string
  body: string
  showCcBcc: boolean
}

export interface ThreadComposeController {
  accountId: string
  setAccountId: (value: string) => void
  toRecipients: EmailAddress[]
  setToRecipients: (value: EmailAddress[]) => void
  ccRecipients: EmailAddress[]
  setCcRecipients: (value: EmailAddress[]) => void
  bccRecipients: EmailAddress[]
  setBccRecipients: (value: EmailAddress[]) => void
  subject: string
  setSubject: (value: string) => void
  body: string
  setBody: (value: string) => void
  showCcBcc: boolean
  setShowCcBcc: (value: boolean) => void
  isSending: boolean
  assistantBulletDraft: string
  setAssistantBulletDraft: (value: string) => void
  assistantReplyIntent: string
  setAssistantReplyIntent: (value: string) => void
  assistantTone: 'formal' | 'informal' | 'friendly' | 'professional' | 'concise'
  setAssistantTone: (value: 'formal' | 'informal' | 'friendly' | 'professional' | 'concise') => void
  assistantFormality: 'formal' | 'neutral' | 'informal'
  setAssistantFormality: (value: 'formal' | 'neutral' | 'informal') => void
  assistantLength: 'short' | 'medium' | 'long'
  setAssistantLength: (value: 'short' | 'medium' | 'long') => void
  assistantCustomInstruction: string
  setAssistantCustomInstruction: (value: string) => void
  assistant: ReturnType<typeof useEmailAssistant>
  attachments: SendAttachment[]
  totalAttachmentSize: number
  isDragging: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  removeAttachment: (index: number) => void
  openFilePicker: () => void
  handleFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  dragHandlers: {
    onDragOver: (event: React.DragEvent) => void
    onDragLeave: (event: React.DragEvent) => void
    onDrop: (event: React.DragEvent) => void
  }
  actions: {
    send: () => Promise<void>
    saveDraft: () => Promise<void>
    generateAssistantDraft: () => Promise<void>
    suggestReply: () => Promise<void>
    rewrite: (
      action: 'improve' | 'tone' | 'shorten' | 'expand' | 'custom',
      overrideTone?: 'formal' | 'informal' | 'friendly' | 'professional' | 'concise'
    ) => Promise<void>
    runTemperatureCheck: () => Promise<void>
    applyAssistantPreview: () => void
    rejectAssistantPreview: () => void
  }
}
