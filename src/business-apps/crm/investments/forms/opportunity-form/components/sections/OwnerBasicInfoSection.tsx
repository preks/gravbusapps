import React from "react";
import { Input, Label } from "@newwork/nw-design-system";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { useOpportunityFormContext } from "../../context/OpportunityFormContext";
import OwnerSelector from "../OwnerSelector";

const prefixDataTestId = "InvestmentOpportunityForm";

const OwnerBasicInfoSection: React.FC = () => {
  const {
    formValues,
    setFormValues,
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    searchEmployeePositions,
    loadMoreEmployeePositions,
  } = useOpportunityFormContext();

  // Handle form field changes
  const handleInputChange = (field: string, value: string) => {
    setFormValues({ [field]: value });
  };

  return (
    <div className="gba:space-y-6">
      {/* Owner Selection */}
      <div className="gba:space-y-2">
        <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
          Owner <span className="gba:text-red-500">*</span>
        </Label>
        <OwnerSelector
          value={formValues.owner}
          onChange={(value) => handleInputChange("owner", value)}
          employees={employeePositions}
          loading={employeePositionsLoading}
          error={employeePositionsError}
          hasMore={employeePositionsHasMore}
          onSearch={searchEmployeePositions}
          onLoadMore={loadMoreEmployeePositions}
          data-testid={formatDataTestId(prefixDataTestId, "owner")}
        />
      </div>

      {/* Investment Name */}
      <div className="gba:space-y-2">
        <Label
          htmlFor="investmentName"
          className="gba:block gba:text-sm gba:font-medium gba:text-gray-900"
        >
          Investment Name <span className="gba:text-red-500">*</span>
        </Label>
        <Input
          id="investmentName"
          value={formValues.name || ""}
          onChange={(e) => handleInputChange("name", e.target.value)}
          placeholder="Please enter investment name..."
          className="gba:border-gray-300 gba:bg-white"
          data-testid={formatDataTestId(prefixDataTestId, "investment-name")}
        />
      </div>
    </div>
  );
};

export default OwnerBasicInfoSection;
