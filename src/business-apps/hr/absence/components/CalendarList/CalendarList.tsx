import React, { useEffect, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { CalendarTimeline, TimelineEvent} from '@newwork/gravity-ui-catalog';

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
    query GetEmployeeAbsences($page: Int!, $limit: Int!) {
    EmployeeAbsence(
      offset: $page
      limit: $limit
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


const CalendarList: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const graphQLClient = useGraphqlClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)
  const [employeeAbsences, setEmployeeAbsences] = useState<EmployeeAbsence[]>([])

  const fetchData = async () => {
    try {

      const { EmployeeAbsence } = await graphQLClient.request<{ EmployeeAbsence: EmployeeAbsence[] }>(
        ABSENCE_QUERY,
        { page: 0, limit: 10 }
      );

      setEmployeeAbsences(EmployeeAbsence);
      
      console.log('Fetched employee absences:', EmployeeAbsence);
      
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

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

  console.log("legendItems", legendItems);
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

  return (
    <div>
      <CalendarTimeline
        items={timelineItems}
        events={timelineEvents}
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
