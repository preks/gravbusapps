import React, { useMemo, useEffect } from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { SalesTeamMember } from '../../sales-members-list/types';
import { useTeamAnalyticsData } from '../hooks/useTeamAnalyticsData';
import {
  PiUsers,
  PiChartLine,
  PiTrendUp,
  PiCalendar,
} from 'react-icons/pi';

const DATA_TEST_ID_PREFIX = 'TeamActivitiesStatistics';

interface TeamActivitiesStatisticsProps extends BusinessAppContextProps {
  teamMembers: SalesTeamMember[];
}

export const TeamActivitiesStatistics: React.FC<TeamActivitiesStatisticsProps> = ({
  teamMembers,
  accessToken,
  userInfo,
}) => {
  // Get employee IDs for data fetching
  const employeeIds = useMemo(() => {
    const memberIds = teamMembers
      .map(member => member.employeeId || member.id)
      .filter((id): id is string => !!id);
    
    // Also include manager IDs
    const managerIds = teamMembers
      .map(member => member.manager?.id)
      .filter((id): id is string => !!id);
    
    return Array.from(new Set([...memberIds, ...managerIds]));
  }, [teamMembers]);

  // Use the specialized analytics data hook (no query limits for comprehensive statistics)
  const {
    activities,
    total,
    loading,
    error,
    loadAnalyticsData,
    retry,
  } = useTeamAnalyticsData({
    employeeIds,
    accessToken,
    userInfo,
  });

  // Load data when component mounts or dependencies change
  useEffect(() => {
    if (employeeIds.length > 0) {
      console.log('TeamActivitiesStatistics: Loading comprehensive analytics data for', employeeIds.length, 'employees');
      loadAnalyticsData();
    }
  }, [employeeIds, loadAnalyticsData]);

  // Debug logging
  useEffect(() => {
    console.log('TeamActivitiesStatistics: Data state', {
      activitiesCount: activities.length,
      total,
      loading,
      error,
      employeeIdsCount: employeeIds.length
    });
  }, [activities, total, loading, error, employeeIds]);

  // Calculate team statistics
  const teamStats = useMemo(() => {
    if (!activities.length) {
      return {
        totalActivities: 0,
        thisWeekActivities: 0,
        avgPerMember: 0,
        mostActiveType: 'N/A',
      };
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const thisWeekActivities = activities.filter(activity => {
      if (!activity.createdAt) return false;
      const createdDate = new Date(activity.createdAt);
      return createdDate >= weekAgo;
    }).length;

    // Count activity types
    const typeCounts = activities.reduce((acc, activity) => {
      const type = activity.activityType?.value || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostActiveType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    return {
      totalActivities: total,
      thisWeekActivities,
      avgPerMember: teamMembers.length > 0 ? total / teamMembers.length : 0,
      mostActiveType,
    };
  }, [activities, total, teamMembers.length]);

  // Create widget items for statistics
  const createStatisticsWidgets = (): WidgetItem[] => [
    {
      key: 'total-activities',
      title: 'Total Activities',
      value: teamStats.totalActivities,
      prefix: <PiChartLine />,
      color: '#1677ff',
      description: 'All team activities recorded',
      precision: 0,
    },
    {
      key: 'this-week-activities',
      title: 'This Week',
      value: teamStats.thisWeekActivities,
      prefix: <PiTrendUp />,
      color: '#52c41a',
      description: 'Activities created this week',
      precision: 0,
    },
    {
      key: 'avg-per-member',
      title: 'Avg per Member',
      value: teamStats.avgPerMember,
      prefix: <PiUsers />,
      color: '#722ed1',
      description: 'Average activities per team member',
      precision: 1,
    },
    {
      key: 'most-active-type',
      title: 'Most Active Type',
      value: teamStats.mostActiveType,
      prefix: <PiCalendar />,
      color: '#fa8c16',
      description: 'Most frequently used activity type',
      valueIsString: true,
    },
  ];

  return (
    <div 
      className="gba:mb-6"
      data-testid={`${DATA_TEST_ID_PREFIX}-container`}
    >
      <WidgetGroup
        widgets={createStatisticsWidgets()}
        isLoading={loading}
        error={error ? new Error(error) : null}
        onRetry={retry}
        skeletonCount={4}
        emptyText="No team activity statistics available."
        data-testid={`${DATA_TEST_ID_PREFIX}-widgets`}
      />
    </div>
  );
};

export default TeamActivitiesStatistics;
