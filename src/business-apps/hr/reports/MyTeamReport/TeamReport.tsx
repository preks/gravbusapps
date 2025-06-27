"use client"

import { Card, Button, Tag, Table, Input, Checkbox } from 'antd';
import { KpiCard } from './components';
import dayjs from 'dayjs';
import { getEmployeeTenure } from './utils/tenureUtils';
import {
  CalendarOutlined,
  UserOutlined,
  SearchOutlined,
  CheckOutlined,
  UpOutlined,
  DownOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  SolutionOutlined
} from '@ant-design/icons';
import React, { useState, useMemo, useCallback } from 'react';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetEmployeesReport } from './hooks/useGetEmployeesReport';
import { useTeamReportFilters } from './hooks/useTeamReportFilters';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';

interface TeamReportProps extends BusinessAppContextProps {}
type EmployeeUI = {
  id: string;
  name: string;
  position: string;
  location: string;
  employmentType: string;
  contractType: string;
  startDate: string;
  exitDate: string | null;
  tenure: string;
};

function getEmployeeTableColumns(
  employees: EmployeeUI[],
  uniquePositions: string[]
) {
  return [
    {
      title: 'Employee Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: EmployeeUI, b: EmployeeUI) => a.name.localeCompare(b.name),
      render: (text: string) => <span className="gba:text-gray-900 gba:font-medium">{text}</span>,
    },
    {
      title: 'Job Position',
      dataIndex: 'position',
      key: 'position',
      filters: uniquePositions.map((position) => ({ text: position, value: position })),
      onFilter: (value: string | number | boolean | bigint, record: EmployeeUI) => record.position === value,
      sorter: (a: EmployeeUI, b: EmployeeUI) => a.position.localeCompare(b.position),
      render: (text: string) => <span className="gba:text-gray-700">{text}</span>,
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      filters: Array.from(new Set(employees.map(emp => emp.location))).map((location) => ({ text: location, value: location })),
      onFilter: (value: string | number | boolean | bigint, record: EmployeeUI) => record.location === value,
      sorter: (a: EmployeeUI, b: EmployeeUI) => a.location.localeCompare(b.location),
      render: (text: string) => <span className="gba:text-gray-700">{text}</span>,
    },
    {
      title: 'Employment Type',
      dataIndex: 'employmentType',
      key: 'employmentType',
      filters: Array.from(new Set(employees.map(emp => emp.employmentType))).map((type) => ({ text: type, value: type })),
      onFilter: (value: string | number | boolean | bigint, record: EmployeeUI) => record.employmentType === value,
      sorter: (a: EmployeeUI, b: EmployeeUI) => a.employmentType.localeCompare(b.employmentType),
      render: (text: string, record: EmployeeUI) => (
        <Tag
          color={
            record.employmentType === "Internal"
              ? "green"
              : record.employmentType === "External"
              ? "orange"
              : record.employmentType === "Contract worker"
              ? "purple"
              : record.employmentType === "Demo" || record.employmentType === "Test"
              ? "red"
              : "default"
          }
          className="gba:text-xs gba:font-semibold gba:rounded gba:px-2 gba:py-1"
          data-testid={`team-report-employee-type-${record.id}`}
        >
          {text}
        </Tag>
      ),
    },
    {
      title: 'Contract Type',
      dataIndex: 'contractType',
      key: 'contractType',
      filters: Array.from(new Set(employees.map(emp => emp.contractType))).map((type) => ({ text: type, value: type })),
      onFilter: (value: string | number | boolean | bigint, record: EmployeeUI) => record.contractType === value,
      sorter: (a: EmployeeUI, b: EmployeeUI) => a.contractType.localeCompare(b.contractType),
      render: (text: string, record: EmployeeUI) => (
        <Tag
          color={
            record.contractType.toLowerCase().includes("full time")
              ? "blue"
              : record.contractType === "Demo"
              ? "red"
              : record.contractType === "Test"
              ? "red"
              : "default"
          }
          className="gba:text-xs gba:font-semibold gba:rounded gba:px-2 gba:py-1"
          data-testid={`team-report-employee-contract-${record.id}`}
        >
          {text}
        </Tag>
      ),
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      sorter: (a: EmployeeUI, b: EmployeeUI) => a.startDate.localeCompare(b.startDate),
      render: (text: string) => <span className="gba:text-gray-700">{text}</span>,
    },
    {
      title: 'Tenure',
      dataIndex: 'tenure',
      key: 'tenure',
      sorter: (a: EmployeeUI, b: EmployeeUI) => {
        const getMonths = (tenure: string) => {
          if (tenure === "N/A") return -1;
          const match = tenure.match(/(\d+)\s+years?\s+and\s+(\d+)\s+months?/);
          if (match) return Number.parseInt(match[1]) * 12 + Number.parseInt(match[2]);
          const monthMatch = tenure.match(/(\d+)\s+months?/);
          if (monthMatch) return Number.parseInt(monthMatch[1]);
          return -1;
        };
        return getMonths(a.tenure) - getMonths(b.tenure);
      },
      render: (text: string) => <span className="gba:text-gray-700">{text}</span>,
    },
  ];
}

