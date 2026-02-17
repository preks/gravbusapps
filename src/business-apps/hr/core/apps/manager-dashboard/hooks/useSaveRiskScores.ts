/**
 * useSaveRiskScores Hook
 * Automatically saves calculated risk scores for trend tracking
 */

import { useCallback, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { FlightRiskEmployee, RiskScoreInput } from '../types/flightRisk.types'
import { SAVE_EMPLOYEE_RISK_SCORE } from '../queries/flightRiskQueries'

// Algorithm version - increment when calculation logic changes significantly
const ALGORITHM_VERSION = 1

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
 * Convert FlightRiskEmployee to RiskScoreInput
 */
const toRiskScoreInput = (employee: FlightRiskEmployee, managerId: string): RiskScoreInput => {
  const signalScores: Record<string, number> = {}

  employee.signals.forEach(signal => {
    signalScores[signal.category] = signal.normalizedScore
  })

  return {
    employeeId: employee.employeeId,
    managerId,
    overallScore: employee.overallRiskScore,
    signalScores,
    version: ALGORITHM_VERSION
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
  const graphQLClient = useGraphqlClient(accessToken)

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

      try {
        // Save each employee's risk score
        // Using Promise.allSettled to ensure partial failures don't block other saves
        const savePromises = employees.map(employee => {
          const input = toRiskScoreInput(employee, managerId)

          return graphQLClient.request(SAVE_EMPLOYEE_RISK_SCORE, { input }).catch(err => {
            // Log but don't throw - we don't want to block the UI
            console.warn(`Failed to save risk score for ${employee.employeeId}:`, err)
            return null
          })
        })

        await Promise.allSettled(savePromises)

        // Mark as saved
        hasSavedRef.current = true
        markSaved()

        console.debug(`Saved risk scores for ${employees.length} employees`)
      } catch (err) {
        // Graceful fallback - if saving fails, just log and continue
        // This is expected during initial rollout before backend is ready
        console.warn('Failed to save risk scores (backend may not be ready):', err)
      }
    },
    [accessToken, managerId, enabled, graphQLClient]
  )

  return {
    saveScores,
    hasSavedThisSession: hasSavedRef.current
  }
}

export default useSaveRiskScores
