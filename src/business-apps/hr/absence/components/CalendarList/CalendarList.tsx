import React, { useCallback, useEffect, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { CalendarTimeline, TimelineEvent } from '@newwork/gravity-ui-catalog';

interface EmployeeAbsence {
  id: string
  employee: {
    id: string
    lastName: string
    firstName: string
    pictureThumbnail: string
    employeePosition: {
      organizationalUnit: {
        name: string
      }
    }
  }
  type: {
    objectValue: string
    id: string
    value: string
    parentEntryId: string
  }
  startDate: string
  endDate: string
  calendarDays: number
  effectiveDays: number
  status: string
}

const ABSENCE_QUERY = `
  query GetEmployeeAbsences($page: Int!, $limit: Int!, $orgUnitId: uuid) {
    EmployeeAbsence(
      offset: $page
      limit: $limit
      where: {employee: {employeePosition: {organizationalUnitId: {_eq: $orgUnitId}}}}
    ) {
      id
      startDate
      endDate
      employee {
        id
        lastName
        firstName
        pictureThumbnail
        employeePosition {
          organizationalUnit {
            name
          }
        }
      }
      type {
        objectValue
        id
        value
        parentEntryId
      }
      calendarDays
      effectiveDays
      status
    }
  }
`

const CalendarList: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
  const graphQLClient = useGraphqlClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)
  const [employeeAbsences, setEmployeeAbsences] = useState<EmployeeAbsence[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!userInfo?.employeeDetails?.organizationalUnit?.id) {
      console.error('User organization unit not found')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { EmployeeAbsence } = await graphQLClient.request<{ EmployeeAbsence: EmployeeAbsence[] }>(
        ABSENCE_QUERY,
        {
          page: 0,
          limit: 200,
          orgUnitId: userInfo.employeeDetails.organizationalUnit.id
        }
      )

      setEmployeeAbsences(EmployeeAbsence)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch absences'))
    } finally {
      setIsLoading(false)
    }
  }, [userInfo, graphQLClient])

  useEffect(() => {
    fetchData();
  }, [graphQLClient, catalogClient]);

  const typeColorMap = new Map<string, string>();
  const typeIconMap = new Map<string, string>();
  
  employeeAbsences.forEach(absence => {
    try {
      const typeInfo = typeof absence.type.objectValue === 'string' 
        ? JSON.parse(absence.type.objectValue)
        : absence.type.objectValue;
        
      if (typeInfo?.color) {
        const color = String(typeInfo.color);
        const hexColor = color.startsWith('#') ? color : `#${color}`;
        typeColorMap.set(absence.type.value, hexColor);
      }
      
      if (typeInfo?.icon) {
        typeIconMap.set(absence.type.value, String(typeInfo.icon));
      }
    } catch (e) {
      console.warn(`Failed to process objectValue for type ${absence.type.value}:`, e);
    }
  });

  const uniqueAbsenceTypes = Array.from(typeColorMap.keys());
 
  const legendItems = uniqueAbsenceTypes.map(type => ({
    label: type,
    color: typeColorMap.get(type) || '#9ca3af',
    icon: typeIconMap.get(type)
  }));

  const employeesById = new Map();
  employeeAbsences.forEach(absence => {
    const empId = absence.employee.id;
    const empName = `${absence.employee.firstName} ${absence.employee.lastName}`.trim();
    const dept = absence.employee.employeePosition?.organizationalUnit?.name || 'No Department';
    
    if (!employeesById.has(empId)) {
      employeesById.set(empId, {
        id: empId,
        name: empName,
        department: dept,
        picture: absence.employee.pictureThumbnail,
        absences: []
      });
    }
    employeesById.get(empId).absences.push({
      startDate: absence.startDate,
      endDate: absence.endDate,
      type: absence.type.value
    });
  });

 
  const timelineItems = Array.from(employeesById.values());

  const timelineEvents: TimelineEvent[] = [];
  

  const eventIdSet = new Set();
  
  employeeAbsences.forEach(absence => {
    const eventId = `${absence.employee.id}-${absence.startDate}-${absence.endDate}-${absence.type.value}`;
    
  
    if (!eventIdSet.has(eventId)) {
      eventIdSet.add(eventId);
      
      const absenceType = absence.type.value;
      const typeInfo = typeof absence.type.objectValue === 'string' 
        ? JSON.parse(absence.type.objectValue)
        : absence.type.objectValue;
      const eventIcon = typeInfo?.icon || '';
      
      timelineEvents.push({
        id: eventId,
        itemId: absence.employee.id,
        title: absenceType,
        startDate: new Date(absence.startDate).toISOString(),
        endDate: new Date(absence.endDate).toISOString(),
        color: typeColorMap.get(absenceType) || '#9ca3af',
        status: absence.status,
        type: eventIcon,
        note: absenceType
      });
    }
  });

  const getInitials = (name: string): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase();
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded">
        Error loading absences: {error.message}
      </div>
    );
  }

  return (
    <div>
      <CalendarTimeline
        items={timelineItems}
        events={timelineEvents}
        title={"Team Availability Calendar"}
        legendItems={legendItems}
        itemDetailLabel='Department'
        renderItemContent={(item) => (
          <div className="flex items-center gap-2 p-1 w-full hover:bg-gray-50 rounded">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
              {item.picture ? (
                <img 
                  src={`data:image/gif;base64,${item.picture}`} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-full h-full flex items-center justify-center text-xs text-gray-600 ${item.picture ? 'hidden' : ''}`}>
                {getInitials(item.name)}
              </div>
            </div>
            <div className="flex-grow min-w-0">
              <div className="truncate font-medium">{item.name}</div>
              <div className="text-xs text-gray-500 truncate">{item.department}</div>
            </div>
          </div>
        )}
      />
    </div>
  )
}

export default CalendarList;
