import React, { useState, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  LauncherLayout, 
  type LauncherSectionConfig, 
  type NavigationCardData, 
  type QuickActionData,
  type KpiData,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Button
} from '@newwork/nw-design-system';
import { quickActions, categoryLabels } from './utils/expenseAreas';
import { ExpenseArea, QuickAction } from './types';
import BackgroundImage from '@/assets/images/background.png';
import { useExpenseDashboardStats } from './hooks/useExpenseDashboardStats';
import { useExpensePermissions, EXPENSE_FEATURE_KEYS } from './hooks/useExpensePermissions';
import { startProcess } from '@/common/utils/start-process';
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import * as RemixIcons from '@remixicon/react';
// Import PhosphorIcons for LauncherLayout
import { 
  User, 
  Gear, 
  ChartBar, 
  ChartLine,
  Users,
  ChartPie,
  Receipt,
  Article,
  CurrencyDollar,
  FileText,
  Calendar,
  Wallet,
  Plus,
  Sliders
} from '@phosphor-icons/react';

interface ExpensesLauncherProps extends BusinessAppContextProps {}

// Map RemixIcon names to PhosphorIcon components
const iconMap = {
  'RiUser3Line': User,
  'RiSettings3Line': Gear,
  'RiBarChart2Line': ChartBar,
  'RiLineChartLine': ChartLine,
  'RiTeamLine': Users,
  'RiPieChart2Line': ChartPie,
  'RiReceiptLine': Receipt,
  'RiPlaneLine': Article,
  'RiMoneyDollarCircleLine': CurrencyDollar,
  'RiFileTextLine': FileText,
  'RiCalendarLine': Calendar,
  'Sliders': Sliders
};

