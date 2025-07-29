import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { CalendarTimeline, TimelineEvent, Select } from '@newwork/gravity-ui-catalog';

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

// Query all 2025 absences (like manager-absences does)
const ABSENCE_QUERY_2025 = `
  query GetAllAbsences2025 {
    EmployeeAbsence(
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          {
            _or: [
              { startDate: { _gte: "2025-01-01T00:00:00.000Z", _lte: "2025-12-31T23:59:59.999Z" } },
              { endDate: { _gte: "2025-01-01T00:00:00.000Z", _lte: "2025-12-31T23:59:59.999Z" } },
              {
                _and: [
                  { startDate: { _lte: "2025-01-01T00:00:00.000Z" } },
                  { endDate: { _gte: "2025-12-31T23:59:59.999Z" } }
                ]
              }
            ]
          }
        ]
      }
      limit: 1000
      orderBy: { startDate: ASC }
    ) {
      id
      startDate
      endDate
      status
      employee {
        id
        lastName
        firstName
        pictureThumbnail
        employeePosition {
          organizationalUnit {
            id
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
    }
  }
`;

// Query all employees in company - EXACT copy from working manager-absences
const GetAllEmployees = `
  query GetAllEmployees {
    Employee(
      where: {
        isDeleted: { _eq: false }
      }
      limit: 1000
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

interface OrganizationalUnit {
  id: string;
  name: string;
}

const CalendarList: React.FC<BusinessAppContextProps> = ({ accessToken, userInfo }) => {
  const graphQLClient = useGraphQLClient(accessToken)
  const [employeeAbsences, setEmployeeAbsences] = useState<EmployeeAbsence[]>([])
  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [organizationalUnits, setOrganizationalUnits] = useState<OrganizationalUnit[]>([])
  const [selectedOrgUnit, setSelectedOrgUnit] = useState<string | null>(
    userInfo?.employeeDetails?.organizationalUnit?.name || null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchAbsencesFor2025 = useCallback(async () => {
    try {
      const result = await graphQLClient.request(ABSENCE_QUERY_2025);
      const absences = result?.EmployeeAbsence || [];
      setEmployeeAbsences(absences);
      console.log('Fetched 2025 absences:', absences.length);
    } catch (error) {
      console.error('Error fetching 2025 absences:', error);
      throw error;
    }
  }, [graphQLClient]);

  const fetchAllEmployees = useCallback(async () => {
    try {
      const result = await graphQLClient.request(GetAllEmployees);
      const employees = result?.Employee || [];
      setAllEmployees(employees);
      console.log('Fetched all employees:', employees.length);
    } catch (error) {
      console.error('Error fetching all employees:', error);
      throw error;
    }
  }, [graphQLClient]);

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      await Promise.all([
        fetchAbsencesFor2025(),
        fetchAllEmployees()
      ]);
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch data'))
    } finally {
      setIsLoading(false)
    }
  }, [fetchAbsencesFor2025, fetchAllEmployees])

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extract organizational units from all employees
  useEffect(() => {
    if (allEmployees.length > 0) {
      const orgUnitsMap = new Map<string, { id: string; name: string }>();
      
      allEmployees.forEach((employee: any) => {
        if (employee.employeePosition?.organizationalUnit?.name) {
          const orgUnitName = employee.employeePosition.organizationalUnit.name;
          orgUnitsMap.set(orgUnitName, {
            id: orgUnitName, // Use name as id since we only have name
            name: orgUnitName
          });
        }
      });

      const uniqueOrgUnits = Array.from(orgUnitsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      setOrganizationalUnits(uniqueOrgUnits);
    }
  }, [allEmployees]);



  // Filter employees based on selected department
  const filteredEmployees = useMemo(() => {
    console.log('Filtering employees:', { selectedOrgUnit, totalEmployees: allEmployees.length });
    
    if (!selectedOrgUnit) {
      console.log('No filter selected - showing all employees:', allEmployees.length);
      return allEmployees; // Show all employees when no filter
    }
    
    const filtered = allEmployees.filter(
      employee => employee.employeePosition?.organizationalUnit?.name === selectedOrgUnit
    );
    
    console.log(`Filtered to department "${selectedOrgUnit}":`, filtered.length, 'employees');
    return filtered;
  }, [allEmployees, selectedOrgUnit]);

  // Create timeline items for ALL filtered employees (whether they have absences or not)
  const timelineItems = useMemo(() => {
    return filteredEmployees.map(employee => {
      const empId = employee.id;
      const empName = `${employee.firstName} ${employee.lastName}`.trim();
      const dept = employee.employeePosition?.organizationalUnit?.name || 'No Department';
      
      return {
        id: empId,
        name: empName,
        department: dept,
        picture: employee.pictureThumbnail
      };
    });
  }, [filteredEmployees]);

  // Status color mapping (like manager-absences)
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

  // Status type mapping (like manager-absences)
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

  // Create timeline events from absences for filtered employees
  const timelineEvents = useMemo(() => {
    const filteredEmployeeIds = new Set(filteredEmployees.map(emp => emp.id));
    
    const events: any[] = [];
    const eventIdSet = new Set();
    
    employeeAbsences.forEach(absence => {
      // Only include absences for filtered employees
      if (!filteredEmployeeIds.has(absence.employee.id)) return;
      
      const eventId = `${absence.employee.id}-${absence.startDate}-${absence.endDate}-${absence.type.value}`;
      
      if (!eventIdSet.has(eventId)) {
        eventIdSet.add(eventId);
        
        const absenceType = absence.type.value;
        let typeIcon = '';
        
        try {
          const typeInfo = typeof absence.type.objectValue === 'string' 
            ? JSON.parse(absence.type.objectValue)
            : absence.type.objectValue;
            
          if (typeInfo?.icon) {
            typeIcon = String(typeInfo.icon);
          }
        } catch (e) {
          console.warn(`Failed to process objectValue for type ${absence.type.value}:`, e);
        }
        
        events.push({
          id: eventId,
          itemId: absence.employee.id,
          title: absenceType,
          startDate: new Date(absence.startDate).toISOString(),
          endDate: new Date(absence.endDate).toISOString(),
          color: getStatusColor(absence.status), // Use STATUS color, not type color
          status: absence.status,
          type: getStatusType(absence.status), // Use STATUS type for CalendarTimeline
          note: absenceType
        });
      }
    });

    return events;
  }, [employeeAbsences, filteredEmployees]);

  // Create status-based legend (like manager-absences)
  const legendItems = [
    { label: 'Approved', color: '#10b981' }, // success variant - green
    { label: 'Pending', color: '#f59e0b' },  // warning variant - amber
    { label: 'Rejected', color: '#ef4444' }, // destructive variant - red
    { label: 'Cancelled', color: '#6b7280' } // secondary variant - gray
  ];

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

  return (
    <div className="gba:relative" data-testid="calendar-list-content">
      {/* Department Filter Toolbar */}
      <div className="gba:mb-4 gba:flex gba:items-center gba:gap-4">
        <div className="gba:w-64">
          <Select
            name="department"
            value={selectedOrgUnit || ''}
            onChange={(value: any) => {
              console.log('=== COMPLETE SELECT DEBUG ===');
              console.log('typeof value:', typeof value);
              console.log('value:', JSON.stringify(value, null, 2));
              console.log('Object.keys(value):', Object.keys(value || {}));
              console.log('==============================');
              
              // For now, let's handle it differently based on what we actually get
              if (typeof value === 'string') {
                if (value === '' || value === 'all') {
                  console.log('String: Setting to All Departments (null)');
                  setSelectedOrgUnit(null);
                } else {
                  console.log('String: Setting to department:', value);
                  setSelectedOrgUnit(value);
                }
              } else if (value && typeof value === 'object') {
                // Handle different object structures
                const selectedValue = value.value || value.name || value.id || value.label;
                if (selectedValue === '' || selectedValue === 'all' || selectedValue === 'All Departments') {
                  console.log('Object: Setting to All Departments (null)');
                  setSelectedOrgUnit(null);
                } else {
                  console.log('Object: Setting to department:', selectedValue);
                  setSelectedOrgUnit(selectedValue);
                }
              }
            }}
            onClear={() => {
              setSelectedOrgUnit(null);
            }}
            placeholder="Filter by Department"
            disabled={isLoading}
            showSearch={false}
            data={[
              { id: 'all', name: 'All Departments', label: 'All Departments' },
              ...organizationalUnits.map(org => ({
                id: org.id,
                name: org.name,
                label: org.name
              }))
            ]}
            data-testid="calendar-department-filter"
          />
        </div>
      </div>

      {/* Calendar Timeline - Always visible */}
      <CalendarTimeline
        key={selectedOrgUnit || 'all'} // Force re-render on filter change
        items={timelineItems}
        events={timelineEvents}
        title=""
        legendItems={legendItems}
        itemDetailLabel='Department'
        initialDate={new Date('2025-07-01')}
        initialViewRange={31}
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

      {/* Debug Info */}
      <div className="gba:absolute gba:bottom-4 gba:right-4 gba:bg-black gba:bg-opacity-75 gba:text-white gba:p-2 gba:rounded gba:text-xs gba:z-10">
        Employees: {timelineItems.length} | Events: {timelineEvents.length} | Dept: {selectedOrgUnit || 'All'}
      </div>
    </div>
  )
}

export default CalendarList;
