import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { 
  PiClock,
  PiCheckCircle,
  PiUsers,
  PiCalendar,
  PiFirstAid
} from 'react-icons/pi';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useAbsenceStatisticsSimple } from '../../../hooks/useAbsenceStatisticsSimple';

interface AbsenceStatisticsSimpleProps extends BusinessAppContextProps {
  onNavigateToAbsenceListPage?: (preFilter?: any) => void;
}

export const AbsenceStatisticsSimple: React.FC<AbsenceStatisticsSimpleProps> = (props) => {
  const { statistics, isLoading, error, refetch } = useAbsenceStatisticsSimple(props);

  // Transform the statistics into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'team-members-away',
      title: 'Team Members Away',
      value: statistics.teamMembersAway,
      prefix: <PiUsers />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Employees away today',
      onClick: () => props.onNavigateToAbsenceListPage?.({
        type: 'team-away',
        status: ['APPROVED']
      })
    },
    {
      key: 'pending-requests',
      title: 'Pending Requests',
      value: statistics.pendingRequests,
      prefix: <PiClock />,
      color: '#faad14',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Requests awaiting approval',
      onClick: () => props.onNavigateToAbsenceListPage?.({
        type: 'pending',
        status: ['PENDING']
      })
    },
    {
      key: 'sick-absences-by-month',
      title: 'Sick Leaves',
      value: statistics.sickAbsencesByMonth.count,
      prefix: <PiFirstAid />,
      color: '#ff4d4f',
      span: { xs: 24, sm: 12, lg: 6 },
      description: `Most Requests - ${statistics.sickAbsencesByMonth.month}`,
      onClick: () => props.onNavigateToAbsenceListPage?.({
        type: 'sick',
        status: ['APPROVED']
      })
    },
    {
      key: 'upcoming-absences',
      title: 'Upcoming Absences',
      value: statistics.upcomingAbsences,
      prefix: <PiCalendar />,
      color: '#1677ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Future scheduled absences',
      onClick: () => props.onNavigateToAbsenceListPage?.({
        type: 'upcoming',
        status: ['APPROVED']
      })
    }
  ];

  return (
    <div data-testid="absence-statistics-simple-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeletonCount={4}
        emptyText="No statistics available."
        data-testid="absence-statistics-simple"
      />
    </div>
  );
}; 