/**
 * EntityLink - Unified entity link handling for Every-AI chat.
 *
 * This module provides centralized link resolution for both:
 * - Inline chips (markdown links like [text](employee://id))
 * - Entity cards (displayData entities with link field)
 *
 * Architecture:
 * - constants/ - Configuration for protocols, entity URLs, and redirects
 * - utils/ - URL parsing and fragment decoding utilities
 */

import React from 'react'
import EmployeeLinkChip from './EmployeeLinkChip'
import SandboxFileLinkChip from './SandboxFileLinkChip'
import { BaseEntityLinkChip } from './BaseEntityLinkChip'
import IrmDocumentLinkChip from './IrmDocumentLinkChip'
import { Navigation, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { SUPPORTED_PROTOCOLS, ENTITY_CONFIG, PROTOCOL_REDIRECTS } from './constants'
import { parseEntityUrl, decodeUrlFragment } from './utils'

export { SUPPORTED_PROTOCOLS } from './constants'

/**
 * Resolved entity link information including URL, icon, and styling.
 * Returned by resolveEntityLink() after parsing and applying redirects.
 */
interface ResolvedEntityLink {
  /** The resolved platform URL for navigation */
  url: string | undefined
  /** The effective protocol after redirect resolution */
  protocol: string
  /** The effective entity ID (may be alternateId if provided) */
  id: string
  /** The alternateId from the link fragment, if present */
  alternateId?: string
  /** The icon component for this entity type */
  icon: React.ReactNode
  /** The styling variant for this entity type */
  variant?: 'default' | 'ai' | 'success' | 'info'
  /** Whether to show border styling */
  showBorder?: boolean
}

/**
 * Transform function for react-markdown to preserve entity protocol URLs.
 * Passes through supported protocols and standard http/https URLs unchanged.
 */
export function markdownUrlTransform(url: string): string {
  // If the URL is one of the supported protocols, leave it as is
  if (SUPPORTED_PROTOCOLS.some(p => url.startsWith(`${p}://`))) {
    return url
  }

  // For http/https, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  return url
}

/**
 * Unified link resolution for entity protocol URLs.
 * Parses the link, extracts metadata (including alternateId), applies redirect protocols,
 * and returns the resolved URL with styling information.
 *
 * This function is used by both inline chips (markdown links) and entity cards.
 *
 * @param link - Entity protocol URL (e.g., "employee_asset://uuid#base64fragment")
 * @returns Resolved link information or null if invalid/unsupported
 */
export function resolveEntityLink(link: string): ResolvedEntityLink | null {
  const parsed = parseEntityUrl(link)
  if (!parsed) return null

  const { protocol, id: entityId, fragment } = parsed
  const metadata = decodeUrlFragment(fragment)

  // Apply redirect protocol if applicable
  let effectiveProtocol = protocol
  if (protocol in PROTOCOL_REDIRECTS) {
    effectiveProtocol = PROTOCOL_REDIRECTS[protocol]
  }

  // Use alternateId if provided in fragment, otherwise use original entityId
  const rawEffectiveId = metadata?.alternateId || entityId
  const [effectiveId, embeddedQuery = ''] = rawEffectiveId.split('?')
  const embeddedParams = new URLSearchParams(embeddedQuery)

  // Get configuration for the effective protocol
  const config = ENTITY_CONFIG[effectiveProtocol]
  if (!config) return null

  // Unsaved workflow drafts (chat handoff) open Flow Studio in draft mode,
  // regardless of whether the link came in as service_workflow or workflow_template.
  if (effectiveProtocol === 'service_workflow' || effectiveProtocol === 'workflow_template') {
    const draftId = embeddedParams.get('draftId')
    if (draftId) {
      return {
        url: `${buildPlatformUrl(Navigation.CREATE_FLOW_CREATOR, { draftId })}#manage`,
        protocol: effectiveProtocol,
        id: draftId,
        alternateId: metadata?.alternateId,
        icon: config.icon(),
        variant: config.variant,
        showBorder: config.showBorder
      }
    }
  }

  // Running workflow instances open in Flow Launcher (My launches detail).
  if (effectiveProtocol === 'service_workflow') {
    const instanceFlowId = embeddedParams.get('flowId') || embeddedParams.get('templateId') || effectiveId
    if (instanceFlowId) {
      return {
        url: buildPlatformUrl(Navigation.FLOW_LAUNCHER, { tab: 'my-launches', flowId: instanceFlowId }),
        protocol: effectiveProtocol,
        id: instanceFlowId,
        alternateId: metadata?.alternateId,
        icon: config.icon(),
        variant: config.variant,
        showBorder: config.showBorder
      }
    }
  }

  // Workflow templates resolve to Flow Studio with flowId.
  if (effectiveProtocol === 'workflow_template') {
    const templateFlowId = embeddedParams.get('flowId') || embeddedParams.get('templateId') || effectiveId
    if (templateFlowId) {
      return {
        url: `${buildPlatformUrl(Navigation.CREATE_FLOW_CREATOR, { flowId: templateFlowId })}#flows`,
        protocol: effectiveProtocol,
        id: templateFlowId,
        alternateId: metadata?.alternateId,
        icon: config.icon(),
        variant: config.variant,
        showBorder: config.showBorder
      }
    }
  }

  let resolvedUrl = config.urlTemplate.replace('{id}', effectiveId)

  if (effectiveProtocol === 'chat_conversation' && metadata?.messageId) {
    const [path, queryString = ''] = resolvedUrl.split('?')
    const baseParams = new URLSearchParams(queryString)
    const view = baseParams.get('view')
    const orderedParams = new URLSearchParams()

    orderedParams.set('conversationId', effectiveId)
    orderedParams.set('messageId', metadata.messageId)

    if (view) {
      orderedParams.set('view', view)
    }

    resolvedUrl = `${path}?${orderedParams.toString()}`
  }

  return {
    url: resolvedUrl,
    protocol: effectiveProtocol,
    id: effectiveId,
    alternateId: metadata?.alternateId,
    icon: config.icon(),
    variant: config.variant,
    showBorder: config.showBorder
  }
}

/**
 * Build a platform URL for an entity.
 * Supports both legacy mode (entity + id) and new mode (entity + id + link).
 *
 * @param entity - The entity type name
 * @param id - The entity ID (used as fallback if link is not provided)
 * @param link - Optional normalized link from backend with alternateId fragment
 * @returns The resolved platform URL or undefined if entity is unknown
 */
export function getEntityUrl(entity: string, id: string, link?: string): string | undefined {
  if (link?.includes('/platform/create/flow-studio')) {
    return link
  }

  // If link is provided, use unified resolution (handles alternateId and redirects)
  if (link) {
    const resolved = resolveEntityLink(link)
    if (resolved?.url) {
      return resolved.url
    }
  }

  // Fallback to legacy behavior (direct entity + id lookup)
  const config = ENTITY_CONFIG[entity]
  if (!config) return undefined
  return config.urlTemplate.replace('{id}', id)
}

// ============================================================================
// EntityLink Component
// ============================================================================

interface EntityLinkProps {
  /** The entity protocol URL (e.g., "employee://uuid" or "account://uuid#fragment") */
  href?: string
  /** Access token for authenticated API calls (used by some special chip types) */
  accessToken: string
  /** Link content to display */
  children: React.ReactNode
}

/**
 * Renders an entity protocol link as an appropriate chip component.
 *
 * Handles special protocols (employee, sandbox, investment_document) with custom
 * components, and uses BaseEntityLinkChip for all other entity types.
 */
const EntityLink: React.FC<EntityLinkProps> = ({ href, accessToken, children }) => {
  // Parse the link to extract protocol, id, and metadata
  const parsed = parseEntityUrl(href || '')
  const metadata = parsed ? decodeUrlFragment(parsed.fragment) : null

  // Determine effective protocol and ID (applying redirects and alternateId)
  let effectiveProtocol = parsed?.protocol || null
  if (effectiveProtocol && effectiveProtocol in PROTOCOL_REDIRECTS) {
    effectiveProtocol = PROTOCOL_REDIRECTS[effectiveProtocol]
  }
  const effectiveId = metadata?.alternateId || parsed?.id || null

  // Special protocol handlers that need custom rendering

  // Employee protocol: needs data fetching, use special component
  if (effectiveProtocol === 'employee' && effectiveId) {
    return (
      <EmployeeLinkChip employeeId={effectiveId} token={accessToken}>
        {children}
      </EmployeeLinkChip>
    )
  }

  // Sandbox file protocol: special download button
  if (effectiveProtocol === 'sandbox' && effectiveId) {
    return (
      <SandboxFileLinkChip filePath={effectiveId} token={accessToken}>
        {children}
      </SandboxFileLinkChip>
    )
  }

  // IRM investment document: resolve to actual file download URL
  if (effectiveProtocol === 'investment_document' && effectiveId) {
    return (
      <IrmDocumentLinkChip documentId={effectiveId} token={accessToken} fallbackHref={href}>
        {children}
      </IrmDocumentLinkChip>
    )
  }

  // All other protocols: use unified resolution
  if (href) {
    const resolved = resolveEntityLink(href)
    if (resolved?.url) {
      const forceWorkflowReload = resolved.protocol === 'workflow_template'
      return (
        <BaseEntityLinkChip
          url={resolved.url}
          icon={resolved.icon}
          variant={resolved.variant}
          showBorder={resolved.showBorder}
          forceReload={forceWorkflowReload}
          newTab
        >
          {children}
        </BaseEntityLinkChip>
      )
    }
  }

  // Regular HTTP/HTTPS links
  if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
    return (
      <a
        href={href}
        className="gba:text-primary gba:underline hover:gba:opacity-80"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    )
  }

  // Root-relative platform links are valid app navigation targets too.
  if (href && href.startsWith('/')) {
    return (
      <a
        href={href}
        className="gba:text-primary gba:underline hover:gba:opacity-80"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    )
  }

  // Fallback: render as plain text
  return <span>{children}</span>
}

export default EntityLink
