import { ExpenseArea, QuickAction } from '../types'
import {
  Receipt,
  Article,
  CurrencyDollar,
  FileText,
  Calendar,
  ChartLine,
  User,
  Users,
  ChartBar,
  ChartPie,
  Plus
} from '@phosphor-icons/react'

export const expenseAreas: ExpenseArea[] = [
  {
    id: 'expense-items',
    title: 'Expense Items',
    description: 'Manage individual expense entries, receipts, and categorization',
    icon: Receipt,
    category: 'core'
  },
  {
    id: 'plans',
    title: 'Plans',
    description: 'Budget planning, expense forecasting, and financial planning',
    icon: Article,
    category: 'planning'
  },
  {
    id: 'advance-payments',
    title: 'Advance Payments',
    description: 'Request and manage advance payments for upcoming expenses',
    icon: CurrencyDollar,
    category: 'core'
  },
  {
    id: 'requests',
    title: 'Requests',
    description: 'Submit, track, and approve expense reimbursement requests',
    icon: FileText,
    category: 'core'
  },
  {
    id: 'calendar',
    title: 'Calendar',
    description: 'View expenses, plans, and events in a calendar timeline',
    icon: Calendar,
    category: 'reporting'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Advanced analytics, spending patterns, and trend analysis',
    icon: ChartLine,
    category: 'reporting'
  }
]

// Manager-specific cards (used as templates for dynamic generation)
export const managerExpenseAreas: ExpenseArea[] = [
  {
    id: 'personal-expenses',
    title: 'Personal Expenses',
    description: 'Manage your own expense submissions and track spending',
    icon: User,
    category: 'manager',
    kpiType: 'personal',
    links: [
      { label: 'Expense Items', action: 'personal-expense-items' },
      { label: 'Expense Plans', action: 'personal-expense-plans' },
      { label: 'Advance Payments', action: 'personal-advance-payments' },
      { label: 'Expense Requests', action: 'personal-expense-requests' }
    ],
    buttonLabel: 'Go to Personal Expenses',
    buttonAction: 'navigate-personal-expenses'
  },
  {
    id: 'team-expenses',
    title: 'Team Expenses',
    description: 'Review and manage your team members expense submissions',
    icon: Users,
    category: 'manager',
    kpiType: 'team',
    links: [
      { label: 'Expense Plans', action: 'team-expense-plans' },
      { label: 'Advance Payments', action: 'team-advance-payments' },
      { label: 'Expense Requests', action: 'team-expense-requests' },
      { label: 'Expense Calendar', action: 'team-expense-calendar' }
    ],
    buttonLabel: 'Go to Team Expenses',
    buttonAction: 'navigate-team-expenses'
  },
  {
    id: 'my-expense-analytics',
    title: 'My Expense Analytics',
    description: 'Personal spending insights, trends, and budget analysis',
    icon: ChartBar,
    category: 'manager',
    kpiType: 'analytics',
    buttonLabel: 'View My Analytics',
    buttonAction: 'navigate-personal-analytics'
  },
  {
    id: 'team-expense-analytics',
    title: 'Team Expense Analytics',
    description: 'Team spending insights, budget tracking, and performance metrics',
    icon: ChartPie,
    category: 'manager',
    kpiType: 'analytics',
    buttonLabel: 'View Team Analytics',
    buttonAction: 'navigate-team-analytics'
  }
]

export const quickActions: QuickAction[] = [
  {
    id: 'create-plan',
    label: 'Create Plan',
    icon: Plus,
    action: 'create-plan'
  },
  {
    id: 'add-expense-item',
    label: 'Add Expense Item',
    icon: Plus,
    action: 'create-expense-item'
  },
  {
    id: 'request-advance',
    label: 'Request Advance',
    icon: Plus,
    action: 'request-advance'
  },
  {
    id: 'submit-request',
    label: 'Submit Request',
    icon: Plus,
    action: 'submit-request'
  }
]

export const categoryLabels: Record<string, string> = {
  core: 'Core Expense Management',
  planning: 'Planning & Budgeting',
  reporting: 'Reports & Analytics',
  manager: 'Manager Dashboard'
}

export const getExpenseAreasByCategory = (category: string): ExpenseArea[] => {
  return expenseAreas.filter(area => area.category === category)
}
