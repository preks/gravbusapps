import { Icon as PhosphorIcon } from '@phosphor-icons/react'

export interface InvestmentArea {
  id: string
  title: string
  description: string
  icon: PhosphorIcon // Changed from string to PhosphorIcon
  category: 'crm' | 'portfolio' | 'analytics'
  path: string
}

export interface InvestmentQuickAction {
  id: string
  label: string
  icon: PhosphorIcon // Changed from string to PhosphorIcon
  action: string
}

export interface InvestmentDashboardStats {
  // IRM Stats (filtered by sourceApp)
  totalLeads: number
  totalOpportunities: number
  totalAccounts: number
  totalContacts: number

  // Investment Stats
  totalInvestments: number
  equityInvestments: number
  realEstateInvestments: number
  liquidFunds: number

  // Portfolio Value
  totalPortfolioValue: number
  assetTypes: number
  averageROI: number
}

export interface InvestmentNavigationCardProps {
  area: InvestmentArea
  onClick: (area: InvestmentArea) => void
  stats?: InvestmentDashboardStats
}

export interface InvestmentQuickActionButtonProps {
  action: InvestmentQuickAction
  onClick: (action: InvestmentQuickAction) => void
}

export interface InvestmentLauncherProps {
  accessToken: string
  userInfo?: any
  employeeId?: string
}
