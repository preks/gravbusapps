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

// Mock data for cost centers
const mockCostCenters = [
  {
    id: "CC001",
    code: "CC-1001",
    name: "Engineering",
    departmentId: "DEPT001",
    departmentName: "Engineering",
    budgetEntity: "Operations",
    annualBudget: 2500000,
    currency: "USD",
    managerName: "Jane Smith",
    employeeCount: 32,
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
    id: "CC002",
    code: "CC-1002",
    name: "Design",
    departmentId: "DEPT002",
    departmentName: "Design",
    budgetEntity: "Operations",
    annualBudget: 1200000,
    currency: "USD",
    managerName: "David Wilson",
    employeeCount: 15,
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
    id: "CC003",
    code: "CC-1003",
    name: "Product",
    departmentId: "DEPT003",
    departmentName: "Product",
    budgetEntity: "Operations",
    annualBudget: 900000,
    currency: "USD",
    managerName: "Emily Davis",
    employeeCount: 10,
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
    id: "CC004",
    code: "CC-1004",
    name: "Marketing",
    departmentId: "DEPT004",
    departmentName: "Marketing",
    budgetEntity: "Sales & Marketing",
    annualBudget: 800000,
    currency: "USD",
    managerName: null,
    employeeCount: 8,
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
    id: "CC005",
    code: "CC-1005",
    name: "Sales",
    departmentId: null,
    departmentName: null,
    budgetEntity: "Sales & Marketing",
    annualBudget: 1500000,
    currency: "USD",
    managerName: "Alex Brown",
    employeeCount: 20,
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
    id: "CC006",
    code: "CC-1006",
    name: "Research",
    departmentId: null,
    departmentName: null,
    budgetEntity: "R&D",
    annualBudget: 1800000,
    currency: "USD",
    managerName: "John Doe",
    employeeCount: 12,
    active: false,
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

// Mock employees for cost center
const mockEmployeesForCostCenter = [
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

// Mock departments
const mockDepartmentsForCostCenter = [
  { id: "DEPT001", name: "Engineering", headCount: 32 },
  { id: "DEPT002", name: "Design", headCount: 15 },
  { id: "DEPT003", name: "Product", headCount: 10 },
  { id: "DEPT004", name: "Marketing", headCount: 8 },
];

const CostCentersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [budgetEntityFilter, setBudgetEntityFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<any>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCostCenter, setSelectedCostCenter] = useState<any>(null);
  const [drawerView, setDrawerView] = useState<
    "costCenter" | "employees" | "department"
  >("costCenter");
  const [drawerData, setDrawerData] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { label: string; onClick: () => void }[]
  >([]);

  // Get unique budget entities and departments for filters
  const budgetEntities = Array.from(
    new Set(mockCostCenters.map((cc) => cc.budgetEntity))
  );
  const departments = Array.from(
    new Set(
      mockCostCenters
        .filter((cc) => cc.departmentId !== null)
        .map((cc) => ({ id: cc.departmentId, name: cc.departmentName }))
    )
  );

  // Filter cost centers
  const filteredCostCenters = mockCostCenters.filter((costCenter) => {
    const matchesSearch =
      searchTerm === "" ||
      costCenter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      costCenter.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      costCenter.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBudgetEntity =
      budgetEntityFilter === "all" ||
      costCenter.budgetEntity === budgetEntityFilter;
    const matchesDepartment =
      departmentFilter === "all" ||
      (departmentFilter === "none" && costCenter.departmentId === null) ||
      costCenter.departmentId === departmentFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && costCenter.active) ||
      (statusFilter === "inactive" && !costCenter.active);

    return (
      matchesSearch && matchesBudgetEntity && matchesDepartment && matchesStatus
    );
  });

  const handleAddNew = () => {
    setEditingCostCenter(null);
    setShowModal(true);
  };

  const handleEdit = (costCenter: any) => {
    setEditingCostCenter(costCenter);
    setShowModal(true);
  };

  const handleDelete = (costCenter: any) => {
    // In a real app, this would call an API to delete the cost center
    console.log("Delete cost center:", costCenter);
  };

  const handleSave = (formData: any) => {
    // In a real app, this would call an API to save the cost center
    console.log("Save cost center:", formData);
    setShowModal(false);
  };

  const handleRowClick = (costCenter: any) => {
    setSelectedCostCenter(costCenter);
    setDrawerData(costCenter);
    setDrawerView("costCenter");
    setBreadcrumbs([]);
    setDrawerOpen(true);
  };

  const handleViewEmployees = () => {
    setBreadcrumbs([
      {
        label: selectedCostCenter.name,
        onClick: () => {
          setDrawerData(selectedCostCenter);
          setDrawerView("costCenter");
          setBreadcrumbs([]);
        },
      },
    ]);
    setDrawerData(mockEmployeesForCostCenter);
    setDrawerView("employees");
  };

  const handleViewDepartment = (departmentId: string) => {
    const department = mockDepartmentsForCostCenter.find(
      (dept) => dept.id === departmentId
    );
    if (department) {
      setBreadcrumbs([
        ...breadcrumbs,
        {
          label: selectedCostCenter.name,
          onClick: () => {
            setDrawerData(selectedCostCenter);
            setDrawerView("costCenter");
            setBreadcrumbs([]);
          },
        },
      ]);
      setDrawerData(department);
      setDrawerView("department");
    }
  };

  const handleEditFromDrawer = () => {
    if (drawerView === "costCenter") {
      setEditingCostCenter(selectedCostCenter);
      setShowModal(true);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const columns = [
    { key: "code", header: "Code" },
    { key: "name", header: "Name" },
    {
      key: "departmentName",
      header: "Department",
      render: (value: string | null) => (
        <span className="text-sm text-neutral-700">
          {value || "Not assigned"}
        </span>
      ),
    },
    {
      key: "budgetEntity",
      header: "Budget Entity",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
    },
    {
      key: "annualBudget",
      header: "Annual Budget",
      render: (value: number, row: any) => (
        <span className="text-sm text-neutral-700">
          {formatCurrency(value, row.currency)}
        </span>
      ),
    },
    {
      key: "employeeCount",
      header: "Employees",
      render: (value: number) => <Badge variant="default">{value}</Badge>,
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
    if (drawerView === "costCenter") {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Cost Center ID" value={data.id} />
            <LabelValue label="Code" value={data.code} />
          </div>

          <LabelValue label="Name" value={data.name} />

          <SectionHeader title="Budget Information" />
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Budget Entity" value={data.budgetEntity} />
            <LabelValue
              label="Annual Budget"
              value={formatCurrency(data.annualBudget, data.currency)}
            />
            <LabelValue label="Currency" value={data.currency} />
            <LabelValue
              label="Status"
              value={
                <Badge variant={data.active ? "success" : "error"}>
                  {data.active ? "Active" : "Inactive"}
                </Badge>
              }
            />
          </div>

          <SectionHeader title="Organization" />
          <div className="grid grid-cols-2 gap-4">
            {data.departmentId && (
              <LabelValue
                label="Department"
                value={
                  <button
                    className="text-primary-600 hover:underline"
                    onClick={() => handleViewDepartment(data.departmentId)}
                  >
                    {data.departmentName}
                  </button>
                }
              />
            )}

            <LabelValue
              label="Manager"
              value={data.managerName || "Not assigned"}
            />
          </div>

          <SectionHeader title="Usage" />
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

          <div className="mt-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-600">
              This cost center has an annual budget of{" "}
              {formatCurrency(data.annualBudget, data.currency)} and is
              associated with {data.employeeCount} employees.
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

          {data.length < selectedCostCenter.employeeCount && (
            <div className="mt-4">
              <Button variant="outline" className="w-full">
                View All {selectedCostCenter.employeeCount} Employees
              </Button>
            </div>
          )}
        </>
      );
    } else if (drawerView === "department") {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Department ID" value={data.id} />
            <LabelValue
              label="Employees"
              value={<Badge variant="default">{data.headCount}</Badge>}
            />
          </div>

          <LabelValue label="Name" value={data.name} />

          <div className="mt-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-600">
              This department has {data.headCount} employees and is associated
              with this cost center.
            </p>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <PageLayout>
      <PageHeader
        title="Cost Centers"
        description="Manage financial cost centers and budget allocations"
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
              Add Cost Center
            </Button>
          </div>
        }
      />

      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={{
          budgetEntity: {
            value: budgetEntityFilter,
            options: [
              { value: "all", label: "All Budget Entities" },
              ...budgetEntities.map((entity) => ({
                value: entity,
                label: entity,
              })),
            ],
            onChange: setBudgetEntityFilter,
          },
          department: {
            value: departmentFilter,
            options: [
              { value: "all", label: "All Departments" },
              { value: "none", label: "No Department" },
              ...departments.map((dept) => ({
                value: dept.id,
                label: dept.name,
              })),
            ],
            onChange: setDepartmentFilter,
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
        data={filteredCostCenters}
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
                  {editingCostCenter ? "Edit Cost Center" : "Add Cost Center"}
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
                      Cost Center ID
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingCostCenter?.id || ""}
                      placeholder="e.g., CC001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Code
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingCostCenter?.code || ""}
                      placeholder="e.g., CC-1001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                    defaultValue={editingCostCenter?.name || ""}
                    placeholder="e.g., Engineering"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Department
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">None</option>
                      {departments.map((dept) => (
                        <option
                          key={dept.id}
                          value={dept.id}
                          selected={editingCostCenter?.departmentId === dept.id}
                        >
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Budget Entity
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Budget Entity</option>
                      {budgetEntities.map((entity) => (
                        <option
                          key={entity}
                          value={entity}
                          selected={editingCostCenter?.budgetEntity === entity}
                        >
                          {entity}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Annual Budget
                    </label>
                    <input
                      type="number"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingCostCenter?.annualBudget || ""}
                      placeholder="e.g., 1000000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Currency
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option
                        value="USD"
                        selected={editingCostCenter?.currency === "USD"}
                      >
                        USD
                      </option>
                      <option
                        value="EUR"
                        selected={editingCostCenter?.currency === "EUR"}
                      >
                        EUR
                      </option>
                      <option
                        value="GBP"
                        selected={editingCostCenter?.currency === "GBP"}
                      >
                        GBP
                      </option>
                      <option
                        value="JPY"
                        selected={editingCostCenter?.currency === "JPY"}
                      >
                        JPY
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Manager
                  </label>
                  <input
                    type="text"
                    className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                    defaultValue={editingCostCenter?.managerName || ""}
                    placeholder="e.g., Jane Smith"
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
                        defaultChecked={editingCostCenter?.active !== false}
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
                        defaultChecked={editingCostCenter?.active === false}
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
                {editingCostCenter
                  ? "Update Cost Center"
                  : "Create Cost Center"}
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
          drawerView === "costCenter"
            ? drawerData?.name
            : drawerView === "employees"
            ? `Employees in ${selectedCostCenter?.name}`
            : drawerData?.name
        }
        data={drawerData}
        onEdit={drawerView === "costCenter" ? handleEditFromDrawer : undefined}
        breadcrumbs={breadcrumbs}
        renderContent={renderDrawerContent}
        lastUpdated={drawerData?.lastUpdated}
        createdInfo={drawerData?.created}
      />
    </PageLayout>
  );
};

export default CostCentersPage;
