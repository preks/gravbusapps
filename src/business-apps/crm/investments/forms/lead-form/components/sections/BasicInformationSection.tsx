import React from "react";
import { Input, Label } from "@newwork/nw-design-system";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { useLeadFormContext } from "../../context/LeadFormContext";

const prefixDataTestId = "LeadForm";

const BasicInformationSection: React.FC = () => {
  const { formValues, setFormValues } = useLeadFormContext();

  return (
    <div className="gba:space-y-6">
      {/* First Name and Last Name - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <div className="gba:space-y-2">
          <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
            First Name <span className="gba:text-red-500">*</span>
          </Label>
          <Input
            name="firstName"
            value={
              typeof formValues.firstName === "string"
                ? formValues.firstName
                : ""
            }
            onChange={(e) => setFormValues({ firstName: e.target.value })}
            placeholder="Please Enter..."
            required
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
            value={
              typeof formValues.lastName === "string"
                ? formValues.lastName
                : ""
            }
            onChange={(e) => setFormValues({ lastName: e.target.value })}
            placeholder="Please Enter..."
            required
            className="gba:border-gray-300 gba:bg-white"
            data-testid={formatDataTestId(prefixDataTestId, "LastNameInput")}
          />
        </div>
      </div>

      {/* Company Name Input Field */}
      <div className="gba:space-y-2">
        <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
          Company Name <span className="gba:text-red-500">*</span>
        </Label>
        <Input
          name="company"
          value={
            typeof formValues.company === "string"
              ? formValues.company
              : String(formValues.company || "")
          }
          onChange={(e) => setFormValues({ company: e.target.value })}
          placeholder="Please Enter..."
          required
          className="gba:border-gray-300 gba:bg-white"
          data-testid={formatDataTestId(prefixDataTestId, "CompanyInput")}
        />
      </div>
    </div>
  );
};

export default BasicInformationSection;
