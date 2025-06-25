"use client"

import { Card, Button, Checkbox, Input, Tag, Pagination } from 'antd';
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
import React, { useState, useEffect } from 'react';
import { DebouncedInput } from '@/components/data-filter/DebouncedInput';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetEmployeesReport } from './hooks/useGetEmployeesReport';

interface TeamReportProps extends BusinessAppContextProps {}
const TeamReport: React.FC<TeamReportProps> = (props) => {

  // Fetch employee report data using the hook
  const [pageSize, setPageSize] = useState<number>(20);
  const report = useGetEmployeesReport({ accessToken: props.accessToken, pageSize });
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





  // Pagination state from hook
  const { currentPage, onPageChange } = report; // 'total' is no longer needed

  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])
  const [sidebarSearchTerm, setSidebarSearchTerm] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isJobPositionExpanded, setIsJobPositionExpanded] = useState(true)

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
    const matchesSearch =
      searchTerm.trim() === "" ||
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesKPIFilter && matchesPositionFilter && matchesSearch;
  });
  // Debug: Log filtered employees (non-sensitive)
  console.log('[TeamReport] filteredEmployees:', filteredEmployees);

  // Paginate filtered employees
  const paginatedEmployees: EmployeeUI[] = filteredEmployees.slice(
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

const clearAllFilters = () => {
  setSelectedPositions([])
  setActiveFilter("all")
  setSearchTerm("")
  setSidebarSearchTerm("")
}

  // --- Search & Filter Controls (Ant Design & DebouncedInput) ---

  const searchFilterBar = (
    <div className="gba:flex gba:gap-4 gba:mb-4" data-testid="team-report-search-filters">
      <DebouncedInput
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
    </div>
  );


  const handlePositionToggle = (position: string) => {
    setSelectedPositions((prev) => (prev.includes(position) ? prev.filter((p) => p !== position) : [...prev, position]))
  }

  

  const hasActiveFilters = selectedPositions.length > 0 || activeFilter !== "all" || searchTerm !== ""

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

          {/* KPI Tiles - Full Width */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
            <Card
              className={`gba:bg-white gba:shadow-sm gba:border-l-4 gba:border-l-blue-500 gba:cursor-pointer gba:transition-all gba:hover:shadow-md ${
                activeFilter === "all" ? "gba:ring-2 gba:ring-blue-200 gba:bg-blue-50" : ""
              }`}
              onClick={() => setActiveFilter("all")}
              data-testid="team-report-kpi-all"
            >
              <Card.Meta
                avatar={<UserOutlined className="gba:text-blue-500" />}
                title={<span className="gba:text-sm gba:font-medium gba:text-gray-600">Total</span>}
                className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-2"
              />
              <div className="gba:px-4 gba:py-2">
                <div className="gba:text-2xl gba:font-bold gba:text-gray-900">{allEmployeeUIs.length}</div>
                <p className="gba:text-xs gba:text-gray-500 gba:mt-1">All members</p>
              </div>
            </Card>
            {allEmployeeUIs.filter((employee: EmployeeUI) => employee.employmentType === "Internal").length > 0 && (
              <Card
                className={`gba:bg-white gba:shadow-sm gba:border-l-4 gba:border-l-green-500 gba:cursor-pointer gba:transition-all gba:hover:shadow-md ${
                  activeFilter === "internal" ? "gba:ring-2 gba:ring-green-200 gba:bg-green-50" : ""
                }`}
                onClick={() => setActiveFilter("internal")}
                data-testid="team-report-kpi-internal"
              >
                <Card.Meta
                  avatar={<CheckOutlined className="gba:text-green-500" />}
                  title={<span className="gba:text-sm gba:font-medium gba:text-gray-600">Internal</span>}
                  className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-2"
                />
                <div className="gba:px-4 gba:py-2">
                  <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                    {allEmployeeUIs.filter((employee: EmployeeUI) => employee.employmentType === "Internal").length}
                  </div>
                  <p className="gba:text-xs gba:text-gray-500 gba:mt-1">Employees</p>
                </div>
              </Card>
            )}

            {allEmployeeUIs.filter((employee: EmployeeUI) => employee.employmentType === "External").length > 0 && (
              <Card
                className={`gba:bg-white gba:shadow-sm gba:border-l-4 gba:border-l-orange-500 gba:cursor-pointer gba:transition-all gba:hover:shadow-md ${
                  activeFilter === "external" ? "gba:ring-2 gba:ring-orange-200 gba:bg-orange-50" : ""
                }`}
                onClick={() => setActiveFilter("external")}
                data-testid="team-report-kpi-external"
              >
                <Card.Meta
                  avatar={<CheckOutlined className="gba:text-orange-500" />}
                  title={<span className="gba:text-sm gba:font-medium gba:text-gray-600">External</span>}
                  className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-2"
                />
                <div className="gba:px-4 gba:py-2">
                  <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                    {allEmployeeUIs.filter((employee: EmployeeUI) => employee.employmentType === "External").length}
                  </div>
                  <p className="gba:text-xs gba:text-gray-500 gba:mt-1">Workers</p>
                </div>
              </Card>
            )}

            {allEmployeeUIs.filter((employee: EmployeeUI) => employee.employmentType === "Contract worker").length > 0 && (
              <Card
                className={`gba:bg-white gba:shadow-sm gba:border-l-4 gba:border-l-purple-500 gba:cursor-pointer gba:transition-all gba:hover:shadow-md ${
                  activeFilter === "contract" ? "gba:ring-2 gba:ring-purple-200 gba:bg-purple-50" : ""
                }`}
                onClick={() => setActiveFilter("contract")}
                data-testid="team-report-kpi-contract"
              >
                <Card.Meta
                  avatar={<SolutionOutlined className="gba:text-purple-500" />}
                  title={<span className="gba:text-sm gba:font-medium gba:text-gray-600">Contract</span>}
                  className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-2"
                />
                <div className="gba:px-4 gba:py-2">
                  <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                    {allEmployeeUIs.filter((employee: EmployeeUI) => employee.employmentType === "Contract worker").length}
                  </div>
                  <p className="gba:text-xs gba:text-gray-500 gba:mt-1">Contractors</p>
                </div>
              </Card>
            )}

            {allEmployeeUIs.filter((employee: EmployeeUI) => employee.employmentType === "Demo" || employee.employmentType === "Test").length > 0 && (
              <Card
                className={`gba:bg-white gba:shadow-sm gba:border-l-4 gba:border-l-red-500 gba:cursor-pointer gba:transition-all gba:hover:shadow-md ${
                  activeFilter === "demo" ? "gba:ring-2 gba:ring-red-200 gba:bg-red-50" : ""
                }`}
                onClick={() => setActiveFilter("demo")}
                data-testid="team-report-kpi-demo"
              >
                <Card.Meta
                  avatar={<CloseOutlined className="gba:text-red-500" />}
                  title={<span className="gba:text-sm gba:font-medium gba:text-gray-600">Demo/Test</span>}
                  className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-2"
                />
                <div className="gba:px-4 gba:py-2">
                  <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                    {allEmployeeUIs.filter((employee: EmployeeUI) => employee.employmentType === "Demo" || employee.employmentType === "Test").length}
                  </div>
                  <p className="gba:text-xs gba:text-gray-500 gba:mt-1">Test users</p>
                </div>
              </Card>
            )}

            <Card
              className={`gba:bg-white gba:shadow-sm gba:border-l-4 gba:border-l-amber-500 gba:cursor-pointer gba:transition-all gba:hover:shadow-md ${activeFilter === "tenure" ? "gba:ring-2 gba:ring-amber-200 gba:bg-amber-50" : ""}`}
              onClick={() => setActiveFilter("tenure")}
              data-testid="team-report-kpi-tenure"
            >
              <Card.Meta
                avatar={<ClockCircleOutlined className="gba:text-amber-500" />}
                title={<span className="gba:text-sm gba:font-medium gba:text-gray-600">Avg. Tenure</span>}
                className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-2"
              />
              <div className="gba:px-4 gba:py-2">
                <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                  {(() => {
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

// If tenure sorting is needed, add it directly to filteredEmployees before slicing for pagination, e.g.:
// const sortedEmployees = [...filteredEmployees].sort((a, b) => getMonths(b.tenure) - getMonths(a.tenure));
// const paginatedEmployees = sortedEmployees.slice(...)
// For now, we use filteredEmployees directly for pagination.
                  if (allEmployeeUIs.length === 0) return '0m';
                    const monthsArr = allEmployeeUIs.map(e => getMonths(e.tenure));
                    const avg = monthsArr.reduce((a, b) => a + b, 0) / monthsArr.length;
                    return `${Math.round(avg)}m`;
                  })()}
                </div>
                <p className="gba:text-xs gba:text-gray-500 gba:mt-1">Average months</p>
              </div>
            </Card>

            {allEmployeeUIs.filter((employee: EmployeeUI) => employee.contractType?.toLowerCase().includes("full time")).length > 0 && (
              <Card
                className={`bg-white shadow-sm border-l-4 border-l-teal-500 cursor-pointer transition-all hover:shadow-md ${
                  activeFilter === "fulltime" ? "ring-2 ring-teal-200 bg-teal-50" : ""
                }`}
                onClick={() => setActiveFilter("fulltime")}
              >
                <Card.Meta
                  avatar={<SolutionOutlined className="gba:text-teal-500" />}
                  title={<span className="gba:text-sm gba:font-medium gba:text-gray-600">Full Time</span>}
                  className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-2"
                />
                <div className="gba:px-4 gba:py-2">
                  <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                    {allEmployeeUIs.filter((employee: EmployeeUI) => employee.contractType?.toLowerCase().includes("full time")).length}
                  </div>
                  <p className="gba:text-xs gba:text-gray-500 gba:mt-1">Full-time</p>
                </div>
              </Card>
            )}

            {allEmployeeUIs.filter((employee: EmployeeUI) => employee.contractType?.toLowerCase().includes("part time")).length > 0 && (
              <Card
                className={`bg-white shadow-sm border-l-4 border-l-indigo-500 cursor-pointer transition-all hover:shadow-md ${
                  activeFilter === "parttime" ? "ring-2 ring-indigo-200 bg-indigo-50" : ""
                }`}
                onClick={() => setActiveFilter("parttime")}
              >
                <Card.Meta
                  avatar={<ClockCircleOutlined className="gba:text-indigo-500" />}
                  title={<span className="gba:text-sm gba:font-medium gba:text-gray-600">Part Time</span>}
                  className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-2"
                />
                <div className="gba:px-4 gba:py-2">
                  <div className="gba:text-2xl gba:font-bold gba:text-gray-900">
                    {allEmployeeUIs.filter((employee: EmployeeUI) => employee.contractType?.toLowerCase().includes("part time")).length}
                  </div>
                  <p className="gba:text-xs gba:text-gray-500 gba:mt-1">Part-time</p>
                </div>
              </Card>
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
                    {/* Search in Job Position */}
                    <div className="mb-4">
                      <Input
                        placeholder="Search in Job Position..."
                        value={sidebarSearchTerm}
                        onChange={(e) => setSidebarSearchTerm(e.target.value)}
                        className="gba:text-sm gba:border-0 gba:border-b gba:border-gray-300 gba:rounded-none gba:focus:ring-0 gba:focus:border-gray-500 gba:px-0"
                        data-testid="team-report-job-position-search"
                      />
                    </div>

                    {/* Position Checkboxes */}
                    <div className="space-y-3">
                      {filteredPositions.map((position) => (
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
        <div>
          <SearchOutlined className="gba:absolute gba:left-3 gba:top-1/2 -gba:translate-y-1/2 gba:text-gray-400 gba:h-4 gba:w-4" />
          <Input
            placeholder="Search in My Team"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="gba:pl-10 gba:bg-gray-100 gba:border-0 gba:rounded-full"
            data-testid="team-report-search-input"
          />
        </div>

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
                  onClose={() => setSearchTerm("")}
                >
                  {searchTerm}
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
            <div className="gba:overflow-x-auto">
              <table
                className="gba:w-full"
                data-testid="team-report-employee-table"
              >
                <thead>
                  <tr className="gba:border-b gba:border-gray-200 gba:bg-gray-50">
                    <th className="gba:text-left gba:py-4 gba:px-6 gba:font-medium gba:text-gray-600 gba:text-sm">
                      Employee Name
                    </th>
                    <th className="gba:text-left gba:py-4 gba:px-6 gba:font-medium gba:text-gray-600 gba:text-sm">
                      Job Position
                    </th>
                    <th className="gba:text-left gba:py-4 gba:px-6 gba:font-medium gba:text-gray-600 gba:text-sm">
                      Location
                    </th>
                    <th className="gba:text-left gba:py-4 gba:px-6 gba:font-medium gba:text-gray-600 gba:text-sm">
                      Employment Type
                    </th>
                    <th className="gba:text-left gba:py-4 gba:px-6 gba:font-medium gba:text-gray-600 gba:text-sm">
                      Contract Type
                    </th>
                    <th className="gba:text-left gba:py-4 gba:px-6 gba:font-medium gba:text-gray-600 gba:text-sm">
                      Start Date
                    </th>
                    <th className="gba:text-left gba:py-4 gba:px-6 gba:font-medium gba:text-gray-600 gba:text-sm">
                      Tenure
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map((employee: EmployeeUI) => (
                      <tr key={employee.id} data-testid={`team-report-employee-row-${employee.id}`}>
                      <td className="gba:py-4 gba:px-6 gba:text-gray-900 gba:font-medium">
                        {employee.name}
                      </td>
                      <td className="gba:py-4 gba:px-6 gba:text-gray-700">
                        {employee.position}
                      </td>
                      <td className="gba:py-4 gba:px-6 gba:text-gray-700">
                        {employee.location}
                      </td>
                      <td className="gba:py-4 gba:px-6">
                        <Tag
                          color={
                            employee.employmentType === "Internal"
                              ? "green"
                              : employee.employmentType === "External"
                              ? "orange"
                              : employee.employmentType === "Contract worker"
                              ? "purple"
                              : employee.employmentType === "Demo" || employee.employmentType === "Test"
                              ? "red"
                              : "default"
                          }
                          className="gba:text-xs gba:font-semibold gba:rounded gba:px-2 gba:py-1"
                          data-testid={`team-report-employee-type-${employee.id}`}
                        >
                          {employee.employmentType}
                        </Tag>
                      </td>
                      <td className="gba:py-4 gba:px-6 gba:text-gray-700">
                        <Tag
                          color={
                            employee.contractType.toLowerCase().includes("full time")
                              ? "teal"
                              : employee.contractType.toLowerCase().includes("part time")
                              ? "blue"
                              : employee.contractType === "Demo"
                              ? "red"
                              : employee.contractType === "Test"
                              ? "red"
                              : "default"
                          }
                          className="gba:text-xs gba:font-semibold gba:rounded gba:px-2 gba:py-1"
                          data-testid={`team-report-employee-contract-${employee.id}`}
                        >
                          {employee.contractType}
                        </Tag>
                      </td>
                      <td className="gba:py-4 gba:px-6 gba:text-gray-700">{employee.startDate}</td>
                      <td className="gba:py-4 gba:px-6 gba:text-gray-700">{employee.tenure}</td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="gba:flex gba:justify-between gba:items-center gba:text-sm gba:text-gray-500 gba:pt-4">
                <span>
                  Showing {paginatedEmployees.length} of {filteredEmployees.length} employees (filtered on page {report.currentPage})
                  {(selectedPositions.length > 0 || activeFilter !== "all" || searchTerm !== "") && (
                    <span className="gba:text-blue-600 gba:font-medium"> (filtered)</span>
                  )}
                </span>
                <span>Last updated: {new Date().toLocaleDateString()}</span>
              </div>
              <div className="gba:pt-4 gba:flex gba:justify-end">
                   <Pagination
                      current={report.currentPage}
                      pageSize={pageSize}
                      total={filteredEmployees.length}
                      onChange={report.onPageChange}
                      showSizeChanger={true}
                      pageSizeOptions={['10','20','50','100']}
                      onShowSizeChange={(_, size) => {
                        setPageSize(size);
                        report.onPageChange(1); // Reset to first page when page size changes
                      }}
                      className="gba:ml-auto"
                      data-testid="team-report-pagination"
                    />
              </div>
          </div>
        </Card> 
      </div>
    </div>
  );
}
export default TeamReport;
