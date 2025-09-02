import React from "react";
import { LeadFormProvider } from "./context/LeadFormContext";
import LeadFormComponent from "./components/LeadFormComponent";
import { LeadFormValues } from "./types";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

interface LeadFormProps {
  initialValues?: Partial<LeadFormValues>;
  onSubmit?: (values: LeadFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
}

const LeadForm: React.FC<BusinessAppContextProps & LeadFormProps> = ({
  initialValues,
  onSubmit = async () => {},
  onCancel = async () => {},
  accessToken,
  userInfo,
  additionalData,
}) => {
  if (!accessToken) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-red-500">
          Error: No access token found. Please ensure you are properly
          authenticated.
        </div>
      </div>
    );
  }

  const businessAppContext: BusinessAppContextProps = {
    accessToken,
    userInfo,
    additionalData,
  };

  return (
    <LeadFormProvider
      businessAppContext={businessAppContext}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <LeadFormComponent />
    </LeadFormProvider>
  );
};

export default LeadForm;
