"use client"

import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DownloadIcon, FilterIcon, PlusIcon, SearchIcon, SortAscIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Zap, CheckCircle, XCircle, User } from "lucide-react"

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
        <Zap className="h-4 w-4 text-sky-400" />
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
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
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
                  <XCircle className="mr-2 h-4 w-4 text-rose-500" />
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
              <User className="mr-2 h-4 w-4 text-gray-500" />
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
    status: "rejected",
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
  switch (group) {
    case "Sick Leave":
      return "bg-rose-100 text-rose-800 hover:bg-rose-200"
    case "Vacation":
      return "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
    case "Special Leave":
      return "bg-violet-100 text-violet-800 hover:bg-violet-200"
    case "Work Leave":
      return "bg-amber-100 text-amber-800 hover:bg-amber-200"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-200"
  }
}

// Get color for status
const getStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 hover:bg-green-200"
    case "pending":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
    case "rejected":
      return "bg-red-100 text-red-800 hover:bg-red-200"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-200"
  }
}

export default function AbsencesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [groupFilter, setGroupFilter] = useState("all")

  // Filter absences based on search query and filters
  const filteredAbsences = absences.filter((absence) => {
    // Search filter
    const matchesSearch =
      absence.requester.toLowerCase().includes(searchQuery.toLowerCase()) ||
      absence.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      absence.group.toLowerCase().includes(searchQuery.toLowerCase()) ||
      absence.department.toLowerCase().includes(searchQuery.toLowerCase())

    // Status filter
    const matchesStatus = statusFilter === "all" || absence.status === statusFilter

    // Group filter
    const matchesGroup = groupFilter === "all" || absence.group === groupFilter

    return matchesSearch && matchesStatus && matchesGroup
  })

  return (
    <div className="p-3 max-w-6xl mx-auto w-full">
      <div className="bg-white border rounded-lg">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <h2 className="text-lg font-semibold">Absence List</h2>
            <Button className="bg-black text-white hover:bg-gray-800 gap-2">
              <PlusIcon className="h-4 w-4" />
              New Absence
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 border-b">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search absences..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                  <SelectItem value="Vacation">Vacation</SelectItem>
                  <SelectItem value="Special Leave">Special Leave</SelectItem>
                  <SelectItem value="Work Leave">Work Leave</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon">
                <FilterIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <DownloadIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="w-[140px]">
                  <div className="flex items-center gap-1">
                    Group
                    <SortAscIcon className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-center">Days</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAbsences.length > 0 ? (
                filteredAbsences.map((absence) => (
                  <TableRow key={absence.id} className="hover:bg-gray-50 cursor-pointer">
                    <TableCell className="pr-0">
                      <ActionButton status={absence.status} />
                    </TableCell>
                    <TableCell>
                      <Badge className={`font-normal ${getGroupColor(absence.group)}`}>{absence.group}</Badge>
                    </TableCell>
                    <TableCell>{absence.type}</TableCell>
                    <TableCell>{formatDateRange(absence.startDate, absence.endDate)}</TableCell>
                    <TableCell className="text-center">{calculateDays(absence.startDate, absence.endDate)}</TableCell>
                    <TableCell>
                      <div>
                        <div>{absence.requester}</div>
                        <div className="text-xs text-gray-500">{absence.department}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`font-normal capitalize ${getStatusColor(absence.status)}`}>
                        {absence.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No absences found matching your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="p-3 border-t flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {filteredAbsences.length} of {absences.length} absences
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" className="bg-gray-100">
              1
            </Button>
            <Button variant="outline" size="sm">
              2
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
