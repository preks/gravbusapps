import {
  readViewPreferences,
  writeViewPreferences,
  type StoredPreferences
} from '@/common/hooks/useViewPreferencesStorage'

export const getReportSectionPreferencesKey = (groupCode: string, sectionCode: string): string =>
  `irm:report-view:${groupCode}:${sectionCode}:preferences:v1`

export const saveReportViewPreferencePatch = (storageKey: string | undefined, patch: StoredPreferences): void => {
  if (!storageKey) return
  writeViewPreferences(storageKey, { ...readViewPreferences(storageKey), ...patch })
}

export const readPreferencesBySection = (keysBySection: Record<string, string>): Record<string, StoredPreferences> =>
  Object.entries(keysBySection).reduce(
    (acc, [sectionCode, storageKey]) => {
      acc[sectionCode] = readViewPreferences(storageKey)
      return acc
    },
    {} as Record<string, StoredPreferences>
  )
