import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { CalendarTimeline, TimelineEvent, Select } from '@newwork/gravity-ui-catalog';
import type { SelectProps } from '@newwork/gravity-ui-catalog';

interface EmployeeAbsence {
  id: string
  employee: {
    id: string
    lastName: string
    firstName: string
    pictureThumbnail: string
    employeePosition: {
      organizationalUnit: {
        id: string
        name: string
      } | null
    } | null
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

interface OrganizationalUnit {
  id: string;
  name: string;
}

const CalendarList: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const graphQLClient = useGraphqlClient(accessToken)
  const [employeeAbsences, setEmployeeAbsences] = useState<EmployeeAbsence[]>([])
  const [organizationalUnits, setOrganizationalUnits] = useState<OrganizationalUnit[]>([])
  const [selectedOrgUnit, setSelectedOrgUnit] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const extractOrgUnits = useCallback((absences: EmployeeAbsence[]): OrganizationalUnit[] => {
    const orgUnitsMap = new Map<string, OrganizationalUnit>();
    
    absences.forEach(absence => {
      const orgUnit = absence.employee?.employeePosition?.organizationalUnit;
      if (orgUnit?.name) {
        orgUnitsMap.set(orgUnit.name, {
          id: orgUnit.name,
          name: orgUnit.name
        });
      }
    });

    return Array.from(orgUnitsMap.values());
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { EmployeeAbsence } = await graphQLClient.request<{ EmployeeAbsence: EmployeeAbsence[] }>(
        ABSENCE_QUERY,
        {
          page: 0,
          limit: 200,
        }
      )

      const orgUnits = extractOrgUnits(EmployeeAbsence);
      setOrganizationalUnits(orgUnits);
      
      if (orgUnits.length > 0 && !selectedOrgUnit) {
        setSelectedOrgUnit(orgUnits[0].id);
      }

      setEmployeeAbsences(EmployeeAbsence)
    } catch (err) {
      console.error('Error fetching employee absences:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch employee absences'))
    } finally {
      setIsLoading(false)
    }
  }, [graphQLClient, extractOrgUnits, selectedOrgUnit])

  const handleOrgUnitChange: SelectProps['onChange'] = (field) => {
    if (field && typeof field === 'object' && 'value' in field) {
      setSelectedOrgUnit(field.value as string);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAbsences = useMemo(() => {
    if (!selectedOrgUnit) return employeeAbsences;
    return employeeAbsences.filter(
      absence => absence.employee?.employeePosition?.organizationalUnit?.name === selectedOrgUnit
    );
  }, [employeeAbsences, selectedOrgUnit]);

  const typeColorMap = new Map<string, string>();
  const typeIconMap = new Map<string, string>();
  
  filteredAbsences.forEach(absence => {
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
  filteredAbsences.forEach(absence => {
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
  
  filteredAbsences.forEach(absence => {
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
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-t-2 gba:border-b-2 gba:border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:p-4 gba:text-red-600 gba:bg-red-50 gba:rounded">
        Error loading absences: {error.message}
      </div>
    );
  }

  if (isLoading && employeeAbsences.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-t-2 gba:border-b-2 gba:border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4">
      <div className="gba:flex gba:items-center gba:flex-start gba:mb-4">
        <h2 className="gba:text-lg gba:font-semibold">Filter by Department</h2>
        {organizationalUnits.length > 0 && (
          <div className="gba:w-64">
            <Select
              name="orgUnit"
              value={selectedOrgUnit || ''}
              onChange={handleOrgUnitChange}
              placeholder="Select Organization Unit"
              disabled={isLoading}
              data={organizationalUnits.map(org => ({
                id: org.id,
                name: org.name,
                value: org.id,
                label: org.name
              })) as any} 
            />
          </div>
        )}
      </div>
      <CalendarTimeline
        items={timelineItems}
        events={timelineEvents}
        title=""
        legendItems={legendItems}
        itemDetailLabel='Department'
        renderItemContent={(item) => (
          <div className="gba:flex gba:items-center gba:gap-2 gba:p-1 gba:w-full gba:hover:bg-gray-50 gba:rounded">
            <div className="gba:w-6 gba:h-6 gba:rounded-full gba:bg-gray-100 gba:flex-shrink-0 gba:overflow-hidden">
              {item.picture ? (
                <img 
                  src={`data:image/gif;base64,${item.picture}`} 
                  alt={getInitials(item.name)}
                  className="gba:w-full gba:h-full gba:object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('gba:hidden');
                  }}
                />
              ) : null}
              <div className={`gba:w-full gba:h-full gba:flex gba:items-center gba:justify-center gba:bg-blue-100 gba:text-blue-700 gba:text-xs gba:font-medium ${item.picture ? 'gba:hidden' : ''}`}>
                {getInitials(item.name)}
              </div>
            </div>
            <div className="gba:flex-grow gba:min-w-0">
              <div className="gba:truncate gba:font-medium">{item.name}</div>
              <div className="gba:text-xs gba:text-gray-500 gba:truncate">{item.department}</div>
            </div>
          </div>
        )}
      />
    </div>
  )
}

export default CalendarList;
