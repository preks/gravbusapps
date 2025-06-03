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

// Mock data for capabilities
const mockCapabilities = [
  {
    id: "CAP001",
    name: "JavaScript",
    category: "Technical",
    description: "JavaScript programming language and ecosystem",
    employeeCount: 25,
    jobProfileCount: 8,
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
    id: "CAP002",
    name: "React",
    category: "Technical",
    description: "React library and related technologies",
    employeeCount: 18,
    jobProfileCount: 5,
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
    id: "CAP003",
    name: "UX Design",
    category: "Design",
    description: "User experience design principles and methodologies",
    employeeCount: 12,
    jobProfileCount: 3,
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
    id: "CAP004",
    name: "Product Management",
    category: "Business",
    description: "Product management skills and methodologies",
    employeeCount: 8,
    jobProfileCount: 2,
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
    id: "CAP005",
    name: "Leadership",
    category: "Soft Skills",
    description: "Leadership and team management skills",
    employeeCount: 15,
    jobProfileCount: 6,
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
    id: "CAP006",
    name: "Data Analysis",
    category: "Technical",
    description: "Data analysis and visualization skills",
    employeeCount: 10,
    jobProfileCount: 4,
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

// Mock employees with capability
const mockEmployeesWithCapability = [
  {
    id: "emp-001",
    name: "John Doe",
    position: "Software Engineer",
    department: "Engineering",
    avatar: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg",
    level: 4,
  },
  {
    id: "emp-002",
    name: "Jane Smith",
    position: "UX Designer",
    department: "Design",
    avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg",
    level: 5,
  },
  {
    id: "emp-003",
    name: "Michael Johnson",
    position: "Product Manager",
    department: "Product",
    avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg",
    level: 3,
  },
];

// Mock job profiles requiring capability
const mockJobProfilesWithCapability = [
  { id: "JP001", title: "Software Engineer", level: "Mid", count: 5 },
  { id: "JP002", title: "Senior Software Engineer", level: "Senior", count: 3 },
  { id: "JP003", title: "Frontend Developer", level: "Mid", count: 4 },
];

const CapabilitiesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingCapability, setEditingCapability] = useState<any>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState<any>(null);
  const [drawerView, setDrawerView] = useState<
    "capability" | "employees" | "jobProfiles"
  >("capability");
  const [drawerData, setDrawerData] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { label: string; onClick: () => void }[]
  >([]);

  // Get unique categories for filter
  const categories = Array.from(
    new Set(mockCapabilities.map((cap) => cap.category))
  );

  // Filter capabilities
  const filteredCapabilities = mockCapabilities.filter((capability) => {
    const matchesSearch =
      searchTerm === "" ||
      capability.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      capability.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (capability.description &&
        capability.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    const matchesCategory =
      categoryFilter === "all" || capability.category === categoryFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && capability.active) ||
      (statusFilter === "inactive" && !capability.active);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleAddNew = () => {
    setEditingCapability(null);
    setShowModal(true);
  };

  const handleEdit = (capability: any) => {
    setEditingCapability(capability);
    setShowModal(true);
  };

  const handleDelete = (capability: any) => {
    // In a real app, this would call an API to delete the capability
    console.log("Delete capability:", capability);
  };

  const handleSave = (formData: any) => {
    // In a real app, this would call an API to save the capability
    console.log("Save capability:", formData);
    setShowModal(false);
  };

  const handleRowClick = (capability: any) => {
    setSelectedCapability(capability);
    setDrawerData(capability);
    setDrawerView("capability");
    setBreadcrumbs([]);
    setDrawerOpen(true);
  };

  const handleViewEmployees = () => {
    setBreadcrumbs([
      {
        label: selectedCapability.name,
        onClick: () => {
          setDrawerData(selectedCapability);
          setDrawerView("capability");
          setBreadcrumbs([]);
        },
      },
    ]);
    setDrawerData(mockEmployeesWithCapability);
    setDrawerView("employees");
  };

  const handleViewJobProfiles = () => {
    setBreadcrumbs([
      {
        label: selectedCapability.name,
        onClick: () => {
          setDrawerData(selectedCapability);
          setDrawerView("capability");
          setBreadcrumbs([]);
        },
      },
    ]);
    setDrawerData(mockJobProfilesWithCapability);
    setDrawerView("jobProfiles");
  };

  const handleEditFromDrawer = () => {
    if (drawerView === "capability") {
      setEditingCapability(selectedCapability);
      setShowModal(true);
    }
  };

  const columns = [
    { key: "id", header: "ID" },
    { key: "name", header: "Name" },
    {
      key: "category",
      header: "Category",
      render: (value: string) => <Badge variant="default">{value}</Badge>,
    },
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
      key: "employeeCount",
      header: "Employees",
      render: (value: number) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
    },
    {
      key: "jobProfileCount",
      header: "Job Profiles",
      render: (value: number) => (
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
    if (drawerView === "capability") {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Capability ID" value={data.id} />
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

          <SectionHeader title="Classification" />
          <LabelValue
            label="Category"
            value={<Badge variant="default">{data.category}</Badge>}
          />

          <SectionHeader title="Usage" />
          <div className="grid grid-cols-2 gap-4">
            <LabelValue
              label="Employees"
              value={
                <button
                  className="text-primary-600 hover:underline"
                  onClick={handleViewEmployees}
                >
                  {data.employeeCount} employees
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
                  {data.jobProfileCount} profiles
                </button>
              }
            />
          </div>

          <div className="mt-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-600">
              This capability is possessed by {data.employeeCount} employees and
              is required by {data.jobProfileCount} job profiles.
            </p>
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
                  <div className="flex-1">
                    <h4 className="font-medium text-neutral-900">
                      {employee.name}
                    </h4>
                    <p className="text-sm text-neutral-500">
                      {employee.position} • {employee.department}
                    </p>
                  </div>
                  <div>
                    <Badge variant="primary">Level {employee.level}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.length < selectedCapability.employeeCount && (
            <div className="mt-4">
              <Button variant="outline" className="w-full">
                View All {selectedCapability.employeeCount} Employees
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
    }

    return null;
  };

  return (
    <PageLayout>
      <PageHeader
        title="Capabilities"
        description="Manage employee skills and organizational capabilities"
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
              Add Capability
            </Button>
          </div>
        }
      />

      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={{
          category: {
            value: categoryFilter,
            options: [
              { value: "all", label: "All Categories" },
              ...categories.map((category) => ({
                value: category,
                label: category,
              })),
            ],
            onChange: setCategoryFilter,
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
        data={filteredCapabilities}
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
                  {editingCapability ? "Edit Capability" : "Add Capability"}
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
                      Capability ID
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingCapability?.id || ""}
                      placeholder="e.g., CAP001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingCapability?.name || ""}
                      placeholder="e.g., JavaScript"
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
                    defaultValue={editingCapability?.description || ""}
                    placeholder="Brief description of the capability"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Category
                  </label>
                  <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option
                        key={category}
                        value={category}
                        selected={editingCapability?.category === category}
                      >
                        {category}
                      </option>
                    ))}
                  </select>
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
                        defaultChecked={editingCapability?.active !== false}
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
                        defaultChecked={editingCapability?.active === false}
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
                {editingCapability ? "Update Capability" : "Create Capability"}
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
          drawerView === "capability"
            ? drawerData?.name
            : drawerView === "employees"
            ? `Employees with ${selectedCapability?.name}`
            : `Job Profiles requiring ${selectedCapability?.name}`
        }
        data={drawerData}
        onEdit={drawerView === "capability" ? handleEditFromDrawer : undefined}
        breadcrumbs={breadcrumbs}
        renderContent={renderDrawerContent}
        lastUpdated={drawerData?.lastUpdated}
        createdInfo={drawerData?.created}
      />
    </PageLayout>
  );
};

export default CapabilitiesPage;
