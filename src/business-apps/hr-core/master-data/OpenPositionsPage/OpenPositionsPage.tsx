import React, { useState } from "react";
import { PageLayout, PageHeader } from "../components/layout/PageLayout";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { DataTable } from "../components/master-data/DataTable";
import { FilterBar } from "../components/master-data/FilterBar";
import {
  DataDrawer,
  LabelValue,
  SectionHeader,
} from "../components/master-data/DataDrawer";
import { Plus, Upload, Download, X, Check, ArrowUpRight, User } from "lucide-react";

// Position status enum
enum PositionStatus {
  Draft = "draft",
  Approved = "approved",
  Hiring = "hiring",
  Filled = "filled",
  Closed = "closed",
}

// Hiring reason enum
enum HiringReason {
  Growth = "growth",
  Replacement = "replacement",
  Temporary = "temporary",
}

// Mock data for open positions
const mockOpenPositions = [
  {
    id: "POS001",
    title: "Senior Software Engineer",
    jobProfile: "Senior Software Engineer",
    department: "Engineering",
    team: "Backend Development",
    location: "New York, NY",
    status: PositionStatus.Hiring,
    hiringReason: HiringReason.Growth,
    hiringManager: "Emily Davis",
    hiringManagerId: "emp-004",
    plannedStartDate: "2024-03-15",
    costCenter: "CC-1001",
    linkedEmployee: null,
    linkedEmployeeId: null,
    createdAt: "2024-01-10T15:30:00Z",
    updatedAt: "2024-01-15T09:45:00Z",
    createdBy: "Michael Johnson",
    lastUpdated: {
      by: "Sarah Taylor",
      at: "2024-01-15T09:45:00Z",
    },
    created: {
      by: "Michael Johnson",
      at: "2024-01-10T15:30:00Z",
    },
  },
  {
    id: "POS002",
    title: "UX Designer",
    jobProfile: "UX Designer",
    department: "Design",
    team: "UX Design",
    location: "San Francisco, CA",
    status: PositionStatus.Approved,
    hiringReason: HiringReason.Growth,
    hiringManager: "David Wilson",
    hiringManagerId: "emp-005",
    plannedStartDate: "2024-04-01",
    costCenter: "CC-1002",
    linkedEmployee: null,
    linkedEmployeeId: null,
    createdAt: "2024-01-20T11:20:00Z",
    updatedAt: "2024-01-25T14:30:00Z",
    createdBy: "Sarah Taylor",
    lastUpdated: {
      by: "Michael Johnson",
      at: "2024-01-25T14:30:00Z",
    },
    created: {
      by: "Sarah Taylor",
      at: "2024-01-20T11:20:00Z",
    },
  },
  {
    id: "POS003",
    title: "Product Manager",
    jobProfile: "Product Manager",
    department: "Product",
    team: "Product Strategy",
    location: "Remote",
    status: PositionStatus.Draft,
    hiringReason: HiringReason.Replacement,
    hiringManager: "John Doe",
    hiringManagerId: "emp-001",
    plannedStartDate: "2024-04-15",
    costCenter: "CC-1003",
    linkedEmployee: null,
    linkedEmployeeId: null,
    createdAt: "2024-01-30T09:15:00Z",
    updatedAt: "2024-01-30T09:15:00Z",
    createdBy: "Michael Johnson",
    lastUpdated: {
      by: "Michael Johnson",
      at: "2024-01-30T09:15:00Z",
    },
    created: {
      by: "Michael Johnson",
      at: "2024-01-30T09:15:00Z",
    },
  },
  {
    id: "POS004",
    title: "Marketing Specialist",
    jobProfile: "Marketing Specialist",
    department: "Marketing",
    team: "Digital Marketing",
    location: "Chicago, IL",
    status: PositionStatus.Filled,
    hiringReason: HiringReason.Growth,
    hiringManager: "Sarah Taylor",
    hiringManagerId: "emp-006",
    plannedStartDate: "2024-02-01",
    costCenter: "CC-1004",
    linkedEmployee: "Marcus Brown",
    linkedEmployeeId: "emp-103",
    createdAt: "2023-12-15T10:30:00Z",
    updatedAt: "2024-02-01T09:00:00Z",
    createdBy: "Jane Smith",
    lastUpdated: {
      by: "Sarah Taylor",
      at: "2024-02-01T09:00:00Z",
    },
    created: {
      by: "Jane Smith",
      at: "2023-12-15T10:30:00Z",
    },
  },
  {
    id: "POS005",
    title: "Sales Representative",
    jobProfile: "Sales Representative",
    department: "Sales",
    team: "Enterprise Sales",
    location: "Boston, MA",
    status: PositionStatus.Closed,
    hiringReason: HiringReason.Temporary,
    hiringManager: "John Doe",
    hiringManagerId: "emp-001",
    plannedStartDate: "2023-11-01",
    costCenter: "CC-1005",
    linkedEmployee: null,
    linkedEmployeeId: null,
    createdAt: "2023-09-20T14:45:00Z",
    updatedAt: "2023-12-15T16:30:00Z",
    createdBy: "Michael Johnson",
    lastUpdated: {
      by: "John Doe",
      at: "2023-12-15T16:30:00Z",
    },
    created: {
      by: "Michael Johnson",
      at: "2023-09-20T14:45:00Z",
    },
  },
  {
    id: "POS006",
    title: "Senior Software Engineer",
    jobProfile: "Senior Software Engineer",
    department: "Engineering",
    team: "Frontend Development",
    location: "New York, NY",
    status: PositionStatus.Filled,
    hiringReason: HiringReason.Growth,
    hiringManager: "Jane Smith",
    hiringManagerId: "emp-002",
    plannedStartDate: "2023-06-15",
    costCenter: "CC-1001",
    linkedEmployee: "Jane Smith",
    linkedEmployeeId: "emp-002",
    assignedOn: "2023-06-15",
    assignmentType: "onboarding",
    createdAt: "2023-05-10T15:30:00Z",
    updatedAt: "2023-06-15T09:45:00Z",
    createdBy: "Michael Johnson",
    lastUpdated: {
      by: "Michael Johnson",
      at: "2023-06-15T09:45:00Z",
    },
    created: {
      by: "Michael Johnson",
      at: "2023-05-10T15:30:00Z",
    },
  },
];

