import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Card,
  CardContent
} from '@newwork/nw-design-system';
import { PiArrowLeft, PiCalendarBlank, PiUsers, PiArrowUp, PiArrowDown } from 'react-icons/pi';
import { Spin, Alert } from 'antd';
import { DataContainer } from '../../../../../../../../components/layout/dataContainer';
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext';
import { useGraphQLClient } from '../../../../../../../../common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '../../../../../../../../common/network/catalogs/useCatalogManagerClient';

export type TimeFilter = 'current-year' | 'current-quarter' | 'current-month' | 'all-time';

interface EntitlementsDetailsProps extends BusinessAppContextProps {
  timeFilter?: TimeFilter;
  onNavigateBack: () => void;
}

interface DetailedEntitlement {
  id: string; // Add unique ID for table keys
  employeeId: string;
  employeeName: string;
  organizationalUnit: string | null;
  absenceType: string;
  absenceTypeId: string;
  entitlement: number;
  validFrom: string;
  validTo: string;
  used: number;
  available: number;
  status: string;
}

// Filter interfaces matching DataContainer expectations
interface DataFilter {
  id: string;
  label: string;
  selected: boolean;
  count?: number;
}

interface DataFilterGroup {
  id: string;
  title: string;
  filters?: DataFilter[];
  backendSearch?: (search: string) => { filters: DataFilter[]; loading: boolean; error: any };
  customComponent?: React.ReactElement;
  hideSearch?: boolean;
}

type SortField = 'employeeName' | 'organizationalUnit' | 'absenceType' | 'entitlement' | 'validFrom' | 'validTo' | 'used' | 'available';
type SortOrder = 'asc' | 'desc';

