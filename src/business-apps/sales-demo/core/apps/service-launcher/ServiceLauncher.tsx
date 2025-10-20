import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  LauncherLayout,
  type LauncherSectionConfig,
  type KpiData,
  type QuickActionData,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@newwork/nw-design-system'
// Import PhosphorIcons for LauncherLayout
import { Gear, Wrench, Headphones, GearSix, Toolbox, Phone } from '@phosphor-icons/react'
import { MODULE_COLORS } from '@/common/constants/ui'
interface ServiceLauncherProps extends BusinessAppContextProps {}
const moduleColor = MODULE_COLORS.SER
const ServiceLauncher: React.FC<ServiceLauncherProps> = context => {
  // Placeholder KPI data
  const headerKpis = useMemo((): KpiData[] => {
    return [
      {
        id: 'service-tickets',
        title: 'Service Tickets',
        value: 'Coming Soon',
        color: 'info'
      },
      {
        id: 'active-services',
        title: 'Active Services',
        value: 'Coming Soon',
        color: 'success'
      },
      {
        id: 'pending-requests',
        title: 'Pending Requests',
        value: 'Coming Soon',
        color: 'warning'
      }
    ]
  }, [])

  // Placeholder sections
  const sections = useMemo((): LauncherSectionConfig[] => {
    return [
      {
        id: 'service-modules',
        title: 'Service Management Hub',
        description: 'Comprehensive service tools for customer support, maintenance, and service operations',
        cards: []
      }
    ]
  }, [])

  // Placeholder quick actions
  const launcherQuickActions = useMemo((): QuickActionData[] => {
    return []
  }, [])

  // Work in progress content overlay
  const WorkInProgressOverlay = () => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center">
            <Wrench className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-xl font-semibold">Work in Progress</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            The Service Management Hub is currently under development. We're building comprehensive service tools for:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 text-left">
            <li className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-blue-500" />
              Customer Support Management
            </li>
            <li className="flex items-center gap-2">
              <Toolbox className="h-4 w-4 text-green-500" />
              Service Ticket Tracking
            </li>
            <li className="flex items-center gap-2">
              <GearSix className="h-4 w-4 text-purple-500" />
              Maintenance Scheduling
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-orange-500" />
              Service Request Management
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="relative min-h-screen">
      <LauncherLayout
        title="Service Management Hub"
        description="Comprehensive service tools for customer support, maintenance, and service operations"
        icon={Gear}
        headerKpis={headerKpis}
        sections={sections}
        quickActions={launcherQuickActions}
        quickActionsTitle="Quick Actions"
        quickActionsDescription="Service management functions and shortcuts"
        variant={moduleColor}
      />
      <WorkInProgressOverlay />
    </div>
  )
}

export default ServiceLauncher
