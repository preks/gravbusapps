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
import {
  Plus,
  Upload,
  Download,
  X,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Project } from "../types";

// Mock data for projects
const mockProjects: Project[] = [
  {
    id: "PRJ001",
    name: "Website Redesign",
    code: "WEB-2024",
    description: "Complete redesign of the company website with new branding",
    status: "active",
    startDate: "2024-01-15",
    endDate: "2024-06-30",
    clientName: "Internal",
    billable: false,
    costCenterId: "CC-1001",
    departmentId: "DEPT001",
    projectManagerId: "emp-004",
    projectManagerName: "Emily Davis",
  },
  {
    id: "PRJ002",
    name: "Mobile App Development",
    code: "APP-2024",
    description: "Development of a new mobile application for customers",
    status: "active",
    startDate: "2024-02-01",
    endDate: "2024-08-31",
    clientName: "Acme Corp",
    billable: true,
    costCenterId: "CC-1001",
    departmentId: "DEPT001",
    projectManagerId: "emp-002",
    projectManagerName: "Jane Smith",
  },
  {
    id: "PRJ003",
    name: "HR System Implementation",
    code: "HR-2024",
    description: "Implementation of a new HR management system",
    status: "active",
    startDate: "2024-01-01",
    endDate: "2024-03-31",
    clientName: "Internal",
    billable: false,
    costCenterId: "CC-1003",
    departmentId: "DEPT003",
    projectManagerId: "emp-003",
    projectManagerName: "Michael Johnson",
  },
  {
    id: "PRJ004",
    name: "Marketing Campaign",
    code: "MKT-2024",
    description: "Q2 marketing campaign for new product launch",
    status: "planned",
    startDate: "2024-04-01",
    endDate: "2024-06-30",
    clientName: "Internal",
    billable: false,
    costCenterId: "CC-1004",
    departmentId: "DEPT004",
    projectManagerId: "emp-006",
    projectManagerName: "Sarah Taylor",
  },
  {
    id: "PRJ005",
    name: "Legacy System Migration",
    code: "MIG-2023",
    description: "Migration from legacy systems to new platform",
    status: "archived",
    startDate: "2023-06-01",
    endDate: "2023-12-31",
    clientName: "Internal",
    billable: false,
    costCenterId: "CC-1001",
    departmentId: "DEPT001",
    projectManagerId: "emp-002",
    projectManagerName: "Jane Smith",
  },
  {
    id: "PRJ006",
    name: "Client Portal",
    code: "CPT-2024",
    description: "Development of a client portal for account management",
    status: "active",
    startDate: "2024-02-15",
    endDate: "2024-07-31",
    clientName: "XYZ Industries",
    billable: true,
    costCenterId: "CC-1001",
    departmentId: "DEPT001",
    projectManagerId: "emp-004",
    projectManagerName: "Emily Davis",
  },
];

// Mock data for departments
const departments = [
  { id: "DEPT001", name: "Engineering" },
  { id: "DEPT002", name: "Design" },
  { id: "DEPT003", name: "Human Resources" },
  { id: "DEPT004", name: "Marketing" },
];

// Mock data for cost centers
const costCenters = [
  { id: "CC-1001", name: "Engineering" },
  { id: "CC-1002", name: "Design" },
  { id: "CC-1003", name: "Human Resources" },
  { id: "CC-1004", name: "Marketing" },
];

// Mock data for project managers
const projectManagers = [
  { id: "emp-002", name: "Jane Smith" },
  { id: "emp-003", name: "Michael Johnson" },
  { id: "emp-004", name: "Emily Davis" },
  { id: "emp-006", name: "Sarah Taylor" },
];

// Mock data for employees assigned to a project
const mockAssignedEmployees = [
  {
    id: "emp-001",
    name: "John Doe",
    position: "Senior Developer",
    department: "Engineering",
    avatar: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg",
    hoursLogged: 120,
  },
  {
    id: "emp-002",
    name: "Jane Smith",
    position: "UX Designer",
    department: "Design",
    avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg",
    hoursLogged: 85,
  },
  {
    id: "emp-003",
    name: "Michael Johnson",
    position: "Product Manager",
    department: "Product",
    avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg",
    hoursLogged: 65,
  },
];

const ProjectsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [billableFilter, setBillableFilter] = useState("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [drawerView, setDrawerView] = useState<
    "project" | "employees" | "department" | "manager"
  >("project");
  const [drawerData, setDrawerData] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { label: string; onClick: () => void }[]
  >([]);

  // Filter projects
  const filteredProjects = mockProjects.filter((project) => {
    const matchesSearch =
      searchTerm === "" ||
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectManagerName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    const matchesDepartment =
      departmentFilter === "all" || project.departmentId === departmentFilter;
    const matchesBillable =
      billableFilter === "all" ||
      (billableFilter === "billable" && project.billable) ||
      (billableFilter === "non-billable" && !project.billable);

    // Time range filter
    const now = new Date();
    const matchesTimeRange =
      timeRangeFilter === "all" ||
      (timeRangeFilter === "active" &&
        project.status === "active" &&
        (!project.endDate || new Date(project.endDate) >= now)) ||
      (timeRangeFilter === "completed" &&
        (project.status === "archived" ||
          (project.endDate && new Date(project.endDate) < now)));

    return (
      matchesSearch &&
      matchesStatus &&
      matchesDepartment &&
      matchesBillable &&
      matchesTimeRange
    );
  });

  const handleAddNew = () => {
    setEditingProject(null);
    setShowModal(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setShowModal(true);
  };

  const handleDelete = (project: Project) => {
    // In a real app, this would call an API to delete the project
    console.log("Delete project:", project);
  };

  const handleSave = (formData: any) => {
    // In a real app, this would call an API to save the project
    console.log("Save project:", formData);
    setShowModal(false);
  };

  const handleRowClick = (project: Project) => {
    setSelectedProject(project);
    setDrawerData(project);
    setDrawerView("project");
    setBreadcrumbs([]);
    setDrawerOpen(true);
  };

  const handleViewEmployees = () => {
    setBreadcrumbs([
      {
        label: selectedProject?.name || "",
        onClick: () => {
          setDrawerData(selectedProject);
          setDrawerView("project");
          setBreadcrumbs([]);
        },
      },
    ]);
    setDrawerData(mockAssignedEmployees);
    setDrawerView("employees");
  };

  const handleViewDepartment = (departmentId: string) => {
    const department = departments.find((dept) => dept.id === departmentId);
    if (department) {
      setBreadcrumbs([
        {
          label: selectedProject?.name || "",
          onClick: () => {
            setDrawerData(selectedProject);
            setDrawerView("project");
            setBreadcrumbs([]);
          },
        },
      ]);
      setDrawerData(department);
      setDrawerView("department");
    }
  };

  const handleViewManager = (managerId: string) => {
    const manager = projectManagers.find((m) => m.id === managerId);
    if (manager) {
      setBreadcrumbs([
        {
          label: selectedProject?.name || "",
          onClick: () => {
            setDrawerData(selectedProject);
            setDrawerView("project");
            setBreadcrumbs([]);
          },
        },
      ]);
      setDrawerData(manager);
      setDrawerView("manager");
    }
  };

  const handleEditFromDrawer = () => {
    if (drawerView === "project" && selectedProject) {
      setEditingProject(selectedProject);
      setShowModal(true);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "planned":
        return <Badge variant="warning">Planned</Badge>;
      case "archived":
        return <Badge variant="default">Archived</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getBillableBadge = (billable: boolean) => {
    return billable ? (
      <Badge variant="primary">Billable</Badge>
    ) : (
      <Badge variant="default">Non-billable</Badge>
    );
  };

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate) return "Not set";

    const formattedStart = new Date(startDate).toLocaleDateString();
    if (!endDate) return `From ${formattedStart}`;

    const formattedEnd = new Date(endDate).toLocaleDateString();
    return `${formattedStart} - ${formattedEnd}`;
  };

  const columns = [
    { key: "name", header: "Name" },
    {
      key: "code",
      header: "Code",
      render: (value: string | undefined) => (
        <span className="text-sm text-neutral-700">{value || "-"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: "projectManagerName",
      header: "Project Manager",
      render: (value: string | undefined) => (
        <span className="text-sm text-neutral-700">
          {value || "Not assigned"}
        </span>
      ),
    },
    {
      key: "billable",
      header: "Billable",
      render: (value: boolean) => getBillableBadge(value),
    },
    {
      key: "dateRange",
      header: "Date Range",
      render: (_: any, row: Project) => (
        <span className="text-sm text-neutral-700">
          {formatDateRange(row.startDate, row.endDate)}
        </span>
      ),
    },
  ];

  // Render drawer content based on view
  const renderDrawerContent = (data: any) => {
    if (drawerView === "project") {
      const project = data as Project;
      const department = departments.find(
        (dept) => dept.id === project.departmentId
      );
      const costCenter = costCenters.find(
        (cc) => cc.id === project.costCenterId
      );

      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Project ID" value={project.id} />
            <LabelValue label="Status" value={getStatusBadge(project.status)} />
          </div>

          {project.code && (
            <LabelValue label="Project Code" value={project.code} />
          )}

          <LabelValue
            label="Description"
            value={project.description || "No description provided"}
          />

          <SectionHeader title="Project Details" />
          <div className="grid grid-cols-2 gap-4">
            <LabelValue
              label="Project Manager"
              value={
                project.projectManagerId ? (
                  <button
                    className="text-primary-600 hover:underline"
                    onClick={() =>
                      handleViewManager(project.projectManagerId || "")
                    }
                  >
                    {project.projectManagerName}
                  </button>
                ) : (
                  "Not assigned"
                )
              }
            />

            {project.departmentId && (
              <LabelValue
                label="Department"
                value={
                  <button
                    className="text-primary-600 hover:underline"
                    onClick={() =>
                      handleViewDepartment(project.departmentId || "")
                    }
                  >
                    {department?.name || project.departmentId}
                  </button>
                }
              />
            )}

            {project.costCenterId && (
              <LabelValue
                label="Cost Center"
                value={
                  costCenter?.name
                    ? `${project.costCenterId} (${costCenter.name})`
                    : project.costCenterId
                }
              />
            )}

            <LabelValue
              label="Date Range"
              value={formatDateRange(project.startDate, project.endDate)}
            />

            <LabelValue
              label="Client"
              value={project.clientName || "Not specified"}
            />

            <LabelValue
              label="Billable"
              value={getBillableBadge(project.billable)}
            />
          </div>

          <SectionHeader title="Resource Allocation" />
          <div className="mb-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleViewEmployees}
            >
              View Assigned Employees
            </Button>
          </div>

          <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-primary-500 mr-2 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-neutral-900">
                  Project Information
                </h4>
                <p className="text-sm text-neutral-600 mt-1">
                  This project has {mockAssignedEmployees.length} assigned
                  employees with a total of{" "}
                  {mockAssignedEmployees.reduce(
                    (sum, emp) => sum + emp.hoursLogged,
                    0
                  )}{" "}
                  hours logged.
                </p>
              </div>
            </div>
          </div>
        </>
      );
    } else if (drawerView === "employees") {
      return (
        <>
          <div className="flex flex-col gap-4">
            {data.map((employee: any) => (
              <div
                key={employee.id}
                className="p-4 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={employee.avatar}
                      alt={employee.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="font-medium text-neutral-900">
                        {employee.name}
                      </h4>
                      <p className="text-sm text-neutral-500">
                        {employee.position} • {employee.department}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {employee.hoursLogged} hours
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <div className="flex items-start">
              <Clock className="h-5 w-5 text-primary-500 mr-2 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-neutral-900">
                  Time Allocation
                </h4>
                <p className="text-sm text-neutral-600 mt-1">
                  Total hours logged:{" "}
                  {data.reduce(
                    (sum: number, emp: any) => sum + emp.hoursLogged,
                    0
                  )}{" "}
                  hours
                </p>
              </div>
            </div>
          </div>
        </>
      );
    } else if (drawerView === "department") {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Department ID" value={data.id} />
            <LabelValue label="Name" value={data.name} />
          </div>

          <div className="mt-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-600">
              This department is associated with this project.
            </p>
          </div>
        </>
      );
    } else if (drawerView === "manager") {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Manager ID" value={data.id} />
            <LabelValue label="Name" value={data.name} />
          </div>

          <div className="mt-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-600">
              This employee is the project manager for this project.
            </p>
          </div>

          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full"
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
        title="Projects"
        description="Manage projects across the organization"
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
              Add Project
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
              { value: "active", label: "Active" },
              { value: "planned", label: "Planned" },
              { value: "archived", label: "Archived" },
            ],
            onChange: setStatusFilter,
          },
          department: {
            value: departmentFilter,
            options: [
              { value: "all", label: "All Departments" },
              ...departments.map((dept) => ({
                value: dept.id,
                label: dept.name,
              })),
            ],
            onChange: setDepartmentFilter,
          },
          billable: {
            value: billableFilter,
            options: [
              { value: "all", label: "All Projects" },
              { value: "billable", label: "Billable" },
              { value: "non-billable", label: "Non-billable" },
            ],
            onChange: setBillableFilter,
          },
          timeRange: {
            value: timeRangeFilter,
            options: [
              { value: "all", label: "All Time Periods" },
              { value: "active", label: "Active & Upcoming" },
              { value: "completed", label: "Completed" },
            ],
            onChange: setTimeRangeFilter,
          },
        }}
      />

      <DataTable
        columns={columns}
        data={filteredProjects}
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
                  {editingProject ? "Edit Project" : "Add Project"}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingProject?.name || ""}
                      placeholder="e.g., Website Redesign"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Project Code
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingProject?.code || ""}
                      placeholder="e.g., WEB-2024"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                    rows={3}
                    defaultValue={editingProject?.description || ""}
                    placeholder="Brief description of the project"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Status
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option
                        value="active"
                        selected={editingProject?.status === "active"}
                      >
                        Active
                      </option>
                      <option
                        value="planned"
                        selected={editingProject?.status === "planned"}
                      >
                        Planned
                      </option>
                      <option
                        value="archived"
                        selected={editingProject?.status === "archived"}
                      >
                        Archived
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Project Manager
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Project Manager</option>
                      {projectManagers.map((manager) => (
                        <option
                          key={manager.id}
                          value={manager.id}
                          selected={
                            editingProject?.projectManagerId === manager.id
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
                      Start Date
                    </label>
                    <input
                      type="date"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingProject?.startDate || ""}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingProject?.endDate || ""}
                    />
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
                          key={dept.id}
                          value={dept.id}
                          selected={editingProject?.departmentId === dept.id}
                        >
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Cost Center
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Cost Center</option>
                      {costCenters.map((cc) => (
                        <option
                          key={cc.id}
                          value={cc.id}
                          selected={editingProject?.costCenterId === cc.id}
                        >
                          {cc.id}: {cc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Client Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingProject?.clientName || ""}
                      placeholder="e.g., Acme Corp or Internal"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Billable
                    </label>
                    <div className="flex items-center space-x-4 mt-2">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="billable"
                          value="yes"
                          defaultChecked={editingProject?.billable === true}
                          className="text-primary-600 focus:ring-primary-500 h-4 w-4"
                        />
                        <span className="ml-2 text-sm text-neutral-700">
                          Yes
                        </span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="billable"
                          value="no"
                          defaultChecked={editingProject?.billable === false}
                          className="text-primary-600 focus:ring-primary-500 h-4 w-4"
                        />
                        <span className="ml-2 text-sm text-neutral-700">
                          No
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
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
                {editingProject ? "Update Project" : "Create Project"}
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
          drawerView === "project"
            ? drawerData?.name
            : drawerView === "employees"
            ? `Employees on ${selectedProject?.name}`
            : drawerView === "department"
            ? drawerData?.name
            : `${drawerData?.name}`
        }
        data={drawerData}
        onEdit={drawerView === "project" ? handleEditFromDrawer : undefined}
        breadcrumbs={breadcrumbs}
        renderContent={renderDrawerContent}
      />
    </PageLayout>
  );
};

export default ProjectsPage;
