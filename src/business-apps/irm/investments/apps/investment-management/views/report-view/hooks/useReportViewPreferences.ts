import { useCallback, useState } from 'react'
import type { StoredPreferences } from '@/common/hooks/useViewPreferencesStorage'
import type { SubSection } from '../utils/subSectionHelpers'
import {
  getReportSectionPreferencesKey,
  readPreferencesBySection,
  saveReportViewPreferencePatch
} from '../utils/reportViewPreferences'

export interface ReportViewPreferencesState {
  preferencesBySection: Record<string, StoredPreferences>
  savePreferencePatch: (sectionCode: string, patch: StoredPreferences) => void
}

const buildKeysBySection = (groupCode: string, subSections: SubSection[]): Record<string, string> =>
  subSections.reduce(
    (acc, section) => {
      acc[section.code] = getReportSectionPreferencesKey(groupCode, section.code)
      return acc
    },
    {} as Record<string, string>
  )

export const useReportViewPreferences = (groupCode: string, subSections: SubSection[]): ReportViewPreferencesState => {
  const [keysBySection, setKeysBySection] = useState<Record<string, string>>(() =>
    buildKeysBySection(groupCode, subSections)
  )

  // Keep keys in sync when sub-sections load asynchronously.
  // Using the "adjusting state during render" pattern so the update is synchronous.
  const currentKeys = buildKeysBySection(groupCode, subSections)
  if (JSON.stringify(currentKeys) !== JSON.stringify(keysBySection)) {
    setKeysBySection(currentKeys)
  }

  // Read once from localStorage per key set.
  // When keysBySection changes (sub-sections loaded), merge fresh localStorage data
  // while preserving any in-session overrides already in state.
  const [preferencesBySection, setPreferencesBySection] = useState<Record<string, StoredPreferences>>(() =>
    readPreferencesBySection(keysBySection)
  )
  const [prevKeysBySection, setPrevKeysBySection] = useState(keysBySection)
  if (keysBySection !== prevKeysBySection) {
    setPrevKeysBySection(keysBySection)
    setPreferencesBySection(prev => ({
      ...readPreferencesBySection(keysBySection),
      ...prev
    }))
  }

  const savePreferencePatch = useCallback(
    (sectionCode: string, patch: StoredPreferences) => {
      saveReportViewPreferencePatch(keysBySection[sectionCode], patch)
      setPreferencesBySection(prev => ({
        ...prev,
        [sectionCode]: { ...prev[sectionCode], ...patch }
      }))
    },
    [keysBySection]
  )

  return { preferencesBySection, savePreferencePatch }
}
