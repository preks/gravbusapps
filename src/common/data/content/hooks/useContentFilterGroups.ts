import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { CONTENT_ENTRY_DESCRIPTORS } from '../types/contentEntryTypes'
import { ContentGroup } from '../constants/contentConstants'
import { ContentRole } from '../constants/contentConstants'

/**
 * Hook to fetch filter options for Content Entries scoped by ContentGroup
 * Uses distinct on ContentEntry to get available filter options (e.g., ContentTypes)
 * instead of fetching from catalog
 */
export const useContentFilterGroups = (
  context: BusinessAppContextProps,
  contentGroup?: ContentGroup,
  options?: { limit?: number }
) => {
  // Build baseWhereParts to scope filter options to specific content group and role
  const baseWhereParts = useMemo(
    () =>
      contentGroup
        ? [`role: { _eq: "${ContentRole.ROOT}" }`, `contentGroup: { _eq: "${contentGroup}" }`]
        : [`role: { _eq: "${ContentRole.ROOT}" }`],
    [contentGroup]
  )

  // Filter descriptors to only those with filter options (optionSelectPaths)
  const filterDescriptors = useMemo(
    () => CONTENT_ENTRY_DESCRIPTORS.filter(d => d.optionSelectPaths && d.optionSelectPaths.length > 0),
    []
  )

  return useFilterGroups(context, 'ContentEntry', filterDescriptors, {
    limit: options?.limit || 100,
    baseWhereParts
  })
}
