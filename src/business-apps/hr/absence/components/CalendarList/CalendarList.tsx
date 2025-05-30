import React, { useEffect, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { CalendarTimeline} from '@newwork/gravity-ui-catalog';

interface EmployeeAbsence {
  id: string
  employee: {
    id: string
    lastName: string
    firstName: string
    picture: string
    employeePosition: {
      organizationalUnit: {
        name: string
      }
    }
  }
  type: {
    objectValue: string
    translations: {
      localeCode: string
      value: string
    }[]
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
        picture
        employeePosition {
          organizationalUnit {
            name
          }
        }
      }
      type {
        objectValue
        translations {
          localeCode
          value
        }
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
  const [absenceGroups, setAbsenceGroups] = useState<{ [key: string]: string }>({})

  const fetchEmployeeAbsences = async () => {
    try {
      const result = await graphQLClient.request<{ EmployeeAbsence: EmployeeAbsence[]}>(
        ABSENCE_QUERY,
        { page: 0, limit: 15 }
      )
      setEmployeeAbsences(result.EmployeeAbsence)
      console.log(employeeAbsences)
    } catch (err) {
      console.error('Error fetching absences:', err)
    }
  }

  const fetchAbsenceGroups = async () => {
    try {
      const result = await catalogClient.getCatalogEntriesList({ catalogIdentifier: 'AbsenceGroup', version: 'v1' })
      setAbsenceGroups(result.data.reduce((acc: { [key: string]: string }, entry: any) => {
        acc[entry.id] = entry.value
        return acc
      }, {}))
    } catch (err) {
      console.error('Error fetching absence groups:', err)
    }
  }

  useEffect(() => {
    fetchEmployeeAbsences()
    fetchAbsenceGroups()
  }, [graphQLClient,catalogClient])

  const legendItems = Object.entries(absenceGroups).map(([id, label]) => {
    const colorMap: Record<string, string> = {
      'Sick Leave': '#fb7185',
      'Vacation': '#34d399',   
      'Special Leave': '#a78bfa',
      'Work Leave': '#fbbf24' 
    };
    return { label, color: colorMap[label] || '#9ca3af' };
  });


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

  const timelineEvents = [];
  

  const eventIdSet = new Set();
  
  employeeAbsences.forEach(absence => {
    const eventId = `${absence.employee.id}-${absence.startDate}-${absence.endDate}-${absence.type.value}`;
    
  
    if (!eventIdSet.has(eventId)) {
      eventIdSet.add(eventId);
      
      timelineEvents.push({
        id: eventId,
        itemId: absence.employee.id,
        title: absence.type.translations[0]?.value || absence.type.value,
        startDate: new Date(absence.startDate).toISOString(),
        endDate: new Date(absence.endDate).toISOString(),
        color: legendItems.find(item => item.label === absence.type.value)?.color || '#9ca3af',
        status: absence.status,
        type: absence.type.value,
        note: absence.type.value
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
          <div className="flex items-center gap-2 p-1 w-full">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
              {getInitials(item.name)}
            </div>
            <span className="truncate flex-grow">{item.name}</span>
          </div>
        )}
      />
    </div>
  )
}

export default CalendarList;
