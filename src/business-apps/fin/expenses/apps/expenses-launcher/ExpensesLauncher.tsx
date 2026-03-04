import React, { useMemo, useEffect } from 'react'
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
import { quickActions } from './utils/expenseAreas'
import { ExpenseArea, QuickAction } from './types'
import { useExpenseDashboardStats } from './hooks/useExpenseDashboardStats'
import { useExpensePermissions } from './hooks/useExpensePermissions'
import { startProcess } from '@/common/utils/start-process'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  User,
  Gear,
  ChartLine,
  Users,
  ChartPie,
  Receipt,
  Article,
  CurrencyDollar,
  FileText,
  Calendar,
  Wallet,
  Sliders,
  WarningIcon,
  ArrowsClockwiseIcon
} from '@phosphor-icons/react'
import { formatCurrencyLocalized } from '@/business-apps/fin/expenses/apps/expenses-launcher/utils/currencyUtils'
import { MODULE_COLORS } from '@/common/constants/ui'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const moduleColor = MODULE_COLORS.FIN

const ExpensesLauncher: React.FC<BusinessAppContextProps> = context => {
  const { stats, isLoading, error, refetch } = useExpenseDashboardStats(context)
  const {
    loading: permissionsLoading,
    error: permissionsError,
    hasManagerPermissions,
    hasFinancePermissions,
    canViewPersonalExpenses,
    canViewTeamExpenses,
    canApproveExpenses,
    canViewFinancialReports,
    canManageBudgets,
    isFeatureVisible,
    getAccessibleFeatures,
    getAllPermissions
  } = useExpensePermissions(context.userInfo?.employeeDetails?.employeeId || '', context.accessToken || '')

  // Local permission debug log (always print once when ready)
  useEffect(() => {
    if (!permissionsLoading) {
      console.log('[ExpensesLauncher][permissions]', {
        canViewPersonalExpenses: canViewPersonalExpenses(),
        canViewTeamExpenses: canViewTeamExpenses(),
        canApproveExpenses: canApproveExpenses(),
        hasManagerPermissions: hasManagerPermissions(),
        hasFinancePermissions: hasFinancePermissions(),
        accessibleFeatures: getAccessibleFeatures(),
        raw: getAllPermissions?.()
      })
    }
  }, [permissionsLoading])

  // Determine UI layout based on permissions (following HR pattern)
  const hasBothManagerAndFinance = hasManagerPermissions() && hasFinancePermissions()
  const showFinanceView = hasFinancePermissions() && !hasManagerPermissions()
  const showManagerView = hasManagerPermissions() && !hasFinancePermissions()

  // Format currency localized with code placement per locale
  const formatCurrency = (amount: number): string => {
    return formatCurrencyLocalized(amount, 'EUR', 0)
  }

  const formatNumber = (num: number): string => {
    if (showFinanceView || showManagerView) {
      return num.toString() // Simple format for finance and manager
    }
    return num.toLocaleString() // Locale format for employee
  }

  // Convert stats to KpiData format for header
  const headerKpis = useMemo((): KpiData[] => {
    if (error) return []

    if (showFinanceView) {
      return [
        {
          id: 'monthly-expenses',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.monthly_expenses', 'Monthly Expenses'),
          value: isLoading ? '...' : formatCurrency(stats.monthlyExpenses),
          color: 'primary'
        },
        {
          id: 'pending-finance-requests',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.pending_verification',
            'Pending Verification'
          ),
          value: isLoading ? '...' : formatNumber(stats.pendingFinanceRequests),
          color: 'default'
        },
        {
          id: 'pending-finance-advances',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.pending_advances', 'Pending Advances'),
          value: isLoading ? '...' : formatNumber(stats.pendingFinanceAdvances),
          color: 'success'
        }
      ]
    } else if (showManagerView) {
      return [
        {
          id: 'monthly-expenses',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.monthly_expenses', 'Monthly Expenses'),
          value: isLoading ? '...' : formatCurrency(stats.monthlyExpenses),
          color: 'primary'
        },
        {
          id: 'pending-team-plans',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.pending_team_plans',
            'Pending Team Plans'
          ),
          value: isLoading ? '...' : formatCurrency(stats.pendingTeamPlans),
          color: 'default'
        },
        {
          id: 'pending-team-requests',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.pending_team_requests',
            'Pending Team Requests'
          ),
          value: isLoading ? '...' : formatCurrency(stats.pendingTeamRequests),
          color: 'success'
        }
      ]
    } else {
      return [
        {
          id: 'unassigned-items',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.unassigned_items', 'Unassigned Items'),
          value: isLoading ? '...' : formatNumber(stats.unassignedItems),
          color: 'default'
        },
        {
          id: 'pending-requests',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.pending_requests', 'Pending Requests'),
          value: isLoading ? '...' : formatNumber(stats.pendingRequests),
          color: 'default'
        },
        {
          id: 'monthly-expenses',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.monthly_expenses', 'Monthly Expenses'),
          value: isLoading ? '...' : formatCurrency(stats.monthlyExpenses),
          color: 'primary'
        }
      ]
    }
  }, [stats, isLoading, error, showFinanceView, showManagerView])

  // Convert quick actions to LauncherLayout format
  const launcherQuickActions = useMemo((): QuickActionData[] => {
    return quickActions.map(action => {
      // Translate labels based on action id
      let translatedLabel = action.label
      switch (action.id) {
        case 'create-plan':
          translatedLabel = getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.create_plan', 'Create Plan')
          break
        case 'add-expense-item':
          translatedLabel = getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.add_expense_item',
            'Add Expense Item'
          )
          break
        case 'request-advance':
          translatedLabel = getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.request_advance',
            'Request Advance'
          )
          break
        case 'submit-request':
          translatedLabel = getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.submit_request',
            'Submit Request'
          )
          break
      }

      return {
        id: action.id,
        label: translatedLabel,
        icon: action.icon,
        onClick: () => handleQuickAction(action)
      }
    })
  }, [])

  // Helper functions
  const getDefaultButtonLabel = (areaId: string): string => {
    switch (areaId) {
      case 'expense-items':
        return getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.view_all_items', 'View All Items')
      case 'plans':
        return getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.view_all_plans', 'View All Plans')
      case 'advance-payments':
        return getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.view_all_advances', 'View All Advances')
      case 'requests':
        return getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.view_all_requests', 'View All Requests')
      case 'calendar':
        return getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.view_calendar', 'View Calendar')
      case 'analytics':
        return getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.view_analytics', 'View Analytics')
      default:
        return getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.view_details', 'View Details')
    }
  }

  // Generate sections based on permissions
  const sections = useMemo((): LauncherSectionConfig[] => {
    const areas: ExpenseArea[] = []

    if (hasBothManagerAndFinance) {
      // Combined view: Manager cards first, then Finance-specific cards
      // Order: Manager cards → Finance-specific cards

      // 1. Personal Expenses (Manager card - shared)
      if (canViewPersonalExpenses()) {
        areas.push({
          id: 'personal-expenses',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.personal_expenses', 'Personal Expenses'),
          description: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.personal_expenses_desc',
            'Manage your own expense submissions and track spending'
          ),
          icon: User,
          category: 'manager',
          kpiType: 'personal',
          links: [
            {
              label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.expense_items', 'Expense Items'),
              action: 'personal-expense-items'
            },
            {
              label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.expense_plans', 'Expense Plans'),
              action: 'personal-expense-plans'
            },
            {
              label: getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.advance_payments',
                'Advance Payments'
              ),
              action: 'personal-advance-payments'
            },
            {
              label: getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.expense_requests',
                'Expense Requests'
              ),
              action: 'personal-expense-requests'
            }
          ],
          buttonLabel: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.go_to_personal_expenses',
            'Go to Personal Expenses'
          ),
          buttonAction: 'navigate-personal-expenses'
        })
      }

      // 2. Team Expenses (Manager card)
      if (canViewTeamExpenses()) {
        areas.push({
          id: 'team-expenses',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.team_expenses', 'Team Expenses'),
          description: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.team_expenses_desc',
            'Review and manage your team members expense submissions'
          ),
          icon: Users,
          category: 'manager',
          kpiType: 'team',
          links: [
            {
              label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.expense_plans', 'Expense Plans'),
              action: 'team-expense-plans'
            },
            {
              label: getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.advance_payments',
                'Advance Payments'
              ),
              action: 'team-advance-payments'
            },
            {
              label: getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.expense_requests',
                'Expense Requests'
              ),
              action: 'team-expense-requests'
            },
            {
              label: getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.expense_calendar',
                'Expense Calendar'
              ),
              action: 'team-expense-calendar'
            }
          ],
          buttonLabel: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.go_to_team_expenses',
            'Go to Team Expenses'
          ),
          buttonAction: 'navigate-team-expenses'
        })
      }

      // 3. Finance Settings (Manager card - shared)
      areas.push({
        id: 'finance-settings',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.finance_settings', 'Finance Settings'),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expenses_launcher.finance_settings_desc',
          'Manage expense calculation rules, mileage policies, and travel regulations'
        ),
        icon: Sliders,
        category: 'manager',
        kpiType: 'settings',
        links: [
          {
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expenses_launcher.expense_calculation_rule_assignment',
              'Expense Calculation Rule Assignment'
            ),
            action: 'finance-expense-assignment-rule'
          },
          {
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.mileage_rules', 'Mileage Rules'),
            action: 'finance-mileage-rules'
          },
          {
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expenses_launcher.travel_region_rules',
              'Travel Region Rules'
            ),
            action: 'finance-travel-region-rules'
          },
          {
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expenses_launcher.expense_calculation_rules',
              'Expense Calculation Rules'
            ),
            action: 'finance-calculation-rules'
          }
        ],
        buttonLabel: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.manage_settings', 'Manage Settings'),
        buttonAction: 'navigate-finance-settings'
      })

      // 4. Calendar (Manager card - shared)
      areas.push({
        id: 'calendar-view',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.calendar', 'Calendar'),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expenses_launcher.calendar_desc',
          'View expenses, plans, and events in a calendar timeline'
        ),
        icon: Calendar,
        category: 'reporting',
        kpiType: 'calendar',
        buttonLabel: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.view_calendar', 'View Calendar'),
        buttonAction: 'navigate-calendar-view'
      })

      // 5. My Expense Analytics (Manager card - shared) - HIDDEN
      // areas.push({
      //   id: 'my-expense-analytics',
      //   title: getTranslationFromI18nKeyAndLabel(
      //     'lowcoder:expenses_launcher.my_expense_analytics',
      //     'My Expense Analytics'
      //   ),
      //   description: getTranslationFromI18nKeyAndLabel(
      //     'lowcoder:expenses_launcher.my_expense_analytics_desc',
      //     'Personal spending insights, trends, and budget analysis'
      //   ),
      //   icon: ChartBar,
      //   category: 'manager',
      //   kpiType: 'analytics',
      //   buttonLabel: getTranslationFromI18nKeyAndLabel(
      //     'lowcoder:expenses_launcher.view_my_analytics',
      //     'View My Analytics'
      //   ),
      //   buttonAction: 'navigate-personal-analytics'
      // })

      // 6. Team Expense Analytics (Manager card)
      if (canViewTeamExpenses() || canManageBudgets()) {
        areas.push({
          id: 'team-expense-analytics',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.team_expense_analytics',
            'Team Expense Analytics'
          ),
          description: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.team_expense_analytics_desc',
            'Team spending insights, budget tracking, and performance metrics'
          ),
          icon: ChartPie,
          category: 'manager',
          kpiType: 'analytics',
          buttonLabel: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.view_team_analytics',
            'View Team Analytics'
          ),
          buttonAction: 'navigate-team-analytics'
        })
      }

      // === FINANCE-SPECIFIC CARDS (shown after Manager cards) ===

      // 7. Expense Management (Finance-specific)
      areas.push({
        id: 'expense-management',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.expense_management', 'Expense Management'),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expenses_launcher.expense_management_desc',
          'Comprehensive expense oversight and policy management'
        ),
        icon: Gear,
        category: 'manager',
        kpiType: 'team',
        links: [
          {
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.expense_requests', 'Expense Requests'),
            action: 'finance-expense-requests'
          },
          {
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.advance_payments', 'Advance Payments'),
            action: 'finance-advance-payments'
          }
        ],
        buttonLabel: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expenses_launcher.go_to_expense_management',
          'Go to Expense Management'
        ),
        buttonAction: 'navigate-finance-management'
      })

      // 8. Advanced Expense Analytics (Finance-specific) - HIDDEN
      // areas.push({
      //   id: 'advanced-expense-analytics',
      //   title: getTranslationFromI18nKeyAndLabel(
      //     'lowcoder:expenses_launcher.advanced_expense_analytics',
      //     'Advanced Expense Analytics'
      //   ),
      //   description: getTranslationFromI18nKeyAndLabel(
      //     'lowcoder:expenses_launcher.advanced_expense_analytics_desc',
      //     'Enterprise spending insights, budget tracking, and performance metrics'
      //   ),
      //   icon: ChartLine,
      //   category: 'reporting',
      //   kpiType: 'analytics',
      //   buttonLabel: getTranslationFromI18nKeyAndLabel(
      //     'lowcoder:expenses_launcher.view_advanced_analytics',
      //     'View Advanced Analytics'
      //   ),
      //   buttonAction: 'navigate-advanced-analytics'
      // })
    } else if (showFinanceView) {
      // Finance view: specialized finance cards
      if (canViewPersonalExpenses()) {
        areas.push({
          id: 'personal-expenses',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.personal_expenses', 'Personal Expenses'),
          description: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.personal_expenses_desc',
            'Manage your own expense submissions and track spending'
          ),
          icon: User, // Now directly using PhosphorIcon components
          category: 'manager',
          kpiType: 'personal',
          links: [
            {
              label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.expense_items', 'Expense Items'),
              action: 'personal-expense-items'
            },
            {
              label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.expense_plans', 'Expense Plans'),
              action: 'personal-expense-plans'
            },
            {
              label: getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.advance_payments',
                'Advance Payments'
              ),
              action: 'personal-advance-payments'
            },
            {
              label: getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.expense_requests',
                'Expense Requests'
              ),
              action: 'personal-expense-requests'
            }
          ],
          buttonLabel: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.go_to_personal_expenses',
            'Go to Personal Expenses'
          ),
          buttonAction: 'navigate-personal-expenses'
        })
      }

      areas.push({
        id: 'expense-management',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.expense_management', 'Expense Management'),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expenses_launcher.expense_management_desc',
          'Comprehensive expense oversight and policy management'
        ),
        icon: Gear, // Now directly using PhosphorIcon components
        category: 'manager',
        kpiType: 'team',
        links: [
          {
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.expense_requests', 'Expense Requests'),
            action: 'finance-expense-requests'
          },
          {
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.advance_payments', 'Advance Payments'),
            action: 'finance-advance-payments'
          }
        ],
        buttonLabel: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expenses_launcher.go_to_expense_management',
          'Go to Expense Management'
        ),
        buttonAction: 'navigate-finance-management'
      })

      areas.push({
        id: 'finance-settings',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.finance_settings', 'Finance Settings'),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expenses_launcher.finance_settings_desc',
          'Manage expense calculation rules, mileage policies, and travel regulations'
        ),
        icon: Sliders, // Now directly using PhosphorIcon components
        category: 'manager',
        kpiType: 'settings',
        links: [
          {
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expenses_launcher.expense_calculation_rule_assignment',
              'Expense Calculation Rule Assignment'
            ),
            action: 'finance-expense-assignment-rule'
          },
          {
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.mileage_rules', 'Mileage Rules'),
            action: 'finance-mileage-rules'
          },
          {
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expenses_launcher.travel_region_rules',
              'Travel Region Rules'
            ),
            action: 'finance-travel-region-rules'
          },
          {
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expenses_launcher.expense_calculation_rules',
              'Expense Calculation Rules'
            ),
            action: 'finance-calculation-rules'
          }
        ],
        buttonLabel: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.manage_settings', 'Manage Settings'),
        buttonAction: 'navigate-finance-settings'
      })

      areas.push({
        id: 'calendar-view',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.calendar', 'Calendar'),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expenses_launcher.calendar_desc',
          'View expenses, plans, and events in a calendar timeline'
        ),
        icon: Calendar, // Now directly using PhosphorIcon components
        category: 'reporting',
        kpiType: 'calendar',
        buttonLabel: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.view_calendar', 'View Calendar'),
        buttonAction: 'navigate-calendar-view'
      })

      // My Expense Analytics - HIDDEN (Finance view)
      // areas.push({
      //   id: 'my-expense-analytics',
      //   title: getTranslationFromI18nKeyAndLabel(
      //     'lowcoder:expenses_launcher.my_expense_analytics',
      //     'My Expense Analytics'
      //   ),
      //   description: getTranslationFromI18nKeyAndLabel(
      //     'lowcoder:expenses_launcher.my_expense_analytics_desc',
      //     'Personal spending insights, trends, and budget analysis'
      //   ),
      //   icon: ChartBar, // Now directly using PhosphorIcon components
      //   category: 'manager',
      //   kpiType: 'analytics',
      //   buttonLabel: getTranslationFromI18nKeyAndLabel(
      //     'lowcoder:expenses_launcher.view_my_analytics',
      //     'View My Analytics'
      //   ),
      //   buttonAction: 'navigate-personal-analytics'
      // })

      // Advanced Expense Analytics - HIDDEN (Finance view)
      // areas.push({
      //   id: 'advanced-expense-analytics',
      //   title: getTranslationFromI18nKeyAndLabel(
      //     'lowcoder:expenses_launcher.advanced_expense_analytics',
      //     'Advanced Expense Analytics'
      //   ),
      //   description: getTranslationFromI18nKeyAndLabel(
      //     'lowcoder:expenses_launcher.advanced_expense_analytics_desc',
      //     'Enterprise spending insights, budget tracking, and performance metrics'
      //   ),
      //   icon: ChartLine, // Now directly using PhosphorIcon components
      //   category: 'reporting',
      //   kpiType: 'analytics',
      //   buttonLabel: getTranslationFromI18nKeyAndLabel(
      //     'lowcoder:expenses_launcher.view_advanced_analytics',
      //     'View Advanced Analytics'
      //   ),
      //   buttonAction: 'navigate-advanced-analytics'
      // })
    } else if (showManagerView) {
      if (canViewPersonalExpenses()) {
        areas.push({
          id: 'personal-expenses',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.personal_expenses', 'Personal Expenses'),
          description: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.personal_expenses_desc',
            'Manage your own expense submissions and track spending'
          ),
          icon: User, // Now directly using PhosphorIcon components
          category: 'manager',
          kpiType: 'personal',
          links: [
            {
              label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.expense_items', 'Expense Items'),
              action: 'personal-expense-items'
            },
            {
              label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.expense_plans', 'Expense Plans'),
              action: 'personal-expense-plans'
            },
            {
              label: getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.advance_payments',
                'Advance Payments'
              ),
              action: 'personal-advance-payments'
            },
            {
              label: getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.expense_requests',
                'Expense Requests'
              ),
              action: 'personal-expense-requests'
            }
          ],
          buttonLabel: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.go_to_personal_expenses',
            'Go to Personal Expenses'
          ),
          buttonAction: 'navigate-personal-expenses'
        })
      }

      if (canViewTeamExpenses() || canApproveExpenses()) {
        areas.push({
          id: 'team-expenses',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.team_expenses', 'Team Expenses'),
          description: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.team_expenses_desc',
            'Review and manage your team members expense submissions'
          ),
          icon: Users, // Now directly using PhosphorIcon components
          category: 'manager',
          kpiType: 'team',
          links: [
            {
              label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.expense_plans', 'Expense Plans'),
              action: 'team-expense-plans'
            },
            {
              label: getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.advance_payments',
                'Advance Payments'
              ),
              action: 'team-advance-payments'
            },
            {
              label: getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.expense_requests',
                'Expense Requests'
              ),
              action: 'team-expense-requests'
            },
            {
              label: getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.expense_calendar',
                'Expense Calendar'
              ),
              action: 'team-expense-calendar'
            }
          ],
          buttonLabel: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.go_to_team_expenses',
            'Go to Team Expenses'
          ),
          buttonAction: 'navigate-team-expenses'
        })
      }

      areas.push({
        id: 'finance-settings',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.finance_settings', 'Finance Settings'),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expenses_launcher.finance_settings_desc',
          'Manage expense calculation rules, mileage policies, and travel regulations'
        ),
        icon: Sliders, // Now directly using PhosphorIcon components
        category: 'manager',
        kpiType: 'settings',
        links: [
          {
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expenses_launcher.expense_calculation_rule_assignment',
              'Expense Calculation Rule Assignment'
            ),
            action: 'finance-expense-assignment-rule'
          },
          {
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.mileage_rules', 'Mileage Rules'),
            action: 'finance-mileage-rules'
          },
          {
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expenses_launcher.travel_region_rules',
              'Travel Region Rules'
            ),
            action: 'finance-travel-region-rules'
          },
          {
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expenses_launcher.expense_calculation_rules',
              'Expense Calculation Rules'
            ),
            action: 'finance-calculation-rules'
          }
        ],
        buttonLabel: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.manage_settings', 'Manage Settings'),
        buttonAction: 'navigate-finance-settings'
      })

      areas.push({
        id: 'calendar-view',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.calendar', 'Calendar'),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expenses_launcher.calendar_desc',
          'View expenses, plans, and events in a calendar timeline'
        ),
        icon: Calendar, // Now directly using PhosphorIcon components
        category: 'reporting',
        kpiType: 'calendar',
        buttonLabel: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.view_calendar', 'View Calendar'),
        buttonAction: 'navigate-calendar-view'
      })

      // My Expense Analytics - HIDDEN (Manager view)
      // areas.push({
      //   id: 'my-expense-analytics',
      //   title: getTranslationFromI18nKeyAndLabel(
      //     'lowcoder:expenses_launcher.my_expense_analytics',
      //     'My Expense Analytics'
      //   ),
      //   description: getTranslationFromI18nKeyAndLabel(
      //     'lowcoder:expenses_launcher.my_expense_analytics_desc',
      //     'Personal spending insights, trends, and budget analysis'
      //   ),
      //   icon: ChartBar, // Now directly using PhosphorIcon components
      //   category: 'manager',
      //   kpiType: 'analytics',
      //   buttonLabel: getTranslationFromI18nKeyAndLabel(
      //     'lowcoder:expenses_launcher.view_my_analytics',
      //     'View My Analytics'
      //   ),
      //   buttonAction: 'navigate-personal-analytics'
      // })

      if (canViewTeamExpenses() || canManageBudgets()) {
        areas.push({
          id: 'team-expense-analytics',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.team_expense_analytics',
            'Team Expense Analytics'
          ),
          description: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.team_expense_analytics_desc',
            'Team spending insights, budget tracking, and performance metrics'
          ),
          icon: ChartPie, // Now directly using PhosphorIcon components
          category: 'manager',
          kpiType: 'analytics',
          buttonLabel: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.view_team_analytics',
            'View Team Analytics'
          ),
          buttonAction: 'navigate-team-analytics'
        })
      }
    } else {
      if (canViewPersonalExpenses()) {
        areas.push({
          id: 'expense-items',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.expense_items', 'Expense Items'),
          description: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses_launcher.expense_items_desc',
            'Manage individual expense entries, receipts, and categorization'
          ),
          icon: Receipt, // Now directly using PhosphorIcon components
          category: 'core'
        })
      }

      areas.push({
        id: 'plans',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.plans', 'Plans'),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expenses_launcher.plans_desc',
          'Budget planning, expense forecasting, and financial planning'
        ),
        icon: Article, // Now directly using PhosphorIcon components
        category: 'planning'
      })

      areas.push({
        id: 'advance-payments',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.advance_payments', 'Advance Payments'),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expenses_launcher.advance_payments_desc',
          'Request and manage advance payments for upcoming expenses'
        ),
        icon: CurrencyDollar, // Now directly using PhosphorIcon components
        category: 'core'
      })

      areas.push({
        id: 'requests',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.requests', 'Requests'),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expenses_launcher.requests_desc',
          'Submit, track, and approve expense reimbursement requests'
        ),
        icon: FileText, // Now directly using PhosphorIcon components
        category: 'core'
      })

      areas.push({
        id: 'calendar',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.calendar', 'Calendar'),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expenses_launcher.calendar_desc',
          'View expenses, plans, and events in a calendar timeline'
        ),
        icon: Calendar, // Now directly using PhosphorIcon components
        category: 'reporting'
      })

      areas.push({
        id: 'analytics',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.analytics', 'Analytics'),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expenses_launcher.analytics_desc',
          'Personal spending analysis, trends, and insights'
        ),
        icon: ChartLine, // Now directly using PhosphorIcon components
        category: 'reporting'
      })
    }

    // Convert areas to cards format
    const cards = areas.map(area => {
      // Get area stats
      const getAreaStats = (areaId: string, kpiType?: string) => {
        if ((showManagerView || showFinanceView) && kpiType) {
          switch (kpiType) {
            case 'personal':
              return {
                value: formatCurrency(stats.monthlyExpenses),
                label: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expenses_launcher.monthly_expenses',
                  'Monthly Expenses'
                )
              }
            case 'team':
              return {
                value: formatNumber(stats.teamMonthlyExpenses),
                label: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expenses_launcher.monthly_requests',
                  'Monthly Requests'
                )
              }
            case 'analytics':
              return {
                value: formatNumber(stats.pendingApprovals || 27),
                label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.active_reports', 'Active Reports')
              }
            case 'settings':
              return {
                value: formatNumber(15),
                label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.active_rules', 'Active Rules')
              }
            case 'calendar':
              return {
                value: formatNumber(stats.upcomingEvents || 8),
                label: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expenses_launcher.events_this_month',
                  'Events This Month'
                )
              }
            default:
              return {
                value: '0',
                label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.items', 'Items')
              }
          }
        }

        switch (areaId) {
          case 'expense-items':
            return {
              value: formatNumber(stats.totalExpenseItems),
              label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.total_items', 'Total Items')
            }
          case 'plans':
            return {
              value: formatNumber(stats.activePlans),
              label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.total_plans', 'Total Plans')
            }
          case 'advance-payments':
            return {
              value: formatNumber(stats.advancePayments),
              label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.total_advances', 'Total Advances')
            }
          case 'requests':
            return {
              value: formatNumber(stats.pendingRequests),
              label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.total_requests', 'Total Requests')
            }
          case 'calendar':
            return {
              value: formatNumber(stats.upcomingEvents || 0),
              label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.upcoming_events', 'Upcoming Events')
            }
          case 'analytics':
            return {
              value: formatNumber(stats.pendingApprovals),
              label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.need_approval', 'Need Approval')
            }
          default:
            return { value: '0', label: getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.items', 'Items') }
        }
      }

      const areaStats = getAreaStats(area.id, area.kpiType)

      // Convert links to actions format
      const actions =
        area.links?.map(link => ({
          label: link.label,
          onClick: () => handleLinkClick(link.action)
        })) || []

      return {
        id: area.id,
        title: area.title,
        description: area.description,
        icon: area.icon, // Now directly using PhosphorIcon components
        stats: areaStats,
        actions,
        primaryAction: {
          label: area.buttonLabel || getDefaultButtonLabel(area.id),
          onClick: () => handleNavigationClick(area)
        }
      }
    })

    return [
      {
        id: 'expense-modules',
        title: showFinanceView
          ? getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.finance_dashboard', 'Finance Dashboard')
          : showManagerView
            ? getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.management_dashboard',
                'Management Dashboard'
              )
            : getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.expense_management', 'Expense Management'),
        description: showFinanceView
          ? getTranslationFromI18nKeyAndLabel(
              'lowcoder:expenses_launcher.finance_dashboard_desc',
              'Comprehensive expense oversight and policy management'
            )
          : showManagerView
            ? getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.management_dashboard_desc',
                'Personal and team expense management tools'
              )
            : getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.expense_management_section_desc',
                'Essential expense functions for daily operations and financial management'
              ),
        cards
      }
    ]
  }, [
    hasBothManagerAndFinance,
    showFinanceView,
    showManagerView,
    canViewPersonalExpenses,
    canViewTeamExpenses,
    canApproveExpenses,
    canViewFinancialReports,
    canManageBudgets,
    isFeatureVisible,
    stats
  ])

  const handleNavigationClick = (area: ExpenseArea) => {
    console.log(`Navigation clicked for ${area.title} - navigation disabled temporarily`)

    if (area.buttonAction) {
      switch (area.buttonAction) {
        case 'navigate-personal-expenses':
          const personalExpensesUrl = buildPlatformUrl('/platform/fin/expenses/personal-expenses', {
            tab: 'dashboard'
          })
          navigateTo(personalExpensesUrl)
          break
        case 'navigate-team-expenses':
          const teamExpensesUrl = buildPlatformUrl('/platform/fin/expenses/manager-expenses', {
            tab: 'dashboard'
          })
          navigateTo(teamExpensesUrl)
          break
        case 'navigate-finance-management':
          const financeManagementUrl = buildPlatformUrl('/platform/fin/expenses/backoffice-expenses', {
            tab: 'dashboard'
          })
          navigateTo(financeManagementUrl)
          break
        case 'navigate-team-analytics':
          // Navigate to team analytics (manager expenses with analytics view)
          const teamAnalyticsUrl = buildPlatformUrl('/platform/fin/expenses/manager-expenses', { view: 'analytics' })
          navigateTo(teamAnalyticsUrl)
          break
        case 'navigate-personal-analytics':
        case 'navigate-advanced-analytics':
        case 'navigate-finance-settings':
        case 'navigate-calendar-view':
          const calendarUrl = buildPlatformUrl('/platform/fin/expenses/personal-expenses', {
            tab: 'calendar'
          })
          navigateTo(calendarUrl)
          break
        default:
          console.log(`Unknown button action: ${area.buttonAction}`)
      }
    } else {
      // Handle employee view card navigation
      const areaToTabMap: Record<string, string> = {
        'expense-items': 'expense-items',
        plans: 'expense-plans',
        'advance-payments': 'advance-payments',
        requests: 'expense-requests',
        calendar: 'calendar'
      }

      const tabName = areaToTabMap[area.id]

      if (tabName) {
        const personalExpensesUrl = buildPlatformUrl('/platform/fin/expenses/personal-expenses', {
          tab: tabName
        })
        navigateTo(personalExpensesUrl)
      }
    }
  }

  const handleLinkClick = (linkAction: string) => {
    console.log(`Manager link action: ${linkAction}`)

    const actionToTabMap: Record<string, string> = {
      'personal-expense-items': 'expense-items',
      'personal-expense-plans': 'expense-plans',
      'personal-advance-payments': 'advance-payments',
      'personal-expense-requests': 'expense-requests',
      'team-expense-plans': 'expense-plans',
      'team-advance-payments': 'advance-payments',
      'team-expense-requests': 'expense-requests',
      'team-expense-calendar': 'expense-calendar',
      'finance-expense-plans': 'expense-plans',
      'finance-advance-payments': 'advance-payments',
      'finance-expense-requests': 'expense-requests',
      'finance-policy-management': 'policy-management',
      'finance-expense-assignment-rule': 'srn_expenseAssignementRule',
      'finance-mileage-rules': 'srn_mileageRuleList',
      'finance-travel-region-rules': 'srn_travelRegionRuleList',
      'finance-calculation-rules': 'srn_calculationRule'
    }

    const tabName = actionToTabMap[linkAction]

    if (tabName) {
      if (linkAction.startsWith('personal-')) {
        const personalExpensesUrl = buildPlatformUrl('/platform/fin/expenses/personal-expenses', {
          tab: tabName
        })
        navigateTo(personalExpensesUrl)
      } else if (linkAction.startsWith('team-')) {
        const teamExpensesUrl = buildPlatformUrl('/platform/fin/expenses/manager-expenses', {
          tab: tabName
        })
        navigateTo(teamExpensesUrl)
      } else if (
        linkAction.startsWith('finance-') &&
        [
          'finance-expense-assignment-rule',
          'finance-mileage-rules',
          'finance-travel-region-rules',
          'finance-calculation-rules'
        ].includes(linkAction)
      ) {
        // Special handling for finance settings - navigate to landing screen URLs
        const landingScreenUrl = `/platform/landing_screen/${tabName}`
        navigateTo(landingScreenUrl)
      } else if (linkAction.startsWith('finance-')) {
        const financeExpensesUrl = buildPlatformUrl('/platform/fin/expenses/backoffice-expenses', {
          tab: tabName
        })
        navigateTo(financeExpensesUrl)
      }
    }
  }

  const handleQuickAction = (action: QuickAction) => {
    const employeeId = context.userInfo?.employeeDetails?.employeeId

    if (!employeeId) {
      console.error('Employee ID not found, cannot start process')
      return
    }

    if (action.action === 'create-expense-item') {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeExpenseItem',
        payload: {
          employeeId: employeeId
        },
        builderType: 'NATIVE_SCREEN'
      })
    } else if (action.action === 'submit-request') {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeExpenseRequest',
        payload: {
          employeeId: employeeId
        },
        builderType: 'NATIVE_SCREEN'
      })
    } else if (action.action === 'create-plan') {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeExpensePlan',
        payload: {
          employeeId: employeeId
        },
        builderType: 'NATIVE_SCREEN'
      })
    } else if (action.action === 'request-advance') {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeAdvancePayment',
        payload: {
          employeeId: employeeId
        },
        builderType: 'NATIVE_SCREEN'
      })
    } else {
      console.log(`Quick action "${action.action}" functionality coming soon`)
    }
  }

  const getPageTitle = (): string => {
    return getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.my_expense_hub', 'My Expense Hub')
  }

  const getDescriptionText = (): string => {
    if (showFinanceView) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:expenses_launcher.finance_overview_desc',
        'Comprehensive expense oversight and analytics overview'
      )
    }
    if (showManagerView) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:expenses_launcher.manager_overview_desc',
        'Manage personal and team expenses with comprehensive oversight'
      )
    }
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:expenses_launcher.employee_overview_desc',
      'Comprehensive expense tracking, planning, and financial management'
    )
  }

  // Show loading state while determining permissions
  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-decorative-1">
        <div className="bg-card/90 backdrop-blur-md p-8 rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <Spinner size="lg" />
            <span className="text-lg font-medium text-card-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.loading_dashboard',
                'Loading your personalized dashboard...'
              )}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if permission check failed
  // BUT: If it's a 401 (unauthorized/expired token), continue with default Employee view
  // instead of blocking the entire dashboard
  if (permissionsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-decorative-1">
        <div className="max-w-md mx-auto p-6">
          <Alert variant="destructive" className="bg-card/90 backdrop-blur-md">
            <WarningIcon size={16} className="h-4 w-4" />
            <AlertTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.permission_check_failed',
                'Permission Check Failed'
              )}
            </AlertTitle>
            <AlertDescription>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.permission_check_failed_desc',
                'Unable to determine your permissions.'
              )}{' '}
              {permissionsError?.message ||
                getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.unknown_error', 'Unknown error')}{' '}
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.showing_limited_view',
                'Showing limited view.'
              )}
            </AlertDescription>
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
            <WarningIcon size={16} className="h-4 w-4" />
            <AlertTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:expenses_launcher.error_loading_stats',
                'Error Loading Stats'
              )}
            </AlertTitle>
            <AlertDescription>
              {error}
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={refetch}>
                  <ArrowsClockwiseIcon size={16} className="h-4 w-4 mr-1" />
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.retry', 'Retry')}
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
      icon={Wallet}
      headerKpis={headerKpis}
      sections={sections}
      quickActions={launcherQuickActions}
      quickActionsTitle={getTranslationFromI18nKeyAndLabel('lowcoder:expenses_launcher.quick_actions', 'Quick Actions')}
      quickActionsDescription={getTranslationFromI18nKeyAndLabel(
        'lowcoder:expenses_launcher.quick_actions_desc',
        'Frequently used expense functions and shortcuts'
      )}
      variant={moduleColor}
    />
  )
}

export default ExpensesLauncher
