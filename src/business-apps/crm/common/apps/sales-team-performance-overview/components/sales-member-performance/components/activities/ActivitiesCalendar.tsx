import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  Alert,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@newwork/nw-design-system';
import { 
  PiPhone, 
  PiEnvelope, 
  PiUsers, 
  PiListChecks, 
  PiCalendar,
  PiCaretLeft,
  PiCaretRight,
  PiUser,
  PiBuilding,
  PiTarget,
  PiHandshake,
} from 'react-icons/pi';

import { ActivitiesTableProps, SalesActivity, ActivityType, ActivityEntityType } from '../../types/activitiesTypes';
import { getActivityScoreBadgeVariant, ACTIVITY_TYPE_COLORS } from './types';
import { useEmployeeActivitiesData } from '../../hooks/useEmployeeActivitiesData';
import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';

dayjs.extend(weekday);
dayjs.extend(localeData);

const DATA_TEST_ID_PREFIX = 'EmployeeActivitiesCalendar';

export const ActivitiesCalendar: React.FC<ActivitiesTableProps> = ({
  employeeId,
  accessToken,
  onTotalChange
}) => {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [search, setSearch] = useState('');

  // Use the same data hook as the table
  const {
    activities,
    total,
    loading,
    error,
    loadPage,
    retry
  } = useEmployeeActivitiesData({
    employeeId,
    search,
    sortField: 'occurredAt',
    sortOrder: 'DESC',
    accessToken
  });

  // Load initial data when component mounts
  useEffect(() => {
    if (employeeId && accessToken) {
      loadPage(1, 200); // Load more items for calendar view
    }
  }, [employeeId, accessToken, search, loadPage]);

  // Report total change to parent component
  useEffect(() => {
    if (onTotalChange) {
      onTotalChange(total);
    }
  }, [total, onTotalChange]);

  // Get activities for a specific date
  const getActivitiesForDate = (date: dayjs.Dayjs): SalesActivity[] => {
    const dateStr = date.format('YYYY-MM-DD');
    const dayActivities = activities.filter(activity => {
      const activityDate = dayjs(activity.occurredAt).format('YYYY-MM-DD');
      return activityDate === dateStr;
    });
    
    // Sort activities within the day by time (earliest first)
    return dayActivities.sort((a, b) => {
      const timeA = dayjs(a.occurredAt);
      const timeB = dayjs(b.occurredAt);
      return timeA.isAfter(timeB) ? 1 : -1;
    });
  };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startOfCalendar = startOfMonth.startOf('week');
    const endOfCalendar = endOfMonth.endOf('week');

    const days = [];
    let day = startOfCalendar;

    while (day.isBefore(endOfCalendar) || day.isSame(endOfCalendar)) {
      days.push({
        date: day,
        isCurrentMonth: day.month() === currentDate.month(),
        isToday: day.isSame(dayjs(), 'day'),
        activities: getActivitiesForDate(day)
      });
      day = day.add(1, 'day');
    }

    return days;
  }, [currentDate, activities]);

  // Get activity type icon
  const getActivityTypeIcon = (type: ActivityType, size = 12) => {
    switch (type) {
      case 'Call': return <PiPhone size={size} />;
      case 'Email': return <PiEnvelope size={size} />;
      case 'Meeting': return <PiUsers size={size} />;
      case 'Task': return <PiListChecks size={size} />;
      default: return <PiListChecks size={size} />;
    }
  };

  // Get entity type icon  
  const getEntityTypeIcon = (entityType: ActivityEntityType, size = 10) => {
    switch (entityType) {
      case 'Contact': return <PiUser size={size} />;
      case 'Lead': return <PiTarget size={size} />;
      case 'Opportunity': return <PiHandshake size={size} />;
      case 'Account': return <PiBuilding size={size} />;
      default: return <PiUser size={size} />;
    }
  };

  // Format time
  const formatTime = (dateString: string): string => {
    return dayjs(dateString).format('HH:mm');
  };

  // Format created date for tooltip
  const formatCreatedDate = (dateString: string): string => {
    return dayjs(dateString).format('MMM D, YYYY [at] HH:mm');
  };

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(currentDate.subtract(1, 'month'));
  };

  const goToNextMonth = () => {
    setCurrentDate(currentDate.add(1, 'month'));
  };

  const goToToday = () => {
    setCurrentDate(dayjs());
  };

  // Loading state
  if (loading && activities.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:p-8" data-testid={`${DATA_TEST_ID_PREFIX}-loading`}>
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="gba:p-4" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <Alert variant="destructive">
          <div className="gba:flex gba:justify-between gba:items-center">
            <div>
              <div className="gba:font-medium">Error Loading Activities</div>
              <div className="gba:text-sm gba:mt-1">{String(error)}</div>
            </div>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle data-testid={`${DATA_TEST_ID_PREFIX}-title`} className="gba:flex gba:items-center gba:gap-2">
            <PiCalendar className="gba:text-black" size={20} />
            Sales Activities Calendar
          </CardTitle>
          
          {/* Calendar Navigation */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
              data-testid={`${DATA_TEST_ID_PREFIX}-prev-month`}
              className="gba:flex gba:items-center gba:gap-1"
            >
              <PiCaretLeft size={14} />
              Previous
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              data-testid={`${DATA_TEST_ID_PREFIX}-today`}
            >
              Today
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
              data-testid={`${DATA_TEST_ID_PREFIX}-next-month`}
              className="gba:flex gba:items-center gba:gap-1"
            >
              Next
              <PiCaretRight size={14} />
            </Button>
          </div>
        </div>
        
        {/* Month/Year Display */}
        <div className="gba:text-center gba:text-lg gba:font-medium gba:text-gray-700" data-testid={`${DATA_TEST_ID_PREFIX}-month-year`}>
          {currentDate.format('MMMM YYYY')}
        </div>
      </CardHeader>
      
      <CardContent className="gba:p-0">
        {/* Calendar Grid */}
        <div className="gba:grid gba:grid-cols-7 gba:border-t">
          {/* Day Headers */}
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
            <div
              key={day}
              className="gba:p-3 gba:text-center gba:text-sm gba:font-medium gba:text-gray-600 gba:bg-gray-50 gba:border-b gba:border-r last:gba:border-r-0"
              data-testid={`${DATA_TEST_ID_PREFIX}-day-header-${day.toLowerCase()}`}
            >
              {day.substring(0, 3)}
            </div>
          ))}
          
          {/* Calendar Days */}
          {calendarDays.map((dayInfo, index) => (
            <div
              key={index}
              className={`
                gba:min-h-[140px] gba:p-2 gba:border-b gba:border-r last:gba:border-r-0 gba:relative
                ${dayInfo.isCurrentMonth ? 'gba:bg-white' : 'gba:bg-gray-50'}
                ${dayInfo.isToday ? 'gba:bg-blue-50' : ''}
              `}
              data-testid={`${DATA_TEST_ID_PREFIX}-day-${dayInfo.date.format('YYYY-MM-DD')}`}
            >
              {/* Day Number */}
              <div
                className={`
                  gba:text-sm gba:font-medium gba:mb-2
                  ${dayInfo.isCurrentMonth ? 'gba:text-gray-900' : 'gba:text-gray-400'}
                  ${dayInfo.isToday ? 'gba:text-blue-600 gba:font-bold' : ''}
                `}
              >
                {dayInfo.date.format('D')}
              </div>
              
              {/* Activities for this day */}
              <div 
                className={`gba:space-y-1 ${dayInfo.activities.length > 3 ? 'gba:max-h-[200px] gba:overflow-y-auto gba:pr-1' : ''}`} 
                style={dayInfo.activities.length > 3 ? { scrollbarWidth: 'thin' } : {}}
              >
                {dayInfo.activities.map((activity) => (
                                     <div
                     key={activity.id}
                     className="gba:p-1 gba:rounded gba:text-xs gba:relative"
                     style={{ backgroundColor: `${ACTIVITY_TYPE_COLORS[activity.type]}15` }}
                     data-testid={`${DATA_TEST_ID_PREFIX}-activity-${activity.id}`}
                   >
                                         <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                       <div style={{ color: ACTIVITY_TYPE_COLORS[activity.type] }}>
                         {getActivityTypeIcon(activity.type, 10)}
                       </div>
                       <span className="gba:font-medium gba:truncate gba:flex-1" style={{ color: ACTIVITY_TYPE_COLORS[activity.type] }}>
                         {formatTime(activity.occurredAt)}
                       </span>
                       <TooltipProvider>
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <Badge variant={getActivityScoreBadgeVariant(activity.activityScore)} className="gba:text-[10px] gba:px-1 gba:py-0 gba:cursor-help">
                               {activity.activityScore}%
                             </Badge>
                           </TooltipTrigger>
                           <TooltipContent>
                             <p className="gba:text-xs">
                               Created: {formatCreatedDate(activity.createdAt)}
                             </p>
                           </TooltipContent>
                         </Tooltip>
                       </TooltipProvider>
                     </div>
                    
                    <div className="gba:text-gray-700 gba:font-medium gba:truncate gba:text-[11px] gba:mb-1">
                      {activity.title}
                    </div>
                    
                    <div className="gba:flex gba:items-center gba:gap-1 gba:text-gray-500">
                      {getEntityTypeIcon(activity.reference.entityType, 8)}
                      <span className="gba:truncate gba:text-[10px]">
                        {activity.reference.entityName}
                      </span>
                    </div>
                    
                    
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Summary Stats */}
        <div className="gba:p-4 gba:border-t gba:bg-gray-50">
          <div className="gba:text-sm gba:text-gray-500 gba:text-center">
            {total > 0 ? `${total} activit${total !== 1 ? 'ies' : 'y'} found` : 'No activities found'}
            {loading && <span> • Loading...</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 