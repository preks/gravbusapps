import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  LauncherLayout,
  type LauncherSectionConfig,
  type KpiData,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Button
} from '@newwork/nw-design-system'
import { hrAreas, hrQuickActions } from './utils/hrAreas'
import { HrArea, HrQuickAction } from './types'
import { useHrStats } from './hooks/useHrStats'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { startProcess } from '@/common/utils/start-process'
import { UsersIcon, WarningIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { MODULE_COLORS } from '@/common/constants/ui'

const moduleColor = MODULE_COLORS.HR
const HrLauncher: React.FC<BusinessAppContextProps> = context => {
  const { stats, isLoading, error, refetch } = useHrStats(context)

  // Format numbers for display
  const formatNumber = (num: number): string => {
    return num.toLocaleString()
  }

  // Convert stats to KpiData format for header
  const headerKpis = useMemo((): KpiData[] => {
    if (error) return []

    return [
      {
        id: 'my-pending-absences',
        title: 'My Pending Absences',
        value: isLoading ? '...' : formatNumber(stats.myPendingAbsences),
        color: 'warning'
      },
      {
        id: 'team-pending-absences',
        title: 'Team Pending Absences',
        value: isLoading ? '...' : formatNumber(stats.teamPendingAbsences),
        color: 'info'
      }
    ]
  }, [stats, isLoading, error])

  // Helper functions
  const getDefaultButtonLabel = (areaId: string): string => {
    switch (areaId) {
      case 'employee-directory':
        return 'View Directory'
      case 'employee-management':
        return 'Manage Employees'
      case 'job-management':
        return 'Manage Jobs'
      case 'absences':
        return 'View Absences'
      case 'hr-analytics':
        return 'View Analytics'
      case 'hr-settings':
        return 'Open Settings'
      default:
        return 'View Details'
    }
  }

  // Generate sections for LauncherLayout
  const sections = useMemo((): LauncherSectionConfig[] => {
    const areas: HrArea[] = hrAreas

    // Convert areas to NavigationCardData format
    const cards = areas.map(area => {
      // Get area stats
      const getAreaStats = (areaId: string) => {
        switch (areaId) {
          case 'employee-directory':
            return {
              value: formatNumber(stats.totalOrganizationalUnits),
              label: 'Organization Units'
            }
          case 'employee-management':
            return {
              value: formatNumber(stats.uniqueEmploymentTypes),
              label: 'Employment Types'
            }
          case 'job-management':
            return {
              value: formatNumber(stats.totalJobPositions),
              label: 'Total Job Positions'
            }
          case 'absences':
            return {
              value: formatNumber(stats.myPendingAbsences + stats.teamPendingAbsences),
              label: 'Total Pending'
            }
          case 'hr-analytics':
            return {
              value: '6',
              label: 'Analytics Dashboards'
            }
          case 'hr-settings':
            return {
              value: '4',
              label: 'MDM Categories'
            }
          default:
            return { value: '0', label: 'Items' }
        }
      }

      const areaStats = getAreaStats(area.id)

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
        }
      }
    })

    return [
      {
        id: 'hr-modules',
        title: 'Human Resources Management Hub',
        description: 'Comprehensive HR tools for employee management, analytics, and organizational operations',
        cards
      }
    ]
  }, [stats])

  const handleNavigationClick = (area: HrArea) => {
    console.log(`Navigation clicked for ${area.title}`)

    // Map areas to their corresponding navigation paths
    const areaToPathMap: Record<string, string> = {
      'employee-directory': '/platform/employee-directory',
      'employee-management': '/platform/hr/human-resources?view=employees',
      'job-management': '/platform/hr/human-resources?view=positions',
      absences: '/platform/hr/absences/personal-absences',
      'hr-analytics': '/platform/hr/human-resources?view=analytics',
      'hr-settings': '/platform/hr-settings'
    }

    const navigationPath = areaToPathMap[area.id]

    if (navigationPath) {
      const hrUrl = buildPlatformUrl(navigationPath)
      navigateTo(hrUrl)
    }
  }

  const handleLinkClick = (actionPath: string) => {
    console.log(`Link clicked: ${actionPath}`)
    const hrUrl = buildPlatformUrl(actionPath)
    navigateTo(hrUrl)
  }

  const handleQuickAction = (action: HrQuickAction) => {
    const employeeId = context.userInfo?.employeeDetails?.employeeId

    if (!employeeId) {
      console.error('Employee ID not found, cannot start process')
      return
    }

    if (action.action === 'add-employee') {
      startProcess({
        domain: 'employee',
        processName: 'saveEmployee',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      })
    } else if (action.action === 'create-job-position') {
      startProcess({
        domain: 'employee',
        processName: 'saveJobPosition',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      })
    } else if (action.action === 'create-job-profile') {
      startProcess({
        domain: 'employee',
        processName: 'saveJobProfile',
        builderType: 'NATIVE_SCREEN',
        payload: {}
      })
    } else if (action.action === 'add-project') {
      startProcess({
        domain: 'dummy-domain',
        processName: 'changeProject',
        builderType: 'NATIVE_SCREEN',
        payload: {
          employeeId: employeeId
        }
      })
    } else {
      console.log(`Quick action "${action.action}" functionality coming soon`)
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-decorative-1">
        <div className="bg-card/90 backdrop-blur-md p-8 rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <Spinner size="lg" />
            <span className="text-lg font-medium text-card-foreground">Loading HR data...</span>
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
      title="Human Resources Management Hub"
      description="Comprehensive HR tools for employee management, workforce analytics, and organizational operations"
      icon={UsersIcon}
      headerKpis={headerKpis}
      sections={sections}
      quickActions={hrQuickActions.map(action => ({
        id: action.id,
        label: action.label,
        icon: action.icon,
        onClick: () => handleQuickAction(action)
      }))}
      variant={moduleColor}
    />
  )
}

export default HrLauncher
