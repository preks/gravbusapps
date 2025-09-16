import React, { useMemo, useState, useEffect } from 'react';
import { CalendarTimeline, TimelineItem, TimelineEvent } from '@newwork/gravity-ui-catalog';
import { Typography, Spin, Alert } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const { Text } = Typography;
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { GET_ABSENCES_FOR_CALENDAR } from '../../../../queries/AbsenceQueries';

const getStatusType = (status: string): string => {
  switch (status) {
    case 'APPROVED':
      return 'approved';
    case 'PENDING':
      return 'pending';
    case 'REJECTED':
      return 'rejected';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'cancelled';
  }
};

interface AbsenceTimelineItem extends TimelineItem {
  name: string;
  detail?: string;
}

const CalendarList: React.FC<BusinessAppContextProps> = (props) => {
  const { accessToken, userInfo } = props;
  const supervisorId = userInfo?.employeeDetails?.employeeId;

  const [calendarInitialDate] = useState<Date>(new Date());

  const [employees, setEmployees] = useState<any[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const graphqlClient = useGraphQLClient(accessToken);

  const loadCalendarData = async () => {
    if (!supervisorId) {
      setError('Supervisor ID not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const query = GET_ABSENCES_FOR_CALENDAR(supervisorId);
      const result = await graphqlClient.request<{
        Employee: any[];
        EmployeeAbsence: any[];
      }>(query, { supervisorId });

      setEmployees(result.Employee || []);
      setAbsences(result.EmployeeAbsence || []);
    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, [supervisorId]);

  const directReportsData = useMemo(() => {
    return employees.map((employee: any) => ({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeePosition: employee.employeePosition,
    }));
  }, [employees]);

  const timelineItems: AbsenceTimelineItem[] = useMemo(() => {
    if (directReportsData.length === 0) return [];

    const items = directReportsData.map((employee: any) => {
      const employeeName =
        `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee';
      const orgUnit = employee.employeePosition?.organizationalUnit?.name || '';

      return {
        id: employee.id,
        name: employeeName,
        detail: orgUnit,
        picture: undefined,
      };
    });

    return items;
  }, [directReportsData]);

  const timelineEvents: TimelineEvent[] = useMemo(() => {
    if (!absences || absences.length === 0 || timelineItems.length === 0) return [];

    const events: TimelineEvent[] = [];

    absences.forEach((absence: any) => {
      if (!absence.startDate || !absence.endDate) {
        return;
      }

      if (!absence.employee?.id) {
        return;
      }

      if (!timelineItems.some((item) => item.id === absence.employee.id)) {
        return;
      }

      const eventType = getStatusType(absence.status);

      const uniqueEventId = `absence-${absence.id}`;

      const formattedStatus =
        absence.status.charAt(0).toUpperCase() + absence.status.slice(1).toLowerCase();

      const event: TimelineEvent = {
        id: uniqueEventId,
        itemId: absence.employee.id,
        title: `${absence.type?.value || 'Absence'}`,
        startDate: absence.startDate,
        endDate: absence.endDate,
        status: formattedStatus,
        type: eventType,
        note: `${absence.type?.value || 'Absence'} - ${formattedStatus}`,
      };

      events.push(event);
    });

    return events;
  }, [absences, timelineItems]);

  const renderDataBody = () => {
    if (loading)
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
          <Spin size="large" />
        </div>
      );

    if (error) {
      return <Alert message={error} type="error" showIcon />;
    }

    if (timelineItems.length === 0 && timelineEvents.length === 0) {
      return (
        <Text>
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_calendar.no_absence_data_available',
            'No absence data available.',
          )}
        </Text>
      );
    }

    return (
      <CalendarTimeline<AbsenceTimelineItem, TimelineEvent>
        title={getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_calendar.title',
          'Team Absence Calendar',
        )}
        items={timelineItems}
        events={timelineEvents}
        itemLabel={getTranslationFromI18nKeyAndLabel(
          'lowcoder:hr_absences.create_absence.employee',
          'Employee',
        )}
        itemDetailLabel={getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_list.search_employee_list.recent_employees_table.department',
          'Department',
        )}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_table.employee_search_filter',
          'Search Employee...',
        )}
        initialDate={calendarInitialDate}
        initialViewRange={31}
        renderItemContent={(item) => (
          <div className="gba:p-2">
            <Text strong>{item.name}</Text>
            {item.detail && (
              <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                {item.detail}
              </Text>
            )}
          </div>
        )}
        legendItems={statusLegend}
      />
    );
  };

  const statusLegend = [
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_calendar.approved', 'Approved'),
      color: '#10b981',
    },
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_calendar.pending', 'Pending'),
      color: '#f59e0b',
    },
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_calendar.rejected', 'Rejected'),
      color: '#ef4444',
    },
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_calendar.cancelled', 'Cancelled'),
      color: '#6b7280',
    },
  ];

  return <div>{renderDataBody()}</div>;
};

export default CalendarList;
