import { useState, useEffect, useCallback, useRef } from 'react'
import { BoardApiService } from '../services/BoardApiService'
import type { BoardStatsResponse, MyWorkResponse } from '../types'

interface BoardHomeData {
  stats: BoardStatsResponse | null
  myWork: MyWorkResponse | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

const REFRESH_INTERVAL = 5 * 60 * 1000

export function useBoardHomeData(isActive: boolean): BoardHomeData {
  const [stats, setStats] = useState<BoardStatsResponse | null>(null)
  const [myWork, setMyWork] = useState<MyWorkResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedRef = useRef(false)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [statsRes, workRes] = await Promise.all([BoardApiService.getBoardStats(), BoardApiService.getMyWork()])
      setStats(statsRes)
      setMyWork(workRes)
      loadedRef.current = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isActive) return
    if (!loadedRef.current) void load()

    const timer = setInterval(() => void load(), REFRESH_INTERVAL)
    return () => clearInterval(timer)
  }, [isActive, load])

  return { stats, myWork, isLoading, error, refresh: load }
}
