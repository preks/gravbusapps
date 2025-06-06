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

// Mock data for locations
const mockLocations = [
  {
    id: "LOC001",
    name: "New York Office",
    country: "United States",
    region: "North America",
    city: "New York",
    state: "NY",
    address: "123 Broadway, New York, NY 10001",
    timezone: "America/New_York",
    active: true,
    employeeCount: 32,
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
    id: "LOC002",
    name: "San Francisco Office",
    country: "United States",
    region: "North America",
    city: "San Francisco",
    state: "CA",
    address: "456 Market St, San Francisco, CA 94105",
    timezone: "America/Los_Angeles",
    active: true,
    employeeCount: 28,
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
    id: "LOC003",
    name: "London Office",
    country: "United Kingdom",
    region: "Europe",
    city: "London",
    state: null,
    address: "10 Downing Street, London SW1A 2AA",
    timezone: "Europe/London",
    active: true,
    employeeCount: 15,
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
    id: "LOC004",
    name: "Berlin Office",
    country: "Germany",
    region: "Europe",
    city: "Berlin",
    state: null,
    address: "Unter den Linden 77, 10117 Berlin",
    timezone: "Europe/Berlin",
    active: true,
    employeeCount: 12,
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
    id: "LOC005",
    name: "Tokyo Office",
    country: "Japan",
    region: "Asia",
    city: "Tokyo",
    state: null,
    address: "1-1 Marunouchi, Chiyoda-ku, Tokyo",
    timezone: "Asia/Tokyo",
    active: true,
    employeeCount: 8,
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
    id: "LOC006",
    name: "Sydney Office",
    country: "Australia",
    region: "Oceania",
    city: "Sydney",
    state: "NSW",
    address: "123 George Street, Sydney NSW 2000",
    timezone: "Australia/Sydney",
    active: false,
    employeeCount: 0,
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

// Mock employees for location
const mockEmployeesForLocation = [
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

// Mock job profiles for location
const mockJobProfilesForLocation = [
  { id: "JP001", title: "Software Engineer", level: "Mid", count: 5 },
  { id: "JP002", title: "UX Designer", level: "Mid", count: 3 },
  { id: "JP003", title: "Product Manager", level: "Senior", count: 2 },
];

const LocationsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [drawerView, setDrawerView] = useState<
    "location" | "employees" | "jobProfiles"
  >("location");
  const [drawerData, setDrawerData] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { label: string; onClick: () => void }[]
  >([]);

  // Get unique regions and countries for filters
  const regions = Array.from(new Set(mockLocations.map((loc) => loc.region)));
  const countries = Array.from(
    new Set(mockLocations.map((loc) => loc.country))
  );

  // Filter locations
  const filteredLocations = mockLocations.filter((location) => {
    const matchesSearch =
      searchTerm === "" ||
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (location.address &&
        location.address.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRegion =
      regionFilter === "all" || location.region === regionFilter;
    const matchesCountry =
      countryFilter === "all" || location.country === countryFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && location.active) ||
      (statusFilter === "inactive" && !location.active);

    return matchesSearch && matchesRegion && matchesCountry && matchesStatus;
  });

  const handleAddNew = () => {
    setEditingLocation(null);
    setShowModal(true);
  };

  const handleEdit = (location: any) => {
    setEditingLocation(location);
    setShowModal(true);
  };

  const handleDelete = (location: any) => {
    // In a real app, this would call an API to delete the location
    console.log("Delete location:", location);
  };

  const handleSave = (formData: any) => {
    // In a real app, this would call an API to save the location
    console.log("Save location:", formData);
    setShowModal(false);
  };

  const handleRowClick = (location: any) => {
    setSelectedLocation(location);
    setDrawerData(location);
    setDrawerView("location");
    setBreadcrumbs([]);
    setDrawerOpen(true);
  };

  const handleViewEmployees = () => {
    setBreadcrumbs([
      {
        label: selectedLocation.name,
        onClick: () => {
          setDrawerData(selectedLocation);
          setDrawerView("location");
          setBreadcrumbs([]);
        },
      },
    ]);
    setDrawerData(mockEmployeesForLocation);
    setDrawerView("employees");
  };

  const handleViewJobProfiles = () => {
    setBreadcrumbs([
      {
        label: selectedLocation.name,
        onClick: () => {
          setDrawerData(selectedLocation);
          setDrawerView("location");
          setBreadcrumbs([]);
        },
      },
    ]);
    setDrawerData(mockJobProfilesForLocation);
    setDrawerView("jobProfiles");
  };

  const handleEditFromDrawer = () => {
    if (drawerView === "location") {
      setEditingLocation(selectedLocation);
      setShowModal(true);
    }
  };

  const columns = [
    { key: "id", header: "ID" },
    { key: "name", header: "Name" },
    {
      key: "country",
      header: "Country",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
    },
    {
      key: "region",
      header: "Region",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
    },
    {
      key: "city",
      header: "City",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
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
    if (drawerView === "location") {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Location ID" value={data.id} />
            <LabelValue
              label="Status"
              value={
                <Badge variant={data.active ? "success" : "error"}>
                  {data.active ? "Active" : "Inactive"}
                </Badge>
              }
            />
          </div>

          <SectionHeader title="Location Details" />
          <div className="grid grid-cols-2 gap-4">
            <LabelValue label="Country" value={data.country} />
            <LabelValue label="Region" value={data.region} />
            <LabelValue label="City" value={data.city} />
            {data.state && (
              <LabelValue label="State/Province" value={data.state} />
            )}
          </div>

          <LabelValue label="Address" value={data.address} />
          <LabelValue label="Timezone" value={data.timezone} />

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
                  View linked profiles
                </button>
              }
            />
          </div>

          <div className="mt-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-600">
              This location is used by {data.employeeCount} employees across{" "}
              {mockJobProfilesForLocation.length} different job profiles.
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

          {data.length < selectedLocation.employeeCount && (
            <div className="mt-4">
              <Button variant="outline" className="w-full">
                View All {selectedLocation.employeeCount} Employees
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
        title="Locations"
        description="Manage physical and virtual office locations"
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
              Add Location
            </Button>
          </div>
        }
      />

      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={{
          region: {
            value: regionFilter,
            options: [
              { value: "all", label: "All Regions" },
              ...regions.map((region) => ({ value: region, label: region })),
            ],
            onChange: setRegionFilter,
          },
          country: {
            value: countryFilter,
            options: [
              { value: "all", label: "All Countries" },
              ...countries.map((country) => ({
                value: country,
                label: country,
              })),
            ],
            onChange: setCountryFilter,
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
        data={filteredLocations}
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
                  {editingLocation ? "Edit Location" : "Add Location"}
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
                      Location ID
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingLocation?.id || ""}
                      placeholder="e.g., LOC001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingLocation?.name || ""}
                      placeholder="e.g., New York Office"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingLocation?.country || ""}
                      placeholder="e.g., United States"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Region
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingLocation?.region || ""}
                      placeholder="e.g., North America"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingLocation?.city || ""}
                      placeholder="e.g., New York"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      State/Province
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingLocation?.state || ""}
                      placeholder="e.g., NY"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                    defaultValue={editingLocation?.address || ""}
                    placeholder="e.g., 123 Broadway, New York, NY 10001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Timezone
                  </label>
                  <input
                    type="text"
                    className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                    defaultValue={editingLocation?.timezone || ""}
                    placeholder="e.g., America/New_York"
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
                        defaultChecked={editingLocation?.active !== false}
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
                        defaultChecked={editingLocation?.active === false}
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
                {editingLocation ? "Update Location" : "Create Location"}
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
          drawerView === "location"
            ? drawerData?.name
            : drawerView === "employees"
            ? `Employees at ${selectedLocation?.name}`
            : `Job Profiles at ${selectedLocation?.name}`
        }
        data={drawerData}
        onEdit={drawerView === "location" ? handleEditFromDrawer : undefined}
        breadcrumbs={breadcrumbs}
        renderContent={renderDrawerContent}
        lastUpdated={drawerData?.lastUpdated}
        createdInfo={drawerData?.created}
      />
    </PageLayout>
  );
};

export default LocationsPage;
