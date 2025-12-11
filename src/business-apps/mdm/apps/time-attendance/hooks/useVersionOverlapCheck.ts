import { useEffect, useState, useCallback } from 'react'
import { UseFormWatch } from 'react-hook-form'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

// Generic interface for version types that have activeFrom and activeTo
export interface VersionWithDates {
  id: string
  activeFrom: string | null
  activeTo: string | null
  [key: string]: any // Allow additional properties
}

// Configuration for overlap check
export interface OverlapCheckConfig<T extends VersionWithDates> {
  // Current version being edited (null for new versions)
  currentVersion: T | null
  // All available versions
  allVersions: T[]
  // Form watch function to get form values
  watch: UseFormWatch<any>
  // Field name in form that contains the entity ID (e.g., 'dayType', 'incrementType')
  entityIdFieldName: string
  // Field name in form that contains the activeFrom date (e.g., 'activeFrom', 'validFrom')
  activeFromFieldName: string
  // Field name in form that contains the activeTo date (e.g., 'activeTo', 'validTo')
  activeToFieldName?: string
  // Function to extract entity ID from a version for filtering
  getEntityIdFromVersion: (version: T) => string | null
  // Translation keys for warning messages (optional, uses defaults if not provided)
  translationKeys?: {
    versionWithoutEndDate?: string
    plannedVersionAfterStart?: string
    periodOverlap?: string
  }
}

// Return type for the hook
export interface UseVersionOverlapCheckReturn {
  overlapWarning: string | null
  suggestedStartDate: string | null
}

/**
 * Hook to check for date overlap when creating or editing versions
 * Works with any version type that has activeFrom and activeTo dates
 * Checks for 3 types of overlaps:
 * 1. Version without end date (infinite version)
 * 2. Planned version after start date
 * 3. Actual overlap with existing versions
 */
