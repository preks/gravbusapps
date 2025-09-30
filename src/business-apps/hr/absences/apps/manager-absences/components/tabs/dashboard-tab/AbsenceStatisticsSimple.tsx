import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { PiClock, PiUsers, PiCalendar, PiFirstAid } from 'react-icons/pi';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useAbsenceStatisticsSimple } from '../../../hooks/useAbsenceStatisticsSimple';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface AbsenceStatisticsSimpleProps extends BusinessAppContextProps {
  onNavigateToAbsenceListPage?: (preFilter?: any) => void;
}

export const AbsenceStatisticsSimple: React.FC<AbsenceStatisticsSimpleProps> = (props) => {
  const { statistics, isLoading, error, refetch } = useAbsenceStatisticsSimple(props);

  // Transform the statistics into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'team-members-away',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_manager.dashboard.team_members_away_btn',
        'Team Members Away',
      ),
      value: statistics.teamMembersAway,
      prefix: <PiUsers />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_manager.dashboard.employees_away_today',
        'Employees away today',
      ),
      onClick: () => {
        const today = dayjs().format('YYYY-MM-DD');
        props.onNavigateToAbsenceListPage?.({
          type: 'team-away',
          status: ['APPROVED'],
          dateRange: {
            startDate: today,
            endDate: today,
          },
        });
      },
    },
    {
      key: 'pending-requests',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_manager.dashboard.pending_requests_btn',
        'Pending Requests',
      ),
      value: statistics.pendingRequests,
      prefix: <PiClock />,
      color: '#faad14',
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_manager.dashboard.requests_awaiting_approval',
        'Requests awaiting approval',
      ),
      onClick: () => {
        const currentYear = new Date().getFullYear();
        const startOfYear = `${currentYear}-01-01`;
        const endOfYear = `${currentYear}-12-31`;

        props.onNavigateToAbsenceListPage?.({
          type: 'pending',
          status: ['PENDING'],
          dateRange: {
            startDate: startOfYear,
            endDate: endOfYear,
          },
        });
      },
    },
    {
      key: 'sick-absences-by-month',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_manager.dashboard.sick_leaves_btn',
        'Sick Leaves',
      ),
      value: statistics.sickAbsencesByMonth.count,
      prefix: <PiFirstAid />,
      color: '#ff4d4f',
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_manager.dashboard.most_requests_month',
        `Most Requests - ${statistics.sickAbsencesByMonth.month}`,
        { month: statistics.sickAbsencesByMonth.month },
      ),
      onClick: () => {
        const currentYear = new Date().getFullYear();
        const monthName = statistics.sickAbsencesByMonth.month;

        // Use dayjs to parse the month name and get the month number
        const monthNumber = dayjs(`${monthName} 1, ${currentYear}`).month(); // 0-based month number

        // Create dates for the first and last day of the month using dayjs
        const startOfMonth = dayjs(`${currentYear}-${String(monthNumber + 1).padStart(2, '0')}-01`);
        const endOfMonth = startOfMonth.endOf('month');

        // Format dates as YYYY-MM-DD
        const startDate = startOfMonth.format('YYYY-MM-DD');
        const endDate = endOfMonth.format('YYYY-MM-DD');

        props.onNavigateToAbsenceListPage?.({
          type: 'sick',
          status: ['APPROVED'],
          groups: ['AbsenceGroup:v1:HEALTH'],
          dateRange: {
            startDate,
            endDate,
          },
        });
      },
    },
    {
      key: 'upcoming-absences',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_manager.dashboard.upcoming_absences_btn',
        'Upcoming Absences',
      ),
      value: statistics.upcomingAbsences,
      prefix: <PiCalendar />,
      color: '#1677ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_manager.dashboard.future_scheduled_absences',
        'Future scheduled absences',
      ),
      onClick: () => {
        const today = new Date().toISOString().split('T')[0];

        props.onNavigateToAbsenceListPage?.({
          type: 'upcoming',
          status: ['APPROVED'],
          dateRange: {
            startDate: today, // Start from today, no end date limit
          },
        });
      },
    },
  ];

  // Handle widget clicks by calling the individual widget's onClick handler
  const handleWidgetClick = (widgetKey: string) => {
    const widget = widgets.find((w) => w.key === widgetKey);
    if (widget?.onClick) {
      widget.onClick();
    }
  };

  return (
    <div data-testid="absence-statistics-simple-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        onWidgetClick={handleWidgetClick}
        skeletonCount={4}
        emptyText={getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_manager.no_statistics_available',
          'No statistics available.',
        )}
        data-testid="absence-statistics-simple"
      />
    </div>
  );
};
