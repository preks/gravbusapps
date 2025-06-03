import React, { useState } from "react";
import { PageLayout, PageHeader } from "../components/layout/PageLayout";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { DataTable } from "../components/master-data/DataTable";
import { FilterBar } from "../components/master-data/FilterBar";
import { Plus, Upload, Download, X, Check, DollarSign } from "lucide-react";

// Mock data for compensation bands
const mockCompensationBands = [
  {
    id: "CB001",
    minSalary: 50000,
    maxSalary: 70000,
    currency: "USD",
    payGrade: "A1",
    country: "United States",
    jobLevel: "Entry",
    active: true,
  },
  {
    id: "CB002",
    minSalary: 70000,
    maxSalary: 90000,
    currency: "USD",
    payGrade: "A2",
    country: "United States",
    jobLevel: "Mid",
    active: true,
  },
  {
    id: "CB003",
    minSalary: 90000,
    maxSalary: 120000,
    currency: "USD",
    payGrade: "A3",
    country: "United States",
    jobLevel: "Senior",
    active: true,
  },
  {
    id: "CB004",
    minSalary: 40000,
    maxSalary: 55000,
    currency: "EUR",
    payGrade: "E1",
    country: "Germany",
    jobLevel: "Entry",
    active: true,
  },
  {
    id: "CB005",
    minSalary: 55000,
    maxSalary: 75000,
    currency: "EUR",
    payGrade: "E2",
    country: "Germany",
    jobLevel: "Mid",
    active: true,
  },
];

// Mock data for dropdowns
const countries = [
  "United States",
  "Germany",
  "United Kingdom",
  "France",
  "Canada",
  "Australia",
];
const jobLevels = ["Entry", "Mid", "Senior", "Lead", "Principal"];
const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"];

const CompensationBandsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingBand, setEditingBand] = useState<any>(null);

  // Filter compensation bands
  const filteredBands = mockCompensationBands.filter((band) => {
    const matchesSearch =
      searchTerm === "" ||
      band.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      band.payGrade.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCountry =
      countryFilter === "all" || band.country === countryFilter;
    const matchesLevel = levelFilter === "all" || band.jobLevel === levelFilter;
    const matchesCurrency =
      currencyFilter === "all" || band.currency === currencyFilter;

    return matchesSearch && matchesCountry && matchesLevel && matchesCurrency;
  });

  const handleAddNew = () => {
    setEditingBand(null);
    setShowModal(true);
  };

  const handleEdit = (band: any) => {
    setEditingBand(band);
    setShowModal(true);
  };

  const handleDelete = (band: any) => {
    // In a real app, this would call an API to delete the band
    console.log("Delete band:", band);
  };

  const handleSave = (formData: any) => {
    // In a real app, this would call an API to save the band
    console.log("Save band:", formData);
    setShowModal(false);
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const columns = [
    { key: "id", header: "Band ID" },
    { key: "payGrade", header: "Pay Grade" },
    {
      key: "minSalary",
      header: "Min Salary",
      render: (value: number, row: any) => (
        <span className="text-sm text-neutral-700">
          {formatCurrency(value, row.currency)}
        </span>
      ),
    },
    {
      key: "maxSalary",
      header: "Max Salary",
      render: (value: number, row: any) => (
        <span className="text-sm text-neutral-700">
          {formatCurrency(value, row.currency)}
        </span>
      ),
    },
    {
      key: "currency",
      header: "Currency",
      render: (value: string) => <Badge variant="outline">{value}</Badge>,
    },
    {
      key: "country",
      header: "Country",
      render: (value: string) => (
        <span className="text-sm text-neutral-700">{value}</span>
      ),
    },
    {
      key: "jobLevel",
      header: "Job Level",
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

  return (
    <PageLayout>
      <PageHeader
        title="Compensation Bands"
        description="Manage salary ranges and compensation bands"
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
              Add Band
            </Button>
          </div>
        }
      />

      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={{
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
          level: {
            value: levelFilter,
            options: [
              { value: "all", label: "All Levels" },
              ...jobLevels.map((level) => ({ value: level, label: level })),
            ],
            onChange: setLevelFilter,
          },
          currency: {
            value: currencyFilter,
            options: [
              { value: "all", label: "All Currencies" },
              ...currencies.map((currency) => ({
                value: currency,
                label: currency,
              })),
            ],
            onChange: setCurrencyFilter,
          },
        }}
      />

      <DataTable
        columns={columns}
        data={filteredBands}
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
                  {editingBand
                    ? "Edit Compensation Band"
                    : "Add Compensation Band"}
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
                      Band ID
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingBand?.id || ""}
                      placeholder="e.g., CB001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Pay Grade
                    </label>
                    <input
                      type="text"
                      className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2"
                      defaultValue={editingBand?.payGrade || ""}
                      placeholder="e.g., A1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Min Salary
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign size={16} className="text-neutral-500" />
                      </div>
                      <input
                        type="number"
                        className="w-full border border-neutral-300 rounded-md shadow-xs pl-8 pr-3 py-2"
                        defaultValue={editingBand?.minSalary || ""}
                        placeholder="e.g., 50000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Max Salary
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign size={16} className="text-neutral-500" />
                      </div>
                      <input
                        type="number"
                        className="w-full border border-neutral-300 rounded-md shadow-xs pl-8 pr-3 py-2"
                        defaultValue={editingBand?.maxSalary || ""}
                        placeholder="e.g., 70000"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Currency
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Currency</option>
                      {currencies.map((currency) => (
                        <option
                          key={currency}
                          value={currency}
                          selected={editingBand?.currency === currency}
                        >
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Country
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Country</option>
                      {countries.map((country) => (
                        <option
                          key={country}
                          value={country}
                          selected={editingBand?.country === country}
                        >
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Job Level
                    </label>
                    <select className="w-full border border-neutral-300 rounded-md shadow-xs px-3 py-2">
                      <option value="">Select Job Level</option>
                      {jobLevels.map((level) => (
                        <option
                          key={level}
                          value={level}
                          selected={editingBand?.jobLevel === level}
                        >
                          {level}
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
                          defaultChecked={editingBand?.active !== false}
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
                          defaultChecked={editingBand?.active === false}
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
                {editingBand ? "Update Band" : "Create Band"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default CompensationBandsPage;