export const useVersionOverlapCheck = <T extends VersionWithDates>(
  config: OverlapCheckConfig<T>
): UseVersionOverlapCheckReturn => {
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null)
  const [suggestedStartDate, setSuggestedStartDate] = useState<string | null>(null)

  // Find versions that overlap with the version's date range
  const findOverlappingVersions = useCallback(
    (entityId: string, newActiveFrom: Date, newActiveTo: Date | null): T[] => {
      if (!entityId) return []

      return config.allVersions.filter(version => {
        const versionEntityId = config.getEntityIdFromVersion(version)
        if (versionEntityId !== entityId || version.id === config.currentVersion?.id) return false
        if (!version.activeFrom) return false

        const versionActiveFrom = new Date(version.activeFrom)
        const versionActiveTo = version.activeTo ? new Date(version.activeTo) : null

        // Two periods overlap if: newActiveFrom <= versionActiveTo AND newActiveTo >= versionActiveFrom
        // Handle cases where one or both periods have no end date (infinite)
        const newStartsBeforeVersionEnds = !versionActiveTo || newActiveFrom <= versionActiveTo
        const newEndsAfterVersionStarts = !newActiveTo || newActiveTo >= versionActiveFrom

        return newStartsBeforeVersionEnds && newEndsAfterVersionStarts
      })
    },
    [config.allVersions, config.currentVersion, config.getEntityIdFromVersion]
  )

  // Find version without end date (infinite version) for a given entity
  const findVersionWithoutEndDate = useCallback(
    (entityId: string): T | null => {
      if (!entityId) return null

      const versionsForEntity = config.allVersions.filter(version => {
        const versionEntityId = config.getEntityIdFromVersion(version)
        return versionEntityId === entityId && version.id !== config.currentVersion?.id && !version.activeTo
      })

      if (versionsForEntity.length === 0) return null

      // Sort by activeFrom descending (most recent first)
      const sortedVersions = [...versionsForEntity].sort((a, b) => {
        const dateA = new Date(a.activeFrom || '').getTime()
        const dateB = new Date(b.activeFrom || '').getTime()
        return dateB - dateA
      })
      return sortedVersions[0] || null
    },
    [config.allVersions, config.currentVersion, config.getEntityIdFromVersion]
  )

  // Find next planned version after a given date for a given entity
  const findNextPlannedVersion = useCallback(
    (entityId: string, afterDate: string): T | null => {
      if (!entityId || !afterDate) return null

      const afterDateObj = new Date(afterDate)

      const versionsForEntity = config.allVersions.filter(version => {
        const versionEntityId = config.getEntityIdFromVersion(version)
        if (versionEntityId !== entityId || version.id === config.currentVersion?.id) return false
        if (!version.activeFrom) return false

        const versionActiveFrom = new Date(version.activeFrom)
        return versionActiveFrom > afterDateObj
      })

      if (versionsForEntity.length === 0) return null

      // Sort by activeFrom ascending (earliest first)
      const sortedVersions = [...versionsForEntity].sort((a, b) => {
        const dateA = new Date(a.activeFrom || '').getTime()
        const dateB = new Date(b.activeFrom || '').getTime()
        return dateA - dateB
      })
      return sortedVersions[0] || null
    },
    [config.allVersions, config.currentVersion, config.getEntityIdFromVersion]
  )

  // Watch form fields
  const entityId = config.watch(config.entityIdFieldName)
  const activeFrom = config.watch(config.activeFromFieldName)
  const activeTo = config.activeToFieldName ? config.watch(config.activeToFieldName) : undefined

  // Check for date overlap when creating or editing a version
  useEffect(() => {
    if (!entityId || !activeFrom) {
      setOverlapWarning(null)
      setSuggestedStartDate(null)
      return
    }

    const newActiveFrom = new Date(activeFrom)
    const newActiveTo = activeTo ? new Date(activeTo) : null

    // Case 1: Check if there's a version without end date (infinite version)
    const versionWithoutEndDate = findVersionWithoutEndDate(entityId)
    if (versionWithoutEndDate) {
      const versionActiveFrom = new Date(versionWithoutEndDate.activeFrom || '')
      // If version starts after the infinite version starts, there will be overlap
      if (newActiveFrom >= versionActiveFrom) {
        const versionActiveFromStr = formatDate(versionActiveFrom)
        setOverlapWarning(
          getTranslationFromI18nKeyAndLabel(
            config.translationKeys?.versionWithoutEndDate ||
              'master-data:hr.time_attendance.day_type_versions.warnings.version_without_end_date',
            `A version without an end date exists for this entity. The existing version starts on ${versionActiveFromStr} and has no end date. Please close the existing version first by setting an end date, then create the version.`,
            { startDate: formatDate(versionActiveFrom), interpolation: { escapeValue: false } }
          )
        )
        setSuggestedStartDate(null)
        return
      }
    }

    // Case 2: Check if there's a planned version after the version's start date
    // Only show warning if version doesn't have end date OR end date is after planned version's start
    const nextPlannedVersion = findNextPlannedVersion(entityId, activeFrom)
    if (nextPlannedVersion) {
      const nextVersionActiveFrom = new Date(nextPlannedVersion.activeFrom || '')
      // If version doesn't have end date OR version's end date is after or equal to next version's start date
      if (!newActiveTo || newActiveTo >= nextVersionActiveFrom) {
        const nextVersionActiveFromStr = formatDate(nextVersionActiveFrom)
        setOverlapWarning(
          getTranslationFromI18nKeyAndLabel(
            config.translationKeys?.plannedVersionAfterStart ||
              'master-data:hr.time_attendance.day_type_versions.warnings.planned_version_after_start',
            `A version is already planned after the start date of this version. The planned version starts on ${nextVersionActiveFromStr}. Please set an end date for this version before the planned version starts, or modify the planned version.`,
            { plannedStartDate: nextVersionActiveFromStr, interpolation: { escapeValue: false } }
          )
        )
        setSuggestedStartDate(null)
        return
      }
    }

    // Case 3: Check for actual overlap with existing versions
    const overlappingVersions = findOverlappingVersions(entityId, newActiveFrom, newActiveTo)
    if (overlappingVersions.length > 0) {
      // Find the version that ends latest among overlapping versions
      const latestOverlappingVersion = overlappingVersions.reduce((latest, current) => {
        const latestEnd = latest.activeTo ? new Date(latest.activeTo).getTime() : Infinity
        const currentEnd = current.activeTo ? new Date(current.activeTo).getTime() : Infinity
        return currentEnd > latestEnd ? current : latest
      }, overlappingVersions[0])

      if (latestOverlappingVersion.activeTo) {
        const latestActiveTo = new Date(latestOverlappingVersion.activeTo)
        // Calculate suggested start date (one day after latest activeTo)
        const suggestedDate = new Date(latestActiveTo)
        suggestedDate.setDate(suggestedDate.getDate() + 1)
        const suggestedDateStr = suggestedDate.toISOString().split('T')[0]

        setOverlapWarning(
          getTranslationFromI18nKeyAndLabel(
            config.translationKeys?.periodOverlap ||
              'master-data:hr.time_attendance.day_type_versions.warnings.period_overlap',
            `A version already exists for this period. The existing version ends on ${formatDate(latestActiveTo.toISOString().split('T')[0])}. Please either modify the existing version or create the version starting from ${formatDate(suggestedDateStr)}.`,
            {
              endDate: formatDate(latestActiveTo),
              suggestedDate: formatDate(suggestedDateStr),
              interpolation: { escapeValue: false }
            }
          )
        )
        setSuggestedStartDate(suggestedDateStr)
        return
      }
    }

    // No warnings
    setOverlapWarning(null)
    setSuggestedStartDate(null)
  }, [
    entityId,
    activeFrom,
    activeTo,
    config.currentVersion,
    findOverlappingVersions,
    findVersionWithoutEndDate,
    findNextPlannedVersion,
    config.translationKeys
  ])

  return {
    overlapWarning,
    suggestedStartDate
  }
}
