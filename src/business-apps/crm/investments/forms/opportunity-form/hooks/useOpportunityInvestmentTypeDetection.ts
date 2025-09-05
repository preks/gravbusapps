import { useMemo } from "react";
import { useOpportunityFormContext } from "../context/OpportunityFormContext";

export const useOpportunityInvestmentTypeDetection = () => {
  const { formValues, investmentGroupsSearchable, dependentInvestmentTypes } = useOpportunityFormContext();

  // Check if selected investment group is equity (same logic as lead form)
  const isEquityGroup = useMemo(() => {
    if (!formValues.investmentGroupRef) return false;
    
    // Find the selected investment group in the searchable groups
    const selectedGroup = investmentGroupsSearchable.find(
      group => group.value === formValues.investmentGroupRef
    );
    
    if (!selectedGroup) return false;
    
    // Check if the group name/label contains "equity" (case-insensitive)
    const groupLabel = selectedGroup.label.toLowerCase();
    const groupName = selectedGroup.name.toLowerCase();
    
    return groupLabel.includes('equity') || groupName.includes('equity');
  }, [formValues.investmentGroupRef, investmentGroupsSearchable]);

  // Check if selected investment type is equity (same logic as lead form)
  const isEquityType = useMemo(() => {
    if (!formValues.investmentTypeRef) return false;
    
    // Find the selected investment type in the dependent types
    const selectedType = dependentInvestmentTypes.find(
      type => type.value === formValues.investmentTypeRef
    );
    
    if (!selectedType) return false;
    
    // Check if the type name/label contains "equity" (case-insensitive)
    const typeLabel = selectedType.label.toLowerCase();
    const typeName = selectedType.name.toLowerCase();
    
    return typeLabel.includes('equity') || typeName.includes('equity');
  }, [formValues.investmentTypeRef, dependentInvestmentTypes]);

  // Check if selected investment group is real estate (same logic as lead form)
  const isRealEstateGroup = useMemo(() => {
    if (!formValues.investmentGroupRef) return false;
    
    // Find the selected investment group in the searchable groups
    const selectedGroup = investmentGroupsSearchable.find(
      group => group.value === formValues.investmentGroupRef
    );
    
    if (!selectedGroup) return false;
    
    // Check if the group name/label contains "real estate" or "realestate" (case-insensitive)
    const groupLabel = selectedGroup.label.toLowerCase();
    const groupName = selectedGroup.name.toLowerCase();
    
    return groupLabel.includes('real estate') || groupName.includes('real estate') ||
           groupLabel.includes('realestate') || groupName.includes('realestate');
  }, [formValues.investmentGroupRef, investmentGroupsSearchable]);

  // Check if selected investment type is existing properties (same logic as lead form)
  const isExistingPropertiesType = useMemo(() => {
    if (!formValues.investmentTypeRef) return false;
    
    // Find the selected investment type in the dependent types
    const selectedType = dependentInvestmentTypes.find(
      type => type.value === formValues.investmentTypeRef
    );
    
    if (!selectedType) return false;
    
    // Check if the type name/label contains "existing properties" (case-insensitive)
    const typeLabel = selectedType.label.toLowerCase();
    const typeName = selectedType.name.toLowerCase();
    
    return typeLabel.includes('existing propert') || typeName.includes('existing propert');
  }, [formValues.investmentTypeRef, dependentInvestmentTypes]);

  // Check if selected investment type is mezzanine loans (for real estate group) - SAME LOGIC AS LEAD FORM
  const isMezzanineLoansType = useMemo(() => {
    if (!formValues.investmentTypeRef) return false;
    
    // Find the selected investment type in the dependent types
    const selectedType = dependentInvestmentTypes.find(
      type => type.value === formValues.investmentTypeRef
    );
    
    if (!selectedType) {
      return false;
    }
    
    // Check if the type name/label contains "mezzanine" (case-insensitive)
    const typeLabel = selectedType.label.toLowerCase();
    const typeName = selectedType.name.toLowerCase();
    
    const result = typeLabel.includes('mezzanine') || typeName.includes('mezzanine');
    
    return result;
  }, [formValues.investmentTypeRef, dependentInvestmentTypes]);

  // Check if selected investment type is others (for real estate group) - SAME LOGIC AS LEAD FORM
  const isOthersType = useMemo(() => {
    if (!formValues.investmentTypeRef) return false;
    
    // Find the selected investment type in the dependent types
    const selectedType = dependentInvestmentTypes.find(
      type => type.value === formValues.investmentTypeRef
    );
    
    if (!selectedType) {
      return false;
    }
    
    // Check if the type name/label contains "others" or "other" (case-insensitive)
    const typeLabel = selectedType.label.toLowerCase();
    const typeName = selectedType.name.toLowerCase();
    
    const result = typeLabel.includes('others') || typeName.includes('others') ||
                   typeLabel.includes('other') || typeName.includes('other');
    
    return result;
  }, [formValues.investmentTypeRef, dependentInvestmentTypes]);

  // Check if selected investment type is project development (for real estate group) - SAME LOGIC AS LEAD FORM
  const isProjectDevelopmentType = useMemo(() => {
    if (!formValues.investmentTypeRef) return false;
    
    // Find the selected investment type in the dependent types
    const selectedType = dependentInvestmentTypes.find(
      type => type.value === formValues.investmentTypeRef
    );
    
    if (!selectedType) {
      return false;
    }
    
    // Check if the type name/label contains "project development" (case-insensitive)
    const typeLabel = selectedType.label.toLowerCase();
    const typeName = selectedType.name.toLowerCase();
    
    const result = typeLabel.includes('project development') || typeName.includes('project development') ||
                   typeLabel.includes('project') || typeName.includes('project');
    
    return result;
  }, [formValues.investmentTypeRef, dependentInvestmentTypes]);

  // Show investment role if either group OR type contains equity, OR real estate + existing properties (NOT for mezzanine loans, project development, or others - same logic as lead form)
  const shouldShowInvestmentRole = isEquityGroup || isEquityType || (isRealEstateGroup && isExistingPropertiesType);

  return {
    isEquityGroup,
    isEquityType,
    isRealEstateGroup,
    isExistingPropertiesType,
    isMezzanineLoansType,
    isProjectDevelopmentType,
    isOthersType,
    shouldShowInvestmentRole,
  };
};
