import React from 'react'
import { useState } from "react"
import { Card, Typography } from 'antd'
import { RiBarChartLine, RiPieChartLine, RiUserLine } from '@remixicon/react'
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

const { Title } = Typography

const absenceData = [
  { month: "Jan", "Sick Leave": 12, Vacation: 8, "Special Leave": 3, "Work Leave": 5 },
  { month: "Feb", "Sick Leave": 15, Vacation: 10, "Special Leave": 2, "Work Leave": 7 },
  { month: "Mar", "Sick Leave": 10, Vacation: 12, "Special Leave": 4, "Work Leave": 6 },
  { month: "Apr", "Sick Leave": 8, Vacation: 15, "Special Leave": 5, "Work Leave": 4 },
  { month: "May", "Sick Leave": 9, Vacation: 18, "Special Leave": 3, "Work Leave": 8 },
]

const absenceDistribution = [
  { name: "Sick Leave", value: 33, count: 54, color: "#fb7185" }, // rose-400
  { name: "Vacation", value: 38, count: 63, color: "#34d399" }, // emerald-400
  { name: "Special Leave", value: 10, count: 17, color: "#a78bfa" }, // violet-400
  { name: "Work Leave", value: 19, count: 30, color: "#38bdf8" }, // sky-400
]

const topAbsentees = [
  {
    name: "Alex Morgan",
    department: "Marketing",
    total: 14,
    breakdown: [
      { type: "Sick Leave", days: 5, color: "#fb7185" },
      { type: "Vacation", days: 7, color: "#34d399" },
      { type: "Special Leave", days: 0, color: "#a78bfa" },
      { type: "Work Leave", days: 2, color: "#38bdf8" },
    ],
  },
  {
    name: "Jamie Chen",
    department: "Engineering",
    total: 12,
    breakdown: [
      { type: "Sick Leave", days: 2, color: "#fb7185" },
      { type: "Vacation", days: 8, color: "#34d399" },
      { type: "Special Leave", days: 1, color: "#a78bfa" },
      { type: "Work Leave", days: 1, color: "#38bdf8" },
    ],
  },
  {
    name: "Taylor Smith",
    department: "Sales",
    total: 11,
    breakdown: [
      { type: "Sick Leave", days: 6, color: "#fb7185" },
      { type: "Vacation", days: 3, color: "#34d399" },
      { type: "Special Leave", days: 0, color: "#a78bfa" },
      { type: "Work Leave", days: 2, color: "#38bdf8" },
    ],
  },
  {
    name: "Jordan Lee",
    department: "Finance",
    total: 10,
    breakdown: [
      { type: "Sick Leave", days: 1, color: "#fb7185" },
      { type: "Vacation", days: 7, color: "#34d399" },
      { type: "Special Leave", days: 2, color: "#a78bfa" },
      { type: "Work Leave", days: 0, color: "#38bdf8" },
    ],
  },
  {
    name: "Casey Wilson",
    department: "HR",
    total: 9,
    breakdown: [
      { type: "Sick Leave", days: 3, color: "#fb7185" },
      { type: "Vacation", days: 5, color: "#34d399" },
      { type: "Special Leave", days: 1, color: "#a78bfa" },
      { type: "Work Leave", days: 0, color: "#38bdf8" },
    ],
  },
]

// Custom tooltip formatter for the pie chart
const pieTooltipFormatter = (value, name, props) => {
  const entry = absenceDistribution.find((item) => item.name === name)
  if (entry) {
    return [`${entry.count} days (${entry.value}%)`, name]
  }
  return [value, name]
}

// AbsenteeDots component with real-time tooltip
function AbsenteeDots({ employee }) {
  const [activeTooltip, setActiveTooltip] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const handleMouseEnter = (index, event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    })
    setActiveTooltip(index)
  }

  const handleMouseLeave = () => {
    setActiveTooltip(null)
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        {employee.breakdown.map((item, index) => (
          <div
            key={index}
            className="h-2 w-2 rounded-full cursor-help transition-opacity duration-200"
            style={{
              backgroundColor: item.color,
              opacity: item.days > 0 ? 1 : 0.3,
            }}
            onMouseEnter={(e) => handleMouseEnter(index, e)}
            onMouseLeave={handleMouseLeave}
          ></div>
        ))}
      </div>

      {activeTooltip !== null && (
        <div
          className="fixed z-50 bg-white px-2 py-1 text-xs border rounded shadow-sm pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 8}px`,
            transition: "opacity 0.2s ease, transform 0.2s ease",
          }}
        >
          {employee.breakdown[activeTooltip].type}: {employee.breakdown[activeTooltip].days} days
        </div>
      )}
    </div>
  )
}

const kpis = [
  {
    title: "Absence Trends",
    icon: <RiBarChartLine className="h-4 w-4" />,
    description: "Monthly absence days by group",
    kpiValue: "164",
    kpiLabel: "Total Absence Days",
    content: (
      <ResponsiveContainer width="100%" height={180}>
        <RechartsBarChart data={absenceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" fontSize={10} tickMargin={5} />
          <YAxis fontSize={10} tickMargin={5} />
          <RechartsTooltip />
          <Bar dataKey="Sick Leave" stackId="a" fill="#fb7185" />
          <Bar dataKey="Vacation" stackId="a" fill="#34d399" />
          <Bar dataKey="Special Leave" stackId="a" fill="#a78bfa" />
          <Bar dataKey="Work Leave" stackId="a" fill="#38bdf8" />
        </RechartsBarChart>
      </ResponsiveContainer>
    ),
  },
  {
    title: "Absence Distribution",
    icon: <RiPieChartLine className="h-4 w-4" />,
    description: "Breakdown by absence group",
    kpiValue: "32.8%",
    kpiLabel: "Vacation Share",
    content: (
      <div>
        <ResponsiveContainer width="100%" height={140}>
          <RechartsPieChart>
            <Pie
              data={absenceDistribution}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={60}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              label={false}
              labelLine={false}
            >
              {absenceDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={pieTooltipFormatter}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    ),
  },
  {
    title: "Top Absentees",
    icon: <RiUserLine className="h-4 w-4" />,
    description: "Employees with most absence days",
    kpiValue: "14",
    kpiLabel: "Max Absence Days",
    content: (
      <div className="space-y-2 mt-2">
        {topAbsentees.map((employee, index) => (
          <div key={index} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{employee.name}</p>
            <p className="text-xs text-muted-foreground">
              {employee.department} • {employee.total} days
            </p>
          </div>
          <AbsenteeDots employee={employee} />
        </div>
        ))}
      </div>
    ),
  },
]

export const KPISection = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between pb-2">
            <div>
              <Title level={5} className="text-sm font-medium">{kpi.title}</Title>
              <p className="text-xs text-muted-foreground">{kpi.description}</p>
            </div>
            <div className="flex-shrink-0">
              {React.cloneElement(kpi.icon, { className: 'h-6 w-6 text-gray-500' })}
            </div>
          </div>
          <div className="p-4">
            <div className="mb-3">
              <div className="text-2xl font-bold">{kpi.kpiValue}</div>
              <p className="text-xs text-muted-foreground">{kpi.kpiLabel}</p>
            </div>
            <div className="h-[200px]">
            {React.isValidElement(kpi.content) ? (
              <div className="flex flex-col h-full">
                {kpi.content}
                {kpi.title === "Absence Distribution" && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {absenceDistribution.map((entry, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                        <div className="text-xs">
                          {entry.name} {entry.value}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>{kpi.content}</div>
            )}
          </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
