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
import {
  DataDrawer,
  LabelValue,
  SectionHeader,
} from "../components/master-data/DataDrawer";
import { Plus, Upload, Download, X, Check, Network } from "lucide-react";

// Mock data for job families
const mockJobFamilies = [
  {
    id: "JF001",
    name: "Engineering",
    parentFamily: null,
    description:
      "Technical roles focused on software development and infrastructure",
    count: 12,
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
    id: "JF002",
    name: "Frontend Engineering",
    parentFamily: "Engineering",
    description: "Specializes in user interface development",
    count: 5,
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
    id: "JF003",
    name: "Backend Engineering",
    parentFamily: "Engineering",
    description: "Specializes in server-side development",
    count: 7,
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
    id: "JF004",
    name: "Design",
    parentFamily: null,
    description: "Roles focused on product design and user experience",
    count: 8,
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
    id: "JF005",
    name: "UX Design",
    parentFamily: "Design",
    description: "Specializes in user experience design",
    count: 3,
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
    id: "JF006",
    name: "Product",
    parentFamily: null,
    description: "Roles focused on product management and strategy",
    count: 6,
    lastUpdated: {
      by: "Jane Smith",
      at: "2023-12-05T11:20:00Z",
    },
    created: {
      by: "John Doe",
      at: "2023-05-10T14:45:00Z",
    },
  },
  {
    id: "JF007",
    name: "Marketing",
    parentFamily: null,
    description: "Roles focused on marketing and communications",
    count: 5,
    lastUpdated: {
      by: "John Doe",
      at: "2023-11-30T10:15:00Z",
    },
    created: {
      by: "Sarah Taylor",
      at: "2023-04-15T09:20:00Z",
    },
  },
];

// Mock job profiles for related data
const mockJobProfiles = [
  {
    id: "JP001",
    title: "Software Engineer",
    jobFamily: "Engineering",
    function: "Software Development",
    level: "Mid",
  },
  {
    id: "JP002",
    title: "Senior Software Engineer",
    jobFamily: "Engineering",
    function: "Software Development",
    level: "Senior",
  },
  {
    id: "JP003",
    title: "Frontend Developer",
    jobFamily: "Frontend Engineering",
    function: "Software Development",
    level: "Mid",
  },
  {
    id: "JP004",
    title: "UX Designer",
    jobFamily: "UX Design",
    function: "User Experience",
    level: "Mid",
  },
];

const JobFamiliesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [parentFilter, setParentFilter] = useState("all");
  const [showHierarchy, setShowHierarchy] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingFamily, setEditingFamily] = useState<any>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<any>(null);
  const [drawerView, setDrawerView] = useState<"family" | "parent" | "child">(
    "family"
  );
  const [drawerData, setDrawerData] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { label: string; onClick: () => void }[]
  >([]);

  // Get unique parent families
  const parentFamilies = Array.from(
    new Set(
      mockJobFamilies
        .filter((family) => family.parentFamily === null)
        .map((family) => family.name)
    )
  );

  // Filter job families
  const filteredFamilies = mockJobFamilies.filter((family) => {
    const matchesSearch =
      searchTerm === "" ||
      family.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      family.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (family.description &&
        family.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesParent =
      parentFilter === "all" ||
      (parentFilter === "root" && family.parentFamily === null) ||
      family.parentFamily === parentFilter;

    return matchesSearch && matchesParent;
  });

  const handleAddNew = () => {
    setEditingFamily(null);
    setShowModal(true);
  };

  const handleEdit = (family: any) => {
    setEditingFamily(family);
    setShowModal(true);
  };

  const handleDelete = (family: any) => {
    // In a real app, this would call an API to delete the family
    console.log("Delete family:", family);
  };

  const handleSave = (formData: any) => {
    // In a real app, this would call an API to save the family
    console.log("Save family:", formData);
    setShowModal(false);
  };

  const handleRowClick = (family: any) => {
    setSelectedFamily(family);
    setDrawerData(family);
    setDrawerView("family");
    setBreadcrumbs([]);
    setDrawerOpen(true);
  };

  const handleRelatedItemClick = (
    type: "parent" | "child",
    familyName: string
  ) => {
    // In a real app, you would fetch the related data
    const relatedFamily = mockJobFamilies.find((f) => f.name === familyName);
    if (relatedFamily) {
      setBreadcrumbs([
        ...breadcrumbs,
        {
          label: selectedFamily.name,
          onClick: () => {
            setDrawerData(selectedFamily);
            setDrawerView("family");
            setBreadcrumbs([]);
          },
        },
      ]);
      setDrawerData(relatedFamily);
      setDrawerView(type);
    }
  };

  const handleEditFromDrawer = () => {
    if (drawerView === "family") {
      setEditingFamily(selectedFamily);
      setShowModal(true);
    }
  };

  const columns = [
    { key: "id", header: "ID" },
    { key: "name", header: "Name" },
    {
      key: "parentFamily",
      header: "Parent Family",
      render: (value: string | null) =>
        value ? (
          <span className="text-sm text-neutral-700">{value}</span>
        ) : (
          <span className="text-sm text-neutral-500">-</span>
        ),
    },
    {
      key: "count",
      header: "Job Profiles",
      render: (value: number) => <Badge variant="default">{value}</Badge>,
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

  // Render drawer content based on view
  const renderDrawerContent = (data: any) => {
    if (drawerView === "family") {
      // Get child families
      const childFamilies = mockJobFamilies.filter(
        (f) => f.parentFamily === data.name
      );

      // Get job profiles in this family
      const familyProfiles = mockJobProfiles.filter(
        (p) => p.jobFamily === data.name
      );

      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Family ID" value={data.id} />
            <LabelValue
              label="Job Profiles"
              value={<Badge variant="default">{data.count}</Badge>}
            />
          </div>

          <LabelValue label="Description" value={data.description} />

          {data.parentFamily && (
            <LabelValue
              label="Parent Family"
              value={
                <button
                  className="text-primary-600 hover:underline"
                  onClick={() =>
                    handleRelatedItemClick("parent", data.parentFamily)
                  }
                >
                  {data.parentFamily}
                </button>
              }
            />
          )}

          {childFamilies.length > 0 && (
            <>
              <SectionHeader title="Child Families" />
              <div className="flex flex-col gap-2">
                {childFamilies.map((family) => (
                  <div
                    key={family.id}
                    className="p-3 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 cursor-pointer"
                    onClick={() => handleRelatedItemClick("child", family.name)}
                  >
                    <div className="font-medium text-sm">{family.name}</div>
                    <div className="text-xs text-neutral-500">
                      {family.count} job profiles
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <SectionHeader title="Job Profiles" />
          {familyProfiles.length > 0 ? (
            <div className="flex flex-col gap-2">
              {familyProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="p-3 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 cursor-pointer"
                >
                  <div className="font-medium text-sm">{profile.title}</div>
                  <div className="text-xs text-neutral-500">
                    {profile.level} • {profile.function}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
              <p className="text-sm text-neutral-500">
                No job profiles found in this family.
              </p>
            </div>
          )}
        </>
      );
    } else if (drawerView === "parent" || drawerView === "child") {
      // Similar to family view but with different breadcrumb context
      const childFamilies = mockJobFamilies.filter(
        (f) => f.parentFamily === data.name
      );
      const familyProfiles = mockJobProfiles.filter(
        (p) => p.jobFamily === data.name
      );

      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Family ID" value={data.id} />
            <LabelValue
              label="Job Profiles"
              value={<Badge variant="default">{data.count}</Badge>}
            />
          </div>

          <LabelValue label="Description" value={data.description} />

          {data.parentFamily && (
            <LabelValue
              label="Parent Family"
              value={
                <button
                  className="text-primary-600 hover:underline"
                  onClick={() =>
                    handleRelatedItemClick("parent", data.parentFamily)
                  }
                >
                  {data.parentFamily}
                </button>
              }
            />
          )}

          {childFamilies.length > 0 && (
            <>
              <SectionHeader title="Child Families" />
              <div className="flex flex-col gap-2">
                {childFamilies.map((family) => (
                  <div
                    key={family.id}
                    className="p-3 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 cursor-pointer"
                    onClick={() => handleRelatedItemClick("child", family.name)}
                  >
                    <div className="font-medium text-sm">{family.name}</div>
                    <div className="text-xs text-neutral-500">
                      {family.count} job profiles
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <SectionHeader title="Job Profiles" />
          {familyProfiles.length > 0 ? (
            <div className="flex flex-col gap-2">
              {familyProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="p-3 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 cursor-pointer"
                >
                  <div className="font-medium text-sm">{profile.title}</div>
                  <div className="text-xs text-neutral-500">
                    {profile.level} • {profile.function}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
              <p className="text-sm text-neutral-500">
                No job profiles found in this family.
              </p>
            </div>
          )}
        </>
      );
    }

    return null;
  };

  return (
    <PageLayout>
      <PageHeader
        title="Job Families"
        description="Manage job families and their hierarchical relationships"
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
              Add Family
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
              { value: "all", label: "All Families" },
              { value: "root", label: "Root Families" },
              ...parentFamilies.map((family) => ({
                value: family,
                label: `Child of ${family}`,
              })),
            ],
            onChange: setParentFilter,
          },
        }}
      />

      {showHierarchy ? (
        <Card>
          <CardHeader>
            <CardTitle>Family Hierarchy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4">
              {/* Hierarchy visualization would go here */}
              <div className="flex flex-col gap-6">
                {mockJobFamilies
                  .filter((family) => family.parentFamily === null)
                  .map((rootFamily) => (
                    <div
                      key={rootFamily.id}
                      className="border border-neutral-200 rounded-lg p-4"
                    >
                      <div className="font-medium text-lg">
                        {rootFamily.name}
                      </div>
                      <div className="text-sm text-neutral-600 mt-1">
                        {rootFamily.description}
                      </div>

                      <div className="mt-4 ml-8 flex flex-col gap-3">
                        {mockJobFamilies
                          .filter(
                            (family) => family.parentFamily === rootFamily.name
                          )
                          .map((childFamily) => (
                            <div
                              key={childFamily.id}
                              className="border border-neutral-200 rounded-lg p-3"
                            >
                              <div className="font-medium">
                                {childFamily.name}
                              </div>
                              <div className="text-sm text-neutral-600 mt-1">
                                {childFamily.description}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={filteredFamilies}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleRowClick}
        />
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900">
                  {editingFamily ? "Edit Job Family" : "Add Job Family"}
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
                      Family ID
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingFamily?.id || ""}
                      placeholder="e.g., JF001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingFamily?.name || ""}
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
                    defaultValue={editingFamily?.description || ""}
                    placeholder="Brief description of the job family"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Parent Family (Optional)
                  </label>
                  <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                    <option value="">None (Root Family)</option>
                    {parentFamilies.map((family) => (
                      <option
                        key={family}
                        value={family}
                        selected={editingFamily?.parentFamily === family}
                      >
                        {family}
                      </option>
                    ))}
                  </select>
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
                {editingFamily ? "Update Family" : "Create Family"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Data Drawer */}
      <DataDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerData ? drawerData.name : ""}
        data={drawerData}
        onEdit={drawerView === "family" ? handleEditFromDrawer : undefined}
        breadcrumbs={breadcrumbs}
        renderContent={renderDrawerContent}
        lastUpdated={drawerData?.lastUpdated}
        createdInfo={drawerData?.created}
      />
    </PageLayout>
  );
};

export default JobFamiliesPage;
