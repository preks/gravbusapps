import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'

const normalize = (value?: string | null): string => (value || '').trim().toLowerCase()

export const isPolicyContentEntry = (entry?: ContentEntry | null): boolean => {
  if (!entry) return false

  const contentTypeValue = normalize(entry.contentType?.value)
  const contentTypeCode = normalize(entry.contentType?.code)
  const contentTypeRef = normalize((entry as any)?.contentTypeRef)
  const tags = (entry.contentEntryTags || [])
    .map(t => normalize(t.contentTag?.value || t.contentTag?.code))
    .filter(Boolean)
  const categories = ((entry as any)?.contentEntryCategories || [])
    .map((c: any) => normalize(c?.contentCategory?.value || c?.contentCategory?.code))
    .filter(Boolean)

  // NOTE: some tenants use ContentType code/value `POLICIES` which does NOT include the substring "policy".
  // Treat both "policy" and "policies" as valid policy markers.
  const policyTokens = ['policy', 'policies']

  const hasPolicyType = policyTokens.some(token => {
    return (
      contentTypeValue === token ||
      contentTypeCode === token ||
      contentTypeValue.includes(token) ||
      contentTypeCode.includes(token)
    )
  })
  const hasPolicyRef =
    Boolean(contentTypeRef) &&
    (contentTypeRef.endsWith(':policy') ||
      contentTypeRef.endsWith(':policies') ||
      contentTypeRef === 'policy' ||
      contentTypeRef === 'policies')
  const hasPolicyTag = tags.some(t => policyTokens.some(token => t === token || t.includes(token)))
  const hasPolicyCategory = categories.some(c => policyTokens.some(token => c === token || c.includes(token)))
  const hasPolicyAdditionalProperties = Boolean((entry as any)?.additionalProperties?.policy)

  return hasPolicyType || hasPolicyRef || hasPolicyTag || hasPolicyCategory || hasPolicyAdditionalProperties
}

export const isPinnedPolicyContentEntry = (entry?: ContentEntry | null): boolean => {
  if (!entry) return false

  const tags = (entry.contentEntryTags || [])
    .map(t => normalize(t.contentTag?.value || t.contentTag?.code))
    .filter(Boolean)

  const pinnedFlag = Boolean((entry as any)?.additionalProperties?.policy?.pinned)
  const criticalTag = tags.some(t => t === 'critical' || t === 'must-read' || t === 'pinned')

  return pinnedFlag || criticalTag
}
