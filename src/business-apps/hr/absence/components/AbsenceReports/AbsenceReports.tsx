import { Card, Button, Input } from "antd";
import {
  RiSearchLine,
  RiFileChartLine,
  RiCalendarLine,
  RiUserLine,
  RiAddLine,
  RiPieChartLine,
  RiBarChartLine,
  RiLineChartLine,
  RiFileTextLine,
  RiArrowRightLine,
  RiStarFill,
} from "@remixicon/react";
import { useState, useEffect } from "react";

// Sample report data
const reports = [
  {
    id: 1,
    title: "Department Absence Summary",
    description:
      "Overview of absences by department with trends and comparisons",
    icon: <RiUserLine className="h-5 w-5" />,
    category: "Department",
    lastRun: "2 days ago",
    favorite: true,
  },
  {
    id: 2,
    title: "Monthly Absence Report",
    description:
      "Monthly breakdown of all absence types across the organization",
    icon: <RiCalendarLine className="h-5 w-5" />,
    category: "Time Period",
    lastRun: "1 week ago",
    favorite: true,
  },
  {
    id: 3,
    title: "Absence Trends Analysis",
    description: "Long-term absence patterns and trend identification",
    icon: <RiBarChartLine className="h-5 w-5" />,
    category: "Analysis",
    lastRun: "2 weeks ago",
    favorite: false,
  },
  {
    id: 4,
    title: "Sick Leave Distribution",
    description: "Detailed analysis of sick leave usage across teams",
    icon: <RiPieChartLine className="h-5 w-5" />,
    category: "Absence Type",
    lastRun: "3 days ago",
    favorite: false,
  },
  {
    id: 5,
    title: "Employee Absence Records",
    description: "Individual absence records for all employees",
    icon: <RiFileTextLine className="h-5 w-5" />,
    category: "Individual",
    lastRun: "Yesterday",
    favorite: false,
  },
  {
    id: 6,
    title: "Quarterly Absence Summary",
    description: "Quarterly comparison of absence rates and patterns",
    icon: <RiBarChartLine className="h-5 w-5" />,
    category: "Time Period",
    lastRun: "1 month ago",
    favorite: true,
  },
  {
    id: 7,
    title: "Absence Duration Analysis",
    description: "Analysis of absence durations by type and department",
    icon: <RiLineChartLine className="h-5 w-5" />,
    category: "Analysis",
    lastRun: "5 days ago",
    favorite: false,
  },
  {
    id: 8,
    title: "Annual Leave Forecast",
    description: "Projected annual leave usage for upcoming quarters",
    icon: <RiLineChartLine className="h-5 w-5" />,
    category: "Forecasting",
    lastRun: "2 weeks ago",
    favorite: false,
  },
];

// Featured reports to highlight at the top
const featuredReports = [
  {
    id: 101,
    title: "Executive Dashboard",
    description: "Key absence metrics and KPIs for executive review",
    icon: <RiFileChartLine className="h-6 w-6 text-violet-500" />,
    color: "bg-violet-50",
  },
  {
    id: 102,
    title: "Compliance Report",
    description: "Absence policy compliance status across departments",
    icon: <RiFileChartLine className="h-6 w-6 text-emerald-500" />,
    color: "bg-emerald-50",
  },
  {
    id: 103,
    title: "Cost Impact Analysis",
    description: "Financial impact assessment of employee absences",
    icon: <RiFileChartLine className="h-6 w-6 text-amber-500" />,
    color: "bg-amber-50",
  },
];

export const AbsenceReports = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredReports, setFilteredReports] = useState(reports);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate total pages
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  // Get current items for page
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReports.slice(indexOfFirstItem, indexOfLastItem);

  // Filter reports based on search query
  useEffect(() => {
    const filtered = reports.filter(
      (report) =>
        report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredReports(filtered);
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchQuery]);

  return (
    <div className="p-3 max-w-6xl mx-auto w-full">
      <div className="bg-white border border-gray-200 rounded-lg">
        {/* Header */}
        <div className="p-4 border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <h2 className="text-lg font-semibold">Absence Reports</h2>
            <Button className="bg-black text-white hover:bg-gray-800 gap-2">
              <RiAddLine className="h-4 w-4" />
              Custom Report
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border border-gray-200">
          <div className="relative">
            <RiSearchLine className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search reports..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Featured Reports */}
        <div className="p-3 border-b border-gray-200">
          <h3 className="text-sm font-medium mb-3">Featured Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {featuredReports.map((report) => (
              <a href="#" key={report.id}>
                <Card
                  style={{
                    backgroundColor:
                      report.color === "bg-violet-50"
                        ? "#e9d5ff"
                        : report.color === "bg-emerald-50"
                        ? "#dcfce7"
                        : report.color === "bg-amber-50"
                        ? "#fef3c7"
                        : "white",
                  }}
                  className="border-0 hover:shadow-md transition-shadow cursor-pointer h-full"
                >
                  <div className="p-4 flex items-start gap-3">
                    <div className="mt-1">{report.icon}</div>
                    <div>
                      <h4 className="font-medium">{report.title}</h4>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {report.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </div>

        {/* All Reports */}
        <div className="p-3">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">All Reports</h3>
            <Button type="text" size="small" className="text-gray-600">
              View All
              <RiArrowRightLine className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-3">
            {currentItems.map((report) => (
              <a href="#" key={report.id}>
                <Card className="border-0 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-gray-100 p-1.5 rounded-md">
                        {report.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-medium">{report.title}</h4>
                          {report.favorite && (
                            <RiStarFill className="h-3 w-3 fill-amber-400 text-amber-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {report.description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="bg-white border border-gray-200 px-1.5 py-0.5 rounded-md text-xs">
                            {report.category}
                          </div>
                          <span className="text-xs text-gray-500">
                            Last run: {report.lastRun}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </a>
            ))}
          </div>

          {filteredReports.length > 0 && (
            <div className="p-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {indexOfFirstItem + 1} to{" "}
                {Math.min(indexOfLastItem, filteredReports.length)} of{" "}
                {filteredReports.length} reports
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant="outlined"
                      size="small"
                      className={currentPage === page ? "bg-gray-100" : ""}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  )
                )}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
