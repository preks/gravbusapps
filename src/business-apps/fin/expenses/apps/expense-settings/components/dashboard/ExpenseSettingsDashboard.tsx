import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useExpenseSettingsIntegration } from '../../hooks/useExpenseSettingsIntegration';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  SectionKpiCards 
} from '@newwork/nw-design-system';
import { CurrencyDollarIcon, CheckCircleIcon, WarningCircleIcon, CalendarIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

export interface ExpenseSettingsDashboardProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const ExpenseSettingsDashboard: React.FC<ExpenseSettingsDashboardProps> = (context) => {
  const { prefixDataTestId = '' } = context;

  // Data integration hook
  const {
    assignments,
    rules,
    statistics,
    isLoading,
    error,
    refetch
  } = useExpenseSettingsIntegration(context);

  // Create KPI cards for statistics
  const kpiCards = [
    {
      id: 'total-rules',
      title: getTranslationFromI18nKeyAndLabel('expense_settings.stats.total_rules', 'Total Rules'),
      value: statistics.totalRules,
      icon: 'currency' as const,
      iconColor: 'text-blue-500',
      footer: getTranslationFromI18nKeyAndLabel('expense_settings.stats.total_rules_desc', 'All expense rules in system')
    },
    {
      id: 'active-assignments',
      title: getTranslationFromI18nKeyAndLabel('expense_settings.stats.active_assignments', 'Active Assignments'),
      value: statistics.activeAssignments,
      icon: 'users' as const,
      iconColor: 'text-green-500',
      footer: getTranslationFromI18nKeyAndLabel('expense_settings.stats.active_assignments_desc', 'Currently active rule assignments')
    },
    {
      id: 'standard-rules',
      title: getTranslationFromI18nKeyAndLabel('expense_settings.stats.standard_rules', 'Standard Rules'),
      value: statistics.standardRules,
      icon: 'calendar' as const,
      iconColor: 'text-green-600',
      footer: getTranslationFromI18nKeyAndLabel('expense_settings.stats.standard_rules_desc', 'Built-in standard rules')
    },
    {
      id: 'custom-rules',
      title: getTranslationFromI18nKeyAndLabel('expense_settings.stats.custom_rules', 'Custom Rules'),
      value: statistics.customRules,
      icon: 'mail' as const,
      iconColor: 'text-orange-500',
      footer: getTranslationFromI18nKeyAndLabel('expense_settings.stats.custom_rules_desc', 'Organization-specific rules')
    },
    {
      id: 'recent-changes',
      title: getTranslationFromI18nKeyAndLabel('expense_settings.stats.recent_changes', 'Recent Changes'),
      value: statistics.recentChanges,
      icon: 'phone' as const,
      iconColor: 'text-purple-500',
      footer: getTranslationFromI18nKeyAndLabel('expense_settings.stats.recent_changes_desc', 'Changes in the last 7 days')
    }
  ];

  return (
    <div 
      data-testid={`${prefixDataTestId}-expense-settings-dashboard`}
      className="gba:p-6"
    >
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div>
          <h3 className="gba:text-xl gba:font-semibold gba:mb-1 gba:text-gray-900">
            {getTranslationFromI18nKeyAndLabel('expense_settings.dashboard.title', 'Settings Overview')}
          </h3>
          <p className="gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('expense_settings.dashboard.subtitle', 'Monitor and manage your expense configuration')}
          </p>
        </div>
        <Button
          onClick={refetch}
          disabled={isLoading}
          data-testid="expense-settings-dashboard-refresh"
          className="gba:flex gba:items-center gba:gap-2"
        >
          <ArrowClockwiseIcon className={`gba:w-4 gba:h-4 ${isLoading ? 'gba:animate-spin' : ''}`} />
          {getTranslationFromI18nKeyAndLabel('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Statistics KPI Cards */}
      {!isLoading && (
        <SectionKpiCards
          cards={kpiCards}
          className="gba:mb-6"
        />
      )}

      {/* Quick Actions and Recent Activity */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6 gba:mt-6">
        {/* Quick Actions */}
        <Card data-testid="expense-settings-quick-actions">
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('expense_settings.dashboard.quick_actions', 'Quick Actions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-3">
              <Button 
                className="gba:w-full gba:flex gba:items-center gba:gap-2"
                data-testid="quick-action-create-assignment"
              >
                <CurrencyDollarIcon className="gba:w-4 gba:h-4" />
                {getTranslationFromI18nKeyAndLabel('expense_settings.actions.create_assignment', 'Create Rule Assignment')}
              </Button>
              <Button 
                variant="outline"
                className="gba:w-full gba:flex gba:items-center gba:gap-2"
                data-testid="quick-action-view-rules"
              >
                <CheckCircleIcon className="gba:w-4 gba:h-4" />
                {getTranslationFromI18nKeyAndLabel('expense_settings.actions.view_rules', 'View All Rules')}
              </Button>
              <Button 
                variant="outline"
                className="gba:w-full gba:flex gba:items-center gba:gap-2"
                data-testid="quick-action-validate-rules"
              >
                <WarningCircleIcon className="gba:w-4 gba:h-4" />
                {getTranslationFromI18nKeyAndLabel('expense_settings.actions.validate_rules', 'Validate Rules')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card data-testid="expense-settings-recent-activity">
          <CardHeader>
            <CardTitle>{getTranslationFromI18nKeyAndLabel('expense_settings.dashboard.recent_activity', 'Recent Activity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-3">
              {assignments.slice(0, 5).map((assignment, index) => (
                <div 
                  key={assignment.id}
                  className="gba:flex gba:justify-between gba:items-center gba:p-2 gba:bg-gray-50 gba:rounded"
                  data-testid={`recent-activity-item-${index}`}
                >
                  <div>
                    <span className="gba:font-semibold">{assignment.ruleCode}</span>
                    <br />
                    <span className="gba:text-sm gba:text-gray-600">
                      {assignment.employeeName || assignment.companyName || 'General Assignment'}
                    </span>
                  </div>
                  <span className="gba:text-xs gba:text-gray-500">
                    {new Date(assignment.activeFrom).toLocaleDateString()}
                  </span>
                </div>
              ))}
              
              {assignments.length === 0 && (
                <div className="gba:text-center gba:text-gray-500 gba:py-4">
                  <span>
                    {getTranslationFromI18nKeyAndLabel('expense_settings.dashboard.no_activity', 'No recent activity')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card 
        className="gba:mt-6"
        data-testid="expense-settings-system-status"
      >
        <CardHeader>
          <CardTitle>{getTranslationFromI18nKeyAndLabel('expense_settings.dashboard.system_status', 'System Status')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
            <div className="gba:text-center gba:p-4 gba:bg-green-50 gba:rounded">
              <CheckCircleIcon className="gba:text-2xl gba:text-green-600 gba:mb-2 gba:mx-auto" />
              <div>
                <span className="gba:font-semibold gba:block">
                  {getTranslationFromI18nKeyAndLabel('expense_settings.status.rules_active', 'Rules Active')}
                </span>
                <span className="gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('expense_settings.status.rules_active_desc', 'All rules are functioning normally')}
                </span>
              </div>
            </div>
            
            <div className="gba:text-center gba:p-4 gba:bg-blue-50 gba:rounded">
              <CurrencyDollarIcon className="gba:text-2xl gba:text-blue-600 gba:mb-2 gba:mx-auto" />
              <div>
                <span className="gba:font-semibold gba:block">
                  {getTranslationFromI18nKeyAndLabel('expense_settings.status.calculations_working', 'Calculations Working')}
                </span>
                <span className="gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('expense_settings.status.calculations_working_desc', 'Rule calculations are processing')}
                </span>
              </div>
            </div>
            
            <div className="gba:text-center gba:p-4 gba:bg-purple-50 gba:rounded">
              <CalendarIcon className="gba:text-2xl gba:text-purple-600 gba:mb-2 gba:mx-auto" />
              <div>
                <span className="gba:font-semibold gba:block">
                  {getTranslationFromI18nKeyAndLabel('expense_settings.status.assignments_synced', 'Assignments Synced')}
                </span>
                <span className="gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('expense_settings.status.assignments_synced_desc', 'All assignments are up to date')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseSettingsDashboard; 