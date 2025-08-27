import React from "react";
import {
  Input,
  Card,
  CardContent,
  Label,
  Alert,
  AlertDescription,
} from "@newwork/nw-design-system";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { useContactFormContext } from "../context/ContactFormContext";
import OwnerSelector from "./OwnerSelector";

const prefixDataTestId = "ContactForm";

const OwnerInformationSection: React.FC = () => {
  const {
    formValues,
    setFormValues,
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    loadMoreEmployeePositions,
    searchEmployeePositions,
    error,
  } = useContactFormContext();

  return (
    <Card
      className="gba:border-0 gba:shadow-none gba:bg-transparent gba:p-0"
      style={{
        border: "0",
        borderWidth: "0",
        borderStyle: "none",
        borderColor: "transparent",
        boxShadow: "none",
        padding: "0",
        background: "transparent",
      }}
    >
      <CardContent
        className="gba:space-y-6 gba:p-0"
        style={{
          border: "0",
          borderWidth: "0",
          borderStyle: "none",
          borderColor: "transparent",
          padding: "0",
        }}
      >
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Owner */}
        <div className="gba:space-y-2">
          <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
            Owner <span className="gba:text-red-500">*</span>
          </Label>
          <OwnerSelector
            value={formValues.owner || formValues.ownerEmployeeId}
            onChange={(value: string) =>
              setFormValues({
                owner: value,
                ownerEmployeeId: value,
              })
            }
            employees={employeePositions}
            loading={employeePositionsLoading}
            hasMore={employeePositionsHasMore}
            onLoadMore={loadMoreEmployeePositions}
            onSearch={(searchTerm: string) => {
              searchEmployeePositions(searchTerm);
            }}
            error={employeePositionsError}
            dataTestId={formatDataTestId(prefixDataTestId, "OwnerSelect")}
          />
        </div>

        {/* First and Last Name - Side by side */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              First Name <span className="gba:text-red-500">*</span>
            </Label>
            <Input
              name="firstName"
              value={formValues.firstName}
              onChange={(e) => setFormValues({ firstName: e.target.value })}
              placeholder="Please Enter..."
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(prefixDataTestId, "FirstNameInput")}
            />
          </div>

          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Last Name <span className="gba:text-red-500">*</span>
            </Label>
            <Input
              name="lastName"
              value={formValues.lastName}
              onChange={(e) => setFormValues({ lastName: e.target.value })}
              placeholder="Please Enter..."
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(prefixDataTestId, "LastNameInput")}
            />
          </div>
        </div>

        {/* Email */}
        <div className="gba:space-y-2">
          <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
            Email <span className="gba:text-red-500">*</span>
          </Label>
          <Input
            name="email"
            type="email"
            value={formValues.email}
            onChange={(e) => setFormValues({ email: e.target.value })}
            placeholder="Please Enter..."
            className="gba:border-gray-300 gba:bg-white"
            data-testid={formatDataTestId(prefixDataTestId, "EmailInput")}
          />
        </div>

        {/* Phone - Single field in grid layout to match CRM styling */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Phone
            </Label>
            <Input
              name="phone"
              type="tel"
              value={formValues.phone}
              onChange={(e) => setFormValues({ phone: e.target.value })}
              placeholder="Please Enter..."
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(prefixDataTestId, "PhoneInput")}
            />
          </div>
          {/* Empty second column to maintain CRM layout consistency (Fax not available in InvestmentContact) */}
          <div className="gba:space-y-2">
            {/* Intentionally empty to match CRM grid layout */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OwnerInformationSection;
