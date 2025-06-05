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

// Mock data for teams
const mockTeams = [
  {
    id: "TEAM001",
    name: "Frontend Development",
    type: "Functional",
    departmentId: "DEPT001",
    departmentName: "Engineering",
    description: "Team responsible for frontend development",
    leadId: "emp-004",
    leadName: "Emily Davis",
    memberCount: 8,
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
    id: "TEAM002",
    name: "Backend Development",
    type: "Functional",
    departmentId: "DEPT001",
    departmentName: "Engineering",
    description: "Team responsible for backend services",
    leadId: "emp-001",
    leadName: "John Doe",
    memberCount: 10,
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
    id: "TEAM003",
    name: "UX Design",
    type: "Functional",
    departmentId: "DEPT002",
    departmentName: "Design",
    description: "Team responsible for user experience design",
    leadId: "emp-005",
    leadName: "David Wilson",
    memberCount: 6,
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
    id: "TEAM004",
    name: "Product Strategy",
    type: "Functional",
    departmentId: "DEPT003",
    departmentName: "Product",
    description: "Team responsible for product strategy and roadmap",
    leadId: "emp-003",
    leadName: "Michael Johnson",
    memberCount: 5,
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
    id: "TEAM005",
    name: "Project Alpha",
    type: "Project",
    departmentId: null,
    departmentName: "Cross-functional",
    description: "Cross-functional team for Project Alpha",
    leadId: "emp-002",
    leadName: "Jane Smith",
    memberCount: 12,
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
    id: "TEAM006",
    name: "Innovation Lab",
    type: "Special",
    departmentId: null,
    departmentName: "Cross-functional",
    description: "Team focused on innovation and new technologies",
    leadId: "emp-001",
    leadName: "John Doe",
    memberCount: 6,
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

// Mock team members
const mockTeamMembers = [
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
const mockDepartmentsForTeam = [
  { id: "DEPT001", name: "Engineering", headCount: 32 },
  { id: "DEPT002", name: "Design", headCount: 15 },
  { id: "DEPT003", name: "Product", headCount: 10 },
];

const TeamsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [drawerView, setDrawerView] = useState<
    "team" | "members" | "department"
  >("team");
  const [drawerData, setDrawerData] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { label: string; onClick: () => void }[]
  >([]);

  // Get unique team types and departments for filters
  const teamTypes = Array.from(new Set(mockTeams.map((team) => team.type)));
  const departments = Array.from(
    new Set(
      mockTeams
        .filter((team) => team.departmentId !== null)
        .map((team) => ({ id: team.departmentId, name: team.departmentName }))
    )
  );

  // Filter teams
  const filteredTeams = mockTeams.filter((team) => {
    const matchesSearch =
      searchTerm === "" ||
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.description &&
        team.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === "all" || team.type === typeFilter;
    const matchesDepartment =
      departmentFilter === "all" ||
      (departmentFilter === "cross-functional" && team.departmentId === null) ||
      team.departmentId === departmentFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && team.active) ||
      (statusFilter === "inactive" && !team.active);

    return matchesSearch && matchesType && matchesDepartment && matchesStatus;
  });

  const handleAddNew = () => {
    setEditingTeam(null);
    setShowModal(true);
  };

  const handleEdit = (team: any) => {
    setEditingTeam(team);
    setShowModal(true);
  };

  const handleDelete = (team: any) => {
    // In a real app, this would call an API to delete the team
    console.log("Delete team:", team);
  };

  const handleSave = (formData: any) => {
    // In a real app, this would call an API to save the team
    console.log("Save team:", formData);
    setShowModal(false);
  };

  const handleRowClick = (team: any) => {
    setSelectedTeam(team);
    setDrawerData(team);
    setDrawerView("team");
    setBreadcrumbs([]);
    setDrawerOpen(true);
  };

  const handleViewMembers = () => {
    setBreadcrumbs([
      {
        label: selectedTeam.name,
        onClick: () => {
          setDrawerData(selectedTeam);
          setDrawerView("team");
          setBreadcrumbs([]);
        },
      },
    ]);
    setDrawerData(mockTeamMembers);
    setDrawerView("members");
  };

  const handleViewDepartment = (departmentId: string) => {
    const department = mockDepartmentsForTeam.find(
      (dept) => dept.id === departmentId
    );
    if (department) {
      setBreadcrumbs([
        ...breadcrumbs,
        {
          label: selectedTeam.name,
          onClick: () => {
            setDrawerData(selectedTeam);
            setDrawerView("team");
            setBreadcrumbs([]);
          },
        },
      ]);
      setDrawerData(department);
      setDrawerView("department");
    }
  };

  const handleEditFromDrawer = () => {
    if (drawerView === "team") {
      setEditingTeam(selectedTeam);
      setShowModal(true);
    }
  };

  const columns = [
    { key: "id", header: "ID" },
    { key: "name", header: "Name" },
    {
      key: "type",
      header: "Type",
      render: (value: string) => <Badge variant="default">{value}</Badge>,
    },
    {
      key: "departmentName",
      header: "Department",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
    },
    {
      key: "leadName",
      header: "Team Lead",
      render: (value: string | null) => (
        <span className="text-sm text-neutral-700">
          {value || "Not assigned"}
        </span>
      ),
    },
    {
      key: "memberCount",
      header: "Members",
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
    if (drawerView === "team") {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Team ID" value={data.id} />
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

          <SectionHeader title="Team Details" />
          <div className="grid grid-cols-2 gap-4">
            <LabelValue
              label="Type"
              value={<Badge variant="default">{data.type}</Badge>}
            />

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
              label="Team Lead"
              value={data.leadName || "Not assigned"}
            />
          </div>

          <SectionHeader title="Team Members" />
          <LabelValue
            label="Members"
            value={
              <button
                className="text-primary-600 hover:underline"
                onClick={handleViewMembers}
              >
                {data.memberCount} team members
              </button>
            }
          />

          <div className="mt-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-600">
              This team has {data.memberCount} members and is{" "}
              {data.departmentId
                ? `part of the ${data.departmentName} department`
                : "a cross-functional team"}
              .
            </p>
          </div>
        </>
      );
    } else if (drawerView === "members") {
      return (
        <>
          <div className="flex flex-col gap-4">
            {data.map((member: any) => (
              <div
                key={member.id}
                className="p-4 border border-neutral-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium text-neutral-900">
                      {member.name}
                    </h4>
                    <p className="text-sm text-neutral-500">
                      {member.position} • {member.department}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.length < selectedTeam.memberCount && (
            <div className="mt-4">
              <Button variant="outline" className="w-full">
                View All {selectedTeam.memberCount} Members
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
              This department has {data.headCount} employees and is the parent
              department for this team.
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
        title="Teams"
        description="Manage functional and cross-functional teams"
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
              Add Team
            </Button>
          </div>
        }
      />

      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={{
          type: {
            value: typeFilter,
            options: [
              { value: "all", label: "All Types" },
              ...teamTypes.map((type) => ({ value: type, label: type })),
            ],
            onChange: setTypeFilter,
          },
          department: {
            value: departmentFilter,
            options: [
              { value: "all", label: "All Departments" },
              { value: "cross-functional", label: "Cross-functional" },
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
        data={filteredTeams}
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
                  {editingTeam ? "Edit Team" : "Add Team"}
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
                      Team ID
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingTeam?.id || ""}
                      placeholder="e.g., TEAM001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingTeam?.name || ""}
                      placeholder="e.g., Frontend Development"
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
                    defaultValue={editingTeam?.description || ""}
                    placeholder="Brief description of the team"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Team Type
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Team Type</option>
                      {teamTypes.map((type) => (
                        <option
                          key={type}
                          value={type}
                          selected={editingTeam?.type === type}
                        >
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Department
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">None (Cross-functional)</option>
                      {departments.map((dept) => (
                        <option
                          key={dept.id}
                          value={dept.id}
                          selected={editingTeam?.departmentId === dept.id}
                        >
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Team Lead
                  </label>
                  <input
                    type="text"
                    className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                    defaultValue={editingTeam?.leadName || ""}
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
                        defaultChecked={editingTeam?.active !== false}
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
                        defaultChecked={editingTeam?.active === false}
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
                {editingTeam ? "Update Team" : "Create Team"}
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
          drawerView === "team"
            ? drawerData?.name
            : drawerView === "members"
            ? `Members of ${selectedTeam?.name}`
            : drawerData?.name
        }
        data={drawerData}
        onEdit={drawerView === "team" ? handleEditFromDrawer : undefined}
        breadcrumbs={breadcrumbs}
        renderContent={renderDrawerContent}
        lastUpdated={drawerData?.lastUpdated}
        createdInfo={drawerData?.created}
      />
    </PageLayout>
  );
};

export default TeamsPage;
