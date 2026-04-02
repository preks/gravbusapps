import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import { ContentGroup } from '@/common/data/content/constants/contentConstants'

export const isPolicyContentEntry = (entry?: ContentEntry | null): boolean => {
  if (!entry) return false

  // Primary check: contentGroup scalar field
  if (entry.contentGroup === ContentGroup.POLICY) return true

  // Secondary check: contentType name for backward compatibility
  const contentTypeName = (entry.contentType?.name || '').trim().toLowerCase()
  const policyTokens = ['policy', 'policies']
  const hasPolicyType = policyTokens.some(token => contentTypeName === token || contentTypeName.includes(token))

  return hasPolicyType
}

export const isPinnedPolicyContentEntry = (entry?: ContentEntry | null): boolean => {
  if (!entry) return false

  const tags = (entry.contentEntryTags || []).map(t => (t.contentTag?.name || '').trim().toLowerCase()).filter(Boolean)

  const pinnedFlag = Boolean((entry as any)?.additionalProperties?.policy?.pinned)
  const criticalTag = tags.some(t => t === 'critical' || t === 'must-read' || t === 'pinned')

  return pinnedFlag || criticalTag
}
