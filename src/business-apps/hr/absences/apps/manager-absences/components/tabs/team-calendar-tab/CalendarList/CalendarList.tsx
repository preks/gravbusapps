import React, { useMemo, useState, useEffect } from 'react';
import { CalendarTimeline, TimelineItem, TimelineEvent } from '@newwork/gravity-ui-catalog';
import { Spinner, Alert, Badge } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

// Status type mapping function (for CalendarTimeline color mapping)
const getStatusType = (status: string): string => {
  switch (status) {
    case 'APPROVED':
      return 'approved'; // Green - matches absence list success variant
    case 'PENDING':
      return 'pending';  // Amber - matches absence list warning variant
    case 'REJECTED':
      return 'rejected'; // Red - matches absence list destructive variant
    case 'CANCELLED':
      return 'cancelled'; // Gray - matches absence list secondary variant
    default:
      return 'cancelled'; // Default - gray
  }
};

// Status color mapping function (matching manager absence table Badge variants)
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'APPROVED':
      return '#10b981'; // success variant - green
    case 'PENDING':
      return '#f59e0b'; // warning variant - amber
    case 'REJECTED':
      return '#ef4444'; // destructive variant - red
    case 'CANCELLED':
      return '#6b7280'; // secondary variant - gray
    default:
      return '#6b7280'; // default - gray
  }
};

// Status badge variant function (same as AbsenceTable)
const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return 'success' as const;
    case 'PENDING':
      return 'warning' as const;
    case 'REJECTED':
      return 'destructive' as const;
    case 'CANCELLED':
      return 'secondary' as const;
    default:
      return 'default' as const;
  }
};

// Define the shape of items for the timeline (employees)
interface AbsenceTimelineItem extends TimelineItem {
  name: string;
  detail?: string; // department
}

// Define the shape of events for the timeline (absences)
interface AbsenceTimelineEvent extends TimelineEvent {
  absenceType: string;
  status: string;
}

export interface CalendarListProps extends BusinessAppContextProps {
  // Add any specific props if needed
}

