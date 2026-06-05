/**
 * useSaveRiskScores Hook
 * Automatically saves calculated risk scores for trend tracking
 */

import { useCallback, useRef } from 'react'
import { FlightRiskEmployee } from '../types/flightRisk.types'

/**
 * Storage key for tracking when we last saved scores
 */
const LAST_SAVE_KEY = 'flight-risk-last-save'

/**
 * Minimum interval between saves (in milliseconds)
 * Default: 1 hour
 */
const MIN_SAVE_INTERVAL_MS = 60 * 60 * 1000

interface UseSaveRiskScoresProps {
  accessToken: string
  managerId: string
  enabled?: boolean
}

interface UseSaveRiskScoresResult {
  saveScores: (employees: FlightRiskEmployee[]) => Promise<void>
  hasSavedThisSession: boolean
}

/**
 * Check if enough time has passed since last save
 */
const shouldSaveScores = (): boolean => {
  try {
    const lastSave = sessionStorage.getItem(LAST_SAVE_KEY)
    if (!lastSave) return true

    const lastSaveTime = Number.parseInt(lastSave, 10)
    const now = Date.now()

    return now - lastSaveTime > MIN_SAVE_INTERVAL_MS
  } catch {
    // If sessionStorage is not available, always allow save
    return true
  }
}

/**
 * Mark that we've saved scores
 */
const markSaved = (): void => {
  try {
    sessionStorage.setItem(LAST_SAVE_KEY, Date.now().toString())
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook to save risk scores for trend tracking
 */
export const useSaveRiskScores = ({
  accessToken,
  managerId,
  enabled = true
}: UseSaveRiskScoresProps): UseSaveRiskScoresResult => {
  const hasSavedRef = useRef(false)

  const saveScores = useCallback(
    async (employees: FlightRiskEmployee[]): Promise<void> => {
      // Skip if disabled or already saved this session or not enough time passed
      if (!enabled || hasSavedRef.current || !shouldSaveScores()) {
        return
      }

      // Skip if no employees or no access token
      if (!accessToken || !managerId || employees.length === 0) {
        return
      }

      // Backend trend-persistence API is not available yet. Mark as handled so
      // the dashboard does not repeatedly call missing GraphQL mutations.
      hasSavedRef.current = true
      markSaved()
    },
    [accessToken, managerId, enabled]
  )

  return {
    saveScores,
    hasSavedThisSession: hasSavedRef.current
  }
}

export default useSaveRiskScores