const EntitlementsDetails: React.FC<EntitlementsDetailsProps> = ({ 
  accessToken, 
  userInfo, 
  timeFilter = 'current-year',
  onNavigateBack 
}) => {
  const graphQLClient = useGraphQLClient(accessToken);
  const catalogClient = useCatalogManagerClient(accessToken);

  const [entitlements, setEntitlements] = useState<DetailedEntitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [organizationalUnits, setOrganizationalUnits] = useState<any[]>([]);
  const [absenceTypesMap, setAbsenceTypesMap] = useState<Record<string, string>>({});
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [orgUnitsLoading, setOrgUnitsLoading] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('employeeName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Track initial load to prevent unnecessary re-renders (like AbsenceList)
  const initialLoadDone = useRef(false);
  
  // Filtering state
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Get date filter for the current time filter
  const getDateFilters = () => {
    const now = new Date();
    
    switch (timeFilter) {
      case 'current-year':
        return {
          startDate: `${now.getFullYear()}-01-01`,
          endDate: `${now.getFullYear()}-12-31`
        };
      case 'current-quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        return {
          startDate: quarterStart.toISOString().split('T')[0],
          endDate: quarterEnd.toISOString().split('T')[0]
        };
      case 'current-month':
        return {
          startDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        };
      case 'all-time':
      default:
        return null;
    }
  };

  // Build GraphQL where conditions like AbsenceList does
  const buildWhereConditions = () => {

    
    const conditions: any = {
      isDeleted: { _eq: false }
    };
    
    // Add filters EXACTLY like AbsenceList - employee filters are raw IDs, others have prefixes
    const employeeFilters = selectedFilters.filter(f => !f.startsWith('department-') && !f.startsWith('type-'));
    const departmentFilters = selectedFilters.filter(f => f.startsWith('department-')).map(f => f.replace('department-', ''));
    const typeFilters = selectedFilters.filter(f => f.startsWith('type-')).map(f => f.replace('type-', ''));
    
    // FIXED: If employee filters are selected, use them instead of search for employees
    if (employeeFilters.length > 0) {
      conditions.employee = { id: { _in: employeeFilters } };
      
      // Still allow search on type and department, but not employee names
      if (search && search.trim()) {
        conditions._or = [
          { type: { value: { _ilike: `%${search.trim()}%` } } },
          { employee: { employeePosition: { organizationalUnit: { name: { _ilike: `%${search.trim()}%` } } } } }
        ];
      }
    } else {
      // No employee filters, use search for everything including employee names
      if (search && search.trim()) {
        conditions._or = [
          { employee: { firstName: { _ilike: `%${search.trim()}%` } } },
          { employee: { lastName: { _ilike: `%${search.trim()}%` } } },
          { type: { value: { _ilike: `%${search.trim()}%` } } },
          { employee: { employeePosition: { organizationalUnit: { name: { _ilike: `%${search.trim()}%` } } } } }
        ];
      }
    }
    
    if (departmentFilters.length > 0) {
      const departmentCondition = { organizationalUnit: { id: { _in: departmentFilters } } };
      
      // Merge with existing employee conditions properly
      if (conditions.employee) {
        conditions.employee.employeePosition = departmentCondition;
      } else {
        conditions.employee = { employeePosition: departmentCondition };
      }
    }
    
    if (typeFilters.length > 0) {
      // Filter by absence type IDs (from catalog)
      const typeIds = typeFilters.map(f => f.replace('type-', ''));
      conditions.type = { id: { _in: typeIds } };
    }
    
    // Active employee positions filter - ADD TO _and instead of overwriting employee condition
    const currentDate = new Date().toISOString();
    
    // Always add active position filter as a separate condition to avoid conflicts
    if (!conditions._and) {
      conditions._and = [];
    }
    
    conditions._and.push({
      employee: { 
        employeePosition: {
          _or: [
            { exitDate: { _isNull: true } },
            { exitDate: { _gte: currentDate } }
          ]
        }
      }
    });
    
    // Date filters - ADD to existing _and array
    const dateFilters = getDateFilters();
    if (dateFilters) {
      conditions._and.push(
        { validFrom: { _lte: dateFilters.endDate } },
        { validTo: { _gte: dateFilters.startDate } }
      );
    }
    
    return conditions;
  };

  const getDetailedEntitlementsQuery = () => {
    return `
      query GetDetailedEntitlements($where: EmployeeAbsenceEntitlementBoolExp!) {
        EmployeeAbsenceEntitlement(where: $where) {
          id
          employeeId
          total
          available
          approved
          pending
          validFrom
          validTo
          type {
            id
            value
            parentEntryId
          }
        }
      }
    `;
  };

  // Separate employee fetching like AbsenceList does  
  const fetchEmployees = useCallback(async () => {
    if (!accessToken) return;
    
    setEmployeesLoading(true);
    try {
      // EXACT same query as AbsenceList for employees
      const employeesQuery = `
        query GetEmployees {
          Employee(
            limit: 500
            orderBy: [{ firstName: ASC }, { lastName: ASC }]
            where: { isDeleted: { _eq: false } }
          ) {
            id
            firstName
            lastName
            employeePosition {
              organizationalUnit {
                name
              }
            }
          }
        }
      `;

      const result = await graphQLClient.request(employeesQuery);
      setEmployees(result?.Employee || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  }, [graphQLClient, accessToken]);

  // Separate org units fetching like AbsenceList does
  const fetchOrganizationalUnits = useCallback(async () => {
    if (!accessToken) return;
    
    setOrgUnitsLoading(true);
    try {
      const orgUnitsQuery = `
        query GetOrganizationalUnitsFromEmployees {
          Employee(
            where: {
              isDeleted: { _eq: false },
              employeePosition: {
                organizationalUnit: { id: { _isNull: false } }
              }
            }
          ) {
            employeePosition {
              organizationalUnit {
                id
                name
              }
            }
          }
        }
      `;

      const result = await graphQLClient.request(orgUnitsQuery);
      const orgUnits = result?.Employee
        ?.map((emp: any) => emp.employeePosition?.organizationalUnit)
        ?.filter((org: any) => org && org.name)
        ?.reduce((unique: any[], org: any) => {
          if (!unique.find((u: any) => u.id === org.id)) {
            unique.push(org);
          }
          return unique;
        }, []) || [];
      
      setOrganizationalUnits(orgUnits);
    } catch (error) {
      console.error('Error fetching org units:', error);
      setOrganizationalUnits([]);
    } finally {
      setOrgUnitsLoading(false);
    }
  }, [graphQLClient, accessToken]);

  // Load employees and org units on mount like AbsenceList
  useEffect(() => {
    fetchEmployees();
    fetchOrganizationalUnits();
  }, [fetchEmployees, fetchOrganizationalUnits]);

  // Fetch catalog data once on mount (like AbsenceList does)
  useEffect(() => {
    const fetchCatalogData = async () => {
      if (!accessToken) return;

      try {
        // Ensure catalog client has access token (like dashboard does)
        catalogClient.setAccessToken(accessToken);

        // Fetch AbsenceType catalog with ALL required parameters like manager-absences
        const typesCatalogData = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: "AbsenceType", version: "v1" },
          { 
            limit: 100, 
            offset: 0, 
            returnTotalRecords: true,
            includeChildCatalogEntries: true
          }
        );
        
        // Map types EXACTLY like AbsenceList maps groups  
        const typesMap: Record<string, string> = {};
        typesCatalogData.data.forEach((entry: any) => {
          typesMap[entry.id] = entry.value;
          // Map by both the main id and the catalogEntryLocalId for compatibility
          if (entry.catalogEntryLocalId) {
            typesMap[entry.catalogEntryLocalId] = entry.value;
          }
        });
        setAbsenceTypesMap(typesMap);
        
        console.log('✅ Types catalog loaded:', Object.keys(typesMap).length, 'types');
      } catch (err) {
        console.error('❌ Error loading catalog:', err);
      }
    };

    fetchCatalogData();
  }, [accessToken]);

  // Initial load effect (like AbsenceList)
  useEffect(() => {
    if (!initialLoadDone.current && accessToken) {
      console.log('🔄 EntitlementsDetails: Initial load');
      initialLoadDone.current = true;
      fetchEntitlements();
    }
  }, [accessToken]);

  // Search and filter effects (like AbsenceList) 
  useEffect(() => {
    if (initialLoadDone.current) {
      console.log('🔍 EntitlementsDetails: Filter/search change');
      setCurrentPage(1); // Reset pagination like AbsenceList
      fetchEntitlements();
    }
  }, [timeFilter, search, JSON.stringify(selectedFilters), employees.length]);

  // Main data fetching function (like AbsenceList fetchAbsences)
  const fetchEntitlements = async () => {
    if (!accessToken) return;

    try {
      // ✅ KEY FIX: Only show loading on initial load, not filter changes
      if (!initialLoadDone.current) {
        setLoading(true);
      }
      setError(null);

        // Create employee lookup map from state (employees fetched separately)
        const employeesMap: Record<string, any> = {};
        employees.forEach((emp: any) => {
          employeesMap[emp.id] = emp;
        });
        
        // Fetch entitlements data with GraphQL variables like AbsenceList
        const whereConditions = buildWhereConditions();
        
        // Log search queries for debugging
        if (search && search.trim()) {
          console.log('🔍 Search applied:', search);
        }
        
        const query = getDetailedEntitlementsQuery();
        const result = await graphQLClient.request<{ 
          EmployeeAbsenceEntitlement: any[]
        }>(query, {
          where: whereConditions
        });
        
        // Transform data using EXACT same pattern as AbsenceList for type mapping
        const transformedData: DetailedEntitlement[] = result.EmployeeAbsenceEntitlement.map((ent: any) => {
          const employee = employeesMap[ent.employeeId];
          
          // Use EXACT same pattern as AbsenceList for type mapping
          const typeName = absenceTypesMap[ent.type?.id] || ent.type?.value || 'Unknown Type';
          
          // Log any unmapped types for debugging
          if (typeName === 'Unknown Type') {
            console.warn('❌ Unmapped absence type:', {
              typeId: ent.type?.id,
              typeValue: ent.type?.value
            });
          }
          
          return {
            id: ent.id, // Use entitlement ID for unique keys
            employeeId: ent.employeeId || '',
            employeeName: employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : 'Unknown Employee',
            organizationalUnit: employee?.employeePosition?.organizationalUnit?.name || 'No Department',
            absenceType: typeName, // Use dashboard pattern
            absenceTypeId: ent.type?.id || '',
            entitlement: ent.total || 0,
            validFrom: ent.validFrom || '',
            validTo: ent.validTo || '',
            used: ent.approved || 0, // Use approved field as "used"
            available: ent.available || 0,
            status: ent.available > 0 ? 'Active' : 'Expired'
          };
        });

        setEntitlements(transformedData);
        setTotal(transformedData.length);

      } catch (err) {
        console.error('❌ Error loading entitlements:', err);
        setError(err instanceof Error ? err.message : 'Failed to load entitlements data');
      } finally {
        setLoading(false);
      }
  };

  // Filtering and sorting logic
  const getEmployeeFilters = useCallback((searchTerm: string) => {
    // FIXED: Show selected employees when no search term (like AbsenceList shows selected departments)
    if (!searchTerm || searchTerm.trim().length < 3) {
      // Get currently selected employees
      const selectedEmployeeIds = selectedFilters.filter(f => !f.startsWith('department-') && !f.startsWith('type-'));
      const selectedEmployees = employees.filter(employee => 
        selectedEmployeeIds.includes(employee.id)
      );

      return {
        filters: selectedEmployees.map(employee => ({
          id: employee.id,
          label: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee',
          selected: true // These are all selected employees
        })),
        loading: employeesLoading,
        error: null
      };
    }

    // FIXED: Only search employee names, not org units
    const filteredEmployees = employees.filter(employee => {
      const firstName = employee.firstName || '';
      const lastName = employee.lastName || '';
      const fullName = `${firstName} ${lastName}`.toLowerCase();
      return fullName.includes(searchTerm.toLowerCase());
    });

    const filterResults = filteredEmployees.map(employee => ({
      id: employee.id,
      label: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee',
      selected: selectedFilters.includes(employee.id)
    }));

    // 🎯 DEBUG: Filter UI staying smooth 
    if (searchTerm && filterResults.length > 0) {
      console.log('EMPLOYEE FILTER: Smooth operation', { 
        searchTerm,
        foundEmployees: filterResults.length,
        selectedEmployees: filterResults.filter(f => f.selected).length
      });
    }

    return {
      filters: filterResults,
      loading: employeesLoading, // Use real loading state
      error: null
    };
  }, [employees, selectedFilters, employeesLoading]);

  const getDepartmentFilters = useCallback((searchTerm: string) => {
    
    const selectedDepartmentIds = selectedFilters
      .filter(f => f.startsWith('department-'))
      .map(f => f.replace('department-', ''));
    
    const selectedDepartments = organizationalUnits.filter(department => 
      selectedDepartmentIds.includes(department.id)
    );

    if (!searchTerm || searchTerm.trim().length < 3) {
      return {
        filters: selectedDepartments.map(department => ({
          id: `department-${department.id}`,
          label: department.name || 'Unknown Department',
          selected: true
        })),
        loading: orgUnitsLoading, // Use real loading state
        error: null
      };
    }

    const filteredDepartments = organizationalUnits.filter(department => {
      const name = department.name || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return {
      filters: filteredDepartments.map(department => ({
        id: `department-${department.id}`,
        label: department.name || 'Unknown Department',
        selected: selectedFilters.includes(`department-${department.id}`)
      })),
      loading: orgUnitsLoading, // Use real loading state
      error: null
    };
  }, [organizationalUnits, selectedFilters, orgUnitsLoading]);

  // Get absence types for filtering (from catalog)
  const absenceTypeFilters = useMemo(() => {
    const uniqueTypes = Array.from(new Set(entitlements.map(e => e.absenceTypeId)))
      .filter(Boolean)
      .map(typeId => ({
        id: `type-${typeId}`,
        label: absenceTypesMap[typeId] || 'Unknown Type',
        selected: selectedFilters.includes(`type-${typeId}`)
      }));
    
    return uniqueTypes;
  }, [entitlements, absenceTypesMap, selectedFilters]);

  // Filter configuration
  const filterGroups: DataFilterGroup[] = [
    {
      id: 'employee',
      title: 'Employee',
      backendSearch: getEmployeeFilters
    },
    {
      id: 'department',
      title: 'Org Unit',
      backendSearch: getDepartmentFilters
    },
    {
      id: 'absenceType',
      title: 'Absence Type',
      filters: absenceTypeFilters
    }
  ];

  // Apply sorting only (search and filtering now done server-side)
  const filteredAndSortedEntitlements = useMemo(() => {
    // Apply sorting
    const sorted = [...entitlements].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle different data types
      if (sortField === 'validFrom' || sortField === 'validTo') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      } else if (typeof aValue === 'number') {
        // Keep as numbers
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [entitlements, sortField, sortOrder]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedEntitlements.slice(startIndex, endIndex);
  }, [filteredAndSortedEntitlements, currentPage, pageSize]);

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleFilterChange = (filterId: string, selected: boolean) => {
    setSelectedFilters(prev => {
      const newFilters = selected 
        ? [...prev, filterId]
        : prev.filter(f => f !== filterId);
      
      // Filter selection should now work smoothly without page refresh
      
      return newFilters;
    });
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1); // Reset to first page when search changes
  }, []); // Remove search dependency to prevent dropdown closing

  const handlePaginationChange = (page: number, newPageSize?: number) => {
    setCurrentPage(page);
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setCurrentPage(1);
    }
  };

  // Filter label map for display
  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    
    employees.forEach(emp => {
      map[emp.id] = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
    });
    
    organizationalUnits.forEach(org => {
      map[`department-${org.id}`] = org.name || 'Unknown Department';
    });
    
    // Use absence type IDs and names from catalog
    Object.entries(absenceTypesMap).forEach(([id, name]) => {
      map[`type-${id}`] = name;
    });
    
    return map;
  }, [employees, organizationalUnits, absenceTypesMap]);

  // Summary statistics based on filtered data
  const summaryStats = useMemo(() => {
    if (filteredAndSortedEntitlements.length === 0) return null;

    const totalEmployees = new Set(filteredAndSortedEntitlements.map(e => e.employeeId)).size;
    const totalEntitlements = filteredAndSortedEntitlements.reduce((sum, e) => sum + e.entitlement, 0);
    const totalUsed = filteredAndSortedEntitlements.reduce((sum, e) => sum + e.used, 0);
    const totalAvailable = filteredAndSortedEntitlements.reduce((sum, e) => sum + e.available, 0);

    return {
      totalEmployees,
      totalEntitlements,
      totalUsed,
      totalAvailable,
      utilizationRate: totalEntitlements > 0 ? (totalUsed / totalEntitlements * 100).toFixed(1) : '0'
    };
  }, [filteredAndSortedEntitlements]);

  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert
          message="Error Loading Entitlements"
          description={error}
          type="error"
          showIcon
        />
      </div>
    );
  }

  // Create sortable header component
  const SortableHeader: React.FC<{ field: SortField; children: React.ReactNode; className?: string }> = ({ field, children, className }) => (
    <TableHead 
      className={`gba:cursor-pointer gba:select-none ${className || ''}`}
      onClick={() => handleSort(field)}
    >
      <div className="gba:flex gba:items-center gba:gap-1">
        {children}
        {sortField === field && (
          sortOrder === 'asc' ? <PiArrowUp size={12} /> : <PiArrowDown size={12} />
        )}
      </div>
    </TableHead>
  );

  // Table component
  const EntitlementsTable: React.FC = () => {
    const totalPages = Math.ceil(filteredAndSortedEntitlements.length / pageSize);

    return (
      <Card>
        <CardContent className="gba:p-0">
          <div className="gba:overflow-x-auto">
            <Table data-testid="entitlements-table" className="gba:w-full">
              <TableHeader>
                <TableRow>
                  <SortableHeader field="employeeName" className="gba:w-[15%]">Employee Name</SortableHeader>
                  <SortableHeader field="organizationalUnit" className="gba:w-[15%]">Org Unit</SortableHeader>
                  <SortableHeader field="absenceType" className="gba:w-[15%]">Absence Type</SortableHeader>
                  <SortableHeader field="entitlement" className="gba:w-[10%]">Entitlement</SortableHeader>
                  <SortableHeader field="validFrom" className="gba:w-[12%]">Valid From</SortableHeader>
                  <SortableHeader field="validTo" className="gba:w-[12%]">Valid To</SortableHeader>
                  <SortableHeader field="used" className="gba:w-[12%]">Used (Effective Days)</SortableHeader>
                  <SortableHeader field="available" className="gba:w-[9%]">Available</SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((entitlement) => (
                  <TableRow key={entitlement.id}>
                    <TableCell className="gba:font-medium">{entitlement.employeeName}</TableCell>
                    <TableCell>{entitlement.organizationalUnit || 'No Department'}</TableCell>
                    <TableCell>{entitlement.absenceType}</TableCell>
                    <TableCell>{entitlement.entitlement} days</TableCell>
                    <TableCell>
                      {entitlement.validFrom ? new Date(entitlement.validFrom).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {entitlement.validTo ? new Date(entitlement.validTo).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>{entitlement.used} days</TableCell>
                    <TableCell>
                      <span className={entitlement.available > 0 ? 'gba:text-green-600 gba:font-medium' : 'gba:text-gray-500'}>
                        {entitlement.available} days
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination - ALWAYS show arrows as requested */}
          <div className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4" data-testid="entitlements-pagination">
            <div className="gba:text-sm gba:text-muted-foreground">
              {totalPages > 1 
                ? `${((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, filteredAndSortedEntitlements.length)} of ${filteredAndSortedEntitlements.length} entitlements`
                : `${filteredAndSortedEntitlements.length} entitlements`
              }
            </div>
            <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">Rows per page</p>
                <select
                  value={pageSize}
                  onChange={(e) => handlePaginationChange(1, Number(e.target.value))}
                  className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                  data-testid="entitlements-page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              {totalPages > 1 && (
                <div className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium">
                  Page {currentPage} of {totalPages}
                </div>
              )}
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Button
                  variant="outline"
                  className="gba:hidden gba:h-8 gba:w-8 gba:p-0 gba:lg:flex"
                  onClick={() => handlePaginationChange(1)}
                  disabled={currentPage === 1 || totalPages <= 1}
                  data-testid="entitlements-first-page-button"
                >
                  <span className="gba:sr-only">Go to first page</span>
                  ⟨⟨
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePaginationChange(currentPage - 1)}
                  disabled={currentPage === 1 || totalPages <= 1}
                  data-testid="entitlements-previous-page-button"
                >
                  <span className="gba:sr-only">Go to previous page</span>
                  ⟨
                </Button>
                <Button
                  variant="outline"
                  className="gba:h-8 gba:w-8 gba:p-0"
                  onClick={() => handlePaginationChange(currentPage + 1)}
                  disabled={currentPage >= totalPages || totalPages <= 1}
                  data-testid="entitlements-next-page-button"
                >
                  <span className="gba:sr-only">Go to next page</span>
                  ⟩
                </Button>
                <Button
                  variant="outline"
                  className="gba:hidden gba:h-8 gba:w-8 gba:p-0 gba:lg:flex"
                  onClick={() => handlePaginationChange(totalPages)}
                  disabled={currentPage >= totalPages || totalPages <= 1}
                  data-testid="entitlements-last-page-button"
                >
                  <span className="gba:sr-only">Go to last page</span>
                  ⟩⟩
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div data-testid="entitlements-details-page" className="gba:space-y-6">
      {/* Back Navigation */}
      <div className="gba:mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onNavigateBack}
          className="gba:flex gba:items-center gba:gap-2"
          data-testid="back-to-dashboard-button"
        >
          <PiArrowLeft size={16} />
          Back to Dashboard
        </Button>
      </div>

      {/* Page Header */}
      <div className="gba:bg-white gba:p-6 gba:rounded-lg gba:border gba:shadow-sm">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <PiUsers size={24} className="gba:text-purple-600" />
            <div>
              <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">
                Vacation Entitlements Details
              </h1>
              <p className="gba:text-gray-600 gba:mt-1">
                Complete breakdown of all employee vacation entitlements and usage
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      {summaryStats && (
        <div className="gba:bg-white gba:p-6 gba:rounded-lg gba:border gba:shadow-sm">
          <h3 className="gba:text-lg gba:font-medium gba:mb-4 gba:flex gba:items-center gba:gap-2">
            <PiCalendarBlank size={20} className="gba:text-blue-600" />
            Summary Statistics (Filtered Results)
          </h3>
          <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-5 gba:gap-4">
            <div className="gba:text-center gba:p-3 gba:bg-blue-50 gba:rounded">
              <div className="gba:text-lg gba:font-bold gba:text-blue-600">
                {summaryStats.totalEmployees}
              </div>
              <div className="gba:text-xs gba:text-gray-600">Total Employees</div>
            </div>
            <div className="gba:text-center gba:p-3 gba:bg-green-50 gba:rounded">
              <div className="gba:text-lg gba:font-bold gba:text-green-600">
                {summaryStats.totalEntitlements}
              </div>
              <div className="gba:text-xs gba:text-gray-600">Total Entitlement Days</div>
            </div>
            <div className="gba:text-center gba:p-3 gba:bg-orange-50 gba:rounded">
              <div className="gba:text-lg gba:font-bold gba:text-orange-600">
                {summaryStats.totalUsed}
              </div>
              <div className="gba:text-xs gba:text-gray-600">Days Used</div>
            </div>
            <div className="gba:text-center gba:p-3 gba:bg-purple-50 gba:rounded">
              <div className="gba:text-lg gba:font-bold gba:text-purple-600">
                {summaryStats.totalAvailable}
              </div>
              <div className="gba:text-xs gba:text-gray-600">Days Available</div>
            </div>
            <div className="gba:text-center gba:p-3 gba:bg-gray-50 gba:rounded">
              <div className="gba:text-lg gba:font-bold gba:text-gray-600">
                {summaryStats.utilizationRate}%
              </div>
              <div className="gba:text-xs gba:text-gray-600">Utilization Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* DataContainer with filtering and table */}
      <DataContainer
        dataControllerProps={{
          search,
          setSearch: handleSearchChange,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: setSelectedFilters,
          filterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>Employee Entitlements</span>
                <span className="gba:text-gray-500">({filteredAndSortedEntitlements.length})</span>
              </div>
            </div>
          ),
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange
        }}
        dataBody={
          <div data-testid="entitlements-table-container">
            <EntitlementsTable />
          </div>
        }
      />
    </div>
  );
};

export default EntitlementsDetails; 