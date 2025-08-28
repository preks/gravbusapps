import React, { useState, useEffect, useMemo } from "react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
} from "@newwork/nw-design-system";
import { PiPencilSimple } from "react-icons/pi";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import EmployeeSearchableSelect from "./EmployeeSearchableSelect";

const prefixDataTestId = "OwnerSelector";

interface SelectOption {
  id: string;
  value: string;
  name: string;
  extraInfo?: {
    pictureThumbnail?: string;
    jobPosition?: string;
    organizationalUnit?: string;
  };
}

interface OwnerSelectorProps {
  value: string;
  onChange: (value: string) => void;
  employees: SelectOption[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSearch: (search: string) => void;
  error?: string | null;
  dataTestId?: string;
}

const OwnerSelector: React.FC<OwnerSelectorProps> = ({
  value,
  onChange,
  employees,
  loading,
  hasMore,
  onLoadMore,
  onSearch,
  error,
  dataTestId,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [cachedSelectedEmployee, setCachedSelectedEmployee] =
    useState<SelectOption | null>(null);

  // Find selected employee - check both value and id for robustness
  const currentSelectedEmployee = employees.find(
    (emp) => emp.value === value || emp.id === value
  );

  // Simple cache management: always update cache when we find the employee in current array
  useEffect(() => {
    if (currentSelectedEmployee) {
      console.log(
        "🔍 OwnerSelector - useEffect: Found current employee, updating cache:",
        currentSelectedEmployee.name
      );
      setCachedSelectedEmployee(currentSelectedEmployee);
    }
  }, [currentSelectedEmployee]);

  // Clear cache when value is cleared
  useEffect(() => {
    if (!value) {
      console.log(
        "🔍 OwnerSelector - useEffect: Value cleared, clearing cache"
      );
      setCachedSelectedEmployee(null);
    }
  }, [value]);

  // Display logic: prioritize current employee, fallback to cache only if it matches current value
  const selectedEmployee =
    currentSelectedEmployee ||
    (value &&
    cachedSelectedEmployee &&
    (cachedSelectedEmployee.value === value ||
      cachedSelectedEmployee.id === value)
      ? cachedSelectedEmployee
      : null);

  // Create enhanced employees array that always includes the selected employee
  const enhancedEmployees = useMemo(() => {
    if (!cachedSelectedEmployee || !value) return employees;

    // Check if the cached selected employee is already in the current employees
    const isSelectedInEmployees = employees.some(
      (emp) =>
        emp.value === cachedSelectedEmployee.value ||
        emp.id === cachedSelectedEmployee.id
    );

    if (isSelectedInEmployees) {
      return employees;
    }

    // Add the cached selected employee to the beginning of the list
    return [cachedSelectedEmployee, ...employees];
  }, [employees, cachedSelectedEmployee, value]);

  // Debug logging (after all variables are defined)
  console.log("🔍 OwnerSelector - Display state:", {
    value,
    currentSelectedEmployee: currentSelectedEmployee?.name,
    cachedSelectedEmployee: cachedSelectedEmployee?.name,
    selectedEmployee: selectedEmployee?.name,
    employeesCount: employees.length,
    cacheMatchesValue: cachedSelectedEmployee
      ? cachedSelectedEmployee.value === value ||
        cachedSelectedEmployee.id === value
      : false,
    enhancedEmployeesCount: enhancedEmployees.length,
  });

  const handleChangeClick = () => {
    setShowDropdown(true);
  };

  const handleEmployeeSelect = (selectedValue: string) => {
    // Find the selected employee from the dropdown options
    const newSelectedEmployee = enhancedEmployees.find(
      (emp) => emp.value === selectedValue || emp.id === selectedValue
    );

    console.log("🔍 OwnerSelector - Employee selected:", {
      selectedValue,
      newSelectedEmployee: newSelectedEmployee?.name,
      currentValue: value,
      willUpdateCache: !!newSelectedEmployee,
    });

    // Immediately update cache with the newly selected employee
    if (newSelectedEmployee) {
      console.log(
        "🔍 OwnerSelector - Immediately caching:",
        newSelectedEmployee.name
      );
      setCachedSelectedEmployee(newSelectedEmployee);
    } else {
      console.warn(
        "🔍 OwnerSelector - Warning: Selected employee not found in options"
      );
    }

    // Update the form value
    onChange(selectedValue);
    setShowDropdown(false);
  };

  const handleDropdownClose = () => {
    setShowDropdown(false);
  };

  if (showDropdown) {
    return (
      <div className="gba:space-y-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-sm gba:font-medium gba:text-gray-900">
            Select Owner <span className="gba:text-red-500">*</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDropdownClose}
            className="gba:text-gray-500 gba:hover:text-gray-700"
          >
            Cancel
          </Button>
        </div>
        <EmployeeSearchableSelect
          name="owner"
          value={value}
          placeholder="Search and select employee owner..."
          options={enhancedEmployees}
          loading={loading}
          hasMore={hasMore}
          onSearch={onSearch}
          onLoadMore={onLoadMore}
          onChange={handleEmployeeSelect}
          error={error}
          data-testid={dataTestId}
        />
      </div>
    );
  }

  return (
    <div
      className="gba:bg-white gba:border gba:border-gray-300 gba:rounded-lg gba:p-4 gba:flex gba:items-center gba:justify-between gba:min-h-[60px] gba:transition-colors gba:hover:border-gray-400"
      data-testid={
        dataTestId || formatDataTestId(prefixDataTestId, "Container")
      }
    >
      {selectedEmployee ? (
        <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
          <Avatar>
            {selectedEmployee.extraInfo?.pictureThumbnail ? (
              <AvatarImage
                src={`data:image/jpeg;base64,${selectedEmployee.extraInfo.pictureThumbnail}`}
                alt={selectedEmployee.name || "Employee"}
              />
            ) : null}
            <AvatarFallback>
              {selectedEmployee.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "??"}
            </AvatarFallback>
          </Avatar>

          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:text-sm gba:font-medium gba:text-gray-900 gba:truncate">
              {selectedEmployee.name}
            </div>
            <div className="gba:text-xs gba:text-gray-600 gba:truncate">
              {selectedEmployee.extraInfo?.jobPosition || "No Position"}
            </div>
            <div className="gba:text-xs gba:text-gray-500 gba:truncate">
              {selectedEmployee.extraInfo?.organizationalUnit || "No Unit"}
            </div>
          </div>
        </div>
      ) : (
        <div className="gba:flex-1 gba:text-gray-500 gba:text-sm">
          No owner selected
        </div>
      )}

      <Button
        variant="secondary"
        size="sm"
        onClick={handleChangeClick}
        className="gba:ml-3 gba:flex gba:items-center gba:gap-1"
        data-testid={formatDataTestId(prefixDataTestId, "ChangeButton")}
      >
        <PiPencilSimple size={14} />
        {selectedEmployee ? "Change" : "Select"}
      </Button>
    </div>
  );
};

export default OwnerSelector;
