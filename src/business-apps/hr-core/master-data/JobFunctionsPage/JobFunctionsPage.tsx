import React, { useState } from "react";
import { PageLayout, PageHeader } from "../components/layout/PageLayout";
import { Button } from "../components/ui/Button";
import { DataTable } from "../components/master-data/DataTable";
import { FilterBar } from "../components/master-data/FilterBar";
import { Plus, Upload, Download, X, Check } from "lucide-react";

// Mock data for job functions
const mockJobFunctions = [
  {
    id: "JFN001",
    name: "Software Development",
    jobFamily: "Engineering",
    description: "Development of software applications and systems",
  },
  {
    id: "JFN002",
    name: "DevOps",
    jobFamily: "Engineering",
    description: "Management of infrastructure and deployment pipelines",
  },
  {
    id: "JFN003",
    name: "User Experience",
    jobFamily: "Design",
    description: "Design of user interfaces and experiences",
  },
  {
    id: "JFN004",
    name: "Product Management",
    jobFamily: "Product",
    description: "Management of product development and strategy",
  },
  {
    id: "JFN005",
    name: "Digital Marketing",
    jobFamily: "Marketing",
    description: "Marketing through digital channels",
  },
];

// Mock data for job families
const jobFamilies = [
  "Engineering",
  "Design",
  "Product",
  "Marketing",
  "Sales",
  "Finance",
  "HR",
];

const JobFunctionsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [familyFilter, setFamilyFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingFunction, setEditingFunction] = useState<any>(null);

  // Filter job functions
  const filteredFunctions = mockJobFunctions.filter((func) => {
    const matchesSearch =
      searchTerm === "" ||
      func.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      func.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (func.description &&
        func.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFamily =
      familyFilter === "all" || func.jobFamily === familyFilter;

    return matchesSearch && matchesFamily;
  });

  const handleAddNew = () => {
    setEditingFunction(null);
    setShowModal(true);
  };

  const handleEdit = (func: any) => {
    setEditingFunction(func);
    setShowModal(true);
  };

  const handleDelete = (func: any) => {
    // In a real app, this would call an API to delete the function
    console.log("Delete function:", func);
  };

  const handleSave = (formData: any) => {
    // In a real app, this would call an API to save the function
    console.log("Save function:", formData);
    setShowModal(false);
  };

  const columns = [
    { key: "id", header: "Function ID" },
    { key: "name", header: "Name" },
    {
      key: "jobFamily",
      header: "Job Family",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
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
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Job Functions"
        description="Manage job functions within job families"
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
              Add Function
            </Button>
          </div>
        }
      />

      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={{
          family: {
            value: familyFilter,
            options: [
              { value: "all", label: "All Families" },
              ...jobFamilies.map((family) => ({
                value: family,
                label: family,
              })),
            ],
            onChange: setFamilyFilter,
          },
        }}
      />

      <DataTable
        columns={columns}
        data={filteredFunctions}
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
                  {editingFunction ? "Edit Job Function" : "Add Job Function"}
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
                      Function ID
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingFunction?.id || ""}
                      placeholder="e.g., JFN001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingFunction?.name || ""}
                      placeholder="e.g., Software Development"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Job Family
                  </label>
                  <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                    <option value="">Select Job Family</option>
                    {jobFamilies.map((family) => (
                      <option
                        key={family}
                        value={family}
                        selected={editingFunction?.jobFamily === family}
                      >
                        {family}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                    rows={3}
                    defaultValue={editingFunction?.description || ""}
                    placeholder="Brief description of the job function"
                  />
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
                {editingFunction ? "Update Function" : "Create Function"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default JobFunctionsPage;
