import React, { useState } from 'react';
import { Card, Button, Select, Space, Input, Tooltip } from 'antd';
import { RiDownloadLine, RiAddLine, RiSearchLine } from '@remixicon/react';
import { format, addDays, subDays, startOfWeek } from 'date-fns';

interface Absence {
  employeeId: number;
  type: string;
  typeDetail: string;
  status: string;
  startDate: Date;
  endDate: Date;
}

interface CalendarListProps {
  // Add props as needed
}

// Sample data for absences with added type details
const absences = [
  {
    employeeId: 1,
    type: "work",
    typeDetail: "Conference",
    status: "approved",
    startDate: new Date(2025, 4, 20), // May 20, 2025
    endDate: new Date(2025, 4, 22), // May 22, 2025
  },
  {
    employeeId: 2,
    type: "sick",
    typeDetail: "Personal Illness",
    status: "approved",
    startDate: new Date(2025, 4, 12), // May 12, 2025
    endDate: new Date(2025, 4, 14), // May 14, 2025
  },
  {
    employeeId: 3,
    type: "special",
    typeDetail: "Family Event",
    status: "approved",
    startDate: new Date(2025, 4, 18), // May 18, 2025
    endDate: new Date(2025, 4, 20), // May 20, 2025
  },
  {
    employeeId: 4,
    type: "vacation",
    typeDetail: "Annual Leave",
    status: "approved",
    startDate: new Date(2025, 4, 25), // May 25, 2025
    endDate: new Date(2025, 4, 27), // May 25, 2025
  },
  {
    employeeId: 5,
    type: "vacation",
    typeDetail: "Summer Holiday",
    status: "approved",
    startDate: new Date(2025, 4, 13), // May 13, 2025
    endDate: new Date(2025, 4, 13), // May 13, 2025 (single day)
  },
];

// Sample employee data
const employees = [
  { id: 1, name: "Alex Johnson", department: "Engineering", avatar: "/placeholder.svg?height=40&width=40" },
  { id: 2, name: "Sarah Chen", department: "Design", avatar: "/placeholder.svg?height=40&width=40" },
  { id: 3, name: "Michael Rodriguez", department: "Product", avatar: "/placeholder.svg?height=40&width=40" },
  { id: 4, name: "Emma Wilson", department: "Marketing", avatar: "/placeholder.svg?height=40&width=40" },
  { id: 5, name: "James Smith", department: "Sales", avatar: "/placeholder.svg?height=40&width=40" },
];

// Absence types with their colors and labels
const absenceTypes = [
  { type: "sick", label: "Sick Leave", color: "bg-rose-400" },
  { type: "vacation", label: "Vacation", color: "bg-emerald-400" },
  { type: "special", label: "Special Leave", color: "bg-violet-400" },
  { type: "work", label: "Work Leave", color: "bg-amber-400" },
];

