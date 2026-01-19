import { FlowArea, FlowQuickAction } from '../types'
import {
  RiPlayLine as Play,
  RiFolderOpenLine as FolderOpen,
  RiCheckboxMultipleLine as ListChecks,
  RiLineChartLine as ChartLine,
  RiSettings4Line as Gear,
  RiUser3Line as User,
  RiTeamLine as Users,
  RiBarChartLine as ChartBar,
  RiPieChartLine as ChartPie,
  RiAddLine as Plus,
  RiFlowChart as Workflow,
  RiFileTextLine as FileText,
  RiCheckboxCircleLine as CheckCircle
} from '@remixicon/react'

export const flowAreas: FlowArea[] = [
  {
    id: 'active-tasks',
    title: 'Active Tasks',
    description: 'View and manage your current assigned tasks and flows',
    icon: ListChecks,
    category: 'core'
  },
  {
    id: 'my-flows',
    title: 'My Flows',
    description: 'Track flows you have initiated and their current status',
    icon: Workflow,
    category: 'core'
  },
  {
    id: 'templates',
    title: 'Templates',
    description: 'Browse and start new flows from available templates',
    icon: FileText,
    category: 'core'
  },
  {
    id: 'completed',
    title: 'Completed',
    description: 'Review finished flows and completed tasks',
    icon: CheckCircle,
    category: 'core'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Personal flow analytics, performance insights, and trends',
    icon: ChartLine,
    category: 'analytics'
  }
]

// Manager-specific cards (used as templates for dynamic generation)
export const managerFlowAreas: FlowArea[] = [
  {
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
  },
  {
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
  },
  {
    id: 'workflow-analytics',
    title: 'Flow Analytics',
    description: 'Personal flow insights, performance metrics, and trends',
    icon: ChartBar,
    category: 'management',
    kpiType: 'analytics',
    buttonLabel: 'View My Analytics',
    buttonAction: 'navigate-personal-analytics'
  },
  {
    id: 'team-analytics',
    title: 'Team Analytics',
    description: 'Team flow insights, performance tracking, and metrics',
    icon: ChartPie,
    category: 'management',
    kpiType: 'analytics',
    buttonLabel: 'View Team Analytics',
    buttonAction: 'navigate-team-analytics'
  }
]

// Admin-specific cards
export const adminFlowAreas: FlowArea[] = [
  {
    id: 'workflow-management',
    title: 'Flow Management',
    description: 'Comprehensive flow oversight and system administration',
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
  },
  {
    id: 'system-analytics',
    title: 'System Analytics',
    description: 'Enterprise flow analytics, system performance, and insights',
    icon: ChartLine,
    category: 'admin',
    kpiType: 'analytics',
    buttonLabel: 'View System Analytics',
    buttonAction: 'navigate-system-analytics'
  }
]

export const quickActions: FlowQuickAction[] = [
  {
    id: 'view-inbox',
    label: 'View Inbox',
    icon: FolderOpen,
    action: 'view-inbox'
  },
  {
    id: 'start-workflow',
    label: 'Start Flow',
    icon: Play,
    action: 'start-workflow'
  },
  {
    id: 'create-template',
    label: 'Create Flow',
    icon: Plus,
    action: 'create-template'
  },
  {
    id: 'view-analytics',
    label: 'View Analytics',
    icon: ChartLine,
    action: 'view-analytics'
  }
]

export const categoryLabels: Record<string, string> = {
  core: 'Core Flow Management',
  management: 'Team & Process Management',
  analytics: 'Analytics & Insights',
  admin: 'System Administration'
}

export const getFlowAreasByCategory = (category: string): FlowArea[] => {
  return flowAreas.filter(area => area.category === category)
}
