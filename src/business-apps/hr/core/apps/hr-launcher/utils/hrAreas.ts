import { HrArea } from '../types'
import { TreeStructureIcon, UserPlusIcon, ClockIcon, TargetIcon, WalletIcon, ChartBarIcon } from '@phosphor-icons/react'

export const hrAreas: HrArea[] = [
  {
    id: 'hr-admin',
    title: 'HR Admin',
    description: 'Manage organizational structure, job frameworks, and employee master data.',
    icon: TreeStructureIcon,
    badgeLabel: 'Core HR',
    badgeTone: 'core',
    explorePath: '/platform/hr-settings',
    links: [
      { label: 'Workforce Management', path: '/platform/hr/workforce-management' },
      { label: 'Organizational Data', path: '/platform/mdm/organizational-data' },
      { label: 'Job Structures', path: '/platform/mdm/job-structure-data' },
      { label: 'Employee Records', path: '/platform/mdm/employment-data' },
      { label: 'Employee Data Import', path: '/platform/hr/data-import' }
    ]
  },
  {
    id: 'recruitment-onboarding',
    title: 'Recruitment & Onboarding',
    description: 'Manage hiring pipelines, candidate tracking, and onboarding workflows.',
    icon: UserPlusIcon,
    badgeLabel: 'Talent',
    badgeTone: 'talent',
    explorePath: '/platform/hr/recruiting/recruiting-manager',
    links: [
      { label: 'Candidate Pipeline', path: '/platform/hr/recruiting/recruiting-manager' },
      { label: 'Onboarding Flows' }
    ]
  },
  {
    id: 'time-absences',
    title: 'HR Time & Absences',
    description: 'Configure time tracking, absence policies, and workforce availability.',
    icon: ClockIcon,
    badgeLabel: 'Time',
    badgeTone: 'time',
    explorePath: '/platform/hr/human-resources?view=analytics&tab=dashboard',
    links: [
      { label: 'Absence Policies', path: '/platform/hr/absence/apps/AbsenceSetup' },
      { label: 'Time Tracking', path: '/platform/mdm/time-attendance' },
      { label: 'Time & Absence Hub', path: '/platform/hr/absences/time-absence-hub' },
      { label: 'Time Analytics', path: '/platform/hr/core/apps/my-team-time' }
    ]
  },
  {
    id: 'performance-management',
    title: 'Performance Management',
    description: 'Track review cycles, goals, and team performance metrics.',
    icon: TargetIcon,
    badgeLabel: 'Performance',
    badgeTone: 'performance',
    explorePath: undefined,
    links: [
      { label: 'Performance Configuration', path: '/platform/hr/core/apps/performance-evaluation' },
      { label: 'Performance Tracking' },
      { label: 'Performance Insights' }
    ]
  },
  {
    id: 'payroll-compensation',
    title: 'Payroll & Compensation',
    description: 'Manage payroll cycles, compensation structures, and salary planning.',
    icon: WalletIcon,
    badgeLabel: 'Payroll',
    badgeTone: 'payroll',
    explorePath: '/platform/hr/compensation-planning/apps/manager-compensation-planning',
    links: [
      { label: 'Compensation Bands', path: '/platform/mdm/compensation-data' },
      { label: 'Payroll Preparation', path: '/platform/hr/payroll/apps/payroll-preparation?view=overview' },
      { label: 'Salary Planning', path: '/platform/hr/compensation-planning/apps/compensation-planning' }
    ]
  },
  {
    id: 'hr-analytics',
    title: 'HR Analytics',
    description: 'Explore workforce trends, reports, and organizational insights.',
    icon: ChartBarIcon,
    badgeLabel: 'Insights',
    badgeTone: 'insights',
    explorePath: '/platform/hr/human-resources?view=analytics',
    links: [
      { label: 'Workforce Reports', path: '/platform/hr/human-resources?view=analytics' },
      { label: 'Structural Analysis', path: '/platform/hr/human-resources?view=analytics' }
    ]
  }
]
