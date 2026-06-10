// Helpers for compose_email HITL in the Workforce run drawer.

import type { ComposeEmailDraft, ComposeEmailRecipient } from '../../types/enterpriseAgent'

export interface ComposeEmailPending {
  draft: ComposeEmailDraft
  description?: string
}

function normalizeRecipients(value: unknown): ComposeEmailRecipient[] {
  if (!Array.isArray(value)) return []
  const recipients: ComposeEmailRecipient[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const address = typeof record.address === 'string' ? record.address.trim() : ''
    if (!address) continue
    const name = typeof record.name === 'string' ? record.name : undefined
    recipients.push(name ? { name, address } : { address })
  }
  return recipients
}

function parseEmailDraft(raw: unknown): ComposeEmailDraft | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const subject = typeof record.subject === 'string' ? record.subject : ''
  const htmlBody =
    typeof record.html_body === 'string' ? record.html_body : typeof record.htmlBody === 'string' ? record.htmlBody : ''
  const textBody =
    typeof record.text_body === 'string'
      ? record.text_body
      : typeof record.textBody === 'string'
        ? record.textBody
        : null

  if (!subject.trim() && !htmlBody.trim() && !textBody?.trim()) {
    return null
  }

  return {
    to: normalizeRecipients(record.to),
    cc: normalizeRecipients(record.cc),
    bcc: normalizeRecipients(record.bcc),
    subject,
    html_body: htmlBody,
    text_body: textBody,
    signature: typeof record.signature === 'string' ? record.signature : null,
    account_id:
      typeof record.account_id === 'string'
        ? record.account_id
        : typeof record.accountId === 'string'
          ? record.accountId
          : null,
    crm_entity_type:
      typeof record.crm_entity_type === 'string'
        ? record.crm_entity_type
        : typeof record.crmEntityType === 'string'
          ? record.crmEntityType
          : null,
    crm_entity_id:
      typeof record.crm_entity_id === 'string'
        ? record.crm_entity_id
        : typeof record.crmEntityId === 'string'
          ? record.crmEntityId
          : null,
    attachments: Array.isArray(record.attachments) ? (record.attachments as ComposeEmailDraft['attachments']) : null
  }
}

export function getComposeEmailPending(
  pending: Record<string, unknown> | null | undefined
): ComposeEmailPending | null {
  if (!pending || pending.form_id !== 'compose_email') return null
  const draft = parseEmailDraft(pending.email_draft)
  if (!draft) return null
  const description = typeof pending.description === 'string' ? pending.description : undefined
  return { draft, description }
}