const CalendarList = () => {
  const initialDate = new Date(2025, 4, 14);
  const startDate = startOfWeek(initialDate, { weekStartsOn: 1 }); // Start on Monday

  const [currentStartDate, setCurrentStartDate] = useState(startDate);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("month");

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const daysToShow = 14;
  const days = Array.from({ length: daysToShow }, (_, i) => addDays(currentStartDate, i));

  const dateRangeText = `${format(currentStartDate, "MMM d")} - ${format(addDays(currentStartDate, 13), "MMM d, yyyy")}`;

  const handlePreviousPeriod = () => {
    setCurrentStartDate((prevDate) => subDays(prevDate, 14));
  };

  const handleNextPeriod = () => {
    setCurrentStartDate((prevDate) => addDays(prevDate, 14));
  };

  const handleToday = () => {
    setCurrentStartDate(startDate);
  };

  const handleExport = () => {
    // Implement export logic
  };

  const handleAddAbsence = () => {
    // Implement add absence logic
  };

  const handleViewModeChange = (value: string) => {
    setViewMode(value);
  };



  const getAbsenceForDay = (employeeId: number, date: Date): Absence | undefined => {
    return absences.find(
      (absence) => absence.employeeId === employeeId && date >= absence.startDate && date <= absence.endDate,
    );
  };

  const isStartOfAbsence = (employeeId: number, date: Date): boolean => {
    const absence = getAbsenceForDay(employeeId, date);
    if (!absence) return false;

    return absence.startDate.getTime() === new Date(date).setHours(0, 0, 0, 0);
  };

  const getAbsenceDuration = (employeeId: number, startDate: Date): number => {
    const absence = getAbsenceForDay(employeeId, startDate);
    if (!absence) return 0;

    let daysRemaining = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= absence.endDate && daysRemaining < daysToShow) {
      const dayIndex = days.findIndex(
        (day) =>
          day.getDate() === currentDate.getDate() &&
          day.getMonth() === currentDate.getMonth() &&
          day.getFullYear() === currentDate.getFullYear(),
      );

      if (dayIndex === -1) break;

      daysRemaining++;
      currentDate = addDays(currentDate, 1);
    }

    return daysRemaining;
  };

  // Function to get the appropriate color for an absence type
  const getAbsenceColor = (type: string): string => {
    const absenceType = absenceTypes.find((at) => at.type === type);
    return absenceType ? absenceType.color : "bg-gray-400";
  };

  // Function to get the label for an absence type
  const getAbsenceLabel = (type: string): string => {
    const absenceType = absenceTypes.find((at) => at.type === type);
    return absenceType ? absenceType.label : "Other";
  };

  // Function to determine if text should be shown in the pill
  const shouldShowText = (duration: number): boolean => {
    return duration >= 2;
  };

  // Cell width in pixels - used for positioning calculations
  const cellWidth = 45;

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <Space>
          <Button
            type="primary"
            onClick={handleExport}
            icon={<RiDownloadLine />}
          >
            Export
          </Button>
          <Button
            type="default"
            onClick={handleAddAbsence}
            icon={<RiAddLine />}
          >
            Add Absence
          </Button>
        </Space>
        
        <Select
          value={viewMode}
          onChange={handleViewModeChange}
          style={{ width: 120 }}
        >
          <Select.Option value="month">Month View</Select.Option>
          <Select.Option value="week">Week View</Select.Option>
          <Select.Option value="day">Day View</Select.Option>
        </Select>
      </div>

      <div className="p-3 max-w-6xl mx-auto w-full">
        {/* Calendar Controls */}
        <div className="bg-white border rounded-lg mb-4">
          <div className="p-3">
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button size="small" onClick={handleToday}>
                  Today
                </Button>
              </div>

              <div className="flex items-center">
                <span className="mr-2 text-xs">View:</span>
                <Select
                  defaultValue="14 Days"
                  size="small"
                  style={{ width: 120 }}
                >
                  <Select.Option value="14 Days">14 Days</Select.Option>
                </Select>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3">
              {absenceTypes.map((type) => (
                <div key={type.type} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-full ${type.color}`} />
                  <span className="text-xs">{type.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto border-t relative">
            <div className="min-w-[830px]">
              {/* Header Row with Days */}
              <div className="grid grid-cols-[180px_repeat(14,minmax(45px,1fr))]">
                <div className="border-r border-b p-2 sticky left-0 bg-white z-10">
                  <div className="font-medium text-sm">Employee</div>
                  <div className="text-xs text-gray-500">Department</div>
                </div>
                {days.map((day, index) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                  return (
                    <div
                      key={index}
                      className={`border-r border-b p-1 text-center ${
                        isWeekend ? "bg-gray-50" : ""
                      }`}
                    >
                      <div className="text-xs text-gray-500">{format(day, "EEE")}</div>
                      <div className="font-medium text-sm">{format(day, "dd")}</div>
                    </div>
                  );
                })}
              </div>

              {/* Employee Rows with Pills */}
              {filteredEmployees.map((employee, employeeIndex) => (
                <div key={employee.id} className="relative">
                  <div className="grid grid-cols-[180px_repeat(14,minmax(45px,1fr))]">
                    {/* Employee Info */}
                    <div className="border-r border-b p-2 flex items-center gap-2 sticky left-0 bg-white z-10">
                      <img
                        src={employee.avatar || "/placeholder.svg"}
                        alt={employee.name}
                        className="w-7 h-7 rounded-full"
                      />
                      <div>
                        <div className="font-medium text-sm">{employee.name}</div>
                      </div>
                    </div>

                    {/* Days */}
                    {days.map((day) => (
                      <div
                        key={day.toISOString()}
                        className={`border-r border-b h-14 relative ${
                          day.getDay() === 0 || day.getDay() === 6 ? "bg-gray-50" : ""
                        }`}
                      />
                    ))}
                  </div>

                  {/* Absence Pills for this employee */}
                  {days.map((day) => {
                    const isStart = isStartOfAbsence(employee.id, day);
                    const absence = getAbsenceForDay(employee.id, day);
                    const duration = isStart ? getAbsenceDuration(employee.id, day) : 0;

                    if (!isStart || !absence) return null;

                    const showText = shouldShowText(duration);
                    const absenceLabel = getAbsenceLabel(absence.type);

                    return (
                      <Tooltip
                        title={`Group: ${absenceLabel}\nType: ${absence.typeDetail}`}
                        placement="top"
                      >
                        <div
                          className={`absolute top-1/2 transform -translate-y-1/2 h-8 rounded-xl px-2 flex items-center justify-center text-xs font-medium z-20 ${getAbsenceColor(
                            absence.type,
                          )} text-gray-900 cursor-pointer`}
                          style={{
                            left: `${days.indexOf(day) * cellWidth + 180 + 2}px`,
                            width: `${duration * cellWidth - 4}px`,
                          }}
                        >
                          {showText && (
                            <span className="truncate">
                              {absence.type.charAt(0).toUpperCase() + absence.type.slice(1)}
                            </span>
                          )}
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CalendarList;
