import React from "react";
import { OpportunityFormProvider } from "./context/OpportunityFormContext";
import OpportunityFormComponent from "./components/OpportunityFormComponent";
import { InvestmentOpportunityFormValues } from "./types";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

interface InvestmentOpportunityFormProps {
  initialValues?: Partial<InvestmentOpportunityFormValues>;
  onSubmit?: (values: InvestmentOpportunityFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
}

const InvestmentOpportunityForm: React.FC<
  BusinessAppContextProps & InvestmentOpportunityFormProps
> = ({
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
    <OpportunityFormProvider
      businessAppContext={businessAppContext}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
    >
      <OpportunityFormComponent />
    </OpportunityFormProvider>
  );
};

export default InvestmentOpportunityForm;
