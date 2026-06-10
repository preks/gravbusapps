// Resolve a profile image for a linked CRM entity so the run-detail header can
// show the same avatar the CRM record page shows (instead of bare initials).
//
// Today only CRM contacts carry a portrait; accounts/other domains fall back to
// initials. The lookup is intentionally tiny (id -> picture url), cached across
// renders, and degrades silently to `null` on any error.

import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

// Mirrors the contact-record page: it selects `pictureThumbnailUrl` (the field
// name is misleading — it actually carries base64 image data, not a URL).
const CONTACT_AVATAR_QUERY = `
  query RunContactAvatar($id: uuid!) {
    ContactByPk(id: $id) {
      pictureThumbnailUrl
    }
  }
`

// Entity types that resolve to a CRM Contact record (same set the entity
// navigation map points at the contact-record route).
const CONTACT_ENTITY_TYPES = new Set(['contact', 'customer_contact', 'business_partner_person'])

interface ContactAvatarResponse {
  ContactByPk?: { pictureThumbnailUrl?: string | null } | null
}

// The CRM picture field can hold a ready data URI / URL, or (most often) raw
// base64 bytes. Resolve all three into a usable <img> src, sniffing the image
// type from the base64 signature so the data URI mime is correct.
function toImageSrc(value: string | null | undefined): string | null {
  const raw = value?.trim()
  if (!raw) return null
  if (/^(data:|https?:|\/)/i.test(raw)) return raw
  const mime = raw.startsWith('/9j/')
    ? 'image/jpeg'
    : raw.startsWith('iVBOR')
      ? 'image/png'
      : raw.startsWith('R0lGOD')
        ? 'image/gif'
        : raw.startsWith('UklGR')
          ? 'image/webp'
          : 'image/jpeg'
  return `data:${mime};base64,${raw}`
}

// Module-level cache keyed by `${type}:${id}` — a `null` entry means "resolved,
// no picture" so we don't refetch a contact that simply has no portrait.
const avatarCache = new Map<string, string | null>()

export function useRunEntityAvatar(
  entityType: string | null | undefined,
  entityId: string | null | undefined,
  accessToken: string
): string | null {
  const graphqlClient = useGraphQLClient(accessToken)
  const normalized = (entityType ?? '').toLowerCase()
  const supported = CONTACT_ENTITY_TYPES.has(normalized)
  const cacheKey = supported && entityId ? `${normalized}:${entityId}` : ''
  const [src, setSrc] = useState<string | null>(() => (cacheKey ? (avatarCache.get(cacheKey) ?? null) : null))

  useEffect(() => {
    if (!cacheKey || !accessToken || !entityId) return
    if (avatarCache.has(cacheKey)) {
      setSrc(avatarCache.get(cacheKey) ?? null)
      return
    }

    let cancelled = false
    graphqlClient
      .request<ContactAvatarResponse>(CONTACT_AVATAR_QUERY, { id: entityId })
      .then(res => {
        const resolved = toImageSrc(res.ContactByPk?.pictureThumbnailUrl)
        avatarCache.set(cacheKey, resolved)
        if (!cancelled) setSrc(resolved)
      })
      .catch(() => {
        avatarCache.set(cacheKey, null)
        if (!cancelled) setSrc(null)
      })

    return () => {
      cancelled = true
    }
  }, [cacheKey, accessToken, entityId, graphqlClient])

  return src
}
