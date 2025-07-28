import { ExpenseArea, QuickAction } from '../types';

export const expenseAreas: ExpenseArea[] = [
  {
    id: 'expense-items',
    title: 'Expense Items',
    description: 'Manage individual expense entries, receipts, and categorization',
    icon: 'RiReceiptLine',
    category: 'core'
  },
  {
    id: 'plans',
    title: 'Plans',
    description: 'Budget planning, expense forecasting, and financial planning',
    icon: 'RiPlaneLine',
    category: 'planning'
  },
  {
    id: 'advance-payments',
    title: 'Advance Payments',
    description: 'Request and manage advance payments for upcoming expenses',
    icon: 'RiMoneyDollarCircleLine',
    category: 'core'
  },
  {
    id: 'requests',
    title: 'Requests',
    description: 'Submit, track, and approve expense reimbursement requests',
    icon: 'RiFileTextLine',
    category: 'core'
  },
  {
    id: 'calendar',
    title: 'Calendar',
    description: 'View expenses, plans, and events in a calendar timeline',
    icon: 'RiCalendarLine',
    category: 'reporting'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Advanced analytics, spending patterns, and trend analysis',
    icon: 'RiLineChartLine',
    category: 'reporting'
  }
];

// Manager-specific cards (used as templates for dynamic generation)
export const managerExpenseAreas: ExpenseArea[] = [
  {
    id: 'personal-expenses',
    title: 'Personal Expenses',
    description: 'Manage your own expense submissions and track spending',
    icon: 'RiUser3Line',
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
    icon: 'RiTeamLine',
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
    icon: 'RiBarChart2Line',
    category: 'manager',
    kpiType: 'analytics',
    buttonLabel: 'View My Analytics',
    buttonAction: 'navigate-personal-analytics'
  },
  {
    id: 'team-expense-analytics',
    title: 'Team Expense Analytics',
    description: 'Team spending insights, budget tracking, and performance metrics',
    icon: 'RiPieChart2Line',
    category: 'manager',
    kpiType: 'analytics',
    buttonLabel: 'View Team Analytics',
    buttonAction: 'navigate-team-analytics'
  }
];

export const quickActions: QuickAction[] = [
  {
    id: 'add-expense-item',
    label: 'Add Expense Item',
    icon: 'RiPlusLine',
    action: 'create-expense-item'
  },
  {
    id: 'create-plan',
    label: 'Create Plan',
    icon: 'RiPlusLine',
    action: 'create-plan'
  },
  {
    id: 'request-advance',
    label: 'Request Advance',
    icon: 'RiPlusLine',
    action: 'request-advance'
  },
  {
    id: 'submit-request',
    label: 'Submit Request',
    icon: 'RiPlusLine',
    action: 'submit-request'
  }
];

export const categoryLabels: Record<string, string> = {
  core: 'Core Expense Management',
  planning: 'Planning & Budgeting',
  reporting: 'Reports & Analytics',
  manager: 'Manager Dashboard'
};

export const getExpenseAreasByCategory = (category: string): ExpenseArea[] => {
  return expenseAreas.filter(area => area.category === category);
}; 