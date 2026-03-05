import { FlowArea, FlowQuickAction } from '../types'
import {
  PlayIcon,
  FolderOpenIcon,
  ListChecksIcon,
  ChartLineIcon,
  GearIcon,
  UserIcon,
  UsersThreeIcon,
  ChartBarIcon,
  ChartPieIcon,
  PlusIcon,
  GitBranchIcon,
  FileTextIcon,
  CheckCircleIcon
} from '@phosphor-icons/react'

export const flowAreas: FlowArea[] = [
  {
    id: 'active-tasks',
    title: 'Active Tasks',
    description: 'View and manage your current assigned tasks and flows',
    icon: ListChecksIcon,
    category: 'core'
  },
  {
    id: 'my-flows',
    title: 'My Flows',
    description: 'Track flows you have initiated and their current status',
    icon: GitBranchIcon,
    category: 'core'
  },
  {
    id: 'templates',
    title: 'Templates',
    description: 'Browse and start new flows from available templates',
    icon: FileTextIcon,
    category: 'core'
  },
  {
    id: 'completed',
    title: 'Completed',
    description: 'Review finished flows and completed tasks',
    icon: CheckCircleIcon,
    category: 'core'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Personal flow analytics, performance insights, and trends',
    icon: ChartLineIcon,
    category: 'analytics'
  }
]

// Manager-specific cards (used as templates for dynamic generation)
export const managerFlowAreas: FlowArea[] = [
  {
    id: 'personal-workflows',
    title: 'Personal Flows',
    description: 'Manage your own flow initiations and task assignments',
    icon: UserIcon,
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
    icon: UsersThreeIcon,
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
    icon: ChartBarIcon,
    category: 'management',
    kpiType: 'analytics',
    buttonLabel: 'View My Analytics',
    buttonAction: 'navigate-personal-analytics'
  },
  {
    id: 'team-analytics',
    title: 'Team Analytics',
    description: 'Team flow insights, performance tracking, and metrics',
    icon: ChartPieIcon,
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
    icon: GearIcon,
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
    icon: ChartLineIcon,
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
    icon: FolderOpenIcon,
    action: 'view-inbox'
  },
  {
    id: 'start-workflow',
    label: 'Start Flow',
    icon: PlayIcon,
    action: 'start-workflow'
  },
  {
    id: 'create-template',
    label: 'Create Flow',
    icon: PlusIcon,
    action: 'create-template'
  },
  {
    id: 'view-analytics',
    label: 'View Analytics',
    icon: ChartLineIcon,
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
