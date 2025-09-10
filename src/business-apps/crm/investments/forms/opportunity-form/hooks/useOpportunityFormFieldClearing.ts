import { useEffect } from "react";
import { useOpportunityFormContext } from "../context/OpportunityFormContext";
import { useOpportunityInvestmentTypeDetection } from "./useOpportunityInvestmentTypeDetection";

export const useOpportunityFormFieldClearing = () => {
  const { formValues, setFormValues, dependentInvestmentTypes, simpleAccounts } = useOpportunityFormContext();
  const {
    isEquityGroup,
    isRealEstateGroup,
    isExistingPropertiesType,
    isMezzanineLoansType,
    isProjectDevelopmentType,
    isOthersType,
    shouldShowInvestmentRole,
  } = useOpportunityInvestmentTypeDetection();

  // Handle form field changes with special account handling
  const handleInputChange = (field: string, value: string) => {
    // Update the form values and also set the accountId for the backend
    if (field === "account") {
      const selectedAccount = simpleAccounts.find((acc) => acc.value === value);
      setFormValues({
        [field]: value,
        accountId: selectedAccount?.id || value, // Use account ID for backend
      });
    } else {
      setFormValues({ [field]: value });
    }
  };

  // Clear investment role when neither group nor type is equity (same logic as lead form)
  useEffect(() => {
    const hasLoadedDependentTypes = !formValues.investmentGroupRef || dependentInvestmentTypes.length > 0;
    
    if (hasLoadedDependentTypes && !shouldShowInvestmentRole && formValues.investmentRoleRef) {
      handleInputChange("investmentRoleRef", "");
    }
  }, [shouldShowInvestmentRole, formValues.investmentGroupRef, dependentInvestmentTypes.length]);

  // Clear investment stake type when investment group is not equity (same logic as lead form)
  useEffect(() => {
    const hasLoadedDependentTypes = !formValues.investmentGroupRef || dependentInvestmentTypes.length > 0;
    
    if (hasLoadedDependentTypes && !isEquityGroup && formValues.investmentStakeTypeRef) {
      handleInputChange("investmentStakeTypeRef", "");
    }
  }, [isEquityGroup, formValues.investmentGroupRef, dependentInvestmentTypes.length]);

  // Clear equity-specific financial fields when investment group is not equity (same logic as lead form)
  useEffect(() => {
    const hasLoadedDependentTypes = !formValues.investmentGroupRef || dependentInvestmentTypes.length > 0;
    
    if (hasLoadedDependentTypes && !isEquityGroup) {
      const updates: any = {};
      if (formValues.stakePercentage) updates.stakePercentage = "";
      if (formValues.marketValue) updates.marketValue = "";
      if (formValues.initialInvestmentAmount) updates.initialInvestmentAmount = "";
      
      if (Object.keys(updates).length > 0) {
        Object.keys(updates).forEach(field => {
          handleInputChange(field, updates[field]);
        });
      }
    }
  }, [isEquityGroup, formValues.investmentGroupRef, dependentInvestmentTypes.length]);

  // Clear real estate specific fields when not Real Estate + Existing Properties (same logic as lead form)
  useEffect(() => {
    const hasLoadedDependentTypes = !formValues.investmentGroupRef || dependentInvestmentTypes.length > 0;
    
    if (hasLoadedDependentTypes && !(isRealEstateGroup && isExistingPropertiesType)) {
      const updates: any = {};
      if (formValues.buildingYear) updates.buildingYear = "";
      if (formValues.size) updates.size = "";
      if (formValues.measurementUnit) updates.measurementUnit = "";
      if (formValues.annualNetColdRent) updates.annualNetColdRent = "";
      
      if (Object.keys(updates).length > 0) {
        Object.keys(updates).forEach(field => {
          handleInputChange(field, updates[field]);
        });
      }
    }
  }, [isRealEstateGroup, isExistingPropertiesType, formValues.investmentGroupRef, dependentInvestmentTypes.length]);

  // Clear real estate mezzanine loans specific fields when not real estate group + mezzanine loans (same logic as lead form)
  useEffect(() => {
    const hasLoadedDependentTypes = !formValues.investmentGroupRef || dependentInvestmentTypes.length > 0;
    
    if (hasLoadedDependentTypes && !(isRealEstateGroup && isMezzanineLoansType)) {
      const updates: any = {};
      if (formValues.loanAmount) updates.loanAmount = "";
      if (formValues.loanInterestRate) updates.loanInterestRate = "";
      
      if (Object.keys(updates).length > 0) {
        Object.keys(updates).forEach(field => {
          handleInputChange(field, updates[field]);
        });
      }
    }
  }, [isRealEstateGroup, isMezzanineLoansType, formValues.investmentGroupRef, dependentInvestmentTypes.length]);

  // Clear initial investment amount when none of the equity or real estate conditions are met (shared field - same logic as lead form)
  useEffect(() => {
    const hasLoadedDependentTypes = !formValues.investmentGroupRef || dependentInvestmentTypes.length > 0;
    
    const shouldShowInitialInvestment = isEquityGroup || 
                                        (isRealEstateGroup && isExistingPropertiesType) ||
                                        (isRealEstateGroup && isOthersType);
    if (hasLoadedDependentTypes && !shouldShowInitialInvestment && formValues.initialInvestmentAmount) {
      handleInputChange("initialInvestmentAmount", "");
    }
  }, [isEquityGroup, isRealEstateGroup, isExistingPropertiesType, isOthersType, formValues.investmentGroupRef, dependentInvestmentTypes.length]);

  // Clear real estate project development specific fields when not real estate group + project development (same logic as lead form)
  useEffect(() => {
    const hasLoadedDependentTypes = !formValues.investmentGroupRef || dependentInvestmentTypes.length > 0;
    
    if (hasLoadedDependentTypes && !(isRealEstateGroup && isProjectDevelopmentType)) {
      const updates: any = {};
      if (formValues.requiredCapitalAmount) updates.requiredCapitalAmount = "";
      if (formValues.forecastedProfitAmount) updates.forecastedProfitAmount = "";
      
      if (Object.keys(updates).length > 0) {
        Object.keys(updates).forEach(field => {
          handleInputChange(field, updates[field]);
        });
      }
    }
  }, [isRealEstateGroup, isProjectDevelopmentType, formValues.investmentGroupRef, dependentInvestmentTypes.length]);

  // Clear forecasted profit amount when not real estate others or project development (same logic as lead form)  
  useEffect(() => {
    const hasLoadedDependentTypes = !formValues.investmentGroupRef || dependentInvestmentTypes.length > 0;
    
    const shouldShowForecastedProfit = (isRealEstateGroup && isProjectDevelopmentType) ||
                                       (isRealEstateGroup && isOthersType);
    if (hasLoadedDependentTypes && !shouldShowForecastedProfit && formValues.forecastedProfitAmount) {
      handleInputChange("forecastedProfitAmount", "");
    }
  }, [isRealEstateGroup, isProjectDevelopmentType, isOthersType, formValues.investmentGroupRef, dependentInvestmentTypes.length]);

  return { handleInputChange };
};