const TeamReport: React.FC<TeamReportProps> = (props) => {
  const { accessToken } = props;
  
  // Local UI state
  const [pageSize, setPageSize] = useState<number>(20);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isFiltersVisible, setIsFiltersVisible] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedEmploymentTypes, setSelectedEmploymentTypes] = useState<string[]>([]);
  
  // Sidebar filter states
  const [sidebarSearchTerm, setSidebarSearchTerm] = useState<string>('');
  const [sidebarLocationSearch, setSidebarLocationSearch] = useState<string>('');
  const [sidebarEmploymentTypeSearch, setSidebarEmploymentTypeSearch] = useState<string>('');
  const [sidebarContractTypeSearch, setSidebarContractTypeSearch] = useState<string>('');
  
  // Expanded sections states
  const [isJobPositionExpanded, setIsJobPositionExpanded] = useState<boolean>(true);
  const [isLocationExpanded, setIsLocationExpanded] = useState<boolean>(true);
  const [isEmploymentTypeExpanded, setIsEmploymentTypeExpanded] = useState<boolean>(true);
  
  // Get employee data
  const report = useGetEmployeesReport({ accessToken, pageSize });
  const allEmployees = report.allEmployees || [];

  // Map all employees to UI structure
  type EmployeeUI = {
    id: string;
    name: string;
    position: string;
    location: string;
    employmentType: string;
    contractType: string;
    startDate: string;
    exitDate: string | null;
    tenure: string;
  };

  const allEmployeeUIs: EmployeeUI[] = (allEmployees || []).map((emp: any): EmployeeUI => ({
    id: emp.id,
    name: `${emp.firstName} ${emp.lastName}`,
    position: emp.jobTitle ?? "N/A",
    location: emp.organizationalUnit ?? "N/A",
    employmentType: emp.employmentType ?? "N/A",
    contractType: emp.contractType ?? "N/A",
    startDate: emp.startDate ? dayjs(emp.startDate).format('YYYY-MM-DD') : "N/A",
    exitDate: emp.exitDate ? dayjs(emp.exitDate).format('YYYY-MM-DD') : null,
    tenure: getEmployeeTenure(emp.startDate, emp.exitDate)
  }));
  // Debug: Log all employees (non-sensitive)
  console.log('[TeamReport] allEmployeeUIs:', allEmployeeUIs);

  const [selectedContractTypes, setSelectedContractTypes] = useState<string[]>([])
  const [isContractTypeExpanded, setIsContractTypeExpanded] = useState(true)
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filtering logic for table (always use allEmployeeUIs as the base)
  const matchesKPI = (employee: EmployeeUI) => {
    switch (activeFilter) {
      case "internal":
        return employee.employmentType === "Internal";
      case "external":
        return employee.employmentType === "External";
      case "contract":
        return employee.employmentType === "Contract worker";
      case "demo":
        return employee.employmentType === "Demo" || employee.employmentType === "Test";
      case "fulltime":
        return employee.contractType?.toLowerCase().includes("full time");
      case "parttime":
        return employee.contractType?.toLowerCase().includes("part time");
      case "tenure":
        return true; // tenure KPI does not filter
      default:
        return true;
    }
  };

  const filteredEmployees: EmployeeUI[] = allEmployeeUIs.filter((employee: EmployeeUI) => {
    const matchesKPIFilter = matchesKPI(employee);
    const matchesPositionFilter = selectedPositions.length === 0 || selectedPositions.includes(employee.position);
    const matchesLocationFilter = selectedLocations.length === 0 || selectedLocations.includes(employee.location);
    const matchesEmploymentTypeFilter = selectedEmploymentTypes.length === 0 || selectedEmploymentTypes.includes(employee.employmentType);
    const matchesContractTypeFilter = selectedContractTypes.length === 0 || selectedContractTypes.includes(employee.contractType);
    const matchesSearch =
      searchTerm.trim() === "" ||
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesKPIFilter && matchesPositionFilter && matchesLocationFilter && matchesEmploymentTypeFilter && matchesContractTypeFilter && matchesSearch;
  });
  // Debug: Log filtered employees (non-sensitive)
  console.log('[TeamReport] filteredEmployees:', filteredEmployees);

  // --- Sorting Logic ---
  const sortEmployees = (
    employees: EmployeeUI[],
    column: string | null,
    direction: 'asc' | 'desc'
  ): EmployeeUI[] => {
    if (!column) return employees;
    const sorted = [...employees].sort((a, b) => {
      let aValue = a[column as keyof EmployeeUI];
      let bValue = b[column as keyof EmployeeUI];
      // Special case for tenure: sort by months, N/A last
      if (column === 'tenure') {
        const getMonths = (tenure: string): number => {
          if (tenure === "N/A") return -1;
          const match = tenure.match(/(\d+)\s+years?\s+and\s+(\d+)\s+months?/);
          if (match) return Number.parseInt(match[1]) * 12 + Number.parseInt(match[2]);
          const monthMatch = tenure.match(/(\d+)\s+months?/);
          if (monthMatch) return Number.parseInt(monthMatch[1]);
          return -1;
        };
        const monthsA = getMonths(aValue as string);
        const monthsB = getMonths(bValue as string);
        if (monthsA === -1 && monthsB === -1) return 0;
        if (monthsA === -1) return 1;
        if (monthsB === -1) return -1;
        return direction === 'asc' ? monthsA - monthsB : monthsB - monthsA;
      }
      // Default string/primitive sort
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      // Fallback for other types
      return direction === 'asc'
        ? (aValue as any) - (bValue as any)
        : (bValue as any) - (aValue as any);
    });
    return sorted;
  };

  // --- Apply sorting (unless tenure KPI is active, which takes priority) ---
  let sortedEmployees = filteredEmployees;
  if (activeFilter === "tenure") {
    sortedEmployees = sortEmployees(filteredEmployees, 'tenure', 'desc');
  } else if (sortColumn) {
    sortedEmployees = sortEmployees(filteredEmployees, sortColumn, sortDirection);
  }

  // Paginate
  const paginatedEmployees: EmployeeUI[] = sortedEmployees.slice(
    (report.currentPage - 1) * pageSize,
    report.currentPage * pageSize
  );
  // Debug: Log paginated employees (non-sensitive)
  console.log('[TeamReport] paginatedEmployees:', paginatedEmployees);

  // Get unique job positions for filter
