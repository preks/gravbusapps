import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  LauncherLayout,
  type LauncherSectionConfig,
  type NavigationCardData,
  type QuickActionData,
  type KpiData,
  Alert,
  AlertTitle,
  AlertDescription,
  Button
} from '@newwork/nw-design-system'
import { crmAreas, quickActions } from './utils/crmAreas'
import { CrmArea, QuickAction } from './types'
import { useCrmDashboardStats } from './hooks/useCrmDashboardStats'
import { startProcess } from '@/common/utils/start-process'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import * as RemixIcons from '@remixicon/react'
// Import PhosphorIcons for LauncherLayout
import { UsersIcon } from '@phosphor-icons/react'
import { MODULE_COLORS } from '@/common/constants/ui'

type CustomerLauncherProps = BusinessAppContextProps

const CustomerLauncher: React.FC<CustomerLauncherProps> = context => {
  const { stats, isLoading, error, refetch } = useCrmDashboardStats(context)

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

  const moduleColor = MODULE_COLORS.CRM
  // Convert stats to KpiData format for header
  const headerKpis = useMemo((): KpiData[] => {
    if (error) return []

    return [
      {
        id: 'total-accounts',
        title: 'Total Accounts',
        value: isLoading ? '...' : formatNumber(stats.totalAccounts),
        color: 'default'
      },
      {
        id: 'active-opportunities',
        title: 'Active Opportunities',
        value: isLoading ? '...' : formatNumber(stats.activeOpportunities),
        color: 'success'
      },
      {
        id: 'pipeline-value',
        title: 'Pipeline Value',
        value: isLoading ? '...' : formatCurrency(stats.pipelineValue),
        color: 'primary'
      }
    ]
  }, [stats, isLoading, error])

  // Convert quick actions to LauncherLayout format
  const launcherQuickActions = useMemo((): QuickActionData[] => {
    return quickActions.map(action => ({
      id: action.id,
      label: action.label,
      icon: action.icon, // Now directly using PhosphorIcon components
      onClick: () => handleQuickAction(action)
    }))
  }, [])

  // Generate sections based on CRM areas
  const sections = useMemo((): LauncherSectionConfig[] => {
    // Convert areas to NavigationCardData format
    const cards: NavigationCardData[] = crmAreas.map(area => {
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
          case 'reports':
            return {
              value: formatNumber(12),
              label: 'Active Reports'
            }
          case 'analytics':
            return {
              value: formatNumber(6),
              label: 'Data Sources'
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
                  const url = buildPlatformUrl('/platform/crm/customer-relations', {
                    view: 'leads',
                    salesLeadStatus: 'SalesLeadStatus:v1:OPEN'
                  })
                  navigateTo(url)
                }
              },
              {
                label: 'Converted Leads',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/crm/customer-relations', {
                    view: 'leads',
                    salesLeadStatus: 'SalesLeadStatus:v1:CONVERTED'
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
                  const url = buildPlatformUrl('/platform/crm/customer-relations', {
                    view: 'opportunities',
                    subView: 'pipeline'
                  })
                  navigateTo(url)
                }
              },
              {
                label: 'Active Opportunities',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/crm/customer-relations', {
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
                  const url = buildPlatformUrl('/platform/crm/customer-relations', { view: 'accounts' })
                  navigateTo(url)
                }
              },
              {
                label: 'Inactive Accounts',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/crm/customer-relations', {
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
                  const url = buildPlatformUrl('/platform/crm/customer-relations', {
                    view: 'contacts',
                    contactType: 'FOUNDER_CONTACT'
                  })
                  navigateTo(url)
                }
              },
              {
                label: 'Primary Contacts',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/crm/customer-relations', {
                    view: 'contacts',
                    contactType: 'PRIMARY_CONTACT'
                  })
                  navigateTo(url)
                }
              },
              {
                label: 'Secondary Contacts',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/crm/customer-relations', {
                    view: 'contacts',
                    contactType: 'SECONDARY_CONTACT'
                  })
                  navigateTo(url)
                }
              }
            ]
          case 'reports':
            return [
              {
                label: 'Sales Reports',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/crm/customer-relations', { view: 'dashboard' })
                  navigateTo(url)
                }
              },
              {
                label: 'Custom Reports',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/crm/customer-relations', { view: 'dashboard' })
                  navigateTo(url)
                }
              }
            ]
          case 'analytics':
            return [
              {
                label: 'Performance Analytics',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/crm/customer-relations', { view: 'dashboard' })
                  navigateTo(url)
                }
              },
              {
                label: 'Predictive Insights',
                onClick: () => {
                  const url = buildPlatformUrl('/platform/crm/customer-relations', { view: 'dashboard' })
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
        },
        variant: moduleColor
      }
    })

    return [
      {
        id: 'core-crm-modules',
        title: 'Core CRM Modules',
        description: 'Essential CRM functions for daily operations and customer management',
        cards
      }
    ]
  }, [stats])

  const handleNavigationClick = (area: CrmArea) => {
    // Navigate to customer relations with specific view
    if (area.id === 'leads') {
      const url = buildPlatformUrl('/platform/crm/customer-relations', {
        view: 'leads'
      })
      navigateTo(url)
    } else if (area.id === 'opportunities') {
      const url = buildPlatformUrl('/platform/crm/customer-relations', {
        view: 'opportunities'
      })
      navigateTo(url)
    } else if (area.id === 'accounts') {
      const url = buildPlatformUrl('/platform/crm/customer-relations', {
        view: 'accounts'
      })
      navigateTo(url)
    } else if (area.id === 'contacts') {
      const url = buildPlatformUrl('/platform/crm/customer-relations', {
        view: 'contacts'
      })
      navigateTo(url)
    } else if (area.id === 'reports') {
      const url = buildPlatformUrl('/platform/crm/customer-relations', {
        view: 'dashboard'
      })
      navigateTo(url)
    } else if (area.id === 'analytics') {
      const url = buildPlatformUrl('/platform/crm/customer-relations', {
        view: 'dashboard'
      })
      navigateTo(url)
    }
  }

  const handleQuickAction = (action: QuickAction) => {
    if (action.action === 'create-lead') {
      startProcess({
        domain: 'customer-relations',
        processName: 'createLead',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      })
    } else if (action.action === 'save-opportunity') {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveOpportunity',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      })
    } else if (action.action === 'save-contact') {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveContact',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      })
    } else if (action.action === 'create-account') {
      startProcess({
        domain: 'customer-relations',
        processName: 'saveAccount',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      })
    } else if (action.action === 'generate-report') {
      const url = buildPlatformUrl('/platform/crm/customer-relations', {
        view: 'dashboard'
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
            <RemixIcons.RiErrorWarningLine className="h-4 w-4" />
            <AlertTitle>Error Loading Stats</AlertTitle>
            <AlertDescription>
              {error}
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={refetch}>
                  <RemixIcons.RiRefreshLine className="h-4 w-4 mr-1" />
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
      title="Customer Relationship Management Hub"
      description="Comprehensive customer management, sales pipeline, and relationship intelligence"
      icon={UsersIcon}
      headerKpis={headerKpis}
      sections={sections}
      quickActions={launcherQuickActions}
      quickActionsTitle="Quick Actions"
      quickActionsDescription="Frequently used CRM functions and shortcuts"
      variant={moduleColor}
    />
  )
}

export default CustomerLauncher
