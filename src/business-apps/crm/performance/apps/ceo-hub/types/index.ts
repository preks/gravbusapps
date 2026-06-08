import { ComponentType } from 'react'

export interface CeoModuleArea {
  id: string
  title: string
  description: string
  icon: ComponentType<{ className?: string; weight?: string }>
  category: 'analytics' | 'performance' | 'strategy'
  path: string
  gradient: string
  stats?: {
    primary: { value: string; label: string }
    secondary?: { value: string; label: string }
  }
  quickLinks?: Array<{
    label: string
    path: string
    params?: Record<string, string>
  }>
}

export interface CeoHubStats {
  // Sales Activity 360 stats
  totalActivities: number
  activitiesThisWeek: number
  callsMade: number
  meetingsScheduled: number
  emailsSent: number

  // Sales Performance stats
  totalRevenue: number
  revenueGrowth: number
  opportunitiesWon: number
  winRate: number
  pipelineValue: number

  // Executive summary
  teamPerformanceScore: number
  forecastAccuracy: number
}