const CalendarList: React.FC<CalendarListProps> = (props) => {
  const { accessToken, userInfo } = props;
  const supervisorId = userInfo?.employeeDetails?.employeeId;
  
  // Direct GraphQL query for absence data (consistent with timeline items)
  // Removed useAbsenceListDataSimple hook to use direct query data

  // Direct query to check direct reports
  const [allAbsences, setAllAbsences] = useState<any[]>([]);
  const [allAbsencesLoading, setAllAbsencesLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const graphqlClient = useGraphQLClient(accessToken);

  // Direct query to check who reports to your employee ID
  React.useEffect(() => {
    if (!accessToken || !supervisorId) return;

    const loadDirectReports = async () => {
      // TEMPORARY: Execute July 2025 analysis query
      const july2025AnalysisQuery = `
        query GetJuly2025Absences($supervisorId: uuid!) {
          EmployeeAbsence(
            where: {
              _and: [
                { employee: { employeePosition: { supervisor: { id: { _eq: $supervisorId } } } } },
                { isDeleted: { _eq: false } },
                {
                  _or: [
                    { startDate: { _gte: "2025-07-01T00:00:00.000Z", _lte: "2025-07-31T23:59:59.999Z" } },
                    { endDate: { _gte: "2025-07-01T00:00:00.000Z", _lte: "2025-07-31T23:59:59.999Z" } },
                    {
                      _and: [
                        { startDate: { _lte: "2025-07-01T00:00:00.000Z" } },
                        { endDate: { _gte: "2025-07-31T23:59:59.999Z" } }
                      ]
                    }
                  ]
                }
              ]
            }
            orderBy: { startDate: ASC }
          ) {
            id
            startDate
            endDate
            status
            effectiveDays
            employee {
              id
              firstName
              lastName
            }
            type {
              value
            }
          }
          
          EmployeeAbsenceAggregate(
            where: {
              _and: [
                { employee: { employeePosition: { supervisor: { id: { _eq: $supervisorId } } } } },
                { isDeleted: { _eq: false } },
                {
                  _or: [
                    { startDate: { _gte: "2025-07-01T00:00:00.000Z", _lte: "2025-07-31T23:59:59.999Z" } },
                    { endDate: { _gte: "2025-07-01T00:00:00.000Z", _lte: "2025-07-31T23:59:59.999Z" } },
                    {
                      _and: [
                        { startDate: { _lte: "2025-07-01T00:00:00.000Z" } },
                        { endDate: { _gte: "2025-07-31T23:59:59.999Z" } }
                      ]
                    }
                  ]
                }
              ]
            }
          ) {
            aggregate {
              count
            }
          }
        }
      `;

      try {
        console.log('🔍 EXECUTING JULY 2025 ANALYSIS QUERY...');
        const july2025Result = await graphqlClient.request(july2025AnalysisQuery, { supervisorId });
        
        const july2025Absences = july2025Result?.EmployeeAbsence || [];
        const totalCount = july2025Result?.EmployeeAbsenceAggregate?.aggregate?.count || 0;
        
        // Count by status
        const statusCounts = july2025Absences.reduce((acc: any, absence: any) => {
          acc[absence.status] = (acc[absence.status] || 0) + 1;
          return acc;
        }, {});
        
        // Check for overlapping absences per employee
        const employeeAbsences: { [employeeId: string]: any[] } = {};
        july2025Absences.forEach((absence: any) => {
          if (!employeeAbsences[absence.employee.id]) {
            employeeAbsences[absence.employee.id] = [];
          }
          employeeAbsences[absence.employee.id].push(absence);
        });
        
        const overlappingEmployees: any[] = [];
        Object.entries(employeeAbsences).forEach(([employeeId, absences]) => {
          if (absences.length > 1) {
            // Check for overlaps
            for (let i = 0; i < absences.length; i++) {
              for (let j = i + 1; j < absences.length; j++) {
                const absence1 = absences[i];
                const absence2 = absences[j];
                const start1 = new Date(absence1.startDate);
                const end1 = new Date(absence1.endDate);
                const start2 = new Date(absence2.startDate);
                const end2 = new Date(absence2.endDate);
                
                // Check if dates overlap
                if (start1 <= end2 && start2 <= end1) {
                  overlappingEmployees.push({
                    employeeId,
                    employeeName: `${absence1.employee.firstName} ${absence1.employee.lastName}`,
                    absence1: { id: absence1.id, startDate: absence1.startDate, endDate: absence1.endDate, status: absence1.status },
                    absence2: { id: absence2.id, startDate: absence2.startDate, endDate: absence2.endDate, status: absence2.status }
                  });
                }
              }
            }
          }
        });
        
        console.log('\n===========================================');
        console.log('JULY 2025 ABSENCE ANALYSIS RESULTS');
        console.log('===========================================');
        console.log(`Total Absences in July 2025: ${totalCount}`);
        console.log('\nBreakdown by Status:');
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`  ${status}: ${count}`);
        });
        console.log('\nAll July 2025 Absences:');
        july2025Absences.forEach((absence: any, index: number) => {
          console.log(`${index + 1}. ${absence.employee.firstName} ${absence.employee.lastName} - ${absence.type.value} (${absence.status})`);
          console.log(`    ${absence.startDate} to ${absence.endDate}`);
        });
        
        if (overlappingEmployees.length > 0) {
          console.log('\n⚠️  OVERLAPPING ABSENCES FOUND:');
          overlappingEmployees.forEach((overlap, index) => {
            console.log(`${index + 1}. ${overlap.employeeName} has overlapping absences:`);
            console.log(`   - Absence 1: ${overlap.absence1.startDate} to ${overlap.absence1.endDate} (${overlap.absence1.status})`);
            console.log(`   - Absence 2: ${overlap.absence2.startDate} to ${overlap.absence2.endDate} (${overlap.absence2.status})`);
          });
        } else {
          console.log('\n✅ No overlapping absences found for the same employee.');
        }
        console.log('===========================================\n');
        
      } catch (error) {
        console.error('Error executing July 2025 analysis query:', error);
      }
      setAllAbsencesLoading(true);
      try {
        // Query to get all employees who report to this supervisor (same as absence list)
        const directReportsQuery = `
          query GetDirectReports($supervisorId: uuid!) {
            Employee(
              where: {
                employeePosition: { supervisor: { id: { _eq: $supervisorId } } }
              }
              limit: 100
              orderBy: [{ firstName: ASC }, { lastName: ASC }]
            ) {
              id
              firstName
              lastName
              pictureThumbnail
              employeePosition {
                organizationalUnit {
                  name
                }
              }
            }
          }
        `;

        const directReportsResult = await graphqlClient.request(directReportsQuery, {
          supervisorId
        });

        const directReports = directReportsResult?.Employee || [];
        
        // Store direct reports data for timeline items
        setDirectReportsData(directReports);
        
        console.log('\n===========================================');
        console.log('EMPLOYEE ANALYSIS FOR YOUR ID:', supervisorId);
        console.log('===========================================\n');
        console.log('TOTAL EMPLOYEES WHO HAVE YOU AS SUPERVISOR:', directReports.length);
        console.log('\nEMPLOYEES REPORTING TO YOU:');
        directReports.forEach((employee: any, index: number) => {
          const orgUnit = employee.employeePosition?.organizationalUnit?.name || 'No Org Unit';
          console.log(`${index + 1}. ${employee.firstName} ${employee.lastName} (ID: ${employee.id}) - Org Unit: ${orgUnit}`);
        });
        console.log('\n===========================================\n');

        // Get employee IDs for absence query
        const employeeIds = directReports.map((employee: any) => employee.id);

        if (employeeIds.length > 0) {
          // Query absences using server-side filtering for July 2025 (same logic as absence list)
          const absencesQuery = `
            query GetTeamAbsences($supervisorId: uuid!) {
              EmployeeAbsence(
                where: { 
                  _and: [
                    { employee: { employeePosition: { supervisor: { id: { _eq: $supervisorId } } } } },
                    { isDeleted: { _eq: false } },
                    {
                      _and: [
                        { startDate: { _lte: "2025-07-31T23:59:59.999Z" } },
                        { endDate: { _gte: "2025-07-01T00:00:00.000Z" } }
                      ]
                    }
                  ]
                }
                limit: 1000
                orderBy: { startDate: DESC }
              ) {
                id
                startDate
                endDate
                status
                effectiveDays
                employee {
                  id
                  firstName
                  lastName
                  pictureThumbnail
                  employeePosition {
                    organizationalUnit {
                      name
                    }
                  }
                }
                type {
                  id
                  code
                  value
                  objectValue
                  parentEntryId
                }
              }
            }
          `;

          const absencesResult = await graphqlClient.request(absencesQuery, {
            supervisorId
          });

          const absences = absencesResult?.EmployeeAbsence || [];
          
          console.log('🔍 SUPERVISOR-BASED ABSENCE QUERY RESULTS:', {
            supervisorId,
            totalAbsences: absences.length,
            allAbsenceDates: absences.map((a: any) => ({
              id: a.id,
              employee: `${a.employee.firstName} ${a.employee.lastName}`,
              startDate: a.startDate,
              endDate: a.endDate,
              status: a.status,
              year: new Date(a.startDate).getFullYear()
            })),
            dateRange: {
              earliest: absences.length > 0 ? Math.min(...absences.map((a: any) => new Date(a.startDate).getTime())) : null,
              latest: absences.length > 0 ? Math.max(...absences.map((a: any) => new Date(a.endDate).getTime())) : null
            }
          });
          setAllAbsences(absences);
          

          
          console.log('📊 STRUCTURED REPORT DATA:', {
            totalDirectReports: directReports.length,
            employeesWithAbsences: new Set(absences.map((a: any) => a.employee.id)).size,
            totalAbsences: absences.length,
            absencesByStatus: absences.reduce((acc: any, absence: any) => {
              acc[absence.status] = (acc[absence.status] || 0) + 1;
              return acc;
            }, {}),
            dateRange: {
              earliest: absences.length > 0 ? Math.min(...absences.map((a: any) => new Date(a.startDate).getTime())) : null,
              latest: absences.length > 0 ? Math.max(...absences.map((a: any) => new Date(a.endDate).getTime())) : null
            }
          });
        }
      } catch (err) {
        console.error('Error loading direct reports:', err);
        setError(err instanceof Error ? err : new Error('Failed to load data'));
      } finally {
        setAllAbsencesLoading(false);
      }
    };

    loadDirectReports();
  }, [accessToken, supervisorId, graphqlClient]);

  // Store direct reports data from GraphQL query
  const [directReportsData, setDirectReportsData] = useState<any[]>([]);

  // Use the direct GraphQL query data for consistency with timeline items
  const absencesToUse = allAbsences || [];
  const loadingToUse = allAbsencesLoading;
  
  // Data loading is handled by the direct GraphQL query in useEffect above
  
      console.log('🔍 CALENDAR DATA LOADING:', {
      totalAbsences: absencesToUse.length,
      loading: loadingToUse,
      error: error?.message,
      absenceDetails: absencesToUse.slice(0, 5).map((a: any) => ({
        id: a.id,
        employee: `${a.employee.firstName} ${a.employee.lastName}`,
        employeeId: a.employee.id,
        startDate: a.startDate,
        endDate: a.endDate,
        status: a.status
      })),
      timelineItemIds: directReportsData.map((e: any) => e.id),
      absenceEmployeeIds: absencesToUse.map((a: any) => a.employee?.id).filter(Boolean),
      statusBreakdown: absencesToUse.reduce((acc: any, a: any) => {
        acc[a.status] = (acc[a.status] || 0) + 1;
        return acc;
      }, {}),
      dateRange: {
        earliest: absencesToUse.length > 0 ? Math.min(...absencesToUse.map((a: any) => new Date(a.startDate).getTime())) : null,
        latest: absencesToUse.length > 0 ? Math.max(...absencesToUse.map((a: any) => new Date(a.endDate).getTime())) : null
      }
    });

  // Transform employee data to timeline items
  const timelineItems: AbsenceTimelineItem[] = useMemo(() => {
    if (directReportsData.length === 0) return [];

    const items = directReportsData.map((employee: any) => {
      const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee';
      const orgUnit = employee.employeePosition?.organizationalUnit?.name || '';
      
      return {
        id: employee.id,
        name: employeeName,
        detail: orgUnit,
        picture: undefined
      };
    });
    
    console.log('🔍 Timeline Items Created:', {
      totalDirectReports: directReportsData.length,
      totalTimelineItems: items.length,
      itemIds: items.map(item => item.id),
      itemNames: items.map(item => item.name)
    });

    return items;
  }, [directReportsData]);

  // Transform absence data to timeline events with status-based colors
  const timelineEvents: AbsenceTimelineEvent[] = useMemo(() => {
    if (!absencesToUse || absencesToUse.length === 0 || timelineItems.length === 0) return [];

    console.log('🔍 Timeline Events Debug:', {
      totalAbsences: absencesToUse.length,
      absenceIds: absencesToUse.map((a: any) => a.id).slice(0, 10), // Show first 10
      employeeIdsInAbsences: absencesToUse.map((a: any) => a.employee?.id).filter(Boolean),
      timelineItemIds: timelineItems.map(item => item.id),
      matchingCount: absencesToUse.filter((a: any) => 
        timelineItems.some(item => item.id === a.employee?.id)
      ).length,
      statusBreakdown: absencesToUse.reduce((acc: any, a: any) => {
        acc[a.status] = (acc[a.status] || 0) + 1;
        return acc;
      }, {})
    });

    const events: AbsenceTimelineEvent[] = [];

    absencesToUse.forEach((absence: any, index: number) => {
      console.log(`🔍 Processing absence ${index + 1}:`, {
        id: absence.id,
        hasEmployee: !!absence.employee,
        employeeId: absence.employee?.id,
        hasStartDate: !!absence.startDate,
        hasEndDate: !!absence.endDate,
        startDate: absence.startDate,
        endDate: absence.endDate,
        status: absence.status,
        typeValue: absence.type.value
      });
      
      // Skip if no valid date can be determined
      if (!absence.startDate || !absence.endDate) {
        console.log(`❌ Skipping absence ${absence.id}: Missing dates`);
        return;
      }
      
      // Ensure employee ID exists for itemId
      if (!absence.employee?.id) {
        console.log(`❌ Skipping absence ${absence.id}: Missing employee ID`);
        return;
      }
      
      // Only include events for employees that have timeline items
      if (!timelineItems.some(item => item.id === absence.employee.id)) {
        console.log(`❌ Skipping absence ${absence.id}: Employee ${absence.employee.id} not in timeline items`);
        return;
      }

      // Debug: Log approved absences specifically
      if (absence.status === 'APPROVED') {
        console.log(`✅ Processing APPROVED absence: ${absence.id} for employee ${absence.employee.firstName} ${absence.employee.lastName}`, {
          startDate: absence.startDate,
          endDate: absence.endDate,
          employeeId: absence.employee.id,
          hasTimelineItem: timelineItems.some(item => item.id === absence.employee.id)
        });
      }

      // Extract icon from objectValue
      let eventIcon = '';
      try {
        const typeInfo = typeof absence.type.objectValue === 'string' 
          ? JSON.parse(absence.type.objectValue)
          : absence.type.objectValue;
        eventIcon = typeInfo?.icon || '';
      } catch (e) {
        // Ignore parsing errors, use empty icon
      }

      // Use status-based type instead of color (CalendarTimeline uses 'type' for colors)
      const eventType = getStatusType(absence.status);
      console.log(`🎨 Type for ${absence.status}: ${eventType}`);
      
      const uniqueEventId = `absence-${absence.id}`;
      
      const event: AbsenceTimelineEvent = {
        id: uniqueEventId,
        itemId: absence.employee.id,
        title: `${absence.type.value} (${absence.status})`,
        startDate: absence.startDate,
        endDate: absence.endDate,
        status: absence.status,
        type: eventType, // Use status type for CalendarTimeline color mapping
        note: `${absence.type.value} - ${absence.status}`,
        absenceType: absence.type.value,
      };

      console.log(`✅ Adding event for absence ${absence.id} with status ${absence.status} and type ${eventType}`, {
        employeeId: absence.employee.id,
        startDate: absence.startDate,
        endDate: absence.endDate,
        formattedStartDate: formatDate(absence.startDate),
        formattedEndDate: formatDate(absence.endDate)
      });
      events.push(event);
    });

    // Debug logging removed for production
    // console.log('🔍 Final timeline events:', {
    //   totalEvents: events.length,
    //   eventsByStatus: events.reduce((acc: any, event) => {
    //     acc[event.status] = (acc[event.status] || 0) + 1;
    //     return acc;
    //   }, {}),
    //   eventItemIds: events.map(e => e.itemId),
    //   timelineItemIds: timelineItems.map(item => item.id),
    //   matchingEvents: events.filter(e => timelineItems.some(item => item.id === e.itemId)).length,
    //   eventDates: events.map(e => ({
    //     id: e.id,
    //     startDate: e.startDate,
    //     endDate: e.endDate,
    //     parsedStart: new Date(e.startDate),
    //     parsedEnd: new Date(e.endDate)
    //   }))
    //     });

    console.log('🔍 Final Events Summary:', {
      eventsCreated: events.length,
      eventsByStatus: events.reduce((acc: any, event) => {
        acc[event.status] = (acc[event.status] || 0) + 1;
        return acc;
      }, {}),
      approvedEvents: events.filter(e => e.status === 'APPROVED').map(e => ({
        id: e.id,
        employeeId: e.itemId,
        startDate: e.startDate,
        endDate: e.endDate
      }))
    });

    return events;
  }, [absencesToUse, timelineItems]);

  const getInitials = (name: string): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase();
  };

  const renderDataBody = () => {
    if (loadingToUse) return <div className="gba:flex gba:justify-center gba:items-center gba:h-full"><Spinner /></div>;
    
    if (error) {
      return (
        <Alert variant="destructive" className="gba:m-4">
          <div className="gba:text-sm gba:font-medium">Error Loading Absences</div>
          <div className="gba:text-sm">{String(error)}</div>
        </Alert>
      );
    }

    if (!timelineItems.length) {
      return (
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-64 gba:text-gray-500">
          <div className="gba:text-lg gba:font-medium">No Direct Reports Found</div>
          <div className="gba:text-sm">No employees are reporting to you or no absence data available.</div>
        </div>
      );
    }

          // Debug logging removed for production
          // console.log('🎯 RENDERING CalendarTimeline with:', {
          //   itemsCount: timelineItems.length,
          //   eventsCount: timelineEvents.length,
          //   items: timelineItems.map(item => ({ id: item.id, name: item.name })),
          //   events: timelineEvents.map(event => ({ 
          //     id: event.id, 
          //     itemId: event.itemId, 
          //     title: event.title, 
          //     startDate: event.startDate,
          //     endDate: event.endDate,
          //     color: event.color,
          //     status: event.status
          //   }))
          //           });
          
          // Filter events to only show those within July 2025 (what the calendar is actually showing)
          const july2025Start = new Date('2025-07-01T00:00:00.000Z'); // July 1, 2025 UTC
          const july2025End = new Date('2025-07-31T23:59:59.999Z'); // July 31, 2025 UTC
          
          const july2025Events = timelineEvents.filter(event => {
            const eventStart = new Date(event.startDate);
            const eventEnd = new Date(event.endDate);
            
            // Event overlaps with July 2025
            const isInJuly2025 = (eventStart <= july2025End && eventEnd >= july2025Start);
            
            console.log(`🔍 Event ${event.id} (${event.status}): ${eventStart.toISOString()} - ${eventEnd.toISOString()} | In July 2025: ${isInJuly2025}`);
            
            return isInJuly2025;
          });
          
          // Calculate overlapping events count for July 2025
          const overlappingCount = july2025Events.filter(event => {
            const sameEmployeeEvents = july2025Events.filter(other => 
              other.itemId === event.itemId && other.id !== event.id
            );
            return sameEmployeeEvents.some(other => {
              const eventStart = new Date(event.startDate);
              const eventEnd = new Date(event.endDate);
              const otherStart = new Date(other.startDate);
              const otherEnd = new Date(other.endDate);
              return eventStart <= otherEnd && otherStart <= eventEnd;
            });
          }).length;
          
          console.log('🎯 JULY 2025 EVENTS ONLY:', {
            july2025EventsCount: july2025Events.length,
            july2025Range: {
              start: july2025Start.toISOString(),
              end: july2025End.toISOString()
            },
            july2025Events: july2025Events.map(event => ({ 
              id: event.id, 
              itemId: event.itemId, 
              title: event.title, 
              startDate: event.startDate,
              endDate: event.endDate,
              status: event.status,
              parsedStart: new Date(event.startDate),
              parsedEnd: new Date(event.endDate)
            })),
            july2025EventsByStatus: july2025Events.reduce((acc: any, event) => {
              acc[event.status] = (acc[event.status] || 0) + 1;
              return acc;
            }, {})
          });
          
          // Summary of the discrepancy
                  console.log('🔍 DISCREPANCY ANALYSIS:', {
          totalAbsences: timelineEvents.length,
          july2025Absences: july2025Events.length,
          countInTitle: july2025Events.length, // This should match july2025Absences
          expectedFromList: 17, // User reported seeing 17 in absence list
          expectedInCalendar: 14, // User reported seeing 14 in calendar
          actualCount: 20, // User reported count shows 20
          july2025EventsList: july2025Events.map(e => ({ id: e.id, startDate: e.startDate, endDate: e.endDate, status: e.status })),
          overlappingEvents: july2025Events.filter(e => {
            const sameEmployeeEvents = july2025Events.filter(other => 
              other.itemId === e.itemId && other.id !== e.id
            );
            return sameEmployeeEvents.some(other => {
              const eStart = new Date(e.startDate);
              const eEnd = new Date(e.endDate);
              const otherStart = new Date(other.startDate);
              const otherEnd = new Date(other.endDate);
              return eStart <= otherEnd && otherStart <= eEnd;
            });
          }).map(e => ({ id: e.id, status: e.status, priority: e.priority })),
          possibleIssues: [
            'Date filtering logic might be incorrect',
            'Timezone issues with date comparison',
            'Calendar component might be filtering differently',
            'Events might have invalid dates'
          ]
        });
          
          console.log('🎯 RENDERING CalendarTimeline with:', {
            itemsCount: timelineItems.length,
            totalEventsCount: timelineEvents.length,
            july2025EventsCount: july2025Events.length,
            july2025Range: {
              start: july2025Start.toISOString(),
              end: july2025End.toISOString()
            },
            // Detailed breakdown of events
            totalEventsByStatus: timelineEvents.reduce((acc: any, event) => {
              acc[event.status] = (acc[event.status] || 0) + 1;
              return acc;
            }, {}),
            july2025EventsByStatus: july2025Events.reduce((acc: any, event) => {
              acc[event.status] = (acc[event.status] || 0) + 1;
              return acc;
            }, {}),
            // List all events for debugging
            allEvents: timelineEvents.map((event: any) => ({ 
              id: event.id, 
              itemId: event.itemId, 
              title: event.title, 
              startDate: event.startDate,
              endDate: event.endDate,
              status: event.status,
              parsedStart: new Date(event.startDate),
              parsedEnd: new Date(event.endDate),
              isInJuly2025: new Date(event.startDate) >= july2025Start && new Date(event.endDate) <= july2025End
            })),
            july2025Events: july2025Events.map((event: any) => ({ 
              id: event.id, 
              itemId: event.itemId, 
              title: event.title, 
              startDate: event.startDate,
              endDate: event.endDate,
              status: event.status,
              parsedStart: new Date(event.startDate),
              parsedEnd: new Date(event.endDate)
            })),
            dateRange: {
              earliest: timelineEvents.length > 0 ? Math.min(...timelineEvents.map(e => new Date(e.startDate).getTime())) : null,
              latest: timelineEvents.length > 0 ? Math.max(...timelineEvents.map(e => new Date(e.endDate).getTime())) : null
            }
          });
          
          console.log('🎯 FINAL CalendarTimeline Props:', {
            title: `${getTranslationFromI18nKeyAndLabel('absence_calendar_title', 'Team Absence Calendar')} (${july2025Events.length} July 2025 absences)`,
            itemsCount: timelineItems.length,
            eventsCount: july2025Events.length,
            initialDate: new Date('2025-07-01'),
            initialViewRange: 31,
            eventsByStatus: july2025Events.reduce((acc: any, event) => {
              acc[event.status] = (acc[event.status] || 0) + 1;
              return acc;
            }, {}),

          });
          
          return (
        <CalendarTimeline<AbsenceTimelineItem, AbsenceTimelineEvent>
          title={getTranslationFromI18nKeyAndLabel('absence_calendar_title', 'Team Absence Calendar')}
          items={timelineItems}
          events={july2025Events}
          itemLabel={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')}
          searchPlaceholder="Search Employees..."
          initialDate={new Date('2025-07-01')} // Start from July 1, 2025
          initialViewRange={31} // Show 31 days
          renderItemContent={(item) => (
            <div className="gba:flex gba:items-center gba:gap-3 gba:p-2">
              <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-blue-500 gba:flex gba:items-center gba:justify-center gba:text-white gba:text-xs gba:font-medium">
                {getInitials(item.name)}
              </div>
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:text-sm gba:font-medium gba:truncate">{item.name}</div>
                {item.detail && (
                  <div className="gba:text-xs gba:text-gray-500 gba:truncate">{item.detail}</div>
                )}
              </div>
            </div>
          )}
          legendItems={statusLegend}
        />
      );
  };

  // Create status-based legend for CalendarTimeline (matching absence list colors)
  const statusLegend = [
    { label: 'Approved', color: '#10b981' }, // success variant - green
    { label: 'Pending', color: '#f59e0b' },  // warning variant - amber
    { label: 'Rejected', color: '#ef4444' }, // destructive variant - red
    { label: 'Cancelled', color: '#6b7280' } // secondary variant - gray
  ];

  return (
    <div className="gba:p-6 gba:bg-white gba:min-h-full gba:rounded-lg">
      {renderDataBody()}
    </div>
  );
};

export default CalendarList;
