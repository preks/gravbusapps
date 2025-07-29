import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { CalendarTimeline, TimelineEvent } from '@newwork/gravity-ui-catalog';
import { Select } from 'antd';
const { Option } = Select;

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

// Query all employees from EmployeePosition table (only employees with positions)
const GetAllEmployeesFromPositions = `
  query GetAllEmployeesFromPositions {
    EmployeePosition(
      where: {
        employee: { isDeleted: { _eq: false } }
      }
      limit: 1000
    ) {
      employee {
        id
        firstName
        lastName
        pictureThumbnail
      }
      organizationalUnit {
        name
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
  const [selectedOrgUnits, setSelectedOrgUnits] = useState<string[]>(
    userInfo?.employeeDetails?.organizationalUnit?.name 
      ? [userInfo.employeeDetails.organizationalUnit.name]
      : ['--- All Departments']
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async (departments: string[] = selectedOrgUnits) => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('Fetching data for departments:', departments);
      
      // Build employee query from EmployeePosition table (only employees with positions)
      let employeesQuery;
      if (departments.includes('--- All Departments')) {
        // If "All Departments" is selected, fetch all employees
        employeesQuery = `
          query GetAllEmployeesFromPositions {
            EmployeePosition(
              where: {
                employee: { isDeleted: { _eq: false } }
              }
              limit: 1000
            ) {
              employee {
                id
                firstName
                lastName
                pictureThumbnail
              }
              organizationalUnit {
                name
              }
            }
          }
        `;
      } else {
        // Filter by selected departments using _in clause
        const departmentNames = departments.map(dept => `"${dept}"`).join(', ');
        employeesQuery = `
          query GetEmployeesByDepartments {
            EmployeePosition(
              where: {
                employee: { isDeleted: { _eq: false } }
                organizationalUnit: {
                  name: { _in: [${departmentNames}] }
                }
              }
              limit: 1000
            ) {
              employee {
                id
                firstName
                lastName
                pictureThumbnail
              }
              organizationalUnit {
                name
              }
            }
          }
        `;
      }

      // Fetch employees from EmployeePosition table
      const employeeResult = await graphQLClient.request(employeesQuery);
      const employeePositions = employeeResult?.EmployeePosition || [];
      
      // Transform EmployeePosition data to Employee format with org unit info
      const employees = employeePositions.map((position: any) => ({
        id: position.employee.id,
        firstName: position.employee.firstName,
        lastName: position.employee.lastName,
        pictureThumbnail: position.employee.pictureThumbnail,
        employeePosition: {
          organizationalUnit: {
            name: position.organizationalUnit.name
          }
        }
      }));
      
      setAllEmployees(employees);
      console.log('=== EMPLOYEE DATA DEBUG ===');
      console.log('Total employee positions fetched:', employeePositions.length);
      console.log('Total employees extracted:', employees.length);
      console.log('Sample employee data:', employees.slice(0, 3));
      console.log('All employees now have position data: 100%');
      console.log('============================');
      
      // Build absence query filtered by employee IDs
      let absenceQuery = ABSENCE_QUERY_2025;
      if (employees.length > 0) {
        const employeeIds = employees.map((emp: any) => `"${emp.id}"`).join(', ');
        absenceQuery = `
          query GetAbsencesForEmployees {
            EmployeeAbsence(
              where: {
                _and: [
                  { isDeleted: { _eq: false } },
                  { employee: { id: { _in: [${employeeIds}] } } },
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
      }

      // Fetch absences for the filtered employees
      const absenceResult = await graphQLClient.request(absenceQuery);
      const absences = absenceResult?.EmployeeAbsence || [];
      setEmployeeAbsences(absences);
      console.log('Fetched absences for employees:', absences.length);
      
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch data'))
    } finally {
      setIsLoading(false)
    }
  }, [graphQLClient, selectedOrgUnits])

  useEffect(() => {
    if (accessToken) {
      fetchData();
    }
  }, [accessToken, selectedOrgUnits, fetchData]);

  // Extract organizational units from ALL company employees (for filter options)
  useEffect(() => {
    const fetchAllOrgUnits = async () => {
      if (!accessToken) return;
      
      try {
        // Always fetch ALL employees to get complete org unit list for filter
        const result = await graphQLClient.request(GetAllEmployeesFromPositions);
        const allEmployeePositions = result?.EmployeePosition || [];
        
        const orgUnitsMap = new Map<string, { id: string; name: string }>();
        
        allEmployeePositions.forEach((position: any) => {
          if (position.organizationalUnit?.name) {
            const orgUnitName = position.organizationalUnit.name;
            orgUnitsMap.set(orgUnitName, {
              id: orgUnitName, // Use name as id since we only have name
              name: orgUnitName
            });
          }
        });

        const uniqueOrgUnits = Array.from(orgUnitsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        console.log('=== ORGANIZATIONAL UNITS DEBUG ===');
        console.log('Total employee positions found:', allEmployeePositions.length);
        console.log('Unique org units found:', uniqueOrgUnits.length);
        console.log('Org units:', uniqueOrgUnits.map(org => org.name));
        console.log('====================================');
        setOrganizationalUnits(uniqueOrgUnits);
      } catch (error) {
        console.error('Error fetching organizational units:', error);
      }
    };

    fetchAllOrgUnits();
  }, [accessToken, graphQLClient]);



  // Create timeline items for ALL employees (data is already filtered server-side)
  const timelineItems = useMemo(() => {
    console.log('Creating timeline items for employees:', allEmployees.length);
    
    return allEmployees.map(employee => {
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
  }, [allEmployees]);

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

  // Create timeline events from absences (data is already filtered server-side)
  const timelineEvents = useMemo(() => {
    console.log('Creating timeline events for absences:', employeeAbsences.length);
    
    const events: any[] = [];
    const eventIdSet = new Set();
    
    employeeAbsences.forEach(absence => {
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
  }, [employeeAbsences]);

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
      {/* Department Filter positioned next to calendar header */}
      <div className="gba:absolute gba:top-2 gba:right-2 gba:z-20 gba:w-64">
        <Select
          value={selectedOrgUnits}
          mode="multiple"
          onChange={(values: any) => {
            console.log('=== MULTI-SELECT DEBUG ===');
            console.log('Selected values:', values);
            console.log('==============================');
            
            // Handle multi-select with "All Departments" as exclusive
            if (!values || values.length === 0) {
              // If nothing selected, default to "All Departments"
              setSelectedOrgUnits(['--- All Departments']);
              return;
            }
            
            // Check if "All Departments" is being selected
            const allDepartmentsSelected = values.includes('--- All Departments');
            
            if (allDepartmentsSelected) {
              // "All Departments" is exclusive - clear other selections
              console.log('All Departments selected - clearing other selections');
              setSelectedOrgUnits(['--- All Departments']);
            } else {
              // Regular multi-select behavior
              console.log('Setting selected departments:', values);
              setSelectedOrgUnits(values);
            }
          }}
          onClear={() => {
            console.log('=== CLEAR BUTTON CLICKED ===');
            console.log('Setting to All Departments');
            setSelectedOrgUnits(['--- All Departments']);
          }}
          placeholder="Filter by Department"
          disabled={isLoading}
          allowClear
          style={{ width: '100%' }}
          data-testid="calendar-department-filter"
        >
          <Option key="all" value="--- All Departments">--- All Departments</Option>
          {organizationalUnits
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(org => (
              <Option key={org.id} value={org.name}>{org.name}</Option>
            ))}
        </Select>
      </div>

      {/* Calendar Timeline - Always visible */}
      <CalendarTimeline
        key={selectedOrgUnits.join(',') || 'all'} // Force re-render on filter change
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
        Employees: {timelineItems.length} | Events: {timelineEvents.length} | Depts: {selectedOrgUnits.join(', ') || 'All'}
      </div>
    </div>
  )
}

export default CalendarList;
