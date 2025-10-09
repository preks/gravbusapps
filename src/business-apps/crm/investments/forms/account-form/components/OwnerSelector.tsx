import React, { useState } from "react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
} from "@newwork/nw-design-system";
import { PiPencilSimple } from "react-icons/pi";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { SelectOption } from "../types";
import EmployeeSearchableSelect from "./EmployeeSearchableSelect";

const prefixDataTestId = "OwnerSelector";

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

  // Find selected employee
  const selectedEmployee = employees.find((emp) => emp.value === value);

  const handleChangeClick = () => {
    setShowDropdown(true);
  };

  const handleEmployeeSelect = (selectedValue: string) => {
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
          placeholder="Search and select account owner..."
          options={employees}
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
        data-testid={formatDataTestId(prefixDataTestId, "change-button")}
      >
        <PiPencilSimple size={14} />
        {selectedEmployee ? "Change" : "Select"}
      </Button>
    </div>
  );
};

export default OwnerSelector;
