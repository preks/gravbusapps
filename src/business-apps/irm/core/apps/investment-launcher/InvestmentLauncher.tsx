import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  LauncherLayout,
  type LauncherSectionConfig,
  type QuickActionData,
  type KpiData,
  Alert,
  AlertTitle,
  AlertDescription,
  Button
} from '@newwork/nw-design-system'
import { investmentAreas, investmentQuickActions } from './utils/investmentAreas'
import { InvestmentArea, InvestmentQuickAction } from './types'
import { useInvestmentDashboardStats } from './hooks/useInvestmentDashboardStats'
import { startProcess } from '@/common/utils/start-process'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { TrendUpIcon, WarningIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { MODULE_COLORS } from '@/common/constants/ui'
type InvestmentLauncherProps = BusinessAppContextProps

const InvestmentLauncher: React.FC<InvestmentLauncherProps> = context => {
  const { stats, isLoading, error, refetch } = useInvestmentDashboardStats(context)

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatPercentage = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(num / 100)
  }

  const moduleColor = MODULE_COLORS.IRM
  // Convert stats to KpiData format for header
  const headerKpis = useMemo((): KpiData[] => {
    if (error) return []

    return [
      {
        id: 'total-portfolio-value',
        title: 'Total Portfolio Value',
        value: isLoading ? '...' : formatCurrency(stats.totalPortfolioValue),
        color: 'default'
      },
      {
        id: 'asset-types',
        title: 'Asset Types',
        value: isLoading ? '...' : formatNumber(stats.assetTypes),
        color: 'success'
      },
      {
        id: 'average-roi',
        title: 'Average ROI',
        value: isLoading ? '...' : formatPercentage(stats.averageROI),
        color: 'primary'
      }
    ]
  }, [stats, isLoading, error])

  // Convert quick actions to LauncherLayout format
  const launcherQuickActions = useMemo((): QuickActionData[] => {
    return investmentQuickActions.map(action => ({
      id: action.id,
      label: action.label,
      icon: action.icon, // Now directly using PhosphorIcon components
      onClick: () => handleQuickAction(action)
    }))
  }, [])

  // Generate sections based on investment areas
  const sections = useMemo((): LauncherSectionConfig[] => {
    // Convert areas to cards format
    const cards = investmentAreas.map(area => {
      // Get area stats
      const getAreaStats = (areaId: string) => {
        switch (areaId) {
          case 'leads':
            return {
              value: formatNumber(stats.totalLeads),
              label: 'Total Leads'
            }
          case 'opportunities':
            return {
              value: formatNumber(stats.totalOpportunities),
              label: 'Total Opportunities'
            }
          case 'accounts':
            return {
              value: formatNumber(stats.totalAccounts),
              label: 'Total Accounts'
            }
          case 'contacts':
            return {
              value: formatNumber(stats.totalContacts),
              label: 'Total Contacts'
            }
          case 'investments':
            return {
              value: formatNumber(stats.totalInvestments),
              label: 'Total Investments'
            }
          case 'analytics-reporting':
            return {
              value: formatNumber(stats.assetTypes),
              label: 'Asset Types'
            }
          default:
            return { value: '0', label: 'Items' }
        }
      }

      const areaStats = getAreaStats(area.id)

      // Get actions based on area type
      const getAreaActions = (areaId: string) => {
        switch (areaId) {
          case 'leads':
            return [
              {
                label: 'Active Leads',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', {
                    view: 'leads',
                    leadStatus: 'InvestmentLeadStatus:v1:OPEN'
                  })
                  navigateTo(url)
                }
              },
              {
                label: 'Converted Leads',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', {
                    view: 'leads',
                    leadStatus: 'InvestmentLeadStatus:v1:CONVERTED'
                  })
                  navigateTo(url)
                }
              }
            ]
          case 'opportunities':
            return [
              {
                label: 'Pipeline Management',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', {
                    view: 'opportunities',
                    subView: 'pipeline'
                  })
                  navigateTo(url)
                }
              },
              {
                label: 'Active Opportunities',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', {
                    view: 'opportunities',
                    status: 'OPPORTUNITY_OPEN'
                  })
                  navigateTo(url)
                }
              }
            ]
          case 'accounts':
            return [
              {
                label: 'Customers',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', { view: 'accounts' })
                  navigateTo(url)
                }
              },
              {
                label: 'Inactive Accounts',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', {
                    view: 'accounts',
                    status: 'inactive'
                  })
                  navigateTo(url)
                }
              }
            ]
          case 'contacts':
            return [
              {
                label: 'Founder Contacts',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', {
                    view: 'contacts',
                    contactType: 'FOUNDER_CONTACT'
                  })
                  navigateTo(url)
                }
              },
              {
                label: 'Primary Contacts',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', {
                    view: 'contacts',
                    contactType: 'PRIMARY_CONTACT'
                  })
                  navigateTo(url)
                }
              },
              {
                label: 'Secondary Contacts',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', {
                    view: 'contacts',
                    contactType: 'SECONDARY_CONTACT'
                  })
                  navigateTo(url)
                }
              }
            ]
          case 'investments':
            return [
              {
                label: 'Equity Investments',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-management', {
                    view: 'investments',
                    subView: 'equity'
                  })
                  navigateTo(url)
                }
              },
              {
                label: 'Liquid Funds Investments',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-management', {
                    view: 'investments',
                    subView: 'liquid-funds'
                  })
                  navigateTo(url)
                }
              },
              {
                label: 'Real Estate Investments',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-management', {
                    view: 'investments',
                    subView: 'real-estate'
                  })
                  navigateTo(url)
                }
              }
            ]
          case 'analytics-reporting':
            return [
              {
                label: 'Performance Analytics',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', {
                    view: 'analytics',
                    type: 'performance'
                  })
                  navigateTo(url)
                }
              },
              {
                label: 'Portfolio Reports',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/irm/investment-relations', {
                    view: 'analytics',
                    type: 'portfolio'
                  })
                  navigateTo(url)
                }
              }
            ]
          default:
            return []
        }
      }

      const actions = getAreaActions(area.id)

      return {
        id: area.id,
        title: area.title,
        description: area.description,
        icon: area.icon, // Now directly using PhosphorIcon components
        stats: areaStats,
        actions,
        primaryAction: {
          label: 'View Details',
          onClick: () => handleNavigationClick(area)
        }
      }
    })

    return [
      {
        id: 'core-investment-modules',
        title: 'Core Investment Modules',
        description: 'Essential investment management and portfolio analytics functions',
        cards
      }
    ]
  }, [stats])

  const handleNavigationClick = (area: InvestmentArea) => {
    // Navigate to platform investment relations with specific view
    if (area.id === 'leads') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', {
        view: 'leads'
      })
      navigateTo(url)
    } else if (area.id === 'opportunities') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', {
        view: 'opportunities'
      })
      navigateTo(url)
    } else if (area.id === 'accounts') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', {
        view: 'accounts'
      })
      navigateTo(url)
    } else if (area.id === 'contacts') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', {
        view: 'contacts'
      })
      navigateTo(url)
    } else if (area.id === 'investments') {
      const url = buildPlatformUrl('/platform/irm/investment-management', { view: 'investments' })
      navigateTo(url)
    } else if (area.id === 'analytics-reporting') {
      const url = buildPlatformUrl('/platform/irm/investment-relations', {
        view: 'analytics'
      })
      navigateTo(url)
    }
  }

  const handleQuickAction = (action: InvestmentQuickAction) => {
    if (action.action === 'create-lead') {
      startProcess({
        domain: 'investment-relations',
        processName: 'createInvestmentLead',
        builderType: 'NATIVE_SCREEN',
        payload: {
          accessToken: context.accessToken
        }
      })
    } else if (action.action === 'save-opportunity') {
      startProcess({
        domain: 'investment-relations',
        processName: 'createInvestmentOpportunity',
        builderType: 'NATIVE_SCREEN',
        payload: {
          accessToken: context.accessToken
        }
      })
    } else if (action.action === 'save-contact') {
      startProcess({
        domain: 'investment-relations',
        processName: 'createInvestmentContact',
        builderType: 'NATIVE_SCREEN',
        payload: {
          accessToken: context.accessToken
        }
      })
    } else if (action.action === 'create-account') {
      startProcess({
        domain: 'investment-relations',
        processName: 'createInvestmentAccount',
        builderType: 'NATIVE_SCREEN',
        payload: {
          accessToken: context.accessToken
        }
      })
    } else if (action.action === 'create-opportunity') {
      startProcess({
        domain: 'investment-relations',
        processName: 'createInvestmentOpportunity',
        builderType: 'NATIVE_SCREEN',
        payload: {
          accessToken: context.accessToken
        }
      })
    } else if (action.action === 'create-contact') {
      startProcess({
        domain: 'investment-relations',
        processName: 'createInvestmentContact',
        builderType: 'NATIVE_SCREEN',
        payload: {
          accessToken: context.accessToken
        }
      })
    } else if (action.action === 'create-investment') {
      startProcess({
        domain: 'investment-relations',
        processName: 'createInvestment',
        builderType: 'NATIVE_SCREEN',
        payload: {
          accessToken: context.accessToken
        }
      })
    } else if (action.action === 'generate-report') {
      const url = buildPlatformUrl('/platform/irm/investment-management', {
        view: 'investments'
      })
      navigateTo(url)
    } else {
      // TODO: Implement other quick actions when functionality is available
    }
  }

  // Show error state if stats loading failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-decorative-1">
        <div className="max-w-md mx-auto p-6">
          <Alert variant="destructive" className="bg-card/90 backdrop-blur-md">
            <WarningIcon size={16} className="h-4 w-4" />
            <AlertTitle>Error Loading Stats</AlertTitle>
            <AlertDescription>
              {error}
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={refetch}>
                  <ArrowsClockwiseIcon size={16} className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <LauncherLayout
      title="Investment Relations Management Hub"
      description="Comprehensive portfolio management, investment tracking, and performance analytics"
      icon={TrendUpIcon}
      headerKpis={headerKpis}
      sections={sections}
      quickActions={launcherQuickActions}
      quickActionsTitle="Quick Actions"
      quickActionsDescription="Frequently used investment and business management functions"
      variant={moduleColor}
    />
  )
}

export default InvestmentLauncher