const ExpensesLauncher: React.FC<ExpensesLauncherProps> = (context) => {
  const { stats, isLoading, error, refetch } = useExpenseDashboardStats(context);
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
    canManageExpensePolicy,
    isFeatureVisible
  } = useExpensePermissions(
    context.userInfo?.employeeDetails?.employeeId || '',
    context.accessToken || ''
  );

  // Determine UI layout based on permissions (following HR pattern)
  const showFinanceView = hasFinancePermissions();
  const showManagerView = hasManagerPermissions() && !hasFinancePermissions();
  const showEmployeeView = !hasManagerPermissions() && !hasFinancePermissions();

  // Format currency and numbers
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    if (showFinanceView || showManagerView) {
      return num.toString(); // Simple format for finance and manager
    }
    return num.toLocaleString(); // Locale format for employee
  };

  // Convert stats to KpiData format for header
  const headerKpis = useMemo((): KpiData[] => {
    if (error) return [];
    
    if (showFinanceView) {
      return [
        {
          id: 'monthly-expenses',
          title: 'Monthly Expenses',
          value: isLoading ? '...' : formatCurrency(stats.monthlyExpenses),
          color: 'primary'
        },
        {
          id: 'pending-finance-requests',
          title: 'Pending Requests',
          value: isLoading ? '...' : formatNumber(stats.pendingFinanceRequests),
          color: 'default'
        },
        {
          id: 'pending-finance-advances',
          title: 'Pending Advances',
          value: isLoading ? '...' : formatNumber(stats.pendingFinanceAdvances),
          color: 'success'
        }
      ];
    } else if (showManagerView) {
      return [
        {
          id: 'monthly-expenses',
          title: 'Monthly Expenses',
          value: isLoading ? '...' : formatCurrency(stats.monthlyExpenses),
          color: 'primary'
        },
        {
          id: 'pending-team-plans',
          title: 'Pending Team Plans',
          value: isLoading ? '...' : formatCurrency(stats.pendingTeamPlans),
          color: 'default'
        },
        {
          id: 'pending-team-requests',
          title: 'Pending Team Requests',
          value: isLoading ? '...' : formatCurrency(stats.pendingTeamRequests),
          color: 'success'
        }
      ];
    } else {
      return [
        {
          id: 'unassigned-items',
          title: 'Unassigned Items',
          value: isLoading ? '...' : formatNumber(stats.unassignedItems),
          color: 'default'
        },
        {
          id: 'pending-requests',
          title: 'Pending Requests',
          value: isLoading ? '...' : formatNumber(stats.pendingRequests),
          color: 'default'
        },
        {
          id: 'monthly-expenses',
          title: 'Monthly Expenses',
          value: isLoading ? '...' : formatCurrency(stats.monthlyExpenses),
          color: 'primary'
        }
      ];
    }
  }, [stats, isLoading, error, showFinanceView, showManagerView]);

  // Convert quick actions to LauncherLayout format
  const launcherQuickActions = useMemo((): QuickActionData[] => {
    return quickActions.map(action => ({
      id: action.id,
      label: action.label,
      icon: iconMap[action.icon as keyof typeof iconMap] || Plus,
      onClick: () => handleQuickAction(action),
      variant: 'secondary'
    }));
  }, []);

  // Helper functions
  const getDefaultButtonLabel = (areaId: string): string => {
    switch (areaId) {
      case 'expense-items': return 'View All Items';
      case 'plans': return 'View All Plans';
      case 'advance-payments': return 'View All Advances';
      case 'requests': return 'View All Requests';
      case 'calendar': return 'View Calendar';
      case 'analytics': return 'View Analytics';
      default: return 'View Details';
    }
  };

  // Generate sections based on permissions
  const sections = useMemo((): LauncherSectionConfig[] => {
    const areas: ExpenseArea[] = [];

    if (showFinanceView) {
      // Finance view: specialized finance cards
      if (canViewPersonalExpenses()) {
        areas.push({
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
        });
      }

      areas.push({
        id: 'expense-management',
        title: 'Expense Management',
        description: 'Comprehensive expense oversight and policy management',
        icon: 'RiSettings3Line',
        category: 'manager',
        kpiType: 'team',
        links: [
          { label: 'Expense Requests', action: 'finance-expense-requests' },
          { label: 'Advance Payments', action: 'finance-advance-payments' }
        ],
        buttonLabel: 'Go to Expense Management',
        buttonAction: 'navigate-finance-management'
      });

      areas.push({
        id: 'finance-settings',
        title: 'Finance Settings',
        description: 'Manage expense calculation rules, mileage policies, and travel regulations',
        icon: 'Sliders',
        category: 'manager',
        kpiType: 'settings',
        links: [
          { label: 'Expense Calculation Rule Assignment', action: 'finance-expense-assignment-rule' },
          { label: 'Mileage Rules', action: 'finance-mileage-rules' },
          { label: 'Travel Region Rules', action: 'finance-travel-region-rules' },
          { label: 'Expense Calculation Rules', action: 'finance-calculation-rules' }
        ],
        buttonLabel: 'Manage Settings',
        buttonAction: 'navigate-finance-settings'
      });

      areas.push({
        id: 'calendar-view',
        title: 'Calendar',
        description: 'View expenses, plans, and events in a calendar timeline',
        icon: 'Calendar',
        category: 'reporting',
        kpiType: 'calendar',
        buttonLabel: 'View Calendar',
        buttonAction: 'navigate-calendar-view'
      });

      areas.push({
        id: 'my-expense-analytics',
        title: 'My Expense Analytics',
        description: 'Personal spending insights, trends, and budget analysis',
        icon: 'RiBarChart2Line',
        category: 'manager',
        kpiType: 'analytics',
        buttonLabel: 'View My Analytics',
        buttonAction: 'navigate-personal-analytics'
      });

      areas.push({
        id: 'advanced-expense-analytics',
        title: 'Advanced Expense Analytics',
        description: 'Enterprise spending insights, budget tracking, and performance metrics',
        icon: 'RiLineChartLine',
        category: 'reporting',
        kpiType: 'analytics',
        buttonLabel: 'View Advanced Analytics',
        buttonAction: 'navigate-advanced-analytics'
      });

    } else if (showManagerView) {
      if (canViewPersonalExpenses()) {
        areas.push({
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
        });
      }

      if (canViewTeamExpenses() || canApproveExpenses()) {
        areas.push({
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
        });
      }

      areas.push({
        id: 'finance-settings',
        title: 'Finance Settings',
        description: 'Manage expense calculation rules, mileage policies, and travel regulations',
        icon: 'Sliders',
        category: 'manager',
        kpiType: 'settings',
        links: [
          { label: 'Expense Calculation Rule Assignment', action: 'finance-expense-assignment-rule' },
          { label: 'Mileage Rules', action: 'finance-mileage-rules' },
          { label: 'Travel Region Rules', action: 'finance-travel-region-rules' },
          { label: 'Expense Calculation Rules', action: 'finance-calculation-rules' }
        ],
        buttonLabel: 'Manage Settings',
        buttonAction: 'navigate-finance-settings'
      });

      areas.push({
        id: 'calendar-view',
        title: 'Calendar',
        description: 'View expenses, plans, and events in a calendar timeline',
        icon: 'Calendar',
        category: 'reporting',
        kpiType: 'calendar',
        buttonLabel: 'View Calendar',
        buttonAction: 'navigate-calendar-view'
      });

      areas.push({
        id: 'my-expense-analytics',
        title: 'My Expense Analytics',
        description: 'Personal spending insights, trends, and budget analysis',
        icon: 'RiBarChart2Line',
        category: 'manager',
        kpiType: 'analytics',
        buttonLabel: 'View My Analytics',
        buttonAction: 'navigate-personal-analytics'
      });

      if (canViewTeamExpenses() || canManageBudgets()) {
        areas.push({
          id: 'team-expense-analytics',
          title: 'Team Expense Analytics',
          description: 'Team spending insights, budget tracking, and performance metrics',
          icon: 'RiPieChart2Line',
          category: 'manager',
          kpiType: 'analytics',
          buttonLabel: 'View Team Analytics',
          buttonAction: 'navigate-team-analytics'
        });
      }
    } else {
      if (canViewPersonalExpenses()) {
        areas.push({
          id: 'expense-items',
          title: 'Expense Items',
          description: 'Manage individual expense entries, receipts, and categorization',
          icon: 'RiReceiptLine',
          category: 'core'
        });
      }

      areas.push({
        id: 'plans',
        title: 'Plans',
        description: 'Budget planning, expense forecasting, and financial planning',
        icon: 'RiPlaneLine',
        category: 'planning'
      });

      areas.push({
        id: 'advance-payments',
        title: 'Advance Payments',
        description: 'Request and manage advance payments for upcoming expenses',
        icon: 'RiMoneyDollarCircleLine',
        category: 'core'
      });

      areas.push({
        id: 'requests',
        title: 'Requests',
        description: 'Submit, track, and approve expense reimbursement requests',
        icon: 'RiFileTextLine',
        category: 'core'
      });

      areas.push({
        id: 'calendar',
        title: 'Calendar',
        description: 'View expenses, plans, and events in a calendar timeline',
        icon: 'RiCalendarLine',
        category: 'reporting'
      });

      areas.push({
        id: 'analytics',
        title: 'Analytics',
        description: 'Personal spending analysis, trends, and insights',
        icon: 'RiLineChartLine',
        category: 'reporting'
      });
    }

    // Convert areas to NavigationCardData format
    const cards: NavigationCardData[] = areas.map(area => {
      // Get area stats
      const getAreaStats = (areaId: string, kpiType?: string) => {
        if ((showManagerView || showFinanceView) && kpiType) {
          switch (kpiType) {
            case 'personal':
              return { 
                value: formatCurrency(stats.monthlyExpenses || 2450), 
                label: 'Monthly Expenses'
              };
            case 'team':
              return { 
                value: formatNumber(stats.teamMonthlyExpenses || 849), 
                label: 'Monthly Requests'
              };
            case 'analytics':
              return { 
                value: formatNumber(stats.pendingApprovals || 27), 
                label: 'Active Reports'
              };
            case 'settings':
              return { 
                value: formatNumber(15), 
                label: 'Active Rules'
              };
            case 'calendar':
              return { 
                value: formatNumber(stats.upcomingEvents || 8), 
                label: 'Events This Month'
              };
            default:
              return { value: '0', label: 'Items' };
          }
        }

        switch (areaId) {
          case 'expense-items':
            return { 
              value: formatNumber(stats.totalExpenseItems), 
              label: 'Total Items'
            };
          case 'plans':
            return { 
              value: formatNumber(stats.activePlans), 
              label: 'Total Plans'
            };
          case 'advance-payments':
            return { 
              value: formatNumber(stats.advancePayments), 
              label: 'Total Advances'
            };
          case 'requests':
            return { 
              value: formatNumber(stats.pendingRequests), 
              label: 'Total Requests'
            };
          case 'calendar':
            return { 
              value: formatNumber(stats.upcomingEvents || 0), 
              label: 'Upcoming Events'
            };
          case 'analytics':
            return { 
              value: formatNumber(stats.pendingApprovals), 
              label: 'Need Approval'
            };
          default:
            return { value: '0', label: 'Items' };
        }
      };

      const areaStats = getAreaStats(area.id, area.kpiType);

      // Convert links to actions format
      const actions = area.links?.map(link => ({
        label: link.label,
        onClick: () => handleLinkClick(link.action)
      })) || [];

      // Get variant based on category and area ID
      const getVariant = (category: string, areaId: string) => {
        if (areaId === 'plans') return 'ext2';
        if (areaId === 'calendar') return 'success';
        if (areaId === 'analytics') return 'info';
        if (areaId === 'expense-management' || areaId === 'advanced-expense-analytics') return 'success';
        if (areaId === 'team-expenses' || areaId === 'team-expense-analytics') return 'success';
        
        switch (category) {
          case 'core': return 'ext2';
          case 'planning': return 'success';
          case 'reporting': return 'ext4';
          case 'manager': return 'ext2';
          default: return 'default';
        }
      };

      return {
        id: area.id,
        title: area.title,
        description: area.description,
        icon: iconMap[area.icon as keyof typeof iconMap] || Wallet,
        stats: areaStats,
        actions,
        primaryAction: {
          label: area.buttonLabel || getDefaultButtonLabel(area.id),
          onClick: () => handleNavigationClick(area)
        },
        variant: getVariant(area.category, area.id)
      };
    });

    return [{
      id: 'expense-modules',
      title: showFinanceView ? 'Finance Dashboard' : (showManagerView ? 'Management Dashboard' : 'Expense Management'),
      description: showFinanceView 
        ? 'Comprehensive expense oversight and policy management' 
        : (showManagerView 
          ? 'Personal and team expense management tools' 
          : 'Essential expense functions for daily operations and financial management'
        ),
      cards
    }];
  }, [showFinanceView, showManagerView, canViewPersonalExpenses, canViewTeamExpenses, canApproveExpenses, canViewFinancialReports, canManageBudgets, isFeatureVisible, stats]);

  const handleNavigationClick = (area: ExpenseArea) => {
    console.log(`Navigation clicked for ${area.title} - navigation disabled temporarily`);
    
    if (area.buttonAction) {
      switch (area.buttonAction) {
        case 'navigate-personal-expenses':
          const personalExpensesUrl = buildPlatformUrl('/platform/fin/expenses/personal-expenses', { tab: 'dashboard' });
          navigateTo(personalExpensesUrl);
          break;
        case 'navigate-team-expenses':
          const teamExpensesUrl = buildPlatformUrl('/platform/fin/expenses/manager-expenses', { tab: 'dashboard' });
          navigateTo(teamExpensesUrl);
          break;
        case 'navigate-finance-management':
          const financeManagementUrl = buildPlatformUrl('/platform/fin/expenses/backoffice-expenses', { tab: 'dashboard' });
          navigateTo(financeManagementUrl);
          break;
        case 'navigate-personal-analytics':
        case 'navigate-team-analytics':
        case 'navigate-advanced-analytics':
        case 'navigate-finance-settings':
        case 'navigate-calendar-view':
          const calendarUrl = buildPlatformUrl('/platform/fin/expenses/personal-expenses', { tab: 'calendar' });
          navigateTo(calendarUrl);
          break;
        default:
          console.log(`Unknown button action: ${area.buttonAction}`);
      }
    } else {
      // Handle employee view card navigation
      const areaToTabMap: Record<string, string> = {
        'expense-items': 'expense-items',
        'plans': 'expense-plans',
        'advance-payments': 'advance-payments',
        'requests': 'expense-requests',
        'calendar': 'calendar'
      };
      
      const tabName = areaToTabMap[area.id];
      
      if (tabName) {
        const personalExpensesUrl = buildPlatformUrl('/platform/fin/expenses/personal-expenses', { tab: tabName });
        navigateTo(personalExpensesUrl);
      }
    }
  };

  const handleLinkClick = (linkAction: string) => {
    console.log(`Manager link action: ${linkAction}`);
    
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
    };

    const tabName = actionToTabMap[linkAction];
    
    if (tabName) {
      if (linkAction.startsWith('personal-')) {
        const personalExpensesUrl = buildPlatformUrl('/platform/fin/expenses/personal-expenses', { tab: tabName });
        navigateTo(personalExpensesUrl);
      } else if (linkAction.startsWith('team-')) {
        const teamExpensesUrl = buildPlatformUrl('/platform/fin/expenses/manager-expenses', { tab: tabName });
        navigateTo(teamExpensesUrl);
      } else if (linkAction.startsWith('finance-') && 
                 ['finance-expense-assignment-rule', 'finance-mileage-rules', 'finance-travel-region-rules', 'finance-calculation-rules'].includes(linkAction)) {
        // Special handling for finance settings - navigate to landing screen URLs
        const landingScreenUrl = `/platform/landing_screen/${tabName}`;
        navigateTo(landingScreenUrl);
      } else if (linkAction.startsWith('finance-')) {
        const financeExpensesUrl = buildPlatformUrl('/platform/fin/expenses/backoffice-expenses', { tab: tabName });
        navigateTo(financeExpensesUrl);
      }
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    const employeeId = context.userInfo?.employeeDetails?.employeeId;
    
    if (!employeeId) {
      console.error('Employee ID not found, cannot start process');
      return;
    }

    if (action.action === 'create-expense-item') {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeExpenseItem',
        payload: {
          employeeId: employeeId
        }
      });
    } else if (action.action === 'submit-request') {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeExpenseRequest',
        payload: {
          employeeId: employeeId
        }
      });
    } else if (action.action === 'create-plan') {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeExpensePlan',
        payload: {
          employeeId: employeeId
        }
      });
    } else if (action.action === 'request-advance') {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeAdvancePayment',
        payload: {
          employeeId: employeeId
        }
      });
    } else {
      console.log(`Quick action "${action.action}" functionality coming soon`);
    }
  };

  const getPageTitle = (): string => {
    return 'My Expense Hub';
  };

  const getDescriptionText = (): string => {
    if (showFinanceView) {
      return 'Comprehensive expense oversight and analytics overview';
    }
    if (showManagerView) {
      return 'Manage personal and team expenses with comprehensive oversight';
    }
    return 'Comprehensive expense tracking, planning, and financial management';
  };

  // Show loading state while determining permissions
  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-decorative-1">
        <div className="bg-card/90 backdrop-blur-md p-8 rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <Spinner size="lg" />
            <span className="text-lg font-medium text-card-foreground">
              Loading your personalized dashboard...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if permission check failed
  if (permissionsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-decorative-1">
        <div className="max-w-md mx-auto p-6">
          <Alert variant="destructive" className="bg-card/90 backdrop-blur-md">
            <RemixIcons.RiErrorWarningLine className="h-4 w-4" />
            <AlertTitle>Permission Check Failed</AlertTitle>
            <AlertDescription>
              Unable to determine your permissions. {permissionsError?.message || 'Unknown error'} Showing limited view.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
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
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={refetch}
                >
                  <RemixIcons.RiRefreshLine className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <LauncherLayout
      title={getPageTitle()}
      description={getDescriptionText()}
      icon={Wallet}
      headerKpis={headerKpis}
      sections={sections}
      quickActions={launcherQuickActions}
      quickActionsTitle="Quick Actions"
      quickActionsDescription="Frequently used expense functions and shortcuts"
    />
  );
};

export default ExpensesLauncher; 