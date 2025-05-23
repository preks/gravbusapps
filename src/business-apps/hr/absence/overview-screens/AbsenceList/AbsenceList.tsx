import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { Table, Input, Button, Tag, Select } from 'antd'
import {
  RiSearchLine,
  RiFilterLine,
  RiDownloadLine,
  RiAddLine,
  RiSortAsc,
  RiUserLine,
  RiFileListLine,
  RiCheckLine,
  RiCloseLine
} from '@remixicon/react'

// Action Button Component
function ActionButton({ status }: { status: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close the menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
      >
        <RiFileListLine className="h-4 w-4 text-sky-400" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute left-0 top-full mt-1 z-50 w-48 rounded-md border border-gray-200 bg-white shadow-lg"
        >
          <div className="py-1">
            {status === "pending" && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // Handle approve action
                    setIsOpen(false)
                  }}
                  className="flex w-full items-center px-3 py-2 text-sm text-left hover:bg-gray-50"
                >
                  <RiCheckLine className="mr-2 h-4 w-4 text-emerald-500" />
                  Approve
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // Handle reject action
                    setIsOpen(false)
                  }}
                  className="flex w-full items-center px-3 py-2 text-sm text-left hover:bg-gray-50"
                >
                  <RiCloseLine className="mr-2 h-4 w-4 text-rose-500" />
                  Reject
                </button>
                <div className="border-t my-1"></div>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                // Handle view profile action
                setIsOpen(false)
              }}
              className="flex w-full items-center px-3 py-2 text-sm text-left hover:bg-gray-50"
            >
              <RiUserLine className="mr-2 h-4 w-4 text-gray-500" />
              View Profile
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Sample data for absences with more detailed information
const absences = [
  {
    id: 1,
    group: "Sick Leave",
    type: "Personal Illness",
    startDate: new Date(2025, 4, 12),
    endDate: new Date(2025, 4, 14),
    requester: "Sarah Chen",
    department: "Design",
    status: "approved",
  },
  {
    id: 2,
    group: "Vacation",
    type: "Annual Leave",
    startDate: new Date(2025, 4, 25),
    endDate: new Date(2025, 4, 27),
    requester: "Emma Wilson",
    department: "Marketing",
    status: "approved",
  },
  {
    id: 3,
    group: "Special Leave",
    type: "Family Event",
    startDate: new Date(2025, 4, 18),
    endDate: new Date(2025, 4, 20),
    requester: "Michael Rodriguez",
    department: "Product",
    status: "approved",
  },
  {
    id: 4,
    group: "Work Leave",
    type: "Conference",
    startDate: new Date(2025, 4, 20),
    endDate: new Date(2025, 4, 22),
    requester: "Alex Johnson",
    department: "Engineering",
    status: "approved",
  },
  {
    id: 5,
    group: "Vacation",
    type: "Summer Holiday",
    startDate: new Date(2025, 4, 13),
    endDate: new Date(2025, 4, 13),
    requester: "James Smith",
    department: "Sales",
    status: "approved",
  },
  {
    id: 6,
    group: "Sick Leave",
    type: "Doctor Appointment",
    startDate: new Date(2025, 4, 15),
    endDate: new Date(2025, 4, 15),
    requester: "Taylor Smith",
    department: "Sales",
    status: "pending",
  },
  {
    id: 7,
    group: "Work Leave",
    type: "Training",
    startDate: new Date(2025, 4, 28),
    endDate: new Date(2025, 4, 30),
    requester: "Jordan Lee",
    department: "Finance",
    status: "pending",
  },
  {
    id: 8,
    group: "Special Leave",
    type: "Bereavement",
    startDate: new Date(2025, 5, 2),
    endDate: new Date(2025, 5, 6),
    requester: "Casey Wilson",
    department: "HR",
    status: "pending",
  },
  {
    id: 9,
    group: "Vacation",
    type: "Personal Time",
    startDate: new Date(2025, 5, 10),
    endDate: new Date(2025, 5, 14),
    requester: "Alex Johnson",
    department: "Engineering",
    status: "pending",
  },
  {
    id: 10,
    group: "Sick Leave",
    type: "Family Care",
    startDate: new Date(2025, 5, 8),
    endDate: new Date(2025, 5, 9),
    requester: "Sarah Chen",
    department: "Design",
    status: "approved",
  },
]

// Calculate the number of days between two dates (inclusive)
const calculateDays = (startDate: Date, endDate: Date) => {
  const diffTime = endDate.getTime() - startDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  return diffDays
}

// Format date range as a string
const formatDateRange = (startDate: Date, endDate: Date) => {
  if (startDate.getTime() === endDate.getTime()) {
    return format(startDate, "MMM d, yyyy")
  }
  return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
}

// Get color for absence group
const getGroupColor = (group: string) => {
  type GroupColorMap = {
    'Sick Leave': string;
    Vacation: string;
    'Special Leave': string;
    'Work Leave': string;
  }
  
  const colors: GroupColorMap = {
    "Sick Leave": "bg-red-100 text-red-600",
    "Vacation": "bg-green-100 text-green-600",
    "Special Leave": "bg-purple-100 text-purple-600",
    "Work Leave": "bg-blue-100 text-blue-600",
  }
  return colors[group as keyof GroupColorMap] || "bg-gray-100 text-gray-600"
}

