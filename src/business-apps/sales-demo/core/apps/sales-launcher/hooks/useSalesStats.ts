import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface SalesStats {
  totalOrders: number
  totalRevenue: number
  totalProducts: number
  activeBoms: number
  openOrders: number
  completedOrders: number
}

interface UseSalesStatsReturn {
  stats: SalesStats
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useSalesStats = (context: BusinessAppContextProps): UseSalesStatsReturn => {
  const [stats, setStats] = useState<SalesStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    activeBoms: 0,
    openOrders: 0,
    completedOrders: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Generate demo statistics
      setStats({
        totalOrders: 1247,
        totalRevenue: 2850000,
        totalProducts: 342,
        activeBoms: 89,
        openOrders: 156,
        completedOrders: 1091
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setIsLoading(false)
    }
  }

  const refetch = () => {
    fetchStats()
  }

  useEffect(() => {
    fetchStats()
  }, [context.accessToken])

  return {
    stats,
    isLoading,
    error,
    refetch
  }
}
