import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  LauncherLayout,
  type LauncherSectionConfig,
  type NavigationCardData,
  type KpiData,
  type QuickActionData,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Button
} from '@newwork/nw-design-system'
import { salesAreas, salesQuickActions } from './utils/salesAreas'
import { SalesArea, SalesQuickAction } from './types'
import { useSalesStats } from './hooks/useSalesStats'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { MODULE_COLORS } from '@/common/constants/ui'
import { ShoppingCart, WarningIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react'

interface SalesLauncherProps extends BusinessAppContextProps {}
const moduleColor = MODULE_COLORS.ERP
const SalesLauncher: React.FC<SalesLauncherProps> = context => {
  const { stats, isLoading, error, refetch } = useSalesStats(context)

  // Format numbers for display
  const formatNumber = (num: number): string => {
    return num.toLocaleString()
  }

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Convert stats to KpiData format for header
  const headerKpis = useMemo((): KpiData[] => {
    if (error) return []

    return [
      {
        id: 'total-orders',
        title: 'Total Orders',
        value: isLoading ? '...' : formatNumber(stats.totalOrders),
        color: 'info'
      },
      {
        id: 'total-revenue',
        title: 'Total Revenue',
        value: isLoading ? '...' : formatCurrency(stats.totalRevenue),
        color: 'success'
      },
      {
        id: 'open-orders',
        title: 'Open Orders',
        value: isLoading ? '...' : formatNumber(stats.openOrders),
        color: 'warning'
      },
      {
        id: 'total-products',
        title: 'Products',
        value: isLoading ? '...' : formatNumber(stats.totalProducts),
        color: 'default'
      }
    ]
  }, [stats, isLoading, error])

  // Helper functions
  const getDefaultButtonLabel = (areaId: string): string => {
    switch (areaId) {
      case 'sales-orders':
        return 'Manage Orders'
      case 'sales-performance':
        return 'View Reports'
      case 'product-management':
        return 'Manage Products'
      case 'bom-management':
        return 'Manage BOMs'
      default:
        return 'View Details'
    }
  }

  // Generate sections for LauncherLayout
  const sections = useMemo((): LauncherSectionConfig[] => {
    const areas: SalesArea[] = salesAreas

    // Convert areas to NavigationCardData format
    const cards: NavigationCardData[] = areas.map(area => {
      // Get area stats
      const getAreaStats = (areaId: string) => {
        switch (areaId) {
          case 'sales-orders':
            return {
              value: formatNumber(stats.totalOrders),
              label: 'Total Orders'
            }
          case 'sales-performance':
            return {
              value: formatCurrency(stats.totalRevenue),
              label: 'Total Revenue'
            }
          case 'product-management':
            return {
              value: formatNumber(stats.totalProducts),
              label: 'Total Products'
            }
          case 'bom-management':
            return {
              value: formatNumber(stats.activeBoms),
              label: 'Active BOMs'
            }
          default:
            return { value: '0', label: 'Items' }
        }
      }

      const areaStats = getAreaStats(area.id)

      // Get variant based on category
      const getVariant = (category: string) => {
        switch (category) {
          case 'orders':
            return 'info'
          case 'analytics':
            return 'success'
          case 'products':
            return 'warning'
          case 'manufacturing':
            return 'default'
          default:
            return 'default'
        }
      }

      return {
        id: area.id,
        title: area.title,
        description: area.description,
        icon: area.icon,
        stats: areaStats,
        actions:
          area.links?.map(link => ({
            label: link.label,
            onClick: () => handleLinkClick(link.action)
          })) || [],
        primaryAction: {
          label: area.buttonLabel || getDefaultButtonLabel(area.id),
          onClick: () => handleNavigationClick(area)
        },
        variant: getVariant(area.category)
      }
    })

    return [
      {
        id: 'sales-modules',
        title: 'Sales Management Hub',
        description: 'Comprehensive sales tools for order management, product catalog, and performance analytics',
        cards
      }
    ]
  }, [stats])

  const handleNavigationClick = (area: SalesArea) => {
    console.log(`Navigation clicked for ${area.title}`)

    // Map areas to their corresponding navigation paths
    const areaToPathMap: Record<string, string> = {
      'sales-orders': '/platform/sales-demo/sales-order-overview',
      'sales-performance': '/platform/sales-demo/sales-performance-report',
      'product-management': '/platform/sales-demo/product-management-overview',
      'bom-management': '/platform/sales-demo/bom-management-overview'
    }

    const navigationPath = areaToPathMap[area.id]

    if (navigationPath) {
      const salesUrl = buildPlatformUrl(navigationPath)
      navigateTo(salesUrl)
    }
  }

  const handleLinkClick = (actionPath: string) => {
    console.log(`Link clicked: ${actionPath}`)
    const salesUrl = buildPlatformUrl(actionPath)
    navigateTo(salesUrl)
  }

  const handleQuickAction = (action: SalesQuickAction) => {
    console.log(`Quick action: ${action.action}`)

    switch (action.action) {
      case 'create-sales-order':
        // Navigate to sales order overview
        const orderUrl = buildPlatformUrl('/platform/sales-demo/sales-order-overview')
        navigateTo(orderUrl)
        break
      case 'add-product':
        // Navigate to product management
        const productUrl = buildPlatformUrl('/platform/sales-demo/product-management-overview')
        navigateTo(productUrl)
        break
      case 'view-analytics':
        // Navigate to sales performance report
        const analyticsUrl = buildPlatformUrl('/platform/sales-demo/sales-performance-report')
        navigateTo(analyticsUrl)
        break
      case 'manage-pipeline':
        // Navigate to sales performance report
        const pipelineUrl = buildPlatformUrl('/platform/sales-demo/sales-performance-report')
        navigateTo(pipelineUrl)
        break
      default:
        console.log('Unknown quick action:', action.action)
    }
  }

  // Convert quick actions to LauncherLayout format
  const launcherQuickActions = useMemo((): QuickActionData[] => {
    return salesQuickActions.map(action => ({
      id: action.id,
      label: action.label,
      icon: action.icon,
      onClick: () => handleQuickAction(action),
      variant: 'secondary'
    }))
  }, [])

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-decorative-1">
        <div className="max-w-md mx-auto p-6">
          <div className="text-center">
            <Spinner size="lg" className="mb-4" />
            <div className="text-sm text-muted-foreground">Loading sales data...</div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if stats loading failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-decorative-1">
        <div className="max-w-md mx-auto p-6">
          <Alert variant="destructive" className="bg-card/90 backdrop-blur-md">
            <WarningIcon size={16} className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
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
      title="Sales Management Hub"
      description="Comprehensive sales tools for order management, product catalog, performance analytics, and manufacturing operations"
      icon={ShoppingCart}
      headerKpis={headerKpis}
      sections={sections}
      quickActions={launcherQuickActions}
      quickActionsTitle="Quick Actions"
      quickActionsDescription="Frequently used sales functions and shortcuts"
      variant={moduleColor}
    />
  )
}

export default SalesLauncher
