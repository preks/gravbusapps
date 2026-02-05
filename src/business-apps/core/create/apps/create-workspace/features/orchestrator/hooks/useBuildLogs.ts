/**
 * Hook for managing build console logs
 * Tracks build events and converts them to log entries
 */

import { useState, useEffect, useCallback } from 'react'
import type { BuildLogEntry } from '../components/widgets/BuildConsoleLog'
import type { BuildPhase } from '../types'

export interface UseBuildLogsResult {
  logs: BuildLogEntry[]
  addLog: (type: BuildLogEntry['type'], message: string) => void
  clearLogs: () => void
}

/**
 * Manages build console logs
 */
export function useBuildLogs(
  isBuilding: boolean,
  currentPhase: BuildPhase | null,
  completedCount: number
): UseBuildLogsResult {
  const [logs, setLogs] = useState<BuildLogEntry[]>([])

  const addLog = useCallback((type: BuildLogEntry['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })
    setLogs(prev => [...prev, { timestamp, type, message }])
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  // Track build events and convert to logs
  useEffect(() => {
    if (!isBuilding && !currentPhase) return

    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })

    // Add phase change logs
    if (currentPhase === 'discovery') {
      if (logs.length === 0 || !logs.some(l => l.message.includes('Discovery'))) {
        setLogs(prev => [
          ...prev,
          {
            timestamp,
            type: 'info',
            message: 'Starting resource discovery phase...'
          }
        ])
      }
    } else if (currentPhase === 'building') {
      if (!logs.some(l => l.message.includes('Building'))) {
        setLogs(prev => [
          ...prev,
          {
            timestamp,
            type: 'info',
            message: 'Starting component building phase...'
          }
        ])
      }
    } else if (currentPhase === 'wiring') {
      if (!logs.some(l => l.message.includes('Wiring'))) {
        setLogs(prev => [
          ...prev,
          {
            timestamp,
            type: 'info',
            message: 'Starting component wiring phase...'
          }
        ])
      }
    }

    // Add completion logs
    if (completedCount > 0 && !logs.some(l => l.message.includes(`${completedCount} components`))) {
      const lastLog = logs[logs.length - 1]
      if (!lastLog || !lastLog.message.includes('completed successfully')) {
        setLogs(prev => [
          ...prev,
          {
            timestamp,
            type: 'success',
            message: 'Component completed successfully'
          }
        ])
      }
    }
  }, [currentPhase, completedCount, isBuilding, logs])

  return {
    logs,
    addLog,
    clearLogs
  }
}
