// Build CRM deep-links and linkify raw UUIDs in Workforce run output.
//
// The agent summary often mentions record ids inline; this module turns
// those ids into human labels with URLs using the server-derived
// ``crm_actions`` payload (``record_ids`` + ``record_labels``).

import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { buildEntityNavigationUrl } from '@/business-apps/platform/apps/every-ai/components/entities/utils/entityNavigation'
import { Navigation, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { WorkforceRunCrmActionEntry } from './workforceTypes'

/** Polymorphic Customer360 subject kind (mirrors the app's `?type=` param). */
export type Customer360SubjectType = 'account' | 'contact'

/**
 * Build a deep-link back into the Customer360 app for a customer subject.
 *
 * Agent runs reference customers by `type` + `id`; this returns the canonical
 * `/platform/crm/customer-360?type=...&id=...` URL so a run can send the user
 * straight back to the 360° workspace it operated on.
 */
export function buildCustomer360Url(
  customerType: Customer360SubjectType,
  customerId: string,
  source: string = 'workforce-run'
): string | undefined {
  if (!customerId) return undefined
  return buildPlatformUrl(Navigation.CRM_CUSTOMER_360, {
    type: customerType,
    id: customerId,
    source
  })
}

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

const BARE_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Agent summaries often wrap record ids in inline code (`uuid`). Replacing
// only the uuid inside backticks yields `[label](url)` which still renders as
// literal code — replace or unwrap the whole backtick segment instead.
const BACKTICK_UUID_PATTERN = /`([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})`/gi

interface ParsedMarkdownLink {
  fullMatch: string
  label: string
  href: string
  index: number
  endIndex: number
}

/** Linear-time `[label](href)` parse at ``start`` (avoids ReDoS-prone regex). */
function tryParseMarkdownLinkAt(content: string, start: number): ParsedMarkdownLink | null {
  if (content[start] !== '[') return null

  const closeBracket = content.indexOf(']', start + 1)
  if (closeBracket === -1 || content[closeBracket + 1] !== '(') return null

  const closeParen = content.indexOf(')', closeBracket + 2)
  if (closeParen === -1) return null

  const label = content.slice(start + 1, closeBracket)
  const href = content.slice(closeBracket + 2, closeParen)
  const fullMatch = content.slice(start, closeParen + 1)

  return {
    fullMatch,
    label,
    href,
    index: start,
    endIndex: closeParen + 1
  }
}

function* iterateMarkdownLinks(content: string): Generator<ParsedMarkdownLink> {
  let scanFrom = 0
  while (scanFrom < content.length) {
    const openBracket = content.indexOf('[', scanFrom)
    if (openBracket === -1) break

    const parsed = tryParseMarkdownLinkAt(content, openBracket)
    if (parsed) {
      yield parsed
      scanFrom = parsed.endIndex
      continue
    }

    scanFrom = openBracket + 1
  }
}

export interface CrmRecordLink {
  label: string
  url: string
}

const RECORD_FIELD_ENTITY: Record<string, string> = {
  contact_id: 'contact',
  account_id: 'account',
  note_id: 'crm_note',
  task_id: 'sales_task',
  customer_360_id: 'customer_360'
}

function defaultLabelForField(field: string, id: string): string {
  switch (field) {
    case 'contact_id':
      return 'Contact'
    case 'account_id':
      return 'Account'
    case 'note_id':
      return 'CRM note'
    case 'task_id':
      return 'CRM task'
    case 'customer_360_id':
      return 'Customer 360'
    default:
      return id
  }
}

export function resolveCrmRecordUrl(field: string, id: string, entityType?: string | null): string | undefined {
  if (!id) return undefined

  const entity = RECORD_FIELD_ENTITY[field]
  if (entity === 'contact' || entity === 'account') {
    return buildEntityNavigationUrl(entity, id, 'workforce-run')
  }
  if (entity === 'customer_360') {
    const subjectType: Customer360SubjectType =
      (entityType ?? '').trim().toLowerCase() === 'contact' ? 'contact' : 'account'
    return buildCustomer360Url(subjectType, id)
  }
  if (entity === 'crm_note' || entity === 'sales_task') {
    return getEntityUrl(entity, id)
  }

  const normalizedType = (entityType ?? '').trim().toLowerCase()
  if (field === 'entity_id') {
    if (normalizedType === 'account') {
      return buildEntityNavigationUrl('account', id, 'workforce-run')
    }
    return buildEntityNavigationUrl('contact', id, 'workforce-run')
  }
  if (field === 'id' && normalizedType === 'contact') {
    return buildEntityNavigationUrl('contact', id, 'workforce-run')
  }
  if (field === 'id' && normalizedType === 'account') {
    return buildEntityNavigationUrl('account', id, 'workforce-run')
  }
  return undefined
}

export function buildCrmRecordLinkMap(
  actions: readonly WorkforceRunCrmActionEntry[] | undefined
): Map<string, CrmRecordLink> {
  const map = new Map<string, CrmRecordLink>()
  if (!actions || actions.length === 0) return map

  for (const action of actions) {
    const recordIds = action.record_ids ?? {}
    const recordLabels = action.record_labels ?? {}

    for (const [field, id] of Object.entries(recordIds)) {
      if (!id || map.has(id)) continue
      const url = resolveCrmRecordUrl(field, id, action.entity_type)
      if (!url) continue
      const label = recordLabels[id] ?? defaultLabelForField(field, id)
      map.set(id, { label, url })
    }
  }

  return map
}

function escapeMarkdownLabel(label: string): string {
  return label.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]')
}

