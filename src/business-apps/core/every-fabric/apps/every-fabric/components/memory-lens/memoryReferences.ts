// Pull navigable references out of a memory body.
//
// Agent memories embed `[label](protocol://id)` links (e.g.
// `[Uli & Denis](document://…)`, `account://`, `employee://`,
// `chat_conversation://`). This module extracts those links and resolves them,
// via the shared EntityLink resolver, into real platform destinations so the
// Memory Lens detail panel can offer one-click "Open" actions to the session /
// document / record the memory is about.

import { resolveEntityLink } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'

export type MemoryReferenceKind = 'session' | 'document' | 'person' | 'account' | 'record' | 'external' | 'link'

export interface MemoryReference {
  /** Stable de-dupe / React key. */
  id: string
  label: string
  /** The original markdown href (entity protocol url or plain url). */
  href: string
  /** A coarse category used only for icon / wording. */
  kind: MemoryReferenceKind
}

interface RawLink {
  label: string
  href: string
}

/** Linear-time `[label](href)` scan (mirrors crmRecordLinks, avoids ReDoS). */
const iterateMarkdownLinks = function* (content: string): Generator<RawLink> {
  let scanFrom = 0
  while (scanFrom < content.length) {
    const open = content.indexOf('[', scanFrom)
    if (open === -1) break

    const close = content.indexOf(']', open + 1)
    if (close === -1 || content[close + 1] !== '(') {
      scanFrom = open + 1
      continue
    }

    const closeParen = content.indexOf(')', close + 2)
    if (closeParen === -1) {
      scanFrom = open + 1
      continue
    }

    const label = content.slice(open + 1, close).trim()
    const href = content.slice(close + 2, closeParen).trim()
    if (label && href) yield { label, href }
    scanFrom = closeParen + 1
  }
}

const PERSON_PROTOCOLS = new Set([
  'employee',
  'contact',
  'customer_contact',
  'business_partner_person',
  'investment_contact'
])
const ACCOUNT_PROTOCOLS = new Set(['account', 'company', 'customer_account', 'investment_account'])
const DOCUMENT_PROTOCOLS = new Set([
  'document',
  'note',
  'slide',
  'spreadsheet',
  'crm_document',
  'content_document',
  'intranet',
  'article'
])

const protocolKind = (protocol: string | undefined): MemoryReferenceKind => {
  if (!protocol) return 'link'
  if (protocol === 'chat_conversation') return 'session'
  if (PERSON_PROTOCOLS.has(protocol)) return 'person'
  if (ACCOUNT_PROTOCOLS.has(protocol)) return 'account'
  if (DOCUMENT_PROTOCOLS.has(protocol)) return 'document'
  return 'record'
}

const isExternal = (href: string): boolean => href.startsWith('http://') || href.startsWith('https://')

const COMPLETE_LINK_AT = /^\[[^\]]*\]\([^)]*\)/

/**
 * Drop a trailing, incomplete markdown link from a memory body.
 *
 * Server-side truncation can slice through a `[label](scheme://id)` link,
 * leaving a fragment like `[Bosch](account://` that react-markdown renders as
 * ugly raw text. If the final `[` starts something that looks like a link
 * (`](` present) but isn't a complete `[..](..)`, we trim it off so the prose
 * ends cleanly. Plain bracketed text (no `](`) is left untouched.
 */
export const sanitizeMemoryBody = (body: string | undefined): string => {
  if (!body) return ''
  const lastOpen = body.lastIndexOf('[')
  if (lastOpen === -1) return body
  const tail = body.slice(lastOpen)
  if (tail.includes('](') && !COMPLETE_LINK_AT.test(tail)) {
    return body
      .slice(0, lastOpen)
      .replace(/[\s—–-]+$/, '')
      .trimEnd()
  }
  return body
}

/**
 * Extract de-duplicated, navigable references from a memory body. Only links
 * that resolve to a real destination (entity protocol, platform path or
 * external url) are kept — decorative or unresolvable links are dropped.
 */
export const extractReferences = (body: string | undefined): MemoryReference[] => {
  if (!body) return []
  const seen = new Set<string>()
  const refs: MemoryReference[] = []

  for (const { label, href } of iterateMarkdownLinks(body)) {
    if (seen.has(href)) continue

    const resolved = resolveEntityLink(href)
    if (resolved?.url) {
      seen.add(href)
      refs.push({ id: href, label, href, kind: protocolKind(resolved.protocol) })
      continue
    }

    if (isExternal(href) || href.startsWith('/')) {
      seen.add(href)
      refs.push({ id: href, label, href, kind: isExternal(href) ? 'external' : 'link' })
    }
  }

  return refs
}
