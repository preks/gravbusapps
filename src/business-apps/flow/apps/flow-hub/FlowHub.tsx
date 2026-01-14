import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  LauncherLayout,
  type LauncherSectionConfig,
  type QuickActionData,
  type KpiData,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Button
} from '@newwork/nw-design-system'
import { quickActions } from './utils/flowAreas'
import { FlowArea, FlowQuickAction } from './types'
import { useFlowDashboardStats } from './hooks/useFlowDashboardStats'
import { useFlowPermissions } from './hooks/useFlowPermissions'
import { navigateTo } from '@/common/utils/navigationUtils'
import * as RemixIcons from '@remixicon/react'
// Import RemixIcons for LauncherLayout
import {
  RiUser3Line as User,
  RiSettings4Line as Gear,
  RiBarChartLine as ChartBar,
  RiLineChartLine as ChartLine,
  RiTeamLine as Users,
  RiPieChartLine as ChartPie,
  RiFlowChart as Workflow,
  RiFileTextLine as FileText,
  RiPlayLine as Play
} from '@remixicon/react'

type FlowHubProps = BusinessAppContextProps

const FlowHub: React.FC<FlowHubProps> = context => {
  const { stats, isLoading, error, refetch } = useFlowDashboardStats(context)
  const {
    loading: permissionsLoading,
    error: permissionsError,
    hasManagerPermissions,
    hasAdminPermissions,
    canViewPersonalFlows,
    canViewTeamFlows,
    canManageWorkflows,
    canAdministerFlows,
    isFeatureVisible
  } = useFlowPermissions(context.userInfo?.employeeDetails?.employeeId || '', context.accessToken || '')

  // Determine UI layout based on permissions
  const showAdminView = hasAdminPermissions()
  const showManagerView = hasManagerPermissions() && !hasAdminPermissions()
  // const showEmployeeView = !hasManagerPermissions() && !hasAdminPermissions();

  // Format numbers
  const formatNumber = (num: number): string => {
    if (showAdminView || showManagerView) {
      return num.toString() // Simple format for admin and manager
    }
    return num.toLocaleString() // Locale format for employee
  }

  // Convert stats to KpiData format for header
  const headerKpis = useMemo((): KpiData[] => {
    if (error) return []

    if (showAdminView) {
      return [
        {
          id: 'system-workflows',
          title: 'Active System Flows',
          value: isLoading ? '...' : formatNumber(stats.systemActiveWorkflows),
          color: 'primary'
        },
        {
          id: 'team-pending-approvals',
          title: 'Pending Approvals',
          value: isLoading ? '...' : formatNumber(stats.teamPendingApprovals),
          color: 'default'
        },
        {
          id: 'team-active-tasks',
          title: 'Open Team Tasks',
          value: isLoading ? '...' : formatNumber(stats.teamActiveTasks),
          color: 'success'
        }
      ]
    } else if (showManagerView) {
      return [
        {
          id: 'personal-active-tasks',
          title: 'My Open Tasks',
          value: isLoading ? '...' : formatNumber(stats.activeTasks),
          color: 'primary'
        },
        {
          id: 'team-active-tasks',
          title: 'Team Open Tasks',
          value: isLoading ? '...' : formatNumber(stats.teamActiveTasks),
          color: 'default'
        },
        {
          id: 'team-pending-approvals',
          title: 'Pending Approvals',
          value: isLoading ? '...' : formatNumber(stats.teamPendingApprovals),
          color: 'success'
        }
      ]
    } else {
      return [
        {
          id: 'active-tasks',
          title: 'Open Tasks',
          value: isLoading ? '...' : formatNumber(stats.activeTasks),
          color: 'default'
        },
        {
          id: 'active-flows',
          title: 'Active Flows',
          value: isLoading ? '...' : formatNumber(stats.activeFlows),
          color: 'default'
        },
        {
          id: 'completed-month',
          title: 'Completed This Month',
          value: isLoading ? '...' : formatNumber(stats.completedTasksMonth),
          color: 'primary'
        }
      ]
    }
  }, [stats, isLoading, error, showAdminView, showManagerView])

  // Convert quick actions to LauncherLayout format
  const hubQuickActions = useMemo((): QuickActionData[] => {
    return quickActions.map(action => ({
      id: action.id,
      label: action.label,
      icon: action.icon as unknown as any,
      onClick: () => handleQuickAction(action),
      variant: 'secondary'
    }))
  }, [])

  // Helper functions
  const getDefaultButtonLabel = (areaId: string): string => {
    switch (areaId) {
      case 'active-tasks':
        return 'View Active Tasks'
      case 'my-flows':
        return 'View My Flows'
      case 'templates':
        return 'Browse Templates'
      case 'completed':
        return 'View Completed'
      case 'analytics':
        return 'View Analytics'
      default:
        return 'View Details'
    }
  }

  // Generate sections based on permissions
  const sections = useMemo((): LauncherSectionConfig[] => {
    const areas: FlowArea[] = []

    if (showAdminView) {
      // Admin view: system administration cards
      if (canViewPersonalFlows()) {
        areas.push({
          id: 'personal-workflows',
          title: 'Personal Flows',
          description: 'Manage your own flow initiations and task assignments',
          icon: User,
          category: 'management',
          kpiType: 'personal',
          links: [
            { label: 'Active Tasks', action: 'personal-active-tasks' },
            { label: 'My Flows', action: 'personal-my-flows' },
            { label: 'Templates', action: 'personal-templates' },
            { label: 'Completed', action: 'personal-completed' }
          ],
          buttonLabel: 'Go to Personal Flows',
          buttonAction: 'navigate-personal-workflows'
        })
      }

      areas.push({
        id: 'system-administration',
        title: 'System Administration',
        description: 'Comprehensive flow system oversight and administration',
        icon: Gear,
        category: 'admin',
        kpiType: 'admin',
        links: [
          { label: 'All Active Flows', action: 'admin-active-workflows' },
          { label: 'Template Management', action: 'admin-template-management' },
          { label: 'System Configuration', action: 'admin-system-config' },
          { label: 'User Management', action: 'admin-user-management' }
        ],
        buttonLabel: 'Go to Administration',
        buttonAction: 'navigate-admin-workflows'
      })

      areas.push({
        id: 'system-analytics',
        title: 'System Analytics',
        description: 'Enterprise flow analytics, system performance, and insights',
        icon: ChartLine,
        category: 'admin',
        kpiType: 'analytics',
        buttonLabel: 'View System Analytics',
        buttonAction: 'navigate-system-analytics'
      })
    } else if (showManagerView) {
      if (canViewPersonalFlows()) {
        areas.push({
          id: 'personal-workflows',
          title: 'Personal Flows',
          description: 'Manage your own flow initiations and task assignments',
          icon: User,
          category: 'management',
          kpiType: 'personal',
          links: [
            { label: 'Active Tasks', action: 'personal-active-tasks' },
            { label: 'My Flows', action: 'personal-my-flows' },
            { label: 'Templates', action: 'personal-templates' },
            { label: 'Completed', action: 'personal-completed' }
          ],
          buttonLabel: 'Go to Personal Flows',
          buttonAction: 'navigate-personal-workflows'
        })
      }

      if (canViewTeamFlows() || canManageWorkflows()) {
        areas.push({
          id: 'team-workflows',
          title: 'Team Flows',
          description: 'Oversee and manage your team members flow activities',
          icon: Users,
          category: 'management',
          kpiType: 'team',
          links: [
            { label: 'Team Active Tasks', action: 'team-active-tasks' },
            { label: 'Team Flows', action: 'team-flows' },
            { label: 'Pending Approvals', action: 'team-pending-approvals' },
            { label: 'Team Analytics', action: 'team-analytics' }
          ],
          buttonLabel: 'Go to Team Flows',
          buttonAction: 'navigate-team-workflows'
        })
      }

      areas.push({
        id: 'workflow-analytics',
        title: 'Flow Analytics',
        description: 'Personal flow insights, performance metrics, and trends',
        icon: ChartBar,
        category: 'management',
        kpiType: 'analytics',
        buttonLabel: 'View My Analytics',
        buttonAction: 'navigate-personal-analytics'
      })

      if (canViewTeamFlows() || canManageWorkflows()) {
        areas.push({
          id: 'team-analytics',
          title: 'Team Analytics',
          description: 'Team flow insights, performance tracking, and metrics',
          icon: ChartPie,
          category: 'management',
          kpiType: 'analytics',
          buttonLabel: 'View Team Analytics',
          buttonAction: 'navigate-team-analytics'
        })
      }
    } else {
      // Employee view: Four cards per spec
      areas.push({
        id: 'my-flows',
        title: 'My Flows',
        description: 'Access your inbox, initiated and participated flows',
        icon: Workflow,
        category: 'core',
        links: [
          { label: 'Open Tasks', action: 'inbox-open-tasks' },
          { label: 'Initiated Flows', action: 'inbox-initiated' },
          { label: 'Participated Flows', action: 'inbox-participated' }
        ],
        buttonLabel: 'Open Inbox',
        buttonAction: 'navigate-inbox'
      })

      areas.push({
        id: 'flow-value-packs',
        title: 'Flow Value Packs',
        description: 'Prebuilt value packs for flows',
        icon: Gear,
        category: 'core',
        links: [
          { label: 'Compliance Value Pack', action: 'value-pack-compliance' },
          { label: 'Employee Lifecycle', action: 'solution-employee-lifecycle' },
          { label: 'Survey Value Pack', action: 'value-pack-survey' }
        ],
        buttonLabel: 'Browse Value Packs',
        buttonAction: 'navigate-value-pack-compliance'
      })

      areas.push({
        id: 'flow-launcher',
        title: 'Flow Launcher',
        description: 'Launch flow templates',
        icon: Play,
        category: 'core',
        links: [
          { label: 'Launch Flow', action: 'launcher-launch' },
          { label: 'Simulate Flow', action: 'launcher-simulate' }
        ],
        buttonLabel: 'Open Flow Launcher',
        buttonAction: 'navigate-flow-launcher'
      })

      areas.push({
        id: 'flow-creator',
        title: 'Flow Creator',
        description: 'Create and manage flow templates',
        icon: FileText,
        category: 'core',
        links: [
          { label: 'Create Flow Template', action: 'templates-create' },
          { label: 'Manage Flow Templates', action: 'templates-manage' }
        ],
        buttonLabel: 'Open Flow Creator',
        buttonAction: 'navigate-flow-creator'
      })

      areas.push({
        id: 'flow-success',
        title: 'Flow Success',
        description: 'Track flow outcomes and performance over time',
        icon: ChartLine,
        category: 'analytics',
        links: [
          { label: 'Flow Analytics', action: 'success-trends' },
          { label: 'Task Analytics', action: 'success-task-performance' },
          { label: 'SLA Monitoring', action: 'success-sla' },
          { label: 'Audit Logs', action: 'success-audit' }
        ],
        buttonLabel: 'Open Flow Success',
        buttonAction: 'navigate-flow-success'
      })

      areas.push({
        id: 'flow-guardian',
        title: 'Flow Guardian',
        description: 'Monitor flow quality and governance checks',
        icon: ChartPie,
        category: 'analytics',
        links: [{ label: 'Guardian Dashboard', action: 'guardian-dashboard' }],
        buttonLabel: 'Open Flow Guardian',
        buttonAction: 'navigate-flow-guardian'
      })
    }

    // Convert areas to NavigationCardData format
    const cards = areas.map(area => {
      // Get area stats
      const getAreaStats = (areaId: string, kpiType?: string) => {
        if ((showManagerView || showAdminView) && kpiType) {
          switch (kpiType) {
            case 'personal':
              return {
                value: formatNumber(stats.activeTasks || 7),
                label: 'Active Tasks'
              }
            case 'team':
              return {
                value: formatNumber(stats.teamActiveTasks || 45),
                label: 'Team Tasks'
              }
            case 'analytics':
              return {
                value: formatNumber(stats.completedTasksMonth || 24),
                label: 'Completed This Month'
              }
            case 'admin':
              return {
                value: formatNumber(stats.systemActiveWorkflows || 189),
                label: 'System Flows'
              }
            default:
              return { value: '0', label: 'Items' }
          }
        }

        switch (areaId) {
          case 'active-tasks':
            return {
              value: formatNumber(stats.activeTasks),
              label: 'Active Tasks'
            }
          case 'my-flows':
            return {
              value: formatNumber(stats.activeTasks),
              label: 'Open Tasks'
            }
          case 'flow-value-packs':
            return {
              value: formatNumber(1),
              label: 'Enabled Solutions'
            }
          case 'flow-creator':
          case 'flow-launcher':
            return {
              value: formatNumber(25), // Mock template count
              label: 'Available Templates'
            }
          case 'completed':
            return {
              value: formatNumber(stats.totalCompletedTasks),
              label: 'Total Completed'
            }
          case 'flow-success':
            return {
              value: formatNumber(stats.completedTasksMonth),
              label: 'Completed This Month'
            }
          case 'flow-guardian':
            return {
              value: formatNumber(stats.activeFlows),
              label: 'Active Flows'
            }
          default:
            return { value: '0', label: 'Items' }
        }
      }

      const areaStats = getAreaStats(area.id, area.kpiType)

      // Convert links to actions format
      const actions =
        area.links?.map(link => ({
          label: link.label,
          onClick: () => handleLinkClick(link.action)
        })) || []

      // Get variant based on category and area ID
      const getVariant = (
        category: string,
        areaId: string
      ):
        | 'default'
        | 'success'
        | 'ext1'
        | 'ext2'
        | 'ext3'
        | 'ext4'
        | 'ext5'
        | 'ext6'
        | 'ext7'
        | 'ext8'
        | 'info'
        | 'destructive'
        | 'warning'
        | undefined => {
        if (areaId === 'templates' || areaId === 'flow-creator' || areaId === 'flow-launcher') return 'ext2'
        if (areaId === 'completed') return 'success'
        if (areaId === 'analytics' || areaId === 'flow-success' || areaId === 'flow-guardian') return 'info'
        if (areaId === 'system-administration' || areaId === 'system-analytics') return 'success'
        if (areaId === 'team-workflows' || areaId === 'team-analytics') return 'success'

        switch (category) {
          case 'core':
            return 'ext2'
          case 'management':
            return 'ext2'
          case 'analytics':
            return 'ext4'
          case 'admin':
            return 'success'
          default:
            return 'default'
        }
      }

      const baseCard = {
        id: area.id,
        title: area.title,
        description: area.description,
        icon: area.icon as unknown as any,
        stats: areaStats,
        actions,
        variant: getVariant(area.category, area.id)
      }

      // Only include primaryAction if a buttonAction/label is provided
      if (area.buttonAction || area.buttonLabel) {
        return {
          ...baseCard,
          primaryAction: {
            label: area.buttonLabel || getDefaultButtonLabel(area.id),
            onClick: () => handleNavigationClick(area)
          }
        }
      }

      return baseCard
    })

    return [
      {
        id: 'flow-modules',
        title: showAdminView ? 'System Administration Hub' : showManagerView ? 'Management Hub' : 'Flow Hub',
        description: showAdminView
          ? 'Comprehensive system oversight and flow administration'
          : showManagerView
            ? 'Personal and team flow management tools'
            : 'Essential flow functions for task management and process automation',
        cards
      }
    ]
  }, [
    showAdminView,
    showManagerView,
    canViewPersonalFlows,
    canViewTeamFlows,
    canManageWorkflows,
    canAdministerFlows,
    isFeatureVisible,
    stats
  ])

  const handleNavigationClick = (area: FlowArea) => {
    console.log(`Navigation clicked for ${area.title} - navigation implementation coming soon`)

    if (area.buttonAction) {
      switch (area.buttonAction) {
        case 'navigate-inbox':
          navigateTo('/platform/apps/flow/apps/inbox?tab=open')
          break
        case 'navigate-personal-workflows':
          console.log('Navigating to personal flows')
          break
        case 'navigate-team-workflows':
          console.log('Navigating to team flows')
          break
        case 'navigate-admin-workflows':
          console.log('Navigating to admin flows')
          break
        case 'navigate-value-pack-compliance':
          navigateTo('/platform/apps/flow/apps/value-packs/compliance')
          break
        case 'navigate-solution-employee-lifecycle':
          navigateTo('/platform/apps/flow/apps/value-packs/employee-lifecycle')
          break
        case 'navigate-solution-survey':
          navigateTo('/platform/apps/flow/apps/value-packs/survey')
          break
        case 'navigate-personal-analytics':
        case 'navigate-team-analytics':
        case 'navigate-system-analytics':
          console.log('Navigating to analytics')
          break
        case 'navigate-flow-creator':
          navigateTo('/platform/apps/flow/apps/creator#create')
          break
        case 'navigate-flow-launcher':
          navigateTo('/platform/apps/flow/apps/launcher')
          break
        case 'navigate-flow-success':
          navigateTo('/platform/apps/flow/apps/success')
          break
        case 'navigate-flow-guardian':
          navigateTo('/platform/apps/flow/apps/guardian')
          break
        default:
          console.log(`Unknown button action: ${area.buttonAction}`)
      }
    } else {
      // Handle employee view card navigation
      const areaToUrlMap: Record<string, string> = {
        'active-tasks': '/platform/apps/flow/apps/inbox?tab=open',
        'my-flows': '/platform/apps/flow/apps/inbox?tab=open',
        'flow-creator': '/platform/apps/flow/apps/creator#create',
        'flow-launcher': '/platform/apps/flow/apps/launcher',
        completed: '/platform/apps/flow/apps/success',
        'flow-success': '/platform/apps/flow/apps/success',
        'flow-guardian': '/platform/apps/flow/apps/guardian'
      }

      const url = areaToUrlMap[area.id]

      if (url) {
        navigateTo(url)
      }
    }
  }

  const handleLinkClick = (linkAction: string) => {
    switch (linkAction) {
      // My Flows (Inbox) tabs
      case 'inbox-open-tasks':
        navigateTo('/platform/apps/flow/apps/inbox?tab=open')
        return
      case 'inbox-initiated':
        navigateTo('/platform/apps/flow/apps/inbox?tab=initiated')
        return
      case 'inbox-participated':
        navigateTo('/platform/apps/flow/apps/inbox?tab=participated')
        return

      // Flow Value Packs
      case 'value-pack-compliance':
        navigateTo('/platform/apps/flow/apps/value-packs/compliance')
        return
      case 'solution-employee-lifecycle':
        navigateTo('/platform/apps/flow/apps/value-packs/employee-lifecycle')
        return
      case 'value-pack-survey':
        navigateTo('/platform/apps/flow/apps/value-packs/survey')
        return

      // Flow Templates / Creator
      case 'templates-create':
        navigateTo('/platform/apps/flow/apps/creator#create')
        return
      case 'templates-manage':
        navigateTo('/platform/apps/flow/apps/creator#manage')
        return
      case 'templates-launch':
        navigateTo('/platform/apps/flow/apps/launcher')
        return

      // Launcher
      case 'launcher-launch':
        navigateTo('/platform/apps/flow/apps/launcher')
        return
      case 'launcher-simulate':
        navigateTo('/platform/apps/flow/apps/launcher')
        return

      // Flow Success tabs via hash-based navigation
      case 'success-flow':
        navigateTo('/platform/apps/flow/apps/success#flow')
        return
      case 'success-trends':
        navigateTo('/platform/apps/flow/apps/success#trends')
        return
      case 'success-task-performance':
        navigateTo('/platform/apps/flow/apps/success#task-performance')
        return
      case 'success-sla':
        navigateTo('/platform/apps/flow/apps/success#sla')
        return
      case 'success-audit':
        navigateTo('/platform/apps/flow/apps/success#audit')
        return
      // Guardian
      case 'guardian-dashboard':
        navigateTo('/platform/apps/flow/apps/guardian')
        return
      default:
        console.log(`Unknown link action: ${linkAction}`)
    }
  }

  const handleQuickAction = (action: FlowQuickAction) => {
    const employeeId = context.userInfo?.employeeDetails?.employeeId

    if (!employeeId) {
      console.error('Employee ID not found, cannot perform action')
      return
    }

    switch (action.action) {
      case 'start-workflow':
        navigateTo('/platform/apps/flow/apps/launcher')
        break
      case 'create-template':
        navigateTo('/platform/apps/flow/apps/creator#create')
        break
      case 'view-inbox':
        navigateTo('/platform/apps/flow/apps/inbox?tab=open')
        break
      case 'view-analytics':
        navigateTo('/platform/apps/flow/apps/success')
        break
      default:
        console.log(`Quick action "${action.action}" functionality coming soon`)
    }
  }

  const getPageTitle = (): string => {
    return 'My Flow Hub'
  }

  const getDescriptionText = (): string => {
    if (showAdminView) {
      return 'Comprehensive system administration and flow oversight'
    }
    if (showManagerView) {
      return 'Manage personal and team flows with comprehensive oversight'
    }
    return 'Comprehensive flow management, task tracking, and process automation'
  }

  // Show loading state while determining permissions
  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-decorative-1">
        <div className="bg-card/90 backdrop-blur-md p-8 rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <Spinner size="lg" />
            <span className="text-lg font-medium text-card-foreground">Loading your personalized hub...</span>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if permission check failed
  if (permissionsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-decorative-1">
        <div className="max-w-md mx-auto p-6">
          <Alert variant="destructive" className="bg-card/90 backdrop-blur-md">
            <RemixIcons.RiErrorWarningLine className="h-4 w-4" />
            <AlertTitle>Permission Check Failed</AlertTitle>
            <AlertDescription>Unable to determine your permissions. Showing limited view.</AlertDescription>
          </Alert>
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
      title={getPageTitle()}
      description={getDescriptionText()}
      icon={Workflow as unknown as any}
      headerKpis={headerKpis}
      sections={sections}
      quickActions={hubQuickActions}
      quickActionsTitle="Quick Actions"
      quickActionsDescription="Frequently used flow functions and shortcuts"
    />
  )
}

export default FlowHub
