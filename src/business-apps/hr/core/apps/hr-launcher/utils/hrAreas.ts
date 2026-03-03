import { HrArea, HrQuickAction } from '../types'
import {
  Users,
  UserCheck,
  Briefcase,
  CalendarX,
  ChartBar,
  Gear,
  UserPlus,
  FileText,
  FolderOpen,
  Desktop
} from '@phosphor-icons/react'

export const hrAreas: HrArea[] = [
  {
    id: 'absences',
    title: 'Absences',
    description: 'Handle time off requests, approvals, absence tracking, and leave policies',
    icon: CalendarX,
    category: 'time-off',
    kpiType: 'absences',
    links: [
      {
        label: 'My Absences',
        action: '/platform/hr/absences/personal-absences'
      },
      {
        label: 'Team Absences',
        action: '/platform/hr/absences/manager-absences'
      },
      {
        label: 'Absence Management',
        action: '/platform/hr/absences/backoffice-absences'
      },
      {
        label: 'My Team Time',
        action: '/platform/hr/my-team-time'
      }
    ]
  },
  {
    id: 'hr-analytics',
    title: 'HR Analytics',
    description: 'View workforce insights, reports, trends, and organizational analytics',
    icon: ChartBar,
    category: 'analytics',
    kpiType: 'analytics',
    links: [
      {
        label: 'Structural Analysis',
        action: '/platform/hr/human-resources?view=analytics'
      },
      {
        label: 'Absence Analytics',
        action: '/platform/hr/human-resources?view=analytics'
      }
    ]
  },
  {
    id: 'hr-settings',
    title: 'HR Settings',
    description: 'Configure HR policies, system settings, permissions, and organizational parameters',
    icon: Gear,
    category: 'settings',
    kpiType: 'settings',
    links: [
      {
        label: 'Organizational Data',
        action: '/platform/mdm/organizational-data'
      },
      {
        label: 'Job Structure Data',
        action: '/platform/mdm/job-structure-data'
      },
      {
        label: 'Employment Data',
        action: '/platform/mdm/employment-data'
      },
      {
        label: 'Compensation Data',
        action: '/platform/mdm/compensation-data'
      }
    ]
  },
  {
    id: 'employee-directory',
    title: 'Employee Directory',
    description: 'Search and view employee information, contact details, and organizational structure',
    icon: Users,
    category: 'core',
    kpiType: 'employees'
  },
  {
    id: 'employee-management',
    title: 'Employee Management',
    description: 'Manage employee records, profiles, onboarding, and lifecycle processes',
    icon: UserCheck,
    category: 'management',
    kpiType: 'employees',
    links: [
      {
        label: 'Employee List',
        action: '/platform/hr/human-resources?view=employees'
      },
      {
        label: 'Employee Directory',
        action: '/platform/employee-directory'
      }
    ]
  },
  {
    id: 'job-management',
    title: 'Job Management',
    description: 'Manage job positions, descriptions, hierarchies, and organizational structure',
    icon: Briefcase,
    category: 'management',
    kpiType: 'jobs',
    links: [
      {
        label: 'Job Positions',
        action: '/platform/hr/human-resources?view=positions'
      },
      {
        label: 'Job Structure Data',
        action: '/platform/mdm/job-structure-data'
      }
    ]
  },
  {
    id: 'asset-management',
    title: 'Asset Management',
    description: 'Manage IT equipment inventory, track allocations, and monitor asset lifecycle',
    icon: Desktop,
    category: 'management',
    kpiType: 'assets',
    links: [
      {
        label: 'Asset Management',
        action: '/platform/hr/assets'
      }
    ]
  }
]

export const hrQuickActions: HrQuickAction[] = [
  {
    id: 'add-employee',
    label: 'Add Employee',
    icon: UserPlus,
    action: 'add-employee'
  },
  {
    id: 'create-job-position',
    label: 'Create Job Position',
    icon: Briefcase,
    action: 'create-job-position'
  },
  {
    id: 'create-job-profile',
    label: 'Create Job Profile',
    icon: FileText,
    action: 'create-job-profile'
  },
  {
    id: 'add-project',
    label: 'Add Project',
    icon: FolderOpen,
    action: 'add-project'
  }
]

export const categoryLabels: Record<string, string> = {
  core: 'Core HR Functions',
  management: 'Employee & Job Management',
  analytics: 'Analytics & Reports',
  settings: 'Configuration & Settings',
  'time-off': 'Time Off & Absences'
}

export const getHrAreasByCategory = (category: string): HrArea[] => {
  return hrAreas.filter(area => area.category === category)
}
