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
import { Plus, Upload, Download, X, Check } from "lucide-react";

// Mock data for departments
const mockDepartments = [
  {
    id: "DEPT001",
    name: "Engineering",
    description: "Software development and technical operations",
    headCount: 32,
    managerId: "emp-002",
    managerName: "Jane Smith",
    parentDepartmentId: null,
    costCenter: "CC-1001",
    active: true,
    lastUpdated: {
      by: "Michael Johnson",
      at: "2023-12-10T15:30:00Z",
    },
    created: {
      by: "Sarah Taylor",
      at: "2023-10-05T09:15:00Z",
    },
  },
  {
    id: "DEPT002",
    name: "Design",
    description: "Product and user experience design",
    headCount: 15,
    managerId: "emp-005",
    managerName: "David Wilson",
    parentDepartmentId: null,
    costCenter: "CC-1002",
    active: true,
    lastUpdated: {
      by: "Jane Smith",
      at: "2023-11-20T09:45:00Z",
    },
    created: {
      by: "Michael Johnson",
      at: "2023-09-15T14:30:00Z",
    },
  },
  {
    id: "DEPT003",
    name: "Product",
    description: "Product management and strategy",
    headCount: 10,
    managerId: "emp-004",
    managerName: "Emily Davis",
    parentDepartmentId: null,
    costCenter: "CC-1003",
    active: true,
    lastUpdated: {
      by: "John Doe",
      at: "2023-12-01T16:30:00Z",
    },
    created: {
      by: "Michael Johnson",
      at: "2023-08-10T10:15:00Z",
    },
  },
  {
    id: "DEPT004",
    name: "Marketing",
    description: "Brand management and market strategies",
    headCount: 8,
    managerId: null,
    managerName: null,
    parentDepartmentId: null,
    costCenter: "CC-1004",
    active: true,
    lastUpdated: {
      by: "Sarah Taylor",
      at: "2023-11-15T14:20:00Z",
    },
    created: {
      by: "John Doe",
      at: "2023-07-15T11:30:00Z",
    },
  },
  {
    id: "DEPT005",
    name: "Frontend Engineering",
    description: "Frontend development and UI implementation",
    headCount: 12,
    managerId: "emp-004",
    managerName: "Emily Davis",
    parentDepartmentId: "DEPT001",
    costCenter: "CC-1001-1",
    active: true,
    lastUpdated: {
      by: "Michael Johnson",
      at: "2023-10-25T13:10:00Z",
    },
    created: {
      by: "Sarah Taylor",
      at: "2023-06-20T09:30:00Z",
    },
  },
  {
    id: "DEPT006",
    name: "Backend Engineering",
    description: "Backend services and API development",
    headCount: 15,
    managerId: "emp-002",
    managerName: "Jane Smith",
    parentDepartmentId: "DEPT001",
    costCenter: "CC-1001-2",
    active: true,
    lastUpdated: {
      by: "Jane Smith",
      at: "2023-12-05T11:20:00Z",
    },
    created: {
      by: "John Doe",
      at: "2023-05-10T14:45:00Z",
    },
  },
];

// Mock employees for department
const mockEmployeesForDepartment = [
  {
    id: "emp-001",
    name: "John Doe",
    position: "Software Engineer",
    department: "Engineering",
    avatar: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg",
  },
  {
    id: "emp-002",
    name: "Jane Smith",
    position: "UX Designer",
    department: "Design",
    avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg",
  },
  {
    id: "emp-003",
    name: "Michael Johnson",
    position: "Product Manager",
    department: "Product",
    avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg",
  },
];

// Mock job profiles for department
const mockJobProfilesForDepartment = [
  { id: "JP001", title: "Software Engineer", level: "Mid", count: 5 },
  { id: "JP002", title: "Senior Software Engineer", level: "Senior", count: 3 },
  { id: "JP003", title: "Engineering Manager", level: "Lead", count: 1 },
];

const DepartmentsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [parentFilter, setParentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [drawerView, setDrawerView] = useState<
    "department" | "employees" | "jobProfiles" | "parent" | "children"
  >("department");
  const [drawerData, setDrawerData] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { label: string; onClick: () => void }[]
  >([]);

  // Get unique parent departments for filter
  const parentDepartments = mockDepartments
    .filter((dept) => dept.parentDepartmentId === null)
    .map((dept) => ({ id: dept.id, name: dept.name }));

  // Filter departments
  const filteredDepartments = mockDepartments.filter((department) => {
    const matchesSearch =
      searchTerm === "" ||
      department.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      department.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (department.description &&
        department.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    const matchesParent =
      parentFilter === "all" ||
      (parentFilter === "root" && department.parentDepartmentId === null) ||
      department.parentDepartmentId === parentFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && department.active) ||
      (statusFilter === "inactive" && !department.active);

    return matchesSearch && matchesParent && matchesStatus;
  });

  const handleAddNew = () => {
    setEditingDepartment(null);
    setShowModal(true);
  };

  const handleEdit = (department: any) => {
    setEditingDepartment(department);
    setShowModal(true);
  };

  const handleDelete = (department: any) => {
    // In a real app, this would call an API to delete the department
    console.log("Delete department:", department);
  };

  const handleSave = (formData: any) => {
    // In a real app, this would call an API to save the department
    console.log("Save department:", formData);
    setShowModal(false);
  };

  const handleRowClick = (department: any) => {
    setSelectedDepartment(department);
    setDrawerData(department);
    setDrawerView("department");
    setBreadcrumbs([]);
    setDrawerOpen(true);
  };

  const handleViewEmployees = () => {
    setBreadcrumbs([
      {
        label: selectedDepartment.name,
        onClick: () => {
          setDrawerData(selectedDepartment);
          setDrawerView("department");
          setBreadcrumbs([]);
        },
      },
    ]);
    setDrawerData(mockEmployeesForDepartment);
    setDrawerView("employees");
  };

  const handleViewJobProfiles = () => {
    setBreadcrumbs([
      {
        label: selectedDepartment.name,
        onClick: () => {
          setDrawerData(selectedDepartment);
          setDrawerView("department");
          setBreadcrumbs([]);
        },
      },
    ]);
    setDrawerData(mockJobProfilesForDepartment);
    setDrawerView("jobProfiles");
  };

  const handleViewParent = (departmentId: string) => {
    const parentDept = mockDepartments.find((dept) => dept.id === departmentId);
    if (parentDept) {
      setBreadcrumbs([
        ...breadcrumbs,
        {
          label: selectedDepartment.name,
          onClick: () => {
            setDrawerData(selectedDepartment);
            setDrawerView("department");
            setBreadcrumbs([]);
          },
        },
      ]);
      setDrawerData(parentDept);
      setDrawerView("parent");
    }
  };

  const handleViewChildren = () => {
    const childDepts = mockDepartments.filter(
      (dept) => dept.parentDepartmentId === selectedDepartment.id
    );
    setBreadcrumbs([
      {
        label: selectedDepartment.name,
        onClick: () => {
          setDrawerData(selectedDepartment);
          setDrawerView("department");
          setBreadcrumbs([]);
        },
      },
    ]);
    setDrawerData(childDepts);
    setDrawerView("children");
  };

  const handleEditFromDrawer = () => {
    if (drawerView === "department") {
      setEditingDepartment(selectedDepartment);
      setShowModal(true);
    }
  };

  const columns = [
    { key: "id", header: "ID" },
    { key: "name", header: "Name" },
    {
      key: "description",
      header: "Description",
      render: (value: string) => (
        <span className="text-sm text-neutral-600 truncate max-w-xs block">
          {value}
        </span>
      ),
    },
    {
      key: "headCount",
      header: "Employees",
      render: (value: number) => <Badge variant="default">{value}</Badge>,
    },
    {
      key: "managerName",
      header: "Manager",
      render: (value: string | null) => (
        <span className="text-sm text-neutral-700">
          {value || "Not assigned"}
        </span>
      ),
    },
    {
      key: "costCenter",
      header: "Cost Center",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
    },
    {
      key: "active",
      header: "Status",
      render: (value: boolean) => (
        <Badge variant={value ? "success" : "error"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  // Render drawer content based on view
  const renderDrawerContent = (data: any) => {
    if (drawerView === "department") {
      // Get child departments
      const childDepartments = mockDepartments.filter(
        (dept) => dept.parentDepartmentId === data.id
      );

      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Department ID" value={data.id} />
            <LabelValue
              label="Status"
              value={
                <Badge variant={data.active ? "success" : "error"}>
                  {data.active ? "Active" : "Inactive"}
                </Badge>
              }
            />
          </div>

          <LabelValue label="Description" value={data.description} />

          <SectionHeader title="Organization" />
          <div className="grid grid-cols-2 gap-4">
            {data.parentDepartmentId && (
              <LabelValue
                label="Parent Department"
                value={
                  <button
                    className="text-primary-600 hover:underline"
                    onClick={() => handleViewParent(data.parentDepartmentId)}
                  >
                    {mockDepartments.find(
                      (dept) => dept.id === data.parentDepartmentId
                    )?.name || data.parentDepartmentId}
                  </button>
                }
              />
            )}

            {childDepartments.length > 0 && (
              <LabelValue
                label="Child Departments"
                value={
                  <button
                    className="text-primary-600 hover:underline"
                    onClick={handleViewChildren}
                  >
                    {childDepartments.length} departments
                  </button>
                }
              />
            )}

            <LabelValue
              label="Manager"
              value={data.managerName || "Not assigned"}
            />

            <LabelValue label="Cost Center" value={data.costCenter} />
          </div>

          <SectionHeader title="Usage" />
          <div className="grid grid-cols-2 gap-4">
            <LabelValue
              label="Employees"
              value={
                <button
                  className="text-primary-600 hover:underline"
                  onClick={handleViewEmployees}
                >
                  {data.headCount} employees
                </button>
              }
            />
            <LabelValue
              label="Job Profiles"
              value={
                <button
                  className="text-primary-600 hover:underline"
                  onClick={handleViewJobProfiles}
                >
                  View linked profiles
                </button>
              }
            />
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
              </div>
            ))}
          </div>

          {data.length < selectedDepartment.headCount && (
            <div className="mt-4">
              <Button variant="outline" className="w-full">
                View All {selectedDepartment.headCount} Employees
              </Button>
            </div>
          )}
        </>
      );
    } else if (drawerView === "jobProfiles") {
      return (
        <>
          <div className="flex flex-col gap-4">
            {data.map((profile: any) => (
              <div
                key={profile.id}
                className="p-4 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-neutral-900">
                      {profile.title}
                    </h4>
                    <div className="flex items-center mt-1">
                      <Badge variant="default" className="mr-2">
                        {profile.level}
                      </Badge>
                      <span className="text-sm text-neutral-500">
                        {profile.count} employees
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      );
    } else if (drawerView === "parent" || drawerView === "children") {
      if (drawerView === "parent") {
        // Single department view
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <LabelValue label="Department ID" value={data.id} />
              <LabelValue
                label="Status"
                value={
                  <Badge variant={data.active ? "success" : "error"}>
                    {data.active ? "Active" : "Inactive"}
                  </Badge>
                }
              />
            </div>

            <LabelValue label="Description" value={data.description} />

            <SectionHeader title="Organization" />
            <div className="grid grid-cols-2 gap-4">
              {data.parentDepartmentId && (
                <LabelValue
                  label="Parent Department"
                  value={
                    <button
                      className="text-primary-600 hover:underline"
                      onClick={() => handleViewParent(data.parentDepartmentId)}
                    >
                      {mockDepartments.find(
                        (dept) => dept.id === data.parentDepartmentId
                      )?.name || data.parentDepartmentId}
                    </button>
                  }
                />
              )}

              <LabelValue
                label="Manager"
                value={data.managerName || "Not assigned"}
              />

              <LabelValue label="Cost Center" value={data.costCenter} />
            </div>

            <SectionHeader title="Usage" />
            <div className="grid grid-cols-2 gap-4">
              <LabelValue
                label="Employees"
                value={`${data.headCount} employees`}
              />
            </div>
          </>
        );
      } else {
        // List of child departments
        return (
          <>
            <div className="flex flex-col gap-4">
              {Array.isArray(data) &&
                data.map((dept: any) => (
                  <div
                    key={dept.id}
                    className="p-4 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedDepartment(dept);
                      setDrawerData(dept);
                      setDrawerView("department");
                      setBreadcrumbs([]);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-neutral-900">
                          {dept.name}
                        </h4>
                        <p className="text-sm text-neutral-500 mt-1">
                          {dept.description}
                        </p>
                        <div className="flex items-center mt-1">
                          <Badge variant="default" className="mr-2">
                            {dept.headCount} employees
                          </Badge>
                          <span className="text-xs text-neutral-500">
                            {dept.costCenter}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </>
        );
      }
    }

    return null;
  };

  return (
    <PageLayout>
      <PageHeader
        title="Departments"
        description="Manage organizational departments and hierarchies"
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
              Add Department
            </Button>
          </div>
        }
      />

      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={{
          parent: {
            value: parentFilter,
            options: [
              { value: "all", label: "All Departments" },
              { value: "root", label: "Root Departments" },
              ...parentDepartments.map((dept) => ({
                value: dept.id,
                label: `Child of ${dept.name}`,
              })),
            ],
            onChange: setParentFilter,
          },
          status: {
            value: statusFilter,
            options: [
              { value: "all", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
            onChange: setStatusFilter,
          },
        }}
      />

      <DataTable
        columns={columns}
        data={filteredDepartments}
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
                  {editingDepartment ? "Edit Department" : "Add Department"}
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
                      Department ID
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingDepartment?.id || ""}
                      placeholder="e.g., DEPT001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingDepartment?.name || ""}
                      placeholder="e.g., Engineering"
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
                    defaultValue={editingDepartment?.description || ""}
                    placeholder="Brief description of the department"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Parent Department
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">None (Root Department)</option>
                      {parentDepartments.map((dept) => (
                        <option
                          key={dept.id}
                          value={dept.id}
                          selected={
                            editingDepartment?.parentDepartmentId === dept.id
                          }
                        >
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Manager
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingDepartment?.managerName || ""}
                      placeholder="e.g., Jane Smith"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Cost Center
                  </label>
                  <input
                    type="text"
                    className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                    defaultValue={editingDepartment?.costCenter || ""}
                    placeholder="e.g., CC-1001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Status
                  </label>
                  <div className="flex items-center space-x-4 mt-2">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="status"
                        value="active"
                        defaultChecked={editingDepartment?.active !== false}
                        className="text-primary-600 focus:ring-primary-500 h-4 w-4"
                      />
                      <span className="ml-2 text-sm text-neutral-700">
                        Active
                      </span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="status"
                        value="inactive"
                        defaultChecked={editingDepartment?.active === false}
                        className="text-primary-600 focus:ring-primary-500 h-4 w-4"
                      />
                      <span className="ml-2 text-sm text-neutral-700">
                        Inactive
                      </span>
                    </label>
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
                {editingDepartment ? "Update Department" : "Create Department"}
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
          drawerView === "department"
            ? drawerData?.name
            : drawerView === "employees"
            ? `Employees in ${selectedDepartment?.name}`
            : drawerView === "jobProfiles"
            ? `Job Profiles in ${selectedDepartment?.name}`
            : drawerView === "parent"
            ? drawerData?.name
            : `Child Departments of ${selectedDepartment?.name}`
        }
        data={drawerData}
        onEdit={drawerView === "department" ? handleEditFromDrawer : undefined}
        breadcrumbs={breadcrumbs}
        renderContent={renderDrawerContent}
        lastUpdated={drawerData?.lastUpdated}
        createdInfo={drawerData?.created}
      />
    </PageLayout>
  );
};

export default DepartmentsPage;
