import React, { useState } from "react";
import { PageLayout, PageHeader } from "../components/layout/PageLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { DataTable } from "../components/master-data/DataTable";
import { FilterBar } from "../components/master-data/FilterBar";
import { Plus, Upload, Download, X, Check, Network } from "lucide-react";

// Mock data for org hierarchy
const mockOrgHierarchy = [
  {
    id: "OH001",
    parentJobProfile: "Chief Executive Officer",
    childJobProfile: "Chief Technology Officer",
    hierarchyDepth: 1,
    directReports: true,
  },
  {
    id: "OH002",
    parentJobProfile: "Chief Executive Officer",
    childJobProfile: "Chief Financial Officer",
    hierarchyDepth: 1,
    directReports: true,
  },
  {
    id: "OH003",
    parentJobProfile: "Chief Technology Officer",
    childJobProfile: "Engineering Director",
    hierarchyDepth: 2,
    directReports: true,
  },
  {
    id: "OH004",
    parentJobProfile: "Engineering Director",
    childJobProfile: "Senior Software Engineer",
    hierarchyDepth: 3,
    directReports: true,
  },
  {
    id: "OH005",
    parentJobProfile: "Senior Software Engineer",
    childJobProfile: "Software Engineer",
    hierarchyDepth: 4,
    directReports: true,
  },
  {
    id: "OH006",
    parentJobProfile: "Chief Financial Officer",
    childJobProfile: "Finance Manager",
    hierarchyDepth: 2,
    directReports: true,
  },
];

// Mock data for job profiles
const jobProfiles = [
  "Chief Executive Officer",
  "Chief Technology Officer",
  "Chief Financial Officer",
  "Engineering Director",
  "Senior Software Engineer",
  "Software Engineer",
  "Finance Manager",
  "UX Designer",
  "Product Manager",
];

const OrgHierarchyPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [parentFilter, setParentFilter] = useState("all");
  const [depthFilter, setDepthFilter] = useState("all");
  const [showHierarchy, setShowHierarchy] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingRelation, setEditingRelation] = useState<any>(null);

  // Filter org hierarchy
  const filteredHierarchy = mockOrgHierarchy.filter((relation) => {
    const matchesSearch =
      searchTerm === "" ||
      relation.parentJobProfile
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      relation.childJobProfile
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      relation.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesParent =
      parentFilter === "all" || relation.parentJobProfile === parentFilter;
    const matchesDepth =
      depthFilter === "all" ||
      relation.hierarchyDepth.toString() === depthFilter;

    return matchesSearch && matchesParent && matchesDepth;
  });

  const handleAddNew = () => {
    setEditingRelation(null);
    setShowModal(true);
  };

  const handleEdit = (relation: any) => {
    setEditingRelation(relation);
    setShowModal(true);
  };

  const handleDelete = (relation: any) => {
    // In a real app, this would call an API to delete the relation
    console.log("Delete relation:", relation);
  };

  const handleSave = (formData: any) => {
    // In a real app, this would call an API to save the relation
    console.log("Save relation:", formData);
    setShowModal(false);
  };

  const columns = [
    { key: "id", header: "ID" },
    {
      key: "parentJobProfile",
      header: "Parent Job Profile",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
    },
    {
      key: "childJobProfile",
      header: "Child Job Profile",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
    },
    {
      key: "hierarchyDepth",
      header: "Depth",
      render: (value: number) => <Badge variant="default">{value}</Badge>,
    },
    {
      key: "directReports",
      header: "Direct Reports",
      render: (value: boolean) => (
        <Badge variant={value ? "success" : "default"}>
          {value ? "Yes" : "No"}
        </Badge>
      ),
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Organization Hierarchy"
        description="Manage reporting relationships between job profiles"
        actions={
          <div className="flex space-x-2">
            <Button variant="outline" leftIcon={<Upload size={16} />}>
              Import
            </Button>
            <Button variant="outline" leftIcon={<Download size={16} />}>
              Export
            </Button>
            <Button
              variant={showHierarchy ? "primary" : "outline"}
              leftIcon={<Network size={16} />}
              onClick={() => setShowHierarchy(!showHierarchy)}
            >
              View Hierarchy
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus size={16} />}
              onClick={handleAddNew}
            >
              Add Relationship
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
              { value: "all", label: "All Parents" },
              ...jobProfiles.map((profile) => ({
                value: profile,
                label: profile,
              })),
            ],
            onChange: setParentFilter,
          },
          depth: {
            value: depthFilter,
            options: [
              { value: "all", label: "All Depths" },
              { value: "1", label: "Depth 1" },
              { value: "2", label: "Depth 2" },
              { value: "3", label: "Depth 3" },
              { value: "4", label: "Depth 4" },
            ],
            onChange: setDepthFilter,
          },
        }}
      />

      {showHierarchy ? (
        <Card>
          <CardHeader>
            <CardTitle>Organization Hierarchy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4">
              {/* Hierarchy visualization would go here */}
              <div className="flex flex-col gap-6">
                {/* Root level */}
                <div className="flex justify-center">
                  <div className="border border-neutral-200 rounded-lg p-4 bg-primary-50 w-64 text-center">
                    <div className="font-medium">Chief Executive Officer</div>
                    <div className="text-sm text-neutral-600 mt-1">Root</div>
                  </div>
                </div>

                {/* Level 1 */}
                <div className="flex justify-center space-x-8">
                  <div className="relative">
                    <div className="absolute left-1/2 -top-6 w-px h-6 bg-neutral-300"></div>
                    <div className="border border-neutral-200 rounded-lg p-4 bg-primary-50 w-64 text-center">
                      <div className="font-medium">
                        Chief Technology Officer
                      </div>
                      <div className="text-sm text-neutral-600 mt-1">
                        Level 1
                      </div>
                    </div>

                    {/* Level 2 under CTO */}
                    <div className="mt-6 ml-8">
                      <div className="relative">
                        <div className="absolute left-1/2 -top-6 w-px h-6 bg-neutral-300"></div>
                        <div className="border border-neutral-200 rounded-lg p-4 bg-primary-50 w-64 text-center">
                          <div className="font-medium">
                            Engineering Director
                          </div>
                          <div className="text-sm text-neutral-600 mt-1">
                            Level 2
                          </div>
                        </div>

                        {/* Level 3 */}
                        <div className="mt-6 ml-8">
                          <div className="relative">
                            <div className="absolute left-1/2 -top-6 w-px h-6 bg-neutral-300"></div>
                            <div className="border border-neutral-200 rounded-lg p-4 bg-primary-50 w-64 text-center">
                              <div className="font-medium">
                                Senior Software Engineer
                              </div>
                              <div className="text-sm text-neutral-600 mt-1">
                                Level 3
                              </div>
                            </div>

                            {/* Level 4 */}
                            <div className="mt-6 ml-8">
                              <div className="relative">
                                <div className="absolute left-1/2 -top-6 w-px h-6 bg-neutral-300"></div>
                                <div className="border border-neutral-200 rounded-lg p-4 bg-primary-50 w-64 text-center">
                                  <div className="font-medium">
                                    Software Engineer
                                  </div>
                                  <div className="text-sm text-neutral-600 mt-1">
                                    Level 4
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute left-1/2 -top-6 w-px h-6 bg-neutral-300"></div>
                    <div className="border border-neutral-200 rounded-lg p-4 bg-primary-50 w-64 text-center">
                      <div className="font-medium">Chief Financial Officer</div>
                      <div className="text-sm text-neutral-600 mt-1">
                        Level 1
                      </div>
                    </div>

                    {/* Level 2 under CFO */}
                    <div className="mt-6 ml-8">
                      <div className="relative">
                        <div className="absolute left-1/2 -top-6 w-px h-6 bg-neutral-300"></div>
                        <div className="border border-neutral-200 rounded-lg p-4 bg-primary-50 w-64 text-center">
                          <div className="font-medium">Finance Manager</div>
                          <div className="text-sm text-neutral-600 mt-1">
                            Level 2
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={filteredHierarchy}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {editingRelation
                    ? "Edit Hierarchy Relationship"
                    : "Add Hierarchy Relationship"}
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
                    Hierarchy ID
                  </label>
                  <input
                    type="text"
                    className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                    defaultValue={editingRelation?.id || ""}
                    placeholder="e.g., OH001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Parent Job Profile
                  </label>
                  <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                    <option value="">Select Parent Job Profile</option>
                    {jobProfiles.map((profile) => (
                      <option
                        key={profile}
                        value={profile}
                        selected={editingRelation?.parentJobProfile === profile}
                      >
                        {profile}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Child Job Profile
                  </label>
                  <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                    <option value="">Select Child Job Profile</option>
                    {jobProfiles.map((profile) => (
                      <option
                        key={profile}
                        value={profile}
                        selected={editingRelation?.childJobProfile === profile}
                      >
                        {profile}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Hierarchy Depth
                    </label>
                    <input
                      type="number"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingRelation?.hierarchyDepth || 1}
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Direct Reports
                    </label>
                    <div className="flex items-center space-x-4 mt-2">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="directReports"
                          value="yes"
                          defaultChecked={
                            editingRelation?.directReports !== false
                          }
                          className="text-primary-600 focus:ring-primary-500 h-4 w-4"
                        />
                        <span className="ml-2 text-sm text-neutral-700">
                          Yes
                        </span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="directReports"
                          value="no"
                          defaultChecked={
                            editingRelation?.directReports === false
                          }
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
                {editingRelation
                  ? "Update Relationship"
                  : "Create Relationship"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default OrgHierarchyPage;
