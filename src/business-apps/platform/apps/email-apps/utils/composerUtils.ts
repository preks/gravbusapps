/**
 * Utility functions for the email composer component.
 */

import type { ComposeMode, EmailMessage } from '../types'

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