function formatMarkdownLink(label: string, url: string): string {
  return `[${escapeMarkdownLabel(label)}](${url})`
}

function linkifyPlainSegment(segment: string, linkMap: Map<string, CrmRecordLink>): string {
  return segment.replace(UUID_PATTERN, match => {
    const link = linkMap.get(match)
    if (!link) return match
    return formatMarkdownLink(link.label, link.url)
  })
}

function normalizeBacktickRecordIds(content: string, linkMap: Map<string, CrmRecordLink>): string {
  const normalized = content.replace(BACKTICK_UUID_PATTERN, (match, uuid: string) => {
    const link = linkMap.get(uuid)
    if (!link) return match
    return formatMarkdownLink(link.label, link.url)
  })

  let unwrapped = ''
  let scanFrom = 0
  while (scanFrom < normalized.length) {
    if (normalized[scanFrom] === '`' && normalized[scanFrom + 1] === '[') {
      const parsed = tryParseMarkdownLinkAt(normalized, scanFrom + 1)
      if (parsed && normalized[parsed.endIndex] === '`') {
        unwrapped += parsed.fullMatch
        scanFrom = parsed.endIndex + 1
        continue
      }
    }
    unwrapped += normalized[scanFrom]
    scanFrom += 1
  }
  return unwrapped
}

function normalizeExistingMarkdownLink(label: string, href: string, linkMap: Map<string, CrmRecordLink>): string {
  const trimmedHref = href.trim()
  if (BARE_UUID_PATTERN.test(trimmedHref)) {
    const link = linkMap.get(trimmedHref)
    if (link) {
      const resolvedLabel = label.trim() || link.label
      return formatMarkdownLink(resolvedLabel, link.url)
    }
  }
  return formatMarkdownLink(label, href)
}

export function linkifyCrmUuidsInOutput(
  content: string,
  actions: readonly WorkforceRunCrmActionEntry[] | undefined
): string {
  if (!content.trim()) return content

  const linkMap = buildCrmRecordLinkMap(actions)
  if (linkMap.size === 0) return content

  const prepared = normalizeBacktickRecordIds(content, linkMap)

  // Only replace bare UUIDs outside existing markdown links. Replacing UUIDs
  // inside `(contactId=...)` destinations breaks markdown and shows raw
  // `[label](url)` text in the drawer.
  let linked = ''
  let lastIndex = 0
  for (const match of iterateMarkdownLinks(prepared)) {
    if (match.index > lastIndex) {
      linked += linkifyPlainSegment(prepared.slice(lastIndex, match.index), linkMap)
    }
    linked += normalizeExistingMarkdownLink(match.label, match.href, linkMap)
    lastIndex = match.endIndex
  }

  if (lastIndex < prepared.length) {
    linked += linkifyPlainSegment(prepared.slice(lastIndex), linkMap)
  }

  return linked || linkifyPlainSegment(prepared, linkMap)
}
