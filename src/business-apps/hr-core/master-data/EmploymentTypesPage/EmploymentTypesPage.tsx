import React, { useState } from "react";
import { PageLayout, PageHeader } from "../components/layout/PageLayout";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { DataTable } from "../components/master-data/DataTable";
import { FilterBar } from "../components/master-data/FilterBar";
import { Plus, Upload, Download, X, Check } from "lucide-react";

// Mock data for employment types
const mockEmploymentTypes = [
  {
    id: "ET001",
    name: "Full-Time",
    description: "Standard full-time employment (40 hours/week)",
    active: true,
    count: 45,
  },
  {
    id: "ET002",
    name: "Part-Time",
    description: "Part-time employment (less than 40 hours/week)",
    active: true,
    count: 12,
  },
  {
    id: "ET003",
    name: "Contractor",
    description: "External contractor or freelancer",
    active: true,
    count: 8,
  },
  {
    id: "ET004",
    name: "Intern",
    description: "Temporary internship position",
    active: true,
    count: 5,
  },
  {
    id: "ET005",
    name: "Seasonal",
    description: "Temporary seasonal employment",
    active: false,
    count: 0,
  },
];

const EmploymentTypesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);

  // Filter employment types
  const filteredTypes = mockEmploymentTypes.filter((type) => {
    const matchesSearch =
      searchTerm === "" ||
      type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (type.description &&
        type.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && type.active) ||
      (statusFilter === "inactive" && !type.active);

    return matchesSearch && matchesStatus;
  });

  const handleAddNew = () => {
    setEditingType(null);
    setShowModal(true);
  };

  const handleEdit = (type: any) => {
    setEditingType(type);
    setShowModal(true);
  };

  const handleDelete = (type: any) => {
    // In a real app, this would call an API to delete the type
    console.log("Delete type:", type);
  };

  const handleSave = (formData: any) => {
    // In a real app, this would call an API to save the type
    console.log("Save type:", formData);
    setShowModal(false);
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
      key: "count",
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

  return (
    <PageLayout>
      <PageHeader
        title="Employment Types"
        description="Manage employment types used across the organization"
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
              Add Type
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
              { value: "inactive", label: "Inactive" },
            ],
            onChange: setStatusFilter,
          },
        }}
      />

      <DataTable
        columns={columns}
        data={filteredTypes}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {editingType ? "Edit Employment Type" : "Add Employment Type"}
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
                      ID
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingType?.id || ""}
                      placeholder="e.g., ET001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingType?.name || ""}
                      placeholder="e.g., Full-Time"
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
                    defaultValue={editingType?.description || ""}
                    placeholder="Brief description of the employment type"
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
                        defaultChecked={editingType?.active !== false}
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
                        defaultChecked={editingType?.active === false}
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
                {editingType ? "Update Type" : "Create Type"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default EmploymentTypesPage;
