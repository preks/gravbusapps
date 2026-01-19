import { JobFamily, JobLevelGroup } from '../types'
import { CatalogEntry } from '@/common/types/CatalogTypes'
import { CatalogManagerClient } from '@/common/network/catalogs/CatalogManagerClient'
import { JOB_LEVEL_GROUP_CATALOG, JOB_LEVEL_GROUP_VERSION } from '../../compensation-data/hooks/useJobLevelGroups'
import { useCallback } from 'react'
import {
  JOB_FAMILY_CATALOG,
  JOB_FAMILY_VERSION
} from '@/business-apps/hr/core/apps/human-resources/components/views/job-position-view/hooks/useJobFamilyFilters'

// Transform catalog entry to JobFamily interface
const transformJobFamily = (catalogEntry: CatalogEntry, allFamilies: CatalogEntry[]): JobFamily => {
  // Find children for this family
  const children = allFamilies.filter(entry => entry.parentEntryId === catalogEntry.id)

  // Calculate hierarchy level
  let level = 0
  let currentParentId = catalogEntry.parentEntryId
  while (currentParentId) {
    level++
    const parent = allFamilies.find(entry => entry.id === currentParentId)
    currentParentId = parent?.parentEntryId
    // Prevent infinite loops
    if (level > 10) break
  }

  // Convert translations array to object format
  const translationsObj: { [key: string]: string } = {}
  catalogEntry.translations?.forEach(translation => {
    if (translation.localeCode && translation.value) {
      translationsObj[translation.localeCode] = translation.value
    }
  })

  return {
    id: catalogEntry.id,
    name: catalogEntry.value || catalogEntry.code || 'Unknown',
    code: catalogEntry.code,
    description: catalogEntry.additionalValue1 || undefined,
    parentEntryId: catalogEntry.parentEntryId,
    isActive: true, // Catalog entries are generally active
    translations: translationsObj,
    objectValue: catalogEntry.objectValue,
    level,
    children: [], // Will be populated separately
    hasChildren: children.length > 0,
    isExpanded: false
  }
}

// Fetch all job families from catalog
export const useGetAllJobFamilies = (catalogClient: CatalogManagerClient) => {
  const fetchAllJobFamilies = useCallback(async () => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: JOB_FAMILY_CATALOG,
          version: JOB_FAMILY_VERSION
        },
        {
          limit: 1000, // Get all families at once for hierarchy building
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: false // We'll build hierarchy ourselves
        }
      )

      const catalogEntries = response.data
      return catalogEntries.map(entry => transformJobFamily(entry, catalogEntries))
    } catch (error) {
      console.error('Error fetching job families:', error)
      throw new Error('Failed to fetch job families from catalog')
    }
  }, [catalogClient])

  return { fetchAllJobFamilies }
}

// Color palette for job level groups
const GROUP_COLORS = [
  'gba:bg-blue-400',
  'gba:bg-green-400',
  'gba:bg-purple-400',
  'gba:bg-orange-400',
  'gba:bg-pink-400',
  'gba:bg-indigo-400',
  'gba:bg-teal-400',
  'gba:bg-red-400'
]

const transformJobLevelGroup = (catalogEntry: CatalogEntry, index: number): JobLevelGroup => {
  return {
    id: catalogEntry.id,
    name: catalogEntry.value || catalogEntry.code || 'Unknown',
    code: catalogEntry.code || catalogEntry.id,
    description: catalogEntry.additionalValue1 || undefined,
    category: catalogEntry.additionalValue2 || 'General',
    isActive: true, // Catalog entries are generally active
    translations: catalogEntry.translations,
    additionalValue1: catalogEntry.additionalValue1,
    additionalValue2: catalogEntry.additionalValue2,
    additionalValue3: catalogEntry.additionalValue3,
    jobLevels: [],
    jobLevelCount: 0,
    color: GROUP_COLORS[index % GROUP_COLORS.length]
  }
}

export const useGetJobLevelGroups = (catalogClient: CatalogManagerClient) => {
  const fetchJobLevelGroups = useCallback(async () => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: JOB_LEVEL_GROUP_CATALOG,
          version: JOB_LEVEL_GROUP_VERSION
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      return response.data.map(transformJobLevelGroup)
    } catch (error) {
      console.error('Error fetching job level groups:', error)
      throw new Error('Failed to fetch job level groups from catalog')
    }
  }, [catalogClient])

  return { fetchJobLevelGroups }
}
