import type React from 'react'

export interface PremiumHeroChip {
  id: string
  label: string
  onClick?: () => void
}

export interface PremiumHeroTab {
  id: string
  label: string
  content?: React.ReactNode
}

export interface PremiumHeroKpiItem {
  id: string
  label: string
  value: string
  change?: string
  changeDirection?: 'up' | 'down' | 'neutral'
}

export interface PremiumHeroInfoCard {
  id: string
  title: string
  value: string
}
