import { buildReplyBody, buildReplySubject } from './composerUtils'
import type { ComposeMode, EmailAddress, EmailMessage } from '../types'
import type { ThreadComposeDraftState } from '../types/threadCompose.types'

export function createEmptyThreadComposeState(): ThreadComposeDraftState {
  return {
    toRecipients: [],
    ccRecipients: [],
    bccRecipients: [],
    subject: '',
    body: '',
    showCcBcc: false
  }
}

function getPrimaryReplyAddress(message: EmailMessage): EmailAddress {
  return message.replyToAddresses?.[0] || message.fromAddress
}

export function createThreadComposeStateFromMode(
  mode: ComposeMode,
  replyToMessage?: EmailMessage | null
): ThreadComposeDraftState {
  if (!replyToMessage) return createEmptyThreadComposeState()

  const subject = buildReplySubject(replyToMessage.subject || '', mode)
  const quotedBody = buildReplyBody(replyToMessage)
  const primaryReplyAddress = getPrimaryReplyAddress(replyToMessage)

  if (mode === 'reply') {
    return {
      toRecipients: [primaryReplyAddress],
      ccRecipients: [],
      bccRecipients: [],
      subject,
      body: quotedBody,
      showCcBcc: false
    }
  }

  if (mode === 'reply-all') {
    const ccRecipients = [...replyToMessage.toAddresses, ...replyToMessage.ccAddresses].filter(
      entry => entry.address !== primaryReplyAddress.address
    )

    return {
      toRecipients: [primaryReplyAddress],
      ccRecipients,
      bccRecipients: [],
      subject,
      body: quotedBody,
      showCcBcc: ccRecipients.length > 0
    }
  }

  if (mode === 'forward') {
    return {
      toRecipients: [],
      ccRecipients: [],
      bccRecipients: [],
      subject,
      body: quotedBody,
      showCcBcc: false
    }
  }

  return createEmptyThreadComposeState()
}
