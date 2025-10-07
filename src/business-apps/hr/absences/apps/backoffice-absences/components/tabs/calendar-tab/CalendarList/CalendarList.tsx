import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext';
import { useGraphQLClient } from '../../../../../../../../../common/network/graphql/useGraphQLClient';
import { CalendarTimeline } from '@newwork/gravity-ui-catalog';
import { Select } from 'antd';
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '../../../../../../../../../common/utils/windowUtils';
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
    translations?: {
      localeCode: string
      value: string
    }[]
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
        translations {
          localeCode
          value
        }
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
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US';
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

  // Helper function to get translated absence type name
  const getAbsenceTypeName = (type: EmployeeAbsence['type'], locale = userLocale): string => {
    const translation = type.translations?.find((t) => t.localeCode === locale);
    return translation?.value || type.value || type.objectValue || 'Unknown Type';
  };

      const fetchData = useCallback(async (departments: string[] = selectedOrgUnits) => {
    setIsLoading(true)
    setError(null)

    try {
      
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
                translations {
                  localeCode
                  value
                }
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
    
    } catch (err) {
      console.error('Error in enhanced fetch:', err)
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
        setOrganizationalUnits(uniqueOrgUnits);
      } catch (error) {
        console.error('Error fetching organizational units:', error);
      }
    };

    fetchAllOrgUnits();
  }, [accessToken, graphQLClient]);



  // Create timeline items for ALL employees (data is already filtered server-side)
  const timelineItems = useMemo(() => {
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
    const events: any[] = [];
    const eventIdSet = new Set();
    
    employeeAbsences.forEach(absence => {
      const eventId = `${absence.employee.id}-${absence.startDate}-${absence.endDate}-${absence.type.value}`;
      
      if (!eventIdSet.has(eventId)) {
        eventIdSet.add(eventId);
        
        const absenceType = getAbsenceTypeName(absence.type);
        
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
  }, [employeeAbsences, selectedOrgUnits]);

  // Create status-based legend (like manager-absences)
  const legendItems = [
    { 
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_calendar.approved', 'Approved'), 
      color: '#10b981' 
    },
    { 
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_calendar.pending', 'Pending'), 
      color: '#f59e0b' 
    },
    { 
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_calendar.rejected', 'Rejected'), 
      color: '#ef4444' 
    },
    { 
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_calendar.cancelled', 'Cancelled'), 
      color: '#6b7280' 
    }
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
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.calendar.error_loading_absences',
          'Error loading absences'
        )}: {error.message}
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
            // Handle edge cases from Ant Design Select
            if (!values || values.length === 0) {
              // If nothing selected, default to "All Departments"
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
              setSelectedOrgUnits(['--- All Departments']);
              return;
            }
            
            // Analyze current state vs new selection to understand user intent
            const currentState = selectedOrgUnits;
            const newSelection = validValues;
            
            const currentHasAllDepartments = currentState.includes('--- All Departments');
            const newHasAllDepartments = newSelection.includes('--- All Departments');
            const specificDepartmentsInNew = newSelection.filter(val => val !== '--- All Departments');
            
            if (currentHasAllDepartments && newHasAllDepartments && specificDepartmentsInNew.length > 0) {
              // User had "All Departments" and clicked on a specific department
              // Ant Design gives us both, but user intent is to switch to specific department
              setSelectedOrgUnits(specificDepartmentsInNew);
            } else if (newHasAllDepartments && !currentHasAllDepartments) {
              // User explicitly clicked "All Departments" - clear others
              setSelectedOrgUnits(['--- All Departments']);
            } else if (newHasAllDepartments && specificDepartmentsInNew.length === 0) {
              // Only "All Departments" in new selection
              setSelectedOrgUnits(['--- All Departments']);
            } else {
              // Regular multi-select behavior (no "All Departments" involved)
              setSelectedOrgUnits(validValues);
            }
          }}
          onClear={() => {
            setSelectedOrgUnits(['--- All Departments']);
          }}
          placeholder={getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.calendar.filter_by_department',
            'Filter by Department'
          )}
          disabled={isLoading}
          allowClear
          style={{ width: '100%' }}
          data-testid="calendar-department-filter"
        >
          <Option key="all" value="--- All Departments">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.calendar.all_departments',
              '--- All Departments'
            )}
          </Option>
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
        title={getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_calendar.title',
          'Team Absence Calendar'
        )}
        legendItems={legendItems}
        itemLabel={getTranslationFromI18nKeyAndLabel(
          'lowcoder:hr_absences.create_absence.employee',
          'Employee'
        )}
        itemDetailLabel={getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_list.search_employee_list.recent_employees_table.department',
          'Department'
        )}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_table.employee_search_filter',
          'Search Employee...'
        )}
        initialDate={new Date()}
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
