import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext';
import { useGraphQLClient } from '../../../../../../../../../common/network/graphql/useGraphQLClient';
import { CalendarTimeline } from '@newwork/gravity-ui-catalog';
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

interface OrganizationalUnit {
  id: string
  name: string
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  employeePosition: {
    organizationalUnit: {
      name: string
    }
  }
}

interface EmployeePositionResponse {
  EmployeePosition: Array<{
    employee: {
      id: string
      firstName: string
      lastName: string
      pictureThumbnail?: string
    }
    organizationalUnit: {
      name: string
    }
  }>
}



interface AbsenceResponse {
  EmployeeAbsence: EmployeeAbsence[]
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



// Query all employees from EmployeePosition table (only employees with positions) - for org units
const getGetAllEmployeesFromPositionsQuery = (currentDate: string) => `
  query GetAllEmployeesFromPositions {
    EmployeePosition(
      where: {
        _and: [
          { employee: { isDeleted: { _eq: false } } },
          { 
            _or: [
              { exitDate: { _isNull: true } },
              { exitDate: { _gte: "${currentDate}" } }
            ]
          }
        ]
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
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
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
      console.log('=== ENHANCED FETCH START ===');
      console.log('Fetching data for departments:', departments);
      
      // Step 1: Fetch employees from EmployeePosition table (ensures department data)
      let employeesQuery;
      if (departments.includes('--- All Departments')) {
        // If "All Departments" is selected, fetch all employees
        const currentDate = new Date().toISOString();
        employeesQuery = `
          query GetAllEmployeesFromPositions {
            EmployeePosition(
              where: {
                _and: [
                  { employee: { isDeleted: { _eq: false } } },
                  { 
                    _or: [
                      { exitDate: { _isNull: true } },
                      { exitDate: { _gte: "${currentDate}" } }
                    ]
                  }
                ]
              }
              limit: 1000
              orderBy: { employee: { lastName: ASC } }
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
        const currentDate = new Date().toISOString();
        const departmentNames = departments.map(dept => `"${dept}"`).join(', ');
        
        console.log('🎯 DEPARTMENT FILTERING DEBUG:', {
          selectedDepartments: departments,
          departmentNamesForQuery: departmentNames,
          queryType: 'GetEmployeesByDepartments'
        });
        
        employeesQuery = `
          query GetEmployeesByDepartments {
            EmployeePosition(
              where: {
                _and: [
                  { employee: { isDeleted: { _eq: false } } },
                  { 
                    _or: [
                      { exitDate: { _isNull: true } },
                      { exitDate: { _gte: "${currentDate}" } }
                    ]
                  },
                  { organizationalUnit: { name: { _in: [${departmentNames}] } } }
                ]
              }
              limit: 1000
              orderBy: { employee: { lastName: ASC } }
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
      const employeeResult = await graphQLClient.request<EmployeePositionResponse>(employeesQuery);
      const employeePositions = employeeResult?.EmployeePosition || [];
      
      // Transform EmployeePosition data to Employee format with org unit info
      const employees: Employee[] = employeePositions.map((position) => ({
        id: position.employee.id,
        firstName: position.employee.firstName,
        lastName: position.employee.lastName,
        pictureThumbnail: position.employee.pictureThumbnail || '',
        employeePosition: {
          organizationalUnit: {
            name: position.organizationalUnit.name
          }
        }
      }));
      
      setAllEmployees(employees);
      console.log('=== EMPLOYEE DATA DEBUG ===');
      console.log('Selected departments for filtering:', departments);
      console.log('Total employee positions fetched:', employeePositions.length);
      console.log('Total employees extracted:', employees.length);
      console.log('Sample employee data:', employees.slice(0, 3));
      console.log('All employees have position data: 100%');
      
      // Debug: Show department distribution
      const deptDistribution = employees.reduce((acc: Record<string, number>, emp) => {
        const dept = emp.employeePosition?.organizationalUnit?.name || 'No Department';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});
      console.log('Department distribution in fetched employees:', deptDistribution);
      console.log('============================');
      
      // Step 2: Fetch 2025 absences for these employees using proper schema structure
      let absenceQuery = ABSENCE_QUERY_2025;
      if (employees.length > 0) {
        const employeeIds = employees.map((emp) => `"${emp.id}"`).join(', ');
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
      const absenceResult = await graphQLClient.request<AbsenceResponse>(absenceQuery);
      const absences = absenceResult?.EmployeeAbsence || [];
      setEmployeeAbsences(absences);
      
      console.log('=== ENHANCED FETCH COMPLETE ===');
      console.log('Input departments:', departments);
      console.log('Total employees fetched:', employees.length);
      console.log('Total absences fetched:', absences.length);
      console.log('Sample absence data:', absences.slice(0, 2));
      console.log('✅ Enhanced 2-step fetch successful!');
      console.log('🎯 Expected behavior: Calendar should now show ONLY employees and absences from selected departments');
      console.log('============================');
    
    } catch (err) {
      console.error('Error in enhanced fetch:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch data'))
    } finally {
      setIsLoading(false)
    }
  }, [graphQLClient, selectedOrgUnits])

  useEffect(() => {
    console.log('🔄 DEPARTMENT FILTER TRIGGER:', {
      accessToken: !!accessToken,
      selectedOrgUnits,
      triggerReason: 'useEffect dependency change'
    });
    
    if (accessToken) {
      console.log('🚀 CALLING fetchData() due to department change...');
      fetchData();
    }
  }, [accessToken, selectedOrgUnits, fetchData]);

  // Extract organizational units from ALL company employees (for filter options)
  useEffect(() => {
    const fetchAllOrgUnits = async () => {
      if (!accessToken) return;
      
      try {
        // Always fetch ALL employees to get complete org unit list for filter
        const currentDate = new Date().toISOString();
      const getAllEmployeesQuery = getGetAllEmployeesFromPositionsQuery(currentDate);
      const result = await graphQLClient.request<EmployeePositionResponse>(getAllEmployeesQuery);
        const allEmployeePositions = result?.EmployeePosition || [];
        
        const orgUnitsMap = new Map<string, OrganizationalUnit>();
        
        allEmployeePositions.forEach((position) => {
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
      
      // Debug: Check for Paul specifically
      const paulPositions = allEmployeePositions.filter(pos => 
        pos.employee.firstName?.toLowerCase().includes('paul') || 
        pos.employee.lastName?.toLowerCase().includes('paul')
      );
      console.log('🔍 Paul Debug in Calendar (with exitDate filter):', {
        currentDateFilter: currentDate,
        foundPaulPositions: paulPositions.length,
        paulDetails: paulPositions.map(pos => ({
          name: `${pos.employee.firstName} ${pos.employee.lastName}`,
          orgUnit: pos.organizationalUnit?.name || 'No Org Unit',
          employeeId: pos.employee.id
        })),
        filteringLogic: 'exitDate IS NULL OR exitDate >= currentDate',
        note: 'If Paul has exitDate set but in the future, he should appear. If exitDate is in the past, he will be filtered out.'
      });

      // DETAILED Paul investigation - check ALL positions without filters
      console.log('🔍 INVESTIGATING PAUL - Running unfiltered query to check his exit date...');
      
      const paulInvestigationQuery = `
        query InvestigatePaul {
          EmployeePosition(
            where: {
              employee: {
                _or: [
                  { firstName: { _ilike: "%paul%" } },
                  { lastName: { _ilike: "%paul%" } }
                ]
              }
            }
          ) {
            id
            exitDate
            employee {
              id
              firstName
              lastName
            }
            organizationalUnit {
              id
              name
            }
          }
        }
      `;
      
      try {
        const paulResult = await graphQLClient.request<any>(paulInvestigationQuery);
        console.log('🔍 PAUL INVESTIGATION RESULTS:', {
          totalPaulPositions: paulResult?.EmployeePosition?.length || 0,
          paulPositions: paulResult?.EmployeePosition?.map((pos: any) => ({
            positionId: pos.id,
            employeeName: `${pos.employee.firstName} ${pos.employee.lastName}`,
            employeeId: pos.employee.id,
            organizationalUnit: pos.organizationalUnit?.name || 'No Org Unit',
            exitDate: pos.exitDate, // THIS IS THE KEY FIELD
            hasExitDate: !!pos.exitDate,
            exitDateStatus: pos.exitDate ? (new Date(pos.exitDate) > new Date() ? 'FUTURE' : 'PAST') : 'NO_EXIT_DATE'
          })) || []
        });
      } catch (error) {
        console.error('🔍 Paul investigation failed:', error);
      }
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
    console.log('🗓️ TIMELINE ITEMS CREATION:', {
      employeeCount: allEmployees.length,
      selectedDepartments: selectedOrgUnits,
      triggerReason: 'allEmployees dependency change'
    });
    
    const items = allEmployees.map(employee => {
      const empId = employee.id;
      const empName = `${employee.firstName} ${employee.lastName}`.trim();
      // employeePosition is a single active position (filtered at query level)
      const dept = employee.employeePosition?.organizationalUnit?.name || 'No Department';
      
      return {
        id: empId,
        name: empName,
        department: dept,
        picture: employee.pictureThumbnail
      };
    });
    
    console.log('✅ Timeline items created:', items.length);
    return items;
  }, [allEmployees, selectedOrgUnits]);

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
    console.log('📅 TIMELINE EVENTS CREATION:', {
      absenceCount: employeeAbsences.length,
      selectedDepartments: selectedOrgUnits,
      triggerReason: 'employeeAbsences dependency change'
    });
    
    const events: any[] = [];
    const eventIdSet = new Set();
    
    // Debug: Show absence distribution by employee and department
    const absenceByDept = employeeAbsences.reduce((acc: Record<string, number>, absence) => {
      const dept = absence.employee?.employeePosition?.organizationalUnit?.name || 'No Department';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    console.log('Absences by department:', absenceByDept);
    
    employeeAbsences.forEach(absence => {
      const eventId = `${absence.employee.id}-${absence.startDate}-${absence.endDate}-${absence.type.value}`;
      
      if (!eventIdSet.has(eventId)) {
        eventIdSet.add(eventId);
        
        const absenceType = absence.type.value;
        
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

    console.log('✅ Timeline events created:', events.length);
    return events;
  }, [employeeAbsences, selectedOrgUnits]);

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
          onChange={(values: string[]) => {
            console.log('=== MULTI-SELECT DEBUG ===');
            console.log('Selected values:', values);
            console.log('Type of values:', typeof values);
            console.log('Is array:', Array.isArray(values));
            console.log('Available org units:', organizationalUnits.map(org => org.name));
            console.log('Current selected:', selectedOrgUnits);
            console.log('==============================');
            
            // Handle edge cases from Ant Design Select
            if (!values || values.length === 0) {
              // If nothing selected, default to "All Departments"
              console.log('Empty selection - setting to All Departments');
              setSelectedOrgUnits(['--- All Departments']);
              return;
            }
            
            // Filter out invalid values that might come from clear operations
            const validValues = values.filter(value => 
              value && 
              typeof value === 'string' && 
              value !== 'department' && 
              value.trim() !== ''
            );
            
            if (validValues.length === 0) {
              console.log('No valid values - setting to All Departments');
              setSelectedOrgUnits(['--- All Departments']);
              return;
            }
            
            // Analyze current state vs new selection to understand user intent
            const currentState = selectedOrgUnits;
            const newSelection = validValues;
            
            const currentHasAllDepartments = currentState.includes('--- All Departments');
            const newHasAllDepartments = newSelection.includes('--- All Departments');
            const specificDepartmentsInNew = newSelection.filter(val => val !== '--- All Departments');
            
            console.log('=== SELECTION ANALYSIS ===');
            console.log('Current state:', currentState);
            console.log('New selection:', newSelection);
            console.log('Current has All Departments:', currentHasAllDepartments);
            console.log('New has All Departments:', newHasAllDepartments);
            console.log('Specific departments in new:', specificDepartmentsInNew);
            console.log('========================');
            
            if (currentHasAllDepartments && newHasAllDepartments && specificDepartmentsInNew.length > 0) {
              // User had "All Departments" and clicked on a specific department
              // Ant Design gives us both, but user intent is to switch to specific department
              console.log('🎯 Auto-removing All Departments - user clicked specific department');
              setSelectedOrgUnits(specificDepartmentsInNew);
            } else if (newHasAllDepartments && !currentHasAllDepartments) {
              // User explicitly clicked "All Departments" - clear others
              console.log('All Departments explicitly selected - clearing other selections');
              setSelectedOrgUnits(['--- All Departments']);
            } else if (newHasAllDepartments && specificDepartmentsInNew.length === 0) {
              // Only "All Departments" in new selection
              console.log('Only All Departments selected');
              setSelectedOrgUnits(['--- All Departments']);
            } else {
              // Regular multi-select behavior (no "All Departments" involved)
              console.log('Regular multi-select - setting departments:', validValues);
              setSelectedOrgUnits(validValues);
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
        key={selectedOrgUnits.join(',') || 'all'}
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
