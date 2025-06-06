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

// Mock data for job profiles
const mockJobProfiles = [
  {
    id: "JP001",
    title: "Software Engineer",
    description: "Develops and maintains software applications",
    jobFamily: "Engineering",
    function: "Software Development",
    level: "Mid",
    employmentType: "Full-Time",
    contractType: "Permanent",
    active: true,
    employeesAssigned: 12,
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
    id: "JP002",
    title: "Senior Software Engineer",
    description: "Leads development of complex software components",
    jobFamily: "Engineering",
    function: "Software Development",
    level: "Senior",
    employmentType: "Full-Time",
    contractType: "Permanent",
    active: true,
    employeesAssigned: 8,
    lastUpdated: {
      by: "Michael Johnson",
      at: "2023-12-05T11:20:00Z",
    },
    created: {
      by: "Sarah Taylor",
      at: "2023-09-15T14:30:00Z",
    },
  },
  {
    id: "JP003",
    title: "UX Designer",
    description: "Creates user-centered designs for products",
    jobFamily: "Design",
    function: "User Experience",
    level: "Mid",
    employmentType: "Full-Time",
    contractType: "Permanent",
    active: true,
    employeesAssigned: 5,
    lastUpdated: {
      by: "Jane Smith",
      at: "2023-11-20T09:45:00Z",
    },
    created: {
      by: "Michael Johnson",
      at: "2023-08-10T10:15:00Z",
    },
  },
  {
    id: "JP004",
    title: "Product Manager",
    description: "Oversees product development and strategy",
    jobFamily: "Product",
    function: "Product Management",
    level: "Senior",
    employmentType: "Full-Time",
    contractType: "Permanent",
    active: true,
    employeesAssigned: 4,
    lastUpdated: {
      by: "John Doe",
      at: "2023-12-01T16:30:00Z",
    },
    created: {
      by: "Michael Johnson",
      at: "2023-07-15T11:30:00Z",
    },
  },
  {
    id: "JP005",
    title: "Marketing Specialist",
    description: "Implements marketing campaigns and strategies",
    jobFamily: "Marketing",
    function: "Digital Marketing",
    level: "Entry",
    employmentType: "Full-Time",
    contractType: "Permanent",
    active: false,
    employeesAssigned: 3,
    lastUpdated: {
      by: "Sarah Taylor",
      at: "2023-11-15T14:20:00Z",
    },
    created: {
      by: "John Doe",
      at: "2023-06-20T09:30:00Z",
    },
  },
];

// Mock data for dropdowns
const jobFamilies = [
  "Engineering",
  "Design",
  "Product",
  "Marketing",
  "Sales",
  "Finance",
  "HR",
];
const jobFunctions = [
  "Software Development",
  "User Experience",
  "Product Management",
  "Digital Marketing",
];
const jobLevels = ["Entry", "Mid", "Senior", "Lead", "Principal"];
const employmentTypes = ["Full-Time", "Part-Time", "Contractor", "Intern"];
const contractTypes = ["Permanent", "Fixed-Term", "Temporary"];

// Mock related data
const mockRelatedData = {
  Engineering: {
    id: "JF001",
    name: "Engineering",
    description:
      "Technical roles focused on software development and infrastructure",
    parentFamily: null,
  },
  "Software Development": {
    id: "JFN001",
    name: "Software Development",
    jobFamily: "Engineering",
    description: "Development of software applications and systems",
  },
  Mid: {
    id: "JL002",
    name: "Mid",
    order: 2,
    description: "Mid-level positions requiring moderate experience",
  },
};

const JobProfilesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [functionFilter, setFunctionFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [drawerView, setDrawerView] = useState<
    "profile" | "family" | "function" | "level"
  >("profile");
  const [drawerData, setDrawerData] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { label: string; onClick: () => void }[]
  >([]);
  const [drawerKey, setDrawerKey] = useState<number>(0);

  // Filter job profiles
  const filteredProfiles = mockJobProfiles.filter((profile) => {
    const matchesSearch =
      searchTerm === "" ||
      profile.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFamily =
      familyFilter === "all" || profile.jobFamily === familyFilter;
    const matchesFunction =
      functionFilter === "all" || profile.function === functionFilter;
    const matchesLevel = levelFilter === "all" || profile.level === levelFilter;
    const matchesActive =
      activeFilter === "all" ||
      (activeFilter === "active" && profile.active) ||
      (activeFilter === "inactive" && !profile.active);

    return (
      matchesSearch &&
      matchesFamily &&
      matchesFunction &&
      matchesLevel &&
      matchesActive
    );
  });

  const handleAddNew = () => {
    setEditingProfile(null);
    setShowModal(true);
  };

  const handleEdit = (profile: any) => {
    setEditingProfile(profile);
    setShowModal(true);
  };

  const handleDelete = (profile: any) => {
    // In a real app, this would call an API to delete the profile
    console.log("Delete profile:", profile);
  };

  const handleSave = (formData: any) => {
    // In a real app, this would call an API to save the profile
    console.log("Save profile:", formData);
    setShowModal(false);
  };

  const handleRowClick = (profile: any) => {
    // Update the selected profile
    setSelectedProfile(profile);

    // Update the drawer data
    setDrawerData(profile);

    // Reset the drawer view
    setDrawerView("profile");

    // Clear breadcrumbs
    setBreadcrumbs([]);

    // Force drawer to re-render by updating the key
    setDrawerKey(Date.now());

    // Open the drawer
    setDrawerOpen(true);
  };

  const handleRelatedItemClick = (
    type: "family" | "function" | "level",
    item: string
  ) => {
    // In a real app, you would fetch the related data
    const relatedData = mockRelatedData[item as keyof typeof mockRelatedData];
    if (relatedData) {
      setBreadcrumbs([
        ...breadcrumbs,
        {
          label: selectedProfile.title,
          onClick: () => {
            setDrawerData(selectedProfile);
            setDrawerView("profile");
            setBreadcrumbs([]);
          },
        },
      ]);
      setDrawerData(relatedData);
      setDrawerView(type);
    }
  };

  const handleEditFromDrawer = () => {
    if (drawerView === "profile") {
      setEditingProfile(selectedProfile);
      setShowModal(true);
    }
  };

  const columns = [
    { key: "id", header: "ID" },
    { key: "title", header: "Title" },
    {
      key: "jobFamily",
      header: "Job Family",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
    },
    {
      key: "function",
      header: "Function",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
    },
    {
      key: "level",
      header: "Level",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
    },
    {
      key: "employmentType",
      header: "Employment Type",
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
    if (drawerView === "profile") {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="ID" value={data.id} />
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
          <div className="grid grid-cols-2 gap-4">
            <LabelValue
              label="Job Family"
              value={
                <button
                  className="text-primary-600 hover:underline"
                  onClick={() =>
                    handleRelatedItemClick("family", data.jobFamily)
                  }
                >
                  {data.jobFamily}
                </button>
              }
            />
            <LabelValue
              label="Function"
              value={
                <button
                  className="text-primary-600 hover:underline"
                  onClick={() =>
                    handleRelatedItemClick("function", data.function)
                  }
                >
                  {data.function}
                </button>
              }
            />
            <LabelValue
              label="Level"
              value={
                <button
                  className="text-primary-600 hover:underline"
                  onClick={() => handleRelatedItemClick("level", data.level)}
                >
                  {data.level}
                </button>
              }
            />
          </div>

          <SectionHeader title="Employment Details" />
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Employment Type" value={data.employmentType} />
            <LabelValue label="Contract Type" value={data.contractType} />
          </div>

          <SectionHeader title="Related Profiles" />
          <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-500">
              No related job profiles found. Job profiles can be linked through
              the organization hierarchy.
            </p>
          </div>
        </>
      );
    } else if (drawerView === "family") {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Family ID" value={data.id} />
            <LabelValue label="Name" value={data.name} />
          </div>

          <LabelValue label="Description" value={data.description} />

          <LabelValue
            label="Parent Family"
            value={data.parentFamily || "None (Root Family)"}
          />

          <SectionHeader title="Related Job Profiles" />
          <div className="flex flex-col gap-2">
            {mockJobProfiles
              .filter((profile) => profile.jobFamily === data.name)
              .map((profile) => (
                <div
                  key={profile.id}
                  className="p-3 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 cursor-pointer"
                  onClick={() => {
                    setSelectedProfile(profile);
                    setDrawerData(profile);
                    setDrawerView("profile");
                    setBreadcrumbs([]);
                  }}
                >
                  <div className="font-medium text-sm">{profile.title}</div>
                  <div className="text-xs text-neutral-500">
                    {profile.level} • {profile.function}
                  </div>
                </div>
              ))}
          </div>
        </>
      );
    } else if (drawerView === "function") {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Function ID" value={data.id} />
            <LabelValue label="Name" value={data.name} />
          </div>

          <LabelValue label="Description" value={data.description} />

          <LabelValue
            label="Job Family"
            value={
              <button
                className="text-primary-600 hover:underline"
                onClick={() => handleRelatedItemClick("family", data.jobFamily)}
              >
                {data.jobFamily}
              </button>
            }
          />

          <SectionHeader title="Related Job Profiles" />
          <div className="flex flex-col gap-2">
            {mockJobProfiles
              .filter((profile) => profile.function === data.name)
              .map((profile) => (
                <div
                  key={profile.id}
                  className="p-3 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 cursor-pointer"
                  onClick={() => {
                    setSelectedProfile(profile);
                    setDrawerData(profile);
                    setDrawerView("profile");
                    setBreadcrumbs([]);
                  }}
                >
                  <div className="font-medium text-sm">{profile.title}</div>
                  <div className="text-xs text-neutral-500">
                    {profile.level} • {profile.jobFamily}
                  </div>
                </div>
              ))}
          </div>
        </>
      );
    } else if (drawerView === "level") {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Level ID" value={data.id} />
            <LabelValue label="Name" value={data.name} />
          </div>

          <LabelValue label="Description" value={data.description} />
          <LabelValue label="Order" value={data.order} />

          <SectionHeader title="Related Job Profiles" />
          <div className="flex flex-col gap-2">
            {mockJobProfiles
              .filter((profile) => profile.level === data.name)
              .map((profile) => (
                <div
                  key={profile.id}
                  className="p-3 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 cursor-pointer"
                  onClick={() => {
                    setSelectedProfile(profile);
                    setDrawerData(profile);
                    setDrawerView("profile");
                    setBreadcrumbs([]);
                  }}
                >
                  <div className="font-medium text-sm">{profile.title}</div>
                  <div className="text-xs text-neutral-500">
                    {profile.jobFamily} • {profile.function}
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
        title="Job Profiles"
        description="Manage job profiles across the organization"
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
              Add Profile
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
          function: {
            value: functionFilter,
            options: [
              { value: "all", label: "All Functions" },
              ...jobFunctions.map((func) => ({ value: func, label: func })),
            ],
            onChange: setFunctionFilter,
          },
          level: {
            value: levelFilter,
            options: [
              { value: "all", label: "All Levels" },
              ...jobLevels.map((level) => ({ value: level, label: level })),
            ],
            onChange: setLevelFilter,
          },
          active: {
            value: activeFilter,
            options: [
              { value: "all", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
            onChange: setActiveFilter,
          },
        }}
      />

      <DataTable
        columns={columns}
        data={filteredProfiles}
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
                  {editingProfile ? "Edit Job Profile" : "Add Job Profile"}
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
                      Profile ID
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingProfile?.id || ""}
                      placeholder="e.g., JP001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingProfile?.title || ""}
                      placeholder="e.g., Software Engineer"
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
                    defaultValue={editingProfile?.description || ""}
                    placeholder="Brief description of the job profile"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                          selected={editingProfile?.jobFamily === family}
                        >
                          {family}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Function
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Function</option>
                      {jobFunctions.map((func) => (
                        <option
                          key={func}
                          value={func}
                          selected={editingProfile?.function === func}
                        >
                          {func}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Level
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Level</option>
                      {jobLevels.map((level) => (
                        <option
                          key={level}
                          value={level}
                          selected={editingProfile?.level === level}
                        >
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Employment Type
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Employment Type</option>
                      {employmentTypes.map((type) => (
                        <option
                          key={type}
                          value={type}
                          selected={editingProfile?.employmentType === type}
                        >
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Contract Type
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Contract Type</option>
                      {contractTypes.map((type) => (
                        <option
                          key={type}
                          value={type}
                          selected={editingProfile?.contractType === type}
                        >
                          {type}
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
                          defaultChecked={editingProfile?.active !== false}
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
                          defaultChecked={editingProfile?.active === false}
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
                {editingProfile ? "Update Profile" : "Create Profile"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Data Drawer */}
      <DataDrawer
        key={drawerKey}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          drawerData
            ? drawerView === "profile"
              ? drawerData.title
              : drawerData.name
            : ""
        }
        data={drawerData}
        onEdit={drawerView === "profile" ? handleEditFromDrawer : undefined}
        breadcrumbs={breadcrumbs}
        renderContent={renderDrawerContent}
        lastUpdated={drawerData?.lastUpdated}
        createdInfo={drawerData?.created}
      />
    </PageLayout>
  );
};

export default JobProfilesPage;