// Mock data for job profiles
const jobProfiles = [
  "Software Engineer",
  "Senior Software Engineer",
  "UX Designer",
  "Product Manager",
  "Marketing Specialist",
  "Sales Representative",
  "HR Coordinator",
];

// Mock data for departments
const departments = [
  "Engineering",
  "Design",
  "Product",
  "Marketing",
  "Sales",
  "Human Resources",
];

// Mock data for locations
const locations = [
  "New York, NY",
  "San Francisco, CA",
  "Chicago, IL",
  "Boston, MA",
  "Remote",
];

// Mock data for hiring managers
const hiringManagers = [
  { id: "emp-001", name: "John Doe" },
  { id: "emp-004", name: "Emily Davis" },
  { id: "emp-005", name: "David Wilson" },
  { id: "emp-006", name: "Sarah Taylor" },
];

// Mock data for teams
const teams = [
  "Frontend Development",
  "Backend Development",
  "UX Design",
  "Product Strategy",
  "Digital Marketing",
  "Enterprise Sales",
  "HR Operations",
];

// Mock data for cost centers
const costCenters = [
  { id: "CC-1001", name: "Engineering" },
  { id: "CC-1002", name: "Design" },
  { id: "CC-1003", name: "Product" },
  { id: "CC-1004", name: "Marketing" },
  { id: "CC-1005", name: "Sales" },
];

// Mock data for employees
const employees = [
  { id: "emp-101", name: "Alex Johnson" },
  { id: "emp-102", name: "Sophia Williams" },
  { id: "emp-103", name: "Marcus Brown" },
  { id: "emp-104", name: "Emma Garcia" },
  { id: "emp-105", name: "Daniel Lee" },
];

const OpenPositionsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [jobProfileFilter, setJobProfileFilter] = useState("all");
  const [hiringManagerFilter, setHiringManagerFilter] = useState("all");
  const [linkedEmployeeFilter, setLinkedEmployeeFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [drawerView, setDrawerView] = useState<
    "position" | "hiringManager" | "department" | "employee"
  >("position");
  const [drawerData, setDrawerData] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { label: string; onClick: () => void }[]
  >([]);

  // Filter open positions
  const filteredPositions = mockOpenPositions.filter((position) => {
    const matchesSearch =
      searchTerm === "" ||
      position.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position.jobProfile.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (position.linkedEmployee &&
        position.linkedEmployee
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || position.status === statusFilter;
    const matchesDepartment =
      departmentFilter === "all" || position.department === departmentFilter;
    const matchesLocation =
      locationFilter === "all" || position.location === locationFilter;
    const matchesJobProfile =
      jobProfileFilter === "all" || position.jobProfile === jobProfileFilter;
    const matchesHiringManager =
      hiringManagerFilter === "all" ||
      position.hiringManagerId === hiringManagerFilter;
    const matchesLinkedEmployee =
      linkedEmployeeFilter === "all" ||
      (linkedEmployeeFilter === "filled" && position.linkedEmployee) ||
      (linkedEmployeeFilter === "unfilled" && !position.linkedEmployee) ||
      position.linkedEmployeeId === linkedEmployeeFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesDepartment &&
      matchesLocation &&
      matchesJobProfile &&
      matchesHiringManager &&
      matchesLinkedEmployee
    );
  });

  const handleAddNew = () => {
    setEditingPosition(null);
    setShowModal(true);
  };

  const handleEdit = (position: any) => {
    setEditingPosition(position);
    setShowModal(true);
  };

  const handleDelete = (position: any) => {
    // In a real app, this would call an API to delete the position
    console.log("Delete position:", position);
  };

  const handleSave = (formData: any) => {
    // In a real app, this would call an API to save the position
    console.log("Save position:", formData);
    setShowModal(false);
  };

  const handleRowClick = (position: any) => {
    setSelectedPosition(position);
    setDrawerData(position);
    setDrawerView("position");
    setBreadcrumbs([]);
    setDrawerOpen(true);
  };

  const handleViewHiringManager = (managerId: string) => {
    const manager = hiringManagers.find((m) => m.id === managerId);
    if (manager) {
      setBreadcrumbs([
        {
          label: selectedPosition.title,
          onClick: () => {
            setDrawerData(selectedPosition);
            setDrawerView("position");
            setBreadcrumbs([]);
          },
        },
      ]);
      setDrawerData(manager);
      setDrawerView("hiringManager");
    }
  };

  const handleViewDepartment = (departmentName: string) => {
    setBreadcrumbs([
      {
        label: selectedPosition.title,
        onClick: () => {
          setDrawerData(selectedPosition);
          setDrawerView("position");
          setBreadcrumbs([]);
        },
      },
    ]);
    setDrawerData({ name: departmentName });
    setDrawerView("department");
  };

  const handleViewEmployee = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId) || {
      id: employeeId,
      name: selectedPosition.linkedEmployee,
    };
    if (employee) {
      setBreadcrumbs([
        {
          label: selectedPosition.title,
          onClick: () => {
            setDrawerData(selectedPosition);
            setDrawerView("position");
            setBreadcrumbs([]);
          },
        },
      ]);
      setDrawerData(employee);
      setDrawerView("employee");
    }
  };

  const handleEditFromDrawer = () => {
    if (drawerView === "position") {
      setEditingPosition(selectedPosition);
      setShowModal(true);
    }
  };

  const handleAssignEmployee = (position: any) => {
    setSelectedPosition(position);
    setShowAssignModal(true);
  };

  const handleReopenPosition = (position: any) => {
    // In a real app, this would call an API to reopen the position
    console.log("Reopen position:", position);
  };

  const getStatusBadge = (status: PositionStatus) => {
    switch (status) {
      case PositionStatus.Draft:
        return <Badge variant="default">Draft</Badge>;
      case PositionStatus.Approved:
        return <Badge variant="primary">Approved</Badge>;
      case PositionStatus.Hiring:
        return <Badge variant="warning">Hiring</Badge>;
      case PositionStatus.Filled:
        return <Badge variant="success">Filled</Badge>;
      case PositionStatus.Closed:
        return <Badge variant="error">Closed</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getHiringReasonBadge = (reason: HiringReason) => {
    switch (reason) {
      case HiringReason.Growth:
        return <Badge variant="success">Growth</Badge>;
      case HiringReason.Replacement:
        return <Badge variant="warning">Replacement</Badge>;
      case HiringReason.Temporary:
        return <Badge variant="info">Temporary</Badge>;
      default:
        return <Badge variant="default">{reason}</Badge>;
    }
  };

  const columns = [
    { key: "title", header: "Position Title" },
    {
      key: "jobProfile",
      header: "Job Profile",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
    },
    {
      key: "department",
      header: "Department",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (value: PositionStatus) => getStatusBadge(value),
    },
    {
      key: "hiringManager",
      header: "Hiring Manager",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
    },
    {
      key: "plannedStartDate",
      header: "Planned Start Date",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "linkedEmployee",
      header: "Linked Employee",
      render: (value: string | null) =>
        value ? (
          <span className="text-sm text-neutral-700">{value}</span>
        ) : (
          <span className="text-sm text-neutral-500">-</span>
        ),
    },
  ];

  // Render drawer content based on view
  const renderDrawerContent = (data: any) => {
    if (drawerView === "position") {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Position ID" value={data.id} />
            <LabelValue label="Status" value={getStatusBadge(data.status)} />
          </div>

          <LabelValue label="Title" value={data.title} />

          <SectionHeader title="Position Details" />
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Job Profile" value={data.jobProfile} />
            <LabelValue
              label="Hiring Reason"
              value={getHiringReasonBadge(data.hiringReason)}
            />
            <LabelValue
              label="Department"
              value={
                <button
                  className="text-primary-600 hover:underline"
                  onClick={() => handleViewDepartment(data.department)}
                >
                  {data.department}
                </button>
              }
            />
            <LabelValue label="Team" value={data.team} />
            <LabelValue label="Location" value={data.location} />
            <LabelValue
              label="Hiring Manager"
              value={
                <button
                  className="text-primary-600 hover:underline"
                  onClick={() => handleViewHiringManager(data.hiringManagerId)}
                >
                  {data.hiringManager}
                </button>
              }
            />
            <LabelValue label="Cost Center" value={data.costCenter} />
            <LabelValue
              label="Planned Start Date"
              value={new Date(data.plannedStartDate).toLocaleDateString()}
            />
          </div>

          {data.linkedEmployee ? (
            <>
              <SectionHeader title="Linked Employee" />
              <div className="p-4 border border-success-200 bg-success-50 rounded-lg">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-success-500 mr-2" />
                  <div>
                    <button
                      className="text-sm font-medium text-success-800 hover:underline"
                      onClick={() => handleViewEmployee(data.linkedEmployeeId)}
                    >
                      {data.linkedEmployee}
                    </button>
                    <div className="text-xs text-success-600">
                      Position filled on{" "}
                      {new Date(data.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  leftIcon={<ArrowUpRight size={16} />}
                  onClick={() =>
                    (window.location.href = `/employees/${data.linkedEmployeeId}`)
                  }
                >
                  View Employee Profile
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-4">
              {data.status === PositionStatus.Approved && (
                <Button
                  variant="primary"
                  className="w-full"
                  leftIcon={<ArrowUpRight size={16} />}
                  onClick={() => handleAssignEmployee(data)}
                >
                  Assign Employee
                </Button>
              )}
              {data.status === PositionStatus.Closed && (
                <Button
                  variant="outline"
                  className="w-full"
                  leftIcon={<ArrowUpRight size={16} />}
                  onClick={() => handleReopenPosition(data)}
                >
                  Reopen Position
                </Button>
              )}
            </div>
          )}

          <div className="mt-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-600">
              This position was created on{" "}
              {new Date(data.createdAt).toLocaleDateString()} by{" "}
              {data.createdBy} and last updated on{" "}
              {new Date(data.updatedAt).toLocaleDateString()}.
            </p>
          </div>
        </>
      );
    } else if (drawerView === "hiringManager") {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Manager ID" value={data.id} />
            <LabelValue label="Name" value={data.name} />
          </div>

          <div className="mt-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-600">
              This manager is responsible for the hiring process of this
              position.
            </p>
          </div>

          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full"
              leftIcon={<ArrowUpRight size={16} />}
              onClick={() => (window.location.href = `/employees/${data.id}`)}
            >
              View Manager Profile
            </Button>
          </div>
        </>
      );
    } else if (drawerView === "department") {
      return (
        <>
          <LabelValue label="Department Name" value={data.name} />

          <div className="mt-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-600">
              This department is associated with this open position.
            </p>
          </div>
        </>
      );
    } else if (drawerView === "employee") {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Employee ID" value={data.id} />
            <LabelValue label="Name" value={data.name} />
          </div>

          <div className="mt-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-600">
              This employee is assigned to the position.
            </p>
          </div>

          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full"
              leftIcon={<ArrowUpRight size={16} />}
              onClick={() => (window.location.href = `/employees/${data.id}`)}
            >
              View Employee Profile
            </Button>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <PageLayout>
      <PageHeader
        title="Open Positions"
        description="Manage open positions across the organization"
        actions={
          <div className="flex space-x-2">
            <Button variant="outline" leftIcon={<Upload size={16} />}>
              Import
            </Button>
            <Button variant="outline" leftIcon={<Download size={16} />}>
              Export
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus size={16} />}
              onClick={handleAddNew}
            >
              Create Position
            </Button>
          </div>
        }
      />

      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={{
          status: {
            value: statusFilter,
            options: [
              { value: "all", label: "All Status" },
              { value: PositionStatus.Draft, label: "Draft" },
              { value: PositionStatus.Approved, label: "Approved" },
              { value: PositionStatus.Hiring, label: "Hiring" },
              { value: PositionStatus.Filled, label: "Filled" },
              { value: PositionStatus.Closed, label: "Closed" },
            ],
            onChange: setStatusFilter,
          },
          department: {
            value: departmentFilter,
            options: [
              { value: "all", label: "All Departments" },
              ...departments.map((dept) => ({ value: dept, label: dept })),
            ],
            onChange: setDepartmentFilter,
          },
          location: {
            value: locationFilter,
            options: [
              { value: "all", label: "All Locations" },
              ...locations.map((loc) => ({ value: loc, label: loc })),
            ],
            onChange: setLocationFilter,
          },
          jobProfile: {
            value: jobProfileFilter,
            options: [
              { value: "all", label: "All Job Profiles" },
              ...jobProfiles.map((profile) => ({
                value: profile,
                label: profile,
              })),
            ],
            onChange: setJobProfileFilter,
          },
          hiringManager: {
            value: hiringManagerFilter,
            options: [
              { value: "all", label: "All Hiring Managers" },
              ...hiringManagers.map((manager) => ({
                value: manager.id,
                label: manager.name,
              })),
            ],
            onChange: setHiringManagerFilter,
          },
          linkedEmployee: {
            value: linkedEmployeeFilter,
            options: [
              { value: "all", label: "All Positions" },
              { value: "filled", label: "Filled Positions" },
              { value: "unfilled", label: "Unfilled Positions" },
              ...employees.map((emp) => ({
                value: emp.id,
                label: `Filled by ${emp.name}`,
              })),
            ],
            onChange: setLinkedEmployeeFilter,
          },
        }}
      />

      <DataTable
        columns={columns}
        data={filteredPositions}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleRowClick}
      />

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {editingPosition ? "Edit Position" : "Create Position"}
                </h3>
                <button
                  className="text-neutral-400 hover:text-neutral-500"
                  onClick={() => setShowModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Position Title
                  </label>
                  <input
                    type="text"
                    className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                    defaultValue={editingPosition?.title || ""}
                    placeholder="e.g., Senior Software Engineer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Job Profile
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Job Profile</option>
                      {jobProfiles.map((profile) => (
                        <option
                          key={profile}
                          value={profile}
                          selected={editingPosition?.jobProfile === profile}
                        >
                          {profile}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Hiring Reason
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Reason</option>
                      <option
                        value={HiringReason.Growth}
                        selected={
                          editingPosition?.hiringReason === HiringReason.Growth
                        }
                      >
                        Growth
                      </option>
                      <option
                        value={HiringReason.Replacement}
                        selected={
                          editingPosition?.hiringReason ===
                          HiringReason.Replacement
                        }
                      >
                        Replacement
                      </option>
                      <option
                        value={HiringReason.Temporary}
                        selected={
                          editingPosition?.hiringReason ===
                          HiringReason.Temporary
                        }
                      >
                        Temporary
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Department
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option
                          key={dept}
                          value={dept}
                          selected={editingPosition?.department === dept}
                        >
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Team
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Team</option>
                      {teams.map((team) => (
                        <option
                          key={team}
                          value={team}
                          selected={editingPosition?.team === team}
                        >
                          {team}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Location
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Location</option>
                      {locations.map((location) => (
                        <option
                          key={location}
                          value={location}
                          selected={editingPosition?.location === location}
                        >
                          {location}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Hiring Manager
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Hiring Manager</option>
                      {hiringManagers.map((manager) => (
                        <option
                          key={manager.id}
                          value={manager.id}
                          selected={
                            editingPosition?.hiringManagerId === manager.id
                          }
                        >
                          {manager.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Cost Center
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Cost Center</option>
                      {costCenters.map((center) => (
                        <option
                          key={center.id}
                          value={center.id}
                          selected={editingPosition?.costCenter === center.id}
                        >
                          {center.id}: {center.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Planned Start Date
                    </label>
                    <input
                      type="date"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingPosition?.plannedStartDate || ""}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Status
                  </label>
                  <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                    <option
                      value={PositionStatus.Draft}
                      selected={
                        editingPosition?.status === PositionStatus.Draft
                      }
                    >
                      Draft
                    </option>
                    <option
                      value={PositionStatus.Approved}
                      selected={
                        editingPosition?.status === PositionStatus.Approved
                      }
                    >
                      Approved
                    </option>
                    <option
                      value={PositionStatus.Hiring}
                      selected={
                        editingPosition?.status === PositionStatus.Hiring
                      }
                    >
                      Hiring
                    </option>
                    <option
                      value={PositionStatus.Filled}
                      selected={
                        editingPosition?.status === PositionStatus.Filled
                      }
                    >
                      Filled
                    </option>
                    <option
                      value={PositionStatus.Closed}
                      selected={
                        editingPosition?.status === PositionStatus.Closed
                      }
                    >
                      Closed
                    </option>
                  </select>
                </div>

                {editingPosition?.status === PositionStatus.Filled && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Linked Employee
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingPosition?.linkedEmployee || ""}
                      placeholder="Search for employee..."
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2 p-6 border-t border-neutral-200 bg-neutral-50">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                leftIcon={<Check size={16} />}
                onClick={() => handleSave({})}
              >
                {editingPosition ? "Update Position" : "Create Position"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Employee Modal */}
      {showAssignModal && selectedPosition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900">
                  Assign Employee to Position
                </h3>
                <button
                  className="text-neutral-400 hover:text-neutral-500"
                  onClick={() => setShowAssignModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-neutral-700 mb-2">
                  Position Details
                </h4>
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-neutral-500">Title</div>
                      <div className="text-sm font-medium">
                        {selectedPosition.title}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">Department</div>
                      <div className="text-sm font-medium">
                        {selectedPosition.department}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">
                        Job Profile
                      </div>
                      <div className="text-sm font-medium">
                        {selectedPosition.jobProfile}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">Location</div>
                      <div className="text-sm font-medium">
                        {selectedPosition.location}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Select Employee
                  </label>
                  <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                    <option value="">Select an employee...</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                    defaultValue={selectedPosition.plannedStartDate}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Assignment Type
                  </label>
                  <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                    <option value="onboarding">Onboarding (New Hire)</option>
                    <option value="internal">Internal Move</option>
                    <option value="promotion">Promotion</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                    rows={3}
                    placeholder="Add any notes about this assignment..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="confirm-assignment"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded-sm"
                  />
                  <label
                    htmlFor="confirm-assignment"
                    className="ml-2 block text-sm text-neutral-700"
                  >
                    I confirm this assignment and understand it will mark the
                    position as filled
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 p-6 border-t border-neutral-200 bg-neutral-50">
              <Button
                variant="outline"
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                leftIcon={<Check size={16} />}
                onClick={() => {
                  // In a real app, this would call an API to assign the employee
                  console.log(
                    "Assign employee to position:",
                    selectedPosition.id
                  );
                  setShowAssignModal(false);
                }}
              >
                Assign Employee
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Data Drawer */}
      <DataDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          drawerView === "position"
            ? `Position: ${drawerData?.title}`
            : drawerView === "hiringManager"
            ? `Hiring Manager: ${drawerData?.name}`
            : drawerView === "employee"
            ? `Employee: ${drawerData?.name}`
            : `Department: ${drawerData?.name}`
        }
        data={drawerData}
        onEdit={drawerView === "position" ? handleEditFromDrawer : undefined}
        breadcrumbs={breadcrumbs}
        renderContent={renderDrawerContent}
        lastUpdated={drawerData?.lastUpdated}
        createdInfo={drawerData?.created}
      />
    </PageLayout>
  );
};

export default OpenPositionsPage;