// Get color for status
const getStatusColor = (status: 'approved' | 'pending' | 'rejected' | string) => {
  type StatusColorMap = {
    approved: string;
    pending: string;
    rejected: string;
  }
  
  const colors: StatusColorMap = {
    approved: "bg-green-100 text-green-600",
    pending: "bg-yellow-100 text-yellow-600",
    rejected: "bg-red-100 text-red-600",
  }
  return colors[status as keyof StatusColorMap] || "bg-gray-100 text-gray-600"
}

export const AbsenceList = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [filteredAbsences, setFilteredAbsences] = useState(absences)
  const [sortBy, setSortBy] = useState("date")
  const [sortDirection, setSortDirection] = useState("asc")

  type AbsenceType = "Sick Leave" | "Vacation" | "Special Leave" | "Work Leave";
  type AbsenceStatus = "approved" | "pending" | "rejected";

  const typeColors: Record<AbsenceType, string> = {
    "Sick Leave": "#FF4D4F",
    Vacation: "#1890FF",
    "Special Leave": "#2FC25B",
    "Work Leave": "#FADB14",
  }

  const statusColors: Record<AbsenceStatus, string> = {
    approved: "#1890FF",
    pending: "#FF4D4F",
    rejected: "#2FC25B",
  }

  const handleFilter = () => {
    // Add filter logic here
  }

  const handleExport = () => {
    // Add export logic here
  }

  const handleAddAbsence = () => {
    // Add add absence logic here
  }

  const handleSort = () => {
    // Add sort logic here
  }

  // Filter absences based on search term
  useEffect(() => {
    const filtered = absences.filter((absence) =>
      absence.requester.toLowerCase().includes(searchQuery.toLowerCase()) ||
      absence.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      absence.group.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredAbsences(filtered)
  }, [searchQuery])

  // Sort absences
  useEffect(() => {
    const sorted = [...filteredAbsences].sort((a, b) => {
      if (sortBy === "date") {
        return sortDirection === "asc"
          ? new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          : new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      }
      if (sortBy === "requester") {
        return sortDirection === "asc"
          ? a.requester.localeCompare(b.requester)
          : b.requester.localeCompare(a.requester)
      }
      return 0
    })
    setFilteredAbsences(sorted)
  }, [sortBy, sortDirection])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search absences..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64"
          prefix={<RiSearchLine />}
        />
        <Button
          type="default"
          onClick={handleFilter}
          icon={<RiFilterLine />}
        >
          Filter
        </Button>
        <Button
          type="default"
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
      </div>

      <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          placeholder="Status"
          style={{ width: 120 }}
        >
          <Select.Option value="all">All Statuses</Select.Option>
          <Select.Option value="approved">Approved</Select.Option>
          <Select.Option value="pending">Pending</Select.Option>
          <Select.Option value="rejected">Rejected</Select.Option>
        </Select>
        <Select
          value={typeFilter}
          onChange={(value) => setTypeFilter(value)}
          placeholder="Type"
          style={{ width: 120 }}
        >
          <Select.Option value="all">All Groups</Select.Option>
          <Select.Option value="sick">Sick Leave</Select.Option>
          <Select.Option value="vacation">Vacation</Select.Option>
          <Select.Option value="special">Special Leave</Select.Option>
          <Select.Option value="work">Work Leave</Select.Option>
        </Select>
      </div>

      <div className="flex items-center gap-4">
        <Button
          type="default"
          onClick={handleSort}
          icon={<RiSortAsc />}
        >
          Sort by Date
        </Button>
      </div>

      <Table
        dataSource={filteredAbsences}
        columns={[
          {
            title: 'Group',
            dataIndex: 'group',
            key: 'group',
          },
          {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (value: AbsenceType) => (
              <Tag color={typeColors[value]}>
                {value}
              </Tag>
            ),
          },
          {
            title: 'Start Date',
            dataIndex: 'startDate',
            key: 'startDate',
            render: (date: Date) => format(date, 'MMM d, yyyy'),
          },
          {
            title: 'End Date',
            dataIndex: 'endDate',
            key: 'endDate',
            render: (date: Date) => format(date, 'MMM d, yyyy'),
          },
          {
            title: 'Requester',
            dataIndex: 'requester',
            key: 'requester',
            render: (name: string) => (
              <div className="flex items-center gap-2">
                <RiUserLine />
                {name}
              </div>
            ),
          },
          {
            title: 'Department',
            dataIndex: 'department',
            key: 'department',
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: AbsenceStatus) => (
              <Tag color={statusColors[status]}>
                {status}
              </Tag>
            ),
          },
          {
            title: 'Actions',
            key: 'actions',
            render: (_, record: any) => (
              <ActionButton status={record.status} />
            ),
          },
        ]}
      />
    </div>
  );
};
