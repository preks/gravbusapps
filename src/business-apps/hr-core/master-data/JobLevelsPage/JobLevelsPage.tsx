import React, { useState } from "react";
import { PageLayout, PageHeader } from "../components/layout/PageLayout";
import { Button } from "../components/ui/Button";
import { DataTable } from "../components/master-data/DataTable";
import { FilterBar } from "../components/master-data/FilterBar";
import {
  Plus,
  Upload,
  Download,
  X,
  Check,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// Mock data for job levels
const mockJobLevels = [
  {
    id: "JL001",
    name: "Entry",
    order: 1,
    description: "Entry-level positions requiring minimal experience",
  },
  {
    id: "JL002",
    name: "Mid",
    order: 2,
    description: "Mid-level positions requiring moderate experience",
  },
  {
    id: "JL003",
    name: "Senior",
    order: 3,
    description: "Senior-level positions requiring significant experience",
  },
  {
    id: "JL004",
    name: "Lead",
    order: 4,
    description: "Lead positions with team management responsibilities",
  },
  {
    id: "JL005",
    name: "Principal",
    order: 5,
    description: "Principal positions with strategic responsibilities",
  },
];

const JobLevelsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<any>(null);

  // Filter job levels
  const filteredLevels = mockJobLevels
    .filter((level) => {
      const matchesSearch =
        searchTerm === "" ||
        level.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        level.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (level.description &&
          level.description.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesSearch;
    })
    .sort((a, b) => a.order - b.order);

  const handleAddNew = () => {
    setEditingLevel(null);
    setShowModal(true);
  };

  const handleEdit = (level: any) => {
    setEditingLevel(level);
    setShowModal(true);
  };

  const handleDelete = (level: any) => {
    // In a real app, this would call an API to delete the level
    console.log("Delete level:", level);
  };

  const handleSave = (formData: any) => {
    // In a real app, this would call an API to save the level
    console.log("Save level:", formData);
    setShowModal(false);
  };

  const handleMoveUp = (level: any) => {
    // In a real app, this would call an API to reorder the levels
    console.log("Move up:", level);
  };

  const handleMoveDown = (level: any) => {
    // In a real app, this would call an API to reorder the levels
    console.log("Move down:", level);
  };

  const columns = [
    { key: "id", header: "Level ID" },
    { key: "name", header: "Name" },
    {
      key: "order",
      header: "Order",
      render: (value: number) => (
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
    {
      key: "actions",
      header: "Order",
      render: (_: any, row: any) => (
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-neutral-500 hover:text-neutral-700"
            onClick={(e) => {
              e.stopPropagation();
              handleMoveUp(row);
            }}
            disabled={row.order === 1}
          >
            <ArrowUp size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-neutral-500 hover:text-neutral-700"
            onClick={(e) => {
              e.stopPropagation();
              handleMoveDown(row);
            }}
            disabled={row.order === mockJobLevels.length}
          >
            <ArrowDown size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Job Levels"
        description="Manage job levels and their ordering"
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
              Add Level
            </Button>
          </div>
        }
      />

      <FilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <DataTable
        columns={columns}
        data={filteredLevels}
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
                  {editingLevel ? "Edit Job Level" : "Add Job Level"}
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
                      Level ID
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingLevel?.id || ""}
                      placeholder="e.g., JL001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingLevel?.name || ""}
                      placeholder="e.g., Entry"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Order
                  </label>
                  <input
                    type="number"
                    className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                    defaultValue={
                      editingLevel?.order || mockJobLevels.length + 1
                    }
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                    rows={3}
                    defaultValue={editingLevel?.description || ""}
                    placeholder="Brief description of the job level"
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
                {editingLevel ? "Update Level" : "Create Level"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default JobLevelsPage;
