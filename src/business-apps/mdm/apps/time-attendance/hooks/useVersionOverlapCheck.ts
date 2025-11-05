import { useEffect, useState, useMemo } from 'react'
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
  // Function to extract entity ID from a version for filtering
  getEntityIdFromVersion: (version: T) => string | null
  // Translation keys for warning messages
  translations?: string
}

// Return type for the hook
export interface UseVersionOverlapCheckReturn {
  overlapWarning: string | null
  suggestedStartDate: string | null
}

/**
 * Hook to check for date overlap when creating new versions
 * Works with any version type that has activeFrom and activeTo dates
 */
export const useVersionOverlapCheck = <T extends VersionWithDates>(
  config: OverlapCheckConfig<T>
): UseVersionOverlapCheckReturn => {
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null)
  const [suggestedStartDate, setSuggestedStartDate] = useState<string | null>(null)

  // Find the latest version for a given entity ID
  const findLatestVersion = useMemo(() => {
    return (entityId: string): T | null => {
      if (!entityId) return null

      // Filter versions for this entity, excluding current version
      const versionsForEntity = config.allVersions.filter(version => {
        const versionEntityId = config.getEntityIdFromVersion(version)
        return versionEntityId === entityId && version.id !== config.currentVersion?.id
      })

      if (versionsForEntity.length === 0) return null

      // Sort by activeTo descending (most recent first) or by activeFrom if activeTo is null
      const sortedVersions = [...versionsForEntity].sort((a, b) => {
        const dateA = a.activeTo ? new Date(a.activeTo).getTime() : new Date(a.activeFrom || '').getTime()
        const dateB = b.activeTo ? new Date(b.activeTo).getTime() : new Date(b.activeFrom || '').getTime()
        return dateB - dateA // Descending order
      })

      return sortedVersions[0] || null
    }
  }, [config.allVersions, config.currentVersion, config.getEntityIdFromVersion])

  // Watch form fields
  const entityId = config.watch(config.entityIdFieldName)
  const activeFrom = config.watch(config.activeFromFieldName)

  // Check for date overlap when creating a new version
  useEffect(() => {
    const isNewVersion = !config.currentVersion || !config.currentVersion.id || config.currentVersion.id === ''

    if (!isNewVersion) {
      setOverlapWarning(null)
      setSuggestedStartDate(null)
      return
    }

    if (!entityId || !activeFrom) {
      setOverlapWarning(null)
      setSuggestedStartDate(null)
      return
    }

    const latestVersion = findLatestVersion(entityId)

    if (!latestVersion || !latestVersion.activeTo) {
      setOverlapWarning(null)
      setSuggestedStartDate(null)
      return
    }

    // Extract date part (YYYY-MM-DD) from ISO string to avoid timezone issues
    const extractDatePart = (isoString: string): string => {
      return isoString.split('T')[0]
    }

    const newActiveFromDate = extractDatePart(activeFrom)
    const latestActiveToDate = extractDatePart(latestVersion.activeTo)

    // Compare dates as strings (YYYY-MM-DD format is sortable)
    if (newActiveFromDate <= latestActiveToDate) {
      // Calculate suggested start date (one day after latest activeTo)
      const latestActiveToDateObj = new Date(latestActiveToDate + 'T00:00:00')
      const suggestedDate = new Date(latestActiveToDateObj)
      suggestedDate.setDate(suggestedDate.getDate() + 1)
      const suggestedDateStr = suggestedDate.toISOString().split('T')[0]

      // Format the date for display using the extracted date part
      const latestActiveToDisplay = formatDate(latestActiveToDate)

      const warningMessage =
        config.translations ??
        getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.day_types.version.a_version_already_exists_for_this_period',
          `A version already exists for this period. The existing version ends on ${latestActiveToDisplay}. Please either modify the existing version or create the new version starting from ${formatDate(suggestedDateStr)}.`
        )

      setOverlapWarning(warningMessage)
      setSuggestedStartDate(suggestedDateStr)
    } else {
      setOverlapWarning(null)
      setSuggestedStartDate(null)
    }
  }, [entityId, activeFrom, config.currentVersion, findLatestVersion, config.translations])

  return {
    overlapWarning,
    suggestedStartDate
  }
}