const uniquePositions = Array.from(new Set(filteredEmployees.map((emp: EmployeeUI) => emp.position))).sort();

// Filter positions based on sidebar search
const filteredPositions = uniquePositions.filter((position: string) =>
  position.toLowerCase().includes(sidebarSearchTerm.toLowerCase()),
);
// Unique & filtered locations
const uniqueLocations = Array.from(new Set(filteredEmployees.map((emp: EmployeeUI) => emp.location))).sort();
const filteredLocations = uniqueLocations.filter((location: string) =>
  location.toLowerCase().includes(sidebarLocationSearch.toLowerCase()),
);
// Unique & filtered employment types
const uniqueEmploymentTypes = Array.from(new Set(filteredEmployees.map((emp: EmployeeUI) => emp.employmentType))).sort();
const filteredEmploymentTypes = uniqueEmploymentTypes.filter((type: string) =>
  type.toLowerCase().includes(sidebarEmploymentTypeSearch.toLowerCase()),
);
// Unique & filtered contract types
const uniqueContractTypes = Array.from(new Set(filteredEmployees.map((emp: EmployeeUI) => emp.contractType))).sort();
const filteredContractTypes = uniqueContractTypes.filter((type: string) =>
  (type || "").toLowerCase().includes(sidebarContractTypeSearch.toLowerCase()),
);

