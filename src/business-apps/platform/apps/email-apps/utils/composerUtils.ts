/**
 * Utility functions for the email composer component.
 */

import type { ComposeMode, EmailMessage } from '../types'

/** The divider pattern used to separate new content from quoted reply text. */
const QUOTE_DIVIDER_PATTERN = /\n\n-{10} On /

/** Build subject line for reply/forward */
export function buildReplySubject(subject: string, mode: ComposeMode): string {
  const clean = subject.replace(/^(Re:\s*|Fwd:\s*)+/i, '')
  if (mode === 'forward') return `Fwd: ${clean}`
  return `Re: ${clean}`
}

/** Build quoted reply body text */
export function buildReplyBody(message: EmailMessage): string {
  const date = new Date(message.date).toLocaleString()
  const from = message.fromAddress.name || message.fromAddress.address
  const divider = `\n\n---------- On ${date}, ${from} wrote ----------\n\n`
  return divider + (message.textBody || '')
}

/** Strip HTML tags to get plain text. */
export function htmlToPlainText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

/**
 * Build the full htmlBody with signature inserted before quoted text.
 * For replies, the signature is placed between the user's content and the quoted block.
 */
export function buildHtmlBody(body: string, signatureHtml: string): string {
  const sig = signatureHtml
    ? `<br><div class="email-signature" style="margin-top:16px;padding-top:8px;border-top:1px solid #e5e7eb;">--<br>${signatureHtml}</div>`
    : ''

  const dividerMatch = body.match(QUOTE_DIVIDER_PATTERN)
  if (dividerMatch && dividerMatch.index !== undefined) {
    const userText = body.slice(0, dividerMatch.index)
    const quotedText = body.slice(dividerMatch.index)
    const userHtml = `<div>${userText.replace(/\n/g, '<br>')}</div>`
    const quotedHtml = `<div style="color:#6b7280;border-left:2px solid #d1d5db;padding-left:12px;margin-top:16px;">${quotedText.replace(/\n/g, '<br>')}</div>`
    return userHtml + sig + quotedHtml
  }

  return `<div>${body.replace(/\n/g, '<br>')}</div>${sig}`
}

/** Build plain text body with signature appended before quoted text. */
export function buildTextBody(body: string, signatureHtml: string): string {
  if (!signatureHtml) return body
  const plainSig = htmlToPlainText(signatureHtml)
  const dividerMatch = body.match(QUOTE_DIVIDER_PATTERN)
  if (dividerMatch && dividerMatch.index !== undefined) {
    const userText = body.slice(0, dividerMatch.index)
    const quotedText = body.slice(dividerMatch.index)
    return `${userText}\n\n--\n${plainSig}${quotedText}`
  }
  return `${body}\n\n--\n${plainSig}`
}
