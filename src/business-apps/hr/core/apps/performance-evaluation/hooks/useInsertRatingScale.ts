import { useCallback } from 'react'
import {
  saveRatingScale as saveRatingScaleApi,
  type SaveRatingScalePayload,
  type SaveRatingScaleResponse
} from '../services/ratingScaleApi'

export type DisplayMode = 'value' | 'letters' | 'stars' | 'custom'

/** API RatingScaleType enum: NUMERIC_RATING_SCALE_TYPE | CUSTOM_LABEL_RATING_SCALE_TYPE | ALPHABETIC_RATING_SCALE_TYPE. */
function displayModeToScaleType(mode: DisplayMode): string {
  switch (mode) {
    case 'letters':
      return 'ALPHABETIC_RATING_SCALE_TYPE'
    case 'stars':
      return 'CUSTOM_LABEL_RATING_SCALE_TYPE'
    case 'custom':
      return 'CUSTOM_LABEL_RATING_SCALE_TYPE'
    default:
      return 'NUMERIC_RATING_SCALE_TYPE'
  }
}

export interface RatingScaleFormValues {
  id?: string
  name: string
  values: string[]
  numValues?: number
  displayMode?: DisplayMode
}

/**
 * For STAR display mode the form sends Unicode ★ which can be escaped (e.g. \star\) and crash the API.
 * Send a plain-text label for the payload so the backend receives safe ASCII/letters.
 */
function labelForApi(displayMode: DisplayMode, formLabel: string, index: number): string {
  if (displayMode === 'stars') {
    const n = index + 1
    return n === 1 ? '1 star' : `${n} stars`
  }
  return formLabel.trim() || String(index + 1)
}

/** Build REST API payload from modal form (value -> label pairs). */
function buildSavePayload(form: RatingScaleFormValues): SaveRatingScalePayload {
  const displayMode = form.displayMode ?? 'value'
  const scaleType = displayModeToScaleType(displayMode)
  const values = form.values.map((label, i) => ({
    value: String(i + 1),
    label: labelForApi(displayMode, label, i),
    description: '',
    numericEquivalent: i + 1,
    displayOrder: i + 1
  }))
  return {
    changeMode: 'INSERT',
    ratingScale: {
      name: form.name.trim(),
      description: '',
      scaleType,
      recordState: 'active',
      notes: '',
      values
    }
  }
}

export interface UseInsertRatingScaleResult {
  saveRatingScale: (form: RatingScaleFormValues) => Promise<SaveRatingScaleResponse | null>
}

export function useInsertRatingScale(accessToken: string | undefined): UseInsertRatingScaleResult {
  const saveRatingScale = useCallback(
    async (form: RatingScaleFormValues): Promise<SaveRatingScaleResponse | null> => {
      if (!accessToken) return null
      const payload = buildSavePayload(form)
      const result = await saveRatingScaleApi(accessToken, payload)
      return result ?? null
    },
    [accessToken]
  )

  return { saveRatingScale }
}
