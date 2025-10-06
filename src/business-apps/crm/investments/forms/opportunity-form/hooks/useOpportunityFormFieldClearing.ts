import { useEffect } from "react";
import { useOpportunityFormContext } from "../context/OpportunityFormContext";
import { useOpportunityInvestmentTypeDetection } from "./useOpportunityInvestmentTypeDetection";

export const useOpportunityFormFieldClearing = () => {
  const { formValues, setFormValues, dependentInvestmentTypes, investmentGroupsSearchable } = useOpportunityFormContext();
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
    // For account field, we'll set both the account value and accountId
    // The accountId will be set by the component that has access to the accounts data
    if (field === "account") {
      setFormValues({ [field]: value });
    } else {
      setFormValues({ [field]: value });
    }
  };

  // Clear investment role when neither group nor type is equity (same logic as lead form)
  useEffect(() => {
    const hasLoadedDependentTypes = !formValues.investmentGroupRef || dependentInvestmentTypes.length > 0;
    const hasLoadedGroups = investmentGroupsSearchable.length > 0;
    
    // Only clear if we have an investment group selected and BOTH groups and dependent types are loaded
    if (hasLoadedDependentTypes && hasLoadedGroups && formValues.investmentGroupRef && !shouldShowInvestmentRole && formValues.investmentRoleRef) {
      handleInputChange("investmentRoleRef", "");
    }
  }, [shouldShowInvestmentRole, formValues.investmentGroupRef, dependentInvestmentTypes.length, investmentGroupsSearchable.length]);

  // Clear investment stake type when investment group is not equity (same logic as lead form)
  useEffect(() => {
    const hasLoadedDependentTypes = !formValues.investmentGroupRef || dependentInvestmentTypes.length > 0;
    const hasLoadedGroups = investmentGroupsSearchable.length > 0;
    
    // Only clear if we have an investment group selected and BOTH groups and dependent types are loaded
    if (hasLoadedDependentTypes && hasLoadedGroups && formValues.investmentGroupRef && !isEquityGroup && formValues.investmentStakeTypeRef) {
      handleInputChange("investmentStakeTypeRef", "");
    }
  }, [isEquityGroup, formValues.investmentGroupRef, dependentInvestmentTypes.length, investmentGroupsSearchable.length]);

  // Clear equity-specific financial fields when investment group is not equity (same logic as lead form)
  useEffect(() => {
    const hasLoadedDependentTypes = !formValues.investmentGroupRef || dependentInvestmentTypes.length > 0;
    const hasLoadedGroups = investmentGroupsSearchable.length > 0;
    
    // Only clear if we have an investment group selected and BOTH groups and dependent types are loaded
    if (hasLoadedDependentTypes && hasLoadedGroups && formValues.investmentGroupRef && !isEquityGroup) {
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
  }, [isEquityGroup, formValues.investmentGroupRef, dependentInvestmentTypes.length, investmentGroupsSearchable.length]);

  // Clear real estate specific fields when not Real Estate + Existing Properties (same logic as lead form)
  useEffect(() => {
    const hasLoadedDependentTypes = !formValues.investmentGroupRef || dependentInvestmentTypes.length > 0;
    const hasLoadedGroups = investmentGroupsSearchable.length > 0;
    
    // Only clear if we have an investment group selected and BOTH groups and dependent types are loaded
    if (hasLoadedDependentTypes && hasLoadedGroups && formValues.investmentGroupRef && !(isRealEstateGroup && isExistingPropertiesType)) {
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
  }, [isRealEstateGroup, isExistingPropertiesType, formValues.investmentGroupRef, dependentInvestmentTypes.length, investmentGroupsSearchable.length]);

  // Clear real estate mezzanine loans specific fields when not real estate group + mezzanine loans (same logic as lead form)
  useEffect(() => {
    const hasLoadedDependentTypes = !formValues.investmentGroupRef || dependentInvestmentTypes.length > 0;
    const hasLoadedGroups = investmentGroupsSearchable.length > 0;
    
    // Only clear if we have an investment group selected and BOTH groups and dependent types are loaded
    if (hasLoadedDependentTypes && hasLoadedGroups && formValues.investmentGroupRef && !(isRealEstateGroup && isMezzanineLoansType)) {
      const updates: any = {};
      if (formValues.loanAmount) updates.loanAmount = "";
      if (formValues.loanInterestRate) updates.loanInterestRate = "";
      
      if (Object.keys(updates).length > 0) {
        Object.keys(updates).forEach(field => {
          handleInputChange(field, updates[field]);
        });
      }
    }
  }, [isRealEstateGroup, isMezzanineLoansType, formValues.investmentGroupRef, dependentInvestmentTypes.length, investmentGroupsSearchable.length]);

  // Clear initial investment amount when none of the equity or real estate conditions are met (shared field - same logic as lead form)
  useEffect(() => {
    const hasLoadedDependentTypes = !formValues.investmentGroupRef || dependentInvestmentTypes.length > 0;
    const hasLoadedGroups = investmentGroupsSearchable.length > 0;
    
    const shouldShowInitialInvestment = isEquityGroup || 
                                        (isRealEstateGroup && isExistingPropertiesType) ||
                                        (isRealEstateGroup && isOthersType);
    // Only clear if we have an investment group selected and BOTH groups and dependent types are loaded
    if (hasLoadedDependentTypes && hasLoadedGroups && formValues.investmentGroupRef && !shouldShowInitialInvestment && formValues.initialInvestmentAmount) {
      handleInputChange("initialInvestmentAmount", "");
    }
  }, [isEquityGroup, isRealEstateGroup, isExistingPropertiesType, isOthersType, formValues.investmentGroupRef, dependentInvestmentTypes.length, investmentGroupsSearchable.length]);

  // Clear real estate project development specific fields when not real estate group + project development (same logic as lead form)
  useEffect(() => {
    const hasLoadedDependentTypes = !formValues.investmentGroupRef || dependentInvestmentTypes.length > 0;
    const hasLoadedGroups = investmentGroupsSearchable.length > 0;
    
    // Only clear if we have an investment group selected and BOTH groups and dependent types are loaded
    if (hasLoadedDependentTypes && hasLoadedGroups && formValues.investmentGroupRef && !(isRealEstateGroup && isProjectDevelopmentType)) {
      const updates: any = {};
      if (formValues.requiredCapitalAmount) updates.requiredCapitalAmount = "";
      if (formValues.forecastedProfitAmount) updates.forecastedProfitAmount = "";
      
      if (Object.keys(updates).length > 0) {
        Object.keys(updates).forEach(field => {
          handleInputChange(field, updates[field]);
        });
      }
    }
  }, [isRealEstateGroup, isProjectDevelopmentType, formValues.investmentGroupRef, dependentInvestmentTypes.length, investmentGroupsSearchable.length]);

  // Clear forecasted profit amount when not real estate others or project development (same logic as lead form)  
  useEffect(() => {
    const hasLoadedDependentTypes = !formValues.investmentGroupRef || dependentInvestmentTypes.length > 0;
    const hasLoadedGroups = investmentGroupsSearchable.length > 0;
    
    const shouldShowForecastedProfit = (isRealEstateGroup && isProjectDevelopmentType) ||
                                       (isRealEstateGroup && isOthersType);
    // Only clear if we have an investment group selected and BOTH groups and dependent types are loaded
    if (hasLoadedDependentTypes && hasLoadedGroups && formValues.investmentGroupRef && !shouldShowForecastedProfit && formValues.forecastedProfitAmount) {
      handleInputChange("forecastedProfitAmount", "");
    }
  }, [isRealEstateGroup, isProjectDevelopmentType, isOthersType, formValues.investmentGroupRef, dependentInvestmentTypes.length, investmentGroupsSearchable.length]);

  return { handleInputChange };
};