// Function to clear all active filters
const clearAllFilters = () => {
  setSelectedPositions([])
  setSelectedLocations([])
  setSelectedEmploymentTypes([])
  setSelectedContractTypes([])
  setActiveFilter("all")
  setSearchTerm("")
  setSidebarSearchTerm("")
  setSidebarLocationSearch("")
  setSidebarEmploymentTypeSearch("")
  setSidebarContractTypeSearch("")
}

  // --- Search & Filter Controls (Ant Design & DebouncedInput) ---
  
  const searchFilterBar = (
    <div className="gba:flex gba:gap-4 gba:mb-4 gba:items-center" data-testid="team-report-search-filters">
      <DebouncedInput
        key={searchTerm === "" ? "empty" : "not-empty"}
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search employees..."
        className="gba:w-full gba:max-w-xs"
        ariaLabel="Search employees"
        data-testid="team-report-search"
      />
      <Button
        onClick={clearAllFilters}
        className="gba:ml-2"
        data-testid="team-report-clear-filters"
        type="default"
      >
        Clear Filters
      </Button>
      <Button
        onClick={() => setIsFilterOpen(true)}
        className="gba:ml-2"
        icon={<SearchOutlined />}
        data-testid="team-report-open-filter"
        type="primary"
      >
        Filter
      </Button>
    </div>
  );


  const handlePositionToggle = (position: string) => {
    setSelectedPositions((prev) => (prev.includes(position) ? prev.filter((p) => p !== position) : [...prev, position]))
  }
  const handleLocationToggle = (location: string) => {
    setSelectedLocations((prev) => (prev.includes(location) ? prev.filter((l) => l !== location) : [...prev, location]))
  }
  const handleEmploymentTypeToggle = (type: string) => {
    setSelectedEmploymentTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }
  const handleContractTypeToggle = (type: string) => {
    setSelectedContractTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }

  const hasActiveFilters = selectedPositions.length > 0 || selectedLocations.length > 0 || selectedEmploymentTypes.length > 0 || selectedContractTypes.length > 0 || activeFilter !== "all" || searchTerm !== ""

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-full space-y-6">
          {/* Header */}
          <div className="gba:flex gba:items-center gba:gap-3 gba:mb-8" data-testid="team-report-header">
            <CalendarOutlined className="gba:text-blue-600 gba:text-3xl" data-testid="team-report-header-icon" />
            <h1 className="gba:text-3xl gba:font-bold gba:text-gray-900" data-testid="team-report-title">My Team</h1>
          </div>

          {searchFilterBar}

          {/* KPI Tiles - Flex Row */}
          <div className="gba:flex gba:flex-wrap gba:gap-4 gba:mb-8 gba:w-full">
            <KpiCard
              icon={<UserOutlined className="gba:text-blue-500" />}
              value={allEmployeeUIs.length}
              label="Total"
              subLabel="All members"
              accentColor="blue"
              active={activeFilter === "all"}
              onClick={() => setActiveFilter("all")}
              data-testid="team-report-kpi-all"
              {...props}
            />
            {allEmployeeUIs.filter((employee: EmployeeUI) => employee.employmentType === "Internal").length > 0 && (
              <KpiCard
                icon={<CheckOutlined className="gba:text-green-500" />}
                value={allEmployeeUIs.filter((employee: EmployeeUI) => employee.employmentType === "Internal").length}
                label="Internal"
                subLabel="Employees"
                accentColor="green"
                active={activeFilter === "internal"}
                onClick={() => setActiveFilter("internal")}
                data-testid="team-report-kpi-internal"
                {...props}
              />
            )}
            {allEmployeeUIs.filter((employee: EmployeeUI) => employee.employmentType === "External").length > 0 && (
              <KpiCard
                icon={<CheckOutlined className="gba:text-orange-500" />}
                value={allEmployeeUIs.filter((employee: EmployeeUI) => employee.employmentType === "External").length}
                label="External"
                subLabel="Workers"
                accentColor="orange"
                active={activeFilter === "external"}
                onClick={() => setActiveFilter("external")}
                data-testid="team-report-kpi-external"
                {...props}
              />
            )}
            {allEmployeeUIs.filter((employee: EmployeeUI) => employee.employmentType === "Contract worker").length > 0 && (
              <KpiCard
                icon={<SolutionOutlined className="gba:text-purple-500" />}
                value={allEmployeeUIs.filter((employee: EmployeeUI) => employee.employmentType === "Contract worker").length}
                label="Contract"
                subLabel="Contractors"
                accentColor="purple"
                active={activeFilter === "contract"}
                onClick={() => setActiveFilter("contract")}
                data-testid="team-report-kpi-contract"
                {...props}
              />
            )}
            {allEmployeeUIs.filter((employee: EmployeeUI) => employee.employmentType === "Demo" || employee.employmentType === "Test").length > 0 && (
              <KpiCard
                icon={<CloseOutlined className="gba:text-red-500" />}
                value={allEmployeeUIs.filter((employee: EmployeeUI) => employee.employmentType === "Demo" || employee.employmentType === "Test").length}
                label="Demo/Test"
                subLabel="Test users"
                accentColor="red"
                active={activeFilter === "demo"}
                onClick={() => setActiveFilter("demo")}
                data-testid="team-report-kpi-demo"
                {...props}
              />
            )}
            <KpiCard
              icon={<ClockCircleOutlined className="gba:text-amber-500" />}
              value={(() => {
                // Calculate average tenure in months from allEmployees
                const getMonths = (tenure: string): number => {
                  if (tenure === "N/A") return 0;
                  const match = tenure.match(/(\d+)\s+years?\s+and\s+(\d+)\s+months?/);
                  if (match) {
                    return Number.parseInt(match[1]) * 12 + Number.parseInt(match[2]);
                  }
                  const monthMatch = tenure.match(/(\d+)\s+months?/);
                  if (monthMatch) {
                    return Number.parseInt(monthMatch[1]);
                  }
                  return 0;
                };
                if (allEmployeeUIs.length === 0) return '0m';
                const validTenures = allEmployeeUIs
                  .map(e => getMonths(e.tenure))
                  .filter(months => months > 0);
                if (validTenures.length === 0) return '0m';
                const avg = validTenures.reduce((a, b) => a + b, 0) / validTenures.length;
                return `${Math.round(avg)}m`;
              })()}
              label="Avg. Tenure"
              subLabel="Average months"
              accentColor="amber"
              active={activeFilter === "tenure"}
              onClick={() => setActiveFilter("tenure")}
              data-testid="team-report-kpi-tenure"
              {...props}
            />
            {allEmployeeUIs.filter((employee: EmployeeUI) => employee.contractType?.toLowerCase().includes("full time")).length > 0 && (
              <KpiCard
                icon={<SolutionOutlined className="gba:text-teal-500" />}
                value={allEmployeeUIs.filter((employee: EmployeeUI) => employee.contractType?.toLowerCase().includes("full time")).length}
                label="Full Time"
                subLabel="Full-time"
                accentColor="teal"
                active={activeFilter === "fulltime"}
                onClick={() => setActiveFilter("fulltime")}
                data-testid="team-report-kpi-fulltime"
                {...props}
              />
            )}
            {allEmployeeUIs.filter((employee: EmployeeUI) => employee.contractType?.toLowerCase().includes("part time")).length > 0 && (
              <KpiCard
                icon={<ClockCircleOutlined className="gba:text-indigo-500" />}
                value={allEmployeeUIs.filter((employee: EmployeeUI) => employee.contractType?.toLowerCase().includes("part time")).length}
                label="Part Time"
                subLabel="Part-time"
                accentColor="indigo"
                active={activeFilter === "parttime"}
                onClick={() => setActiveFilter("parttime")}
                data-testid="team-report-kpi-parttime"
                {...props}
              />
            )}
          </div>
        </div>
  
       {/* Filter + Content Section */}
       <div className="flex">
        {/* Filter Sidebar */}
        {isFilterOpen && (
          <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0">
            <div className="p-6 h-full overflow-y-auto">
              {/* Filter Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <SearchOutlined className="gba:w-5 gba:h-5 gba:text-gray-400" data-testid="team-report-filter-search-icon" />
                  <h2 className="gba:text-lg gba:font-semibold gba:text-gray-900">Filter</h2>
                </div>
                <Button
                  type="text"
                  onClick={() => setIsFilterOpen(false)}
                  className="gba:p-1 gba:h-6 gba:w-6"
                  icon={<CloseOutlined className="gba:h-4 gba:w-4" data-testid="team-report-filter-close-icon" />}
                  data-testid="team-report-filter-close-btn"
                />
              </div>

              {/* Job Position Section */}
              <div className="mb-6">
                <Button
                  onClick={() => setIsJobPositionExpanded(!isJobPositionExpanded)}
                  className="gba:flex gba:items-center gba:justify-between gba:w-full gba:text-left gba:mb-4"
                  type="text"
                  data-testid="team-report-job-position-toggle"
                  icon={isJobPositionExpanded ? <UpOutlined className="gba:text-gray-400" /> : <DownOutlined className="gba:text-gray-400" />}
                >
                  <h3 className="gba:text-sm gba:font-medium gba:text-gray-900">Job Position</h3>
                </Button>
                {isJobPositionExpanded && (
                  <>
                    <div className="mb-4">
                      <Input
                        placeholder="Search in Job Position..."
                        value={sidebarSearchTerm}
                        onChange={(e) => setSidebarSearchTerm(e.target.value)}
                        className="gba:text-sm gba:border-0 gba:border-b gba:border-gray-300 gba:rounded-none gba:focus:ring-0 gba:focus:border-gray-500 gba:px-0"
                        data-testid="team-report-job-position-search"
                      />
                    </div>
                    {sidebarSearchTerm.trim() === "" ? (
                      <div className="gba:text-gray-400 gba:text-sm gba:pl-1" data-testid="team-report-job-position-helper">
                        Type to search job positions
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredPositions.length > 0 ? (
                          filteredPositions.map((position) => (
                            <div key={position} className="flex items-center space-x-3">
                              <Checkbox
                                id={position}
                                checked={selectedPositions.includes(position)}
                                onChange={() => handlePositionToggle(position)}
                                className="gba:border-gray-400"
                                data-testid={`team-report-job-position-checkbox-${position}`}
                              />
                              <label htmlFor={position} className="gba:text-sm gba:text-gray-700 gba:cursor-pointer gba:flex-1" data-testid={`team-report-job-position-label-${position}`}>
                                {position}
                              </label>
                            </div>
                          ))
                        ) : (
                          <div className="gba:text-gray-400 gba:text-sm gba:pl-1">No results found</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Location Section */}
              <div className="mb-6">
                <Button
                  onClick={() => setIsLocationExpanded(!isLocationExpanded)}
                  className="gba:flex gba:items-center gba:justify-between gba:w-full gba:text-left gba:mb-4"
                  type="text"
                  data-testid="team-report-location-toggle"
                  icon={isLocationExpanded ? <UpOutlined className="gba:text-gray-400" /> : <DownOutlined className="gba:text-gray-400" />}
                >
                  <h3 className="gba:text-sm gba:font-medium gba:text-gray-900">Location</h3>
                </Button>
                {isLocationExpanded && (
                  <>
                    <div className="mb-4">
                      <Input
                        placeholder="Search in Location..."
                        value={sidebarLocationSearch}
                        onChange={(e) => setSidebarLocationSearch(e.target.value)}
                        className="gba:text-sm gba:border-0 gba:border-b gba:border-gray-300 gba:rounded-none gba:focus:ring-0 gba:focus:border-gray-500 gba:px-0"
                        data-testid="team-report-location-search"
                      />
                    </div>
                    {sidebarLocationSearch.trim() === "" ? (
                      <div className="gba:text-gray-400 gba:text-sm gba:pl-1" data-testid="team-report-location-helper">
                        Type to search locations
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredLocations.length > 0 ? (
                          filteredLocations.map((location) => (
                            <div key={location} className="flex items-center space-x-3">
                              <Checkbox
                                id={location}
                                checked={selectedLocations.includes(location)}
                                onChange={() => handleLocationToggle(location)}
                                className="gba:border-gray-400"
                                data-testid={`team-report-location-checkbox-${location}`}
                              />
                              <label htmlFor={location} className="gba:text-sm gba:text-gray-700 gba:cursor-pointer gba:flex-1" data-testid={`team-report-location-label-${location}`}>
                                {location}
                              </label>
                            </div>
                          ))
                        ) : (
                          <div className="gba:text-gray-400 gba:text-sm gba:pl-1">No results found</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Employment Type Section */}
              <div className="mb-6">
                <Button
                  onClick={() => setIsEmploymentTypeExpanded(!isEmploymentTypeExpanded)}
                  className="gba:flex gba:items-center gba:justify-between gba:w-full gba:text-left gba:mb-4"
                  type="text"
                  data-testid="team-report-employment-type-toggle"
                  icon={isEmploymentTypeExpanded ? <UpOutlined className="gba:text-gray-400" /> : <DownOutlined className="gba:text-gray-400" />}
                >
                  <h3 className="gba:text-sm gba:font-medium gba:text-gray-900">Employment Type</h3>
                </Button>
                {isEmploymentTypeExpanded && (
                  <>
                    <div className="mb-4">
                      <Input
                        placeholder="Search in Employment Type..."
                        value={sidebarEmploymentTypeSearch}
                        onChange={(e) => setSidebarEmploymentTypeSearch(e.target.value)}
                        className="gba:text-sm gba:border-0 gba:border-b gba:border-gray-300 gba:rounded-none gba:focus:ring-0 gba:focus:border-gray-500 gba:px-0"
                        data-testid="team-report-employment-type-search"
                      />
                    </div>
                    <div className="space-y-3">
                      {filteredEmploymentTypes.map((type) => (
                        <div key={type} className="flex items-center space-x-3">
                          <Checkbox
                            id={type}
                            checked={selectedEmploymentTypes.includes(type)}
                            onChange={() => handleEmploymentTypeToggle(type)}
                            className="gba:border-gray-400"
                            data-testid={`team-report-employment-type-checkbox-${type}`}
                          />
                          <label htmlFor={type} className="gba:text-sm gba:text-gray-700 gba:cursor-pointer gba:flex-1" data-testid={`team-report-employment-type-label-${type}`}>
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Contract Type Section */}
              <div className="mb-6">
                <Button
                  onClick={() => setIsContractTypeExpanded(!isContractTypeExpanded)}
                  className="gba:flex gba:items-center gba:justify-between gba:w-full gba:text-left gba:mb-4"
                  type="text"
                  data-testid="team-report-contract-type-toggle"
                  icon={isContractTypeExpanded ? <UpOutlined className="gba:text-gray-400" /> : <DownOutlined className="gba:text-gray-400" />}
                >
                  <h3 className="gba:text-sm gba:font-medium gba:text-gray-900">Contract Type</h3>
                </Button>
                {isContractTypeExpanded && (
                  <>
                    <div className="mb-4">
                      <Input
                        placeholder="Search in Contract Type..."
                        value={sidebarContractTypeSearch}
                        onChange={(e) => setSidebarContractTypeSearch(e.target.value)}
                        className="gba:text-sm gba:border-0 gba:border-b gba:border-gray-300 gba:rounded-none gba:focus:ring-0 gba:focus:border-gray-500 gba:px-0"
                        data-testid="team-report-contract-type-search"
                      />
                    </div>
                    <div className="space-y-3">
                      {filteredContractTypes.map((type) => (
                        <div key={type} className="flex items-center space-x-3">
                          <Checkbox
                            id={type}
                            checked={selectedContractTypes.includes(type)}
                            onChange={() => handleContractTypeToggle(type)}
                            className="gba:border-gray-400"
                            data-testid={`team-report-contract-type-checkbox-${type}`}
                          />
                          <label htmlFor={type} className="gba:text-sm gba:text-gray-700 gba:cursor-pointer gba:flex-1" data-testid={`team-report-contract-type-label-${type}`}>
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Filter Summary */}
              <div className="border-t pt-4 space-y-3">
                <div className="text-sm text-gray-600">
                  {selectedPositions.length > 0 && (
                    <p>
                      {selectedPositions.length} position{selectedPositions.length !== 1 ? "s" : ""} selected
                    </p>
                  )}
                  {activeFilter !== "all" && <p>KPI filter: {activeFilter}</p>}
                </div>
                {hasActiveFilters && (
                  <Button type="default" onClick={clearAllFilters} className="gba:w-full" data-testid="team-report-clear-all-filters-btn">
                    Clear All Filters
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {/* <div>
          <SearchOutlined className="gba:absolute gba:left-3 gba:top-1/2 -gba:translate-y-1/2 gba:text-gray-400 gba:h-4 gba:w-4" />
          <Input
            placeholder="Search in My Team"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="gba:pl-10 gba:bg-gray-100 gba:border-0 gba:rounded-full"
          />
        </div> */}

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mb-4">
              {activeFilter !== "all" && (
                <Tag
                  color="blue"
                  className="gba:flex gba:items-center gba:gap-1"
                  data-testid="team-report-active-filter-tag"
                  closable
                  closeIcon={<CloseOutlined className="gba:h-3 gba:w-3 gba:cursor-pointer" />}
                  onClose={() => setActiveFilter("all")}
                >
                  {activeFilter === "fulltime" ? "Full Time" : activeFilter === "parttime" ? "Part Time" : activeFilter}
                </Tag>
              )}
              {selectedPositions.map((position: string) => (
                <Tag
                  key={position}
                  color="geekblue"
                  className="gba:flex gba:items-center gba:gap-1"
                  data-testid={`team-report-active-position-tag-${position}`}
                  closable
                  closeIcon={<CloseOutlined className="gba:h-3 gba:w-3 gba:cursor-pointer" />}
                  onClose={() => handlePositionToggle(position)}
                >
                  {position}
                </Tag>
              ))}
              {searchTerm && (
                <Tag
                  color="default"
                  className="gba:flex gba:items-center gba:gap-1"
                  data-testid="team-report-active-search-tag"
                  closable
                  closeIcon={
                    <CloseOutlined className="gba:h-3 gba:w-3 gba:cursor-pointer" />
                  }
                  onClose={e => {
                      e.preventDefault();
                      setSearchTerm("");
                  }}
                >
                  Search: {searchTerm}
                </Tag>
              )}
            </div>
          )}
        </div>

        {/* Employee Table Section */}
        <Card
          className="gba:bg-white gba:shadow-sm"
          data-testid="team-report-employee-table-card"
        >
          <div className="gba:p-0">
            <Table
              className="gba:w-full gba:rounded-md"
              data-testid="team-report-employee-table"
              columns={getEmployeeTableColumns(filteredEmployees, uniquePositions)}
              dataSource={sortedEmployees}
              rowKey="id"
              pagination={{
                current: report.currentPage,
                pageSize,
                total: filteredEmployees.length,
                onChange: report.onPageChange,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} employees`,
                onShowSizeChange: (_, size) => {
                  setPageSize(size);
                  report.onPageChange(1); // Reset to first page when page size changes
                }
              }}
            />        
          </div>
        </Card> 
      </div>
    </div>
  );
}
export default TeamReport;
